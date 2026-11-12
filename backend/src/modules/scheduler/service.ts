import { prisma } from '../../utils/prisma.js';
import { calculateWeeklyCancellationRate } from '../../utils/cancellation.js';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import {
  trip_status,
  request_status,
  lock_type,
  account_status,
  violation_status,
  actor_type,
  fail_reason_code,
  user_role,
} from '@prisma/client';
import { NotificationService } from '../notification/service.js';

const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Tính toán mốc tuần (Thứ Hai 00:00:00 - Chủ Nhật 23:59:59) theo múi giờ Việt Nam
 */
export function getPreviousWeekRangeVN(targetDate: Date = new Date()): {
  weekStart: Date;
  weekEnd: Date;
  weekStartDateOnly: Date;
} {
  const zonedTarget = toZonedTime(targetDate, VIETNAM_TIMEZONE);
  const dayOfWeek = zonedTarget.getDay(); // 0: Sunday, 1: Monday, ...
  const targetForWeek = dayOfWeek === 0 ? zonedTarget : subWeeks(zonedTarget, 1);

  const zonedStart = startOfWeek(targetForWeek, { weekStartsOn: 1 });
  const zonedEnd = endOfWeek(targetForWeek, { weekStartsOn: 1 });

  const utcStart = fromZonedTime(zonedStart, VIETNAM_TIMEZONE);
  const utcEnd = fromZonedTime(zonedEnd, VIETNAM_TIMEZONE);

  const weekStartStr = formatInTimeZone(utcStart, VIETNAM_TIMEZONE, 'yyyy-MM-dd');
  const weekStartDateOnly = new Date(`${weekStartStr}T00:00:00.000Z`);

  return { weekStart: utcStart, weekEnd: utcEnd, weekStartDateOnly };
}

export class SchedulerService {
  /**
   * CS-01: Tự động đóng chuyến trước 6 tiếng khởi hành & chuyển yêu cầu PENDING thành EXPIRED
   * Chạy định kỳ mỗi phút hoặc chạy bù khi server khởi động
   */
  static async closeTripsBefore6h(now: Date = new Date()) {
    // Ngưỡng thời gian: hiện tại + 6 giờ
    const threshold = new Date(now.getTime() + 6 * 60 * 60 * 1000);

    // 1. Tìm tất cả các chuyến xe OPEN có departure_time <= now + 6h
    const tripsToClose = await prisma.trip.findMany({
      where: {
        status: trip_status.OPEN,
        departure_time: { lte: threshold },
      },
      include: {
        transport_requests: {
          where: { status: request_status.PENDING },
          select: { id: true, code: true, user_id: true },
        },
      },
    });

    if (tripsToClose.length === 0) {
      return {
        closedTripsCount: 0,
        expiredRequestsCount: 0,
        trips: [],
      };
    }

    const processedTrips: Array<{ id: string; code: string; expiredRequestsCount: number }> = [];
    let totalExpired = 0;

    for (const trip of tripsToClose) {
      await prisma.$transaction(async (tx) => {
        // Cập nhật chuyến xe sang CLOSED
        await tx.trip.update({
          where: { id: trip.id },
          data: { status: trip_status.CLOSED },
        });

        // Chuyển toàn bộ yêu cầu PENDING của chuyến xe thành EXPIRED
        if (trip.transport_requests.length > 0) {
          const reqIds = trip.transport_requests.map((r) => r.id);
          await tx.transportRequest.updateMany({
            where: { id: { in: reqIds } },
            data: { status: request_status.EXPIRED },
          });

          // Gửi thông báo hết hạn cho từng người dùng
          for (const req of trip.transport_requests) {
            await tx.notification.create({
              data: {
                user_id: req.user_id,
                type: 'REQUEST_EXPIRED',
                content: `Yêu cầu ${req.code} của bạn trên chuyến ${trip.code} đã hết hạn do chuyến xe đã tự động đóng nhận yêu cầu trước giờ khởi hành 6 tiếng.`,
                ref_type: 'TRIP',
                ref_id: trip.id,
              },
            });
          }
        }

        // Gửi thông báo cho tài xế về việc đóng nhận yêu cầu
        await tx.notification.create({
          data: {
            user_id: trip.driver_id,
            type: 'TRIP_CLOSED',
            content: `Chuyến xe ${trip.code} (${trip.origin_name} → ${trip.dest_name}) đã tự động đóng nhận yêu cầu do còn 6 tiếng trước giờ khởi hành.`,
            ref_type: 'TRIP',
            ref_id: trip.id,
          },
        });
      });

      totalExpired += trip.transport_requests.length;
      processedTrips.push({
        id: trip.id.toString(),
        code: trip.code,
        expiredRequestsCount: trip.transport_requests.length,
      });
    }

    return {
      closedTripsCount: processedTrips.length,
      expiredRequestsCount: totalExpired,
      trips: processedTrips,
    };
  }

  /**
   * CS-02: Chốt tỷ lệ hủy tuần (T2-CN, giờ Việt Nam) & Xử phạt khóa tài khoản người dùng vi phạm
   * Chạy định kỳ vào Chủ Nhật 23:59:00 hoặc Thứ Hai 00:00:00 (Asia/Ho_Chi_Minh)
   */
  static async settleWeeklyCancellationRate(options?: {
    customWeekRange?: { weekStart: Date; weekEnd: Date; weekStartDateOnly: Date };
    targetDate?: Date;
  }) {
    const range = options?.customWeekRange || getPreviousWeekRangeVN(options?.targetDate || new Date());
    const { weekStart, weekEnd, weekStartDateOnly } = range;

    // 1. Tìm tất cả yêu cầu có chuyến xe khởi hành trong tuần đánh giá
    const requests = await prisma.transportRequest.findMany({
      where: {
        trip: {
          departure_time: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
      },
      include: {
        trip: true,
      },
    });

    if (requests.length === 0) {
      return {
        weekStart: weekStartDateOnly,
        evaluatedUsersCount: 0,
        violationsCount: 0,
        penalties: [],
      };
    }

    // 2. Nhóm yêu cầu theo từng user_id
    const userRequestsMap = new Map<bigint, typeof requests>();
    for (const req of requests) {
      const list = userRequestsMap.get(req.user_id) || [];
      list.push(req);
      userRequestsMap.set(req.user_id, list);
    }

    const penalties: Array<{
      userId: string;
      cancelRate: number;
      confirmedCount: number;
      cancelledCount: number;
      lockType: lock_type;
      lockUntil: Date | null;
    }> = [];

    // 3. Đánh giá từng người dùng theo quy tắc chuẩn
    for (const [userId, userReqs] of userRequestsMap.entries()) {
      // Kiểm tra người dùng có còn tồn tại và không phải ADMIN/DRIVER hay không
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user || user.role !== user_role.USER) continue;

      // Đã có bản ghi violation cho tuần này chưa? (Đảm bảo idempotent chống xử phạt 2 lần)
      const existingViolation = await prisma.violation.findUnique({
        where: {
          user_id_week_start: {
            user_id: userId,
            week_start: weekStartDateOnly,
          },
        },
      });
      if (existingViolation) continue;

      let confirmedCount = 0;
      let cancelledCount = 0;

      for (const r of userReqs) {
        // Loại bỏ hoàn toàn nếu chuyến bị tài xế hủy
        if (r.cancelled_by === actor_type.DRIVER) {
          continue;
        }

        // Bỏ qua các yêu cầu chưa từng được duyệt
        if (
          r.status === request_status.PENDING ||
          r.status === request_status.REJECTED ||
          r.status === request_status.EXPIRED
        ) {
          continue;
        }

        // Các yêu cầu đã từng được duyệt (ACCEPTED, COMPLETED, CANCELLED sau duyệt, FAILED)
        confirmedCount++;

        // Tử số (tính hủy do người dùng):
        // 1. Khách tự hủy sau khi đã ACCEPTED (counts_toward_cancel_rate = true)
        if (
          r.status === request_status.CANCELLED &&
          r.cancelled_by === actor_type.USER &&
          r.counts_toward_cancel_rate
        ) {
          cancelledCount++;
        }
        // 2. Thất bại do lỗi người dùng: WRONG_INFO, UNREACHABLE, ABSENT
        else if (
          r.status === request_status.FAILED &&
          r.fail_reason_code &&
          ([fail_reason_code.WRONG_INFO, fail_reason_code.UNREACHABLE, fail_reason_code.ABSENT] as fail_reason_code[]).includes(
            r.fail_reason_code
          )
        ) {
          cancelledCount++;
        }
      }

      // Tính toán tỷ lệ
      const rateResult = calculateWeeklyCancellationRate(confirmedCount, cancelledCount);

      if (rateResult.isApplicable && rateResult.isViolation) {
        // Kiểm tra số lần vi phạm đang có hiệu lực trong quá khứ của người dùng
        const priorViolationsCount = await prisma.violation.count({
          where: {
            user_id: userId,
            status: violation_status.ACTIVE,
          },
        });

        const isFirstViolation = priorViolationsCount === 0;
        const now = new Date();
        const lockType = isFirstViolation ? lock_type.TEMPORARY : lock_type.PERMANENT;
        const lockUntil = isFirstViolation
          ? new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) // Khóa 14 ngày
          : null; // Khóa vĩnh viễn

        await prisma.$transaction(async (tx) => {
          // Tạo bản ghi Vi phạm
          await tx.violation.create({
            data: {
              user_id: userId,
              week_start: weekStartDateOnly,
              confirmed_count: confirmedCount,
              cancelled_count: cancelledCount,
              cancel_rate: rateResult.rate,
              lock_type: lockType,
              lock_until: lockUntil,
              status: violation_status.ACTIVE,
            },
          });

          // Cập nhật trạng thái tài khoản User
          await tx.user.update({
            where: { id: userId },
            data: {
              status: isFirstViolation ? account_status.LOCKED_TEMP : account_status.LOCKED_PERM,
              locked_until: lockUntil,
            },
          });

          // Ghi nhận Audit Log hệ thống
          await tx.auditLog.create({
            data: {
              actor_type: actor_type.SYSTEM,
              action: isFirstViolation ? 'LOCK_ACCOUNT_TEMP' : 'LOCK_ACCOUNT_PERM',
              target_type: 'USER',
              target_id: userId,
              reason: isFirstViolation
                ? `Vi phạm tỷ lệ hủy chuyến tuần (${(rateResult.rate * 100).toFixed(1)}% > 5%) lần đầu. Khóa tài khoản tạm thời 14 ngày.`
                : `Tái phạm tỷ lệ hủy chuyến tuần (${(rateResult.rate * 100).toFixed(1)}% > 5%) lần ${priorViolationsCount + 1}. Khóa tài khoản vĩnh viễn.`,
            },
          });

          // Gửi thông báo cho người dùng
          const notifContent = isFirstViolation
            ? `Tài khoản của bạn đã bị tạm khóa 14 ngày do tỷ lệ hủy chuyến tuần vượt quá 5% (${(rateResult.rate * 100).toFixed(1)}%). Tài khoản sẽ tự động mở khóa vào ${lockUntil?.toLocaleDateString('vi-VN')}.`
            : `Tài khoản của bạn đã bị khóa vĩnh viễn do tái phạm tỷ lệ hủy chuyến tuần vượt quá 5% (${(rateResult.rate * 100).toFixed(1)}%). Vui lòng liên hệ quản trị viên để khiếu nại.`;

          await tx.notification.create({
            data: {
              user_id: userId,
              type: isFirstViolation ? 'ACCOUNT_LOCKED_TEMP' : 'ACCOUNT_LOCKED_PERM',
              content: notifContent,
            },
          });
        });

        penalties.push({
          userId: userId.toString(),
          cancelRate: rateResult.rate,
          confirmedCount,
          cancelledCount,
          lockType,
          lockUntil,
        });
      }
    }

    return {
      weekStart: weekStartDateOnly,
      evaluatedUsersCount: userRequestsMap.size,
      violationsCount: penalties.length,
      penalties,
    };
  }

  /**
   * CS-03: Tự động mở khóa các tài khoản LOCKED_TEMP đã hết hạn 14 ngày
   * Chạy định kỳ hằng giờ hoặc chạy bù khi server khởi động
   */
  static async unlockExpiredLockedAccounts(now: Date = new Date()) {
    // Tìm các tài khoản LOCKED_TEMP có locked_until <= now
    const expiredUsers = await prisma.user.findMany({
      where: {
        status: account_status.LOCKED_TEMP,
        locked_until: { lte: now },
      },
      select: { id: true, full_name: true, phone: true },
    });

    if (expiredUsers.length === 0) {
      return {
        unlockedCount: 0,
        userIds: [],
      };
    }

    const unlockedIds: string[] = [];

    for (const u of expiredUsers) {
      await prisma.$transaction(async (tx) => {
        // Cập nhật tài khoản về ACTIVE
        await tx.user.update({
          where: { id: u.id },
          data: {
            status: account_status.ACTIVE,
            locked_until: null,
          },
        });

        // Ghi Audit Log mở khóa tự động
        await tx.auditLog.create({
          data: {
            actor_type: actor_type.SYSTEM,
            action: 'UNLOCK_ACCOUNT_AUTO',
            target_type: 'USER',
            target_id: u.id,
            reason: 'Hết thời hạn tạm khóa 14 ngày. Hệ thống tự động phục hồi quyền hoạt động.',
          },
        });

        // Gửi thông báo tới người dùng
        await tx.notification.create({
          data: {
            user_id: u.id,
            type: 'ACCOUNT_UNLOCKED',
            content: 'Thời hạn tạm khóa tài khoản của bạn đã kết thúc. Tài khoản GoX của bạn đã được tự động mở khóa bình thường.',
          },
        });
      });

      unlockedIds.push(u.id.toString());
    }

    return {
      unlockedCount: unlockedIds.length,
      userIds: unlockedIds,
    };
  }
}
