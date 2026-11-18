import { prisma } from '../../utils/prisma.js';
import {
  user_role,
  account_status,
  incident_status,
  trip_status,
  request_status,
  actor_type,
  fail_reason_code,
} from '@prisma/client';
import {
  unlockUserSchema,
  lockUserSchema,
  updateIncidentStatusSchema,
  listUsersQuerySchema,
  listIncidentsQuerySchema,
  statisticsQuerySchema,
  tripsByDateQuerySchema,
} from './schema.js';
import { z } from 'zod';
import { AppError } from '../../middlewares/errorHandler.js';
import { calculateWeeklyCancellationRate } from '../../utils/cancellation.js';
import { getCurrentWeekRangeVN } from '../scheduler/service.js';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

function formatVnDateKey(date: Date): string {
  return format(toZonedTime(date, VN_TIMEZONE), 'yyyy-MM-dd');
}

function parseVnDayStart(dateStr: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(`${dateStr}T00:00:00.000+07:00`);
  }
  return new Date(dateStr);
}

function parseVnDayEnd(dateStr: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(`${dateStr}T23:59:59.999+07:00`);
  }
  return new Date(dateStr);
}

export class AdminService {
  /**
   * AD-01: Lấy danh sách tài khoản kèm bộ lọc vai trò, trạng thái và từ khóa tìm kiếm
   */
  static async getUsers(rawQuery: z.infer<typeof listUsersQuerySchema> | any) {
    const query = listUsersQuerySchema.parse(rawQuery);
    const skip = (query.page - 1) * query.limit;

    const where: any = {};

    if (query.role) {
      where.role = query.role;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { full_name: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          phone: true,
          email: true,
          full_name: true,
          avatar_url: true,
          role: true,
          status: true,
          locked_until: true,
          created_at: true,
          violations: {
            where: { status: 'ACTIVE' },
            orderBy: { created_at: 'desc' },
            take: 1,
            select: {
              id: true,
              week_start: true,
              confirmed_count: true,
              cancelled_count: true,
              cancel_rate: true,
              lock_type: true,
              lock_until: true,
              status: true,
              created_at: true,
            },
          },
          _count: {
            select: {
              trips: true,
              transport_requests: true,
              violations: true,
            },
          },
        },
      }),
    ]);

    const formattedUsers = users.map((u) => ({
      ...u,
      id: u.id.toString(),
      violations: u.violations.map((v) => ({
        ...v,
        id: v.id.toString(),
      })),
    }));

    return {
      users: formattedUsers,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * AD-01: Mở khóa tài khoản người dùng/tài xế
   * Bắt buộc Admin nhập lý do giải trình (>=10 ký tự), ghi AuditLog và thu hồi Vi phạm (REVOKED)
   */
  static async unlockUser(
    adminId: bigint,
    targetUserId: bigint,
    rawInput: z.infer<typeof unlockUserSchema> | any
  ) {
    const input = unlockUserSchema.parse(rawInput);

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        violations: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Không tìm thấy tài khoản người dùng.');
    }

    if (user.status === account_status.ACTIVE) {
      throw new AppError(400, 'USER_ALREADY_ACTIVE', 'Tài khoản hiện đang ở trạng thái Hoạt động, không cần mở khóa.');
    }

    // Thực hiện trong Transaction an toàn
    const result = await prisma.$transaction(async (tx) => {
      // 1. Phục hồi trạng thái ACTIVE cho User
      const updatedUser = await tx.user.update({
        where: { id: targetUserId },
        data: {
          status: account_status.ACTIVE,
          locked_until: null,
        },
      });

      // 2. Thu hồi các bản ghi Vi phạm đang ACTIVE thành REVOKED
      await tx.violation.updateMany({
        where: {
          user_id: targetUserId,
          status: 'ACTIVE',
        },
        data: {
          status: 'REVOKED',
          revoked_at: new Date(),
          revoked_by: adminId,
        },
      });

      // 3. Ghi vết Audit Log bắt buộc
      const auditLog = await tx.auditLog.create({
        data: {
          actor_id: adminId,
          actor_type: 'ADMIN',
          action: 'UNLOCK_ACCOUNT',
          target_type: 'USER',
          target_id: targetUserId,
          reason: input.reason,
        },
      });

      // 4. Gửi thông báo đến người dùng
      await tx.notification.create({
        data: {
          user_id: targetUserId,
          type: 'ACCOUNT_UNLOCKED',
          content: `Tài khoản của bạn đã được Quản trị viên mở khóa thành công. Lý do: "${input.reason}"`,
          ref_type: 'USER',
          ref_id: targetUserId,
        },
      });

      return { updatedUser, auditLog };
    });

    return {
      message: 'Mở khóa tài khoản thành công',
      user: {
        ...result.updatedUser,
        id: result.updatedUser.id.toString(),
      },
      audit_log: {
        ...result.auditLog,
        id: result.auditLog.id.toString(),
        actor_id: result.auditLog.actor_id?.toString() || null,
        target_id: result.auditLog.target_id?.toString() || null,
      },
    };
  }

  /**
   * AD-01 (Nâng cao): Xem chi tiết toàn diện thông tin 1 tài khoản (Hồ sơ, xe, vi phạm, tỷ lệ hủy tuần, lịch sử khóa/mở khóa)
   */
  static async getUserDetail(targetUserId: bigint) {
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        phone: true,
        email: true,
        full_name: true,
        avatar_url: true,
        role: true,
        status: true,
        locked_until: true,
        created_at: true,
        vehicles: {
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            type: true,
            brand_model: true,
            plate_number: true,
            seat_count: true,
            cargo_area_m2: true,
            cargo_max_kg: true,
            fuel_type: true,
            fuel_consumption: true,
            photo_url: true,
            status: true,
            is_deleted: true,
            created_at: true,
          },
        },
        violations: {
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            week_start: true,
            confirmed_count: true,
            cancelled_count: true,
            cancel_rate: true,
            lock_type: true,
            lock_until: true,
            status: true,
            revoked_at: true,
            created_at: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Không tìm thấy tài khoản người dùng.');
    }

    const [
      totalTrips,
      completedTrips,
      cancelledTrips,
      totalRequests,
      completedRequests,
      failedRequests,
      incidentReportsCount,
      auditLogs,
    ] = await Promise.all([
      prisma.trip.count({ where: { driver_id: targetUserId } }),
      prisma.trip.count({ where: { driver_id: targetUserId, status: trip_status.COMPLETED } }),
      prisma.trip.count({ where: { driver_id: targetUserId, status: trip_status.CANCELLED } }),
      prisma.transportRequest.count({ where: { user_id: targetUserId } }),
      prisma.transportRequest.count({ where: { user_id: targetUserId, status: request_status.COMPLETED } }),
      prisma.transportRequest.count({ where: { user_id: targetUserId, status: request_status.FAILED } }),
      prisma.incidentReport.count({ where: { reporter_id: targetUserId } }),
      prisma.auditLog.findMany({
        where: { target_type: 'USER', target_id: targetUserId },
        orderBy: { created_at: 'desc' },
        take: 20,
        include: {
          actor: {
            select: {
              id: true,
              full_name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
    ]);

    // Tính tỷ lệ hủy tuần hiện tại (T2-CN giờ VN) cho USER
    let cancellation = null;
    if (user.role === user_role.USER) {
      const { weekStart, weekEnd } = getCurrentWeekRangeVN();
      const currentWeekRequests = await prisma.transportRequest.findMany({
        where: {
          user_id: targetUserId,
          trip: {
            departure_time: {
              gte: weekStart,
              lte: weekEnd,
            },
          },
        },
        select: {
          status: true,
          cancelled_by: true,
          counts_toward_cancel_rate: true,
          fail_reason_code: true,
        },
      });

      let weekConfirmed = 0;
      let weekCancelled = 0;
      for (const r of currentWeekRequests) {
        if (r.cancelled_by === actor_type.DRIVER) continue;
        if (
          r.status === request_status.PENDING ||
          r.status === request_status.REJECTED ||
          r.status === request_status.EXPIRED
        ) {
          continue;
        }
        weekConfirmed++;
        if (
          r.status === request_status.CANCELLED &&
          r.cancelled_by === actor_type.USER &&
          r.counts_toward_cancel_rate
        ) {
          weekCancelled++;
        } else if (
          r.status === request_status.FAILED &&
          r.fail_reason_code &&
          ([fail_reason_code.WRONG_INFO, fail_reason_code.UNREACHABLE, fail_reason_code.ABSENT] as fail_reason_code[]).includes(
            r.fail_reason_code
          )
        ) {
          weekCancelled++;
        }
      }

      const rateRes = calculateWeeklyCancellationRate(weekConfirmed, weekCancelled);
      cancellation = {
        week_confirmed: weekConfirmed,
        week_cancelled: weekCancelled,
        week_rate: rateRes.rate,
        is_violation: rateRes.isViolation,
        total_violations: user.violations.length,
      };
    }

    return {
      ...user,
      id: user.id.toString(),
      vehicles: user.vehicles.map((v) => ({
        ...v,
        id: v.id.toString(),
      })),
      violations: user.violations.map((v) => ({
        ...v,
        id: v.id.toString(),
      })),
      audit_logs: auditLogs.map((log) => ({
        ...log,
        id: log.id.toString(),
        actor_id: log.actor_id?.toString() || null,
        target_id: log.target_id?.toString() || null,
        actor: log.actor ? { ...log.actor, id: log.actor.id.toString() } : null,
      })),
      stats: {
        total_trips: totalTrips,
        completed_trips: completedTrips,
        cancelled_trips: cancelledTrips,
        total_requests: totalRequests,
        completed_requests: completedRequests,
        failed_requests: failedRequests,
        incident_reports_count: incidentReportsCount,
      },
      cancellation,
    };
  }

  /**
   * AD-01 (Nâng cao): Quản trị viên chủ động khóa tài khoản người dùng / tài xế bất kỳ kèm lý do giải trình
   */
  static async lockUser(
    adminId: bigint,
    targetUserId: bigint,
    rawInput: z.infer<typeof lockUserSchema> | any
  ) {
    const input = lockUserSchema.parse(rawInput);

    if (adminId === targetUserId) {
      throw new AppError(400, 'CANNOT_LOCK_SELF', 'Bạn không thể tự khóa tài khoản của chính mình.');
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Không tìm thấy tài khoản người dùng.');
    }

    if (user.role === user_role.ADMIN) {
      throw new AppError(403, 'CANNOT_LOCK_ADMIN', 'Không thể khóa tài khoản Quản trị viên khác.');
    }

    const isPermanent = input.lock_type === 'LOCKED_PERM';
    const nextStatus = isPermanent ? account_status.LOCKED_PERM : account_status.LOCKED_TEMP;
    const lockedUntil = isPermanent
      ? null
      : new Date(Date.now() + input.duration_days * 24 * 60 * 60 * 1000);

    const formattedUntil = lockedUntil
      ? lockedUntil.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
      : null;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Cập nhật trạng thái khóa cho User
      const updatedUser = await tx.user.update({
        where: { id: targetUserId },
        data: {
          status: nextStatus,
          locked_until: lockedUntil,
        },
      });

      // 2. Ghi vết Audit Log bắt buộc
      const auditLog = await tx.auditLog.create({
        data: {
          actor_id: adminId,
          actor_type: 'ADMIN',
          action: 'LOCK_ACCOUNT',
          target_type: 'USER',
          target_id: targetUserId,
          reason: isPermanent
            ? `[Khóa vĩnh viễn] ${input.reason}`
            : `[Tạm khóa ${input.duration_days} ngày đến ${formattedUntil}] ${input.reason}`,
        },
      });

      // 3. Gửi thông báo đến Người dùng / Tài xế kèm lý do khóa
      const notifContent = isPermanent
        ? `Tài khoản của bạn đã bị Quản trị viên khóa vĩnh viễn. Lý do: "${input.reason}"`
        : `Tài khoản của bạn đã bị Quản trị viên tạm khóa ${input.duration_days} ngày (đến ${formattedUntil}). Lý do: "${input.reason}"`;

      await tx.notification.create({
        data: {
          user_id: targetUserId,
          type: 'ACCOUNT_LOCKED',
          content: notifContent,
          ref_type: 'USER',
          ref_id: targetUserId,
        },
      });

      return { updatedUser, auditLog };
    });

    return {
      message: isPermanent
        ? 'Đã khóa vĩnh viễn tài khoản thành công'
        : `Đã tạm khóa tài khoản ${input.duration_days} ngày thành công`,
      user: {
        ...result.updatedUser,
        id: result.updatedUser.id.toString(),
      },
      audit_log: {
        ...result.auditLog,
        id: result.auditLog.id.toString(),
        actor_id: result.auditLog.actor_id?.toString() || null,
        target_id: result.auditLog.target_id?.toString() || null,
      },
    };
  }

  /**
   * AD-02: Lấy danh sách toàn bộ sự cố trong hệ thống (hỗ trợ lọc trạng thái, dải ngày và từ khóa)
   */
  static async getIncidents(rawQuery: z.infer<typeof listIncidentsQuerySchema> | any) {
    const query = listIncidentsQuerySchema.parse(rawQuery);
    const skip = (query.page - 1) * query.limit;

    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }

    if (query.from_date || query.to_date) {
      where.created_at = {};
      if (query.from_date) {
        where.created_at.gte = new Date(`${query.from_date}T00:00:00.000+07:00`);
      }
      if (query.to_date) {
        where.created_at.lte = new Date(`${query.to_date}T23:59:59.999+07:00`);
      }
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { reporter: { full_name: { contains: query.search, mode: 'insensitive' } } },
        { reporter: { phone: { contains: query.search } } },
        { trip: { code: { contains: query.search, mode: 'insensitive' } } },
        { transport_request: { code: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [total, incidents] = await Promise.all([
      prisma.incidentReport.count({ where }),
      prisma.incidentReport.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { created_at: 'desc' },
        include: {
          reporter: {
            select: {
              id: true,
              full_name: true,
              phone: true,
              email: true,
              role: true,
              avatar_url: true,
            },
          },
          handler: {
            select: {
              id: true,
              full_name: true,
              phone: true,
              email: true,
            },
          },
          trip: {
            select: {
              id: true,
              code: true,
              origin_name: true,
              dest_name: true,
              departure_time: true,
              status: true,
            },
          },
          transport_request: {
            select: {
              id: true,
              code: true,
              type: true,
              status: true,
            },
          },
        },
      }),
    ]);

    const formattedIncidents = incidents.map((inc) => ({
      ...inc,
      id: inc.id.toString(),
      reporter_id: inc.reporter_id.toString(),
      handled_by: inc.handled_by?.toString() || null,
      trip_id: inc.trip_id?.toString() || null,
      request_id: inc.request_id?.toString() || null,
      reporter: {
        ...inc.reporter,
        id: inc.reporter.id.toString(),
      },
      handler: inc.handler
        ? {
            ...inc.handler,
            id: inc.handler.id.toString(),
          }
        : null,
      trip: inc.trip
        ? {
            ...inc.trip,
            id: inc.trip.id.toString(),
          }
        : null,
      transport_request: inc.transport_request
        ? {
            ...inc.transport_request,
            id: inc.transport_request.id.toString(),
          }
        : null,
    }));

    return {
      incidents: formattedIncidents,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * AD-02: Cập nhật tiến trình xử lý sự cố qua máy trạng thái 4 bước:
   * NOT_RECEIVED -> RECEIVED -> PROCESSING -> RESOLVED
   * Nghiêm cấm nhảy cóc trạng thái và tự động gửi thông báo cho người báo cáo.
   */
  static async updateIncidentStatus(
    adminId: bigint,
    incidentId: bigint,
    rawInput: z.infer<typeof updateIncidentStatusSchema> | any
  ) {
    const input = updateIncidentStatusSchema.parse(rawInput);

    const incident = await prisma.incidentReport.findUnique({
      where: { id: incidentId },
      include: {
        reporter: {
          select: { id: true, full_name: true },
        },
      },
    });

    if (!incident) {
      throw new AppError(404, 'INCIDENT_NOT_FOUND', 'Không tìm thấy sự cố.');
    }

    if (incident.status === input.status) {
      return {
        message: 'Trạng thái không thay đổi',
        incident: {
          ...incident,
          id: incident.id.toString(),
          reporter_id: incident.reporter_id.toString(),
          handled_by: incident.handled_by?.toString() || null,
          trip_id: incident.trip_id?.toString() || null,
          request_id: incident.request_id?.toString() || null,
        },
      };
    }

    // Kiểm tra máy trạng thái tuần tự nghiêm ngặt (Không được nhảy cóc)
    const allowedTransitions: Record<incident_status, incident_status[]> = {
      NOT_RECEIVED: [incident_status.RECEIVED],
      RECEIVED: [incident_status.PROCESSING],
      PROCESSING: [incident_status.RESOLVED],
      RESOLVED: [],
    };

    const validNextStatuses = allowedTransitions[incident.status] || [];
    if (!validNextStatuses.includes(input.status)) {
      const statusLabels: Record<incident_status, string> = {
        NOT_RECEIVED: 'Chưa tiếp nhận',
        RECEIVED: 'Đã tiếp nhận',
        PROCESSING: 'Đang xử lý',
        RESOLVED: 'Đã giải quyết',
      };
      throw new AppError(
        400,
        'INVALID_STATUS_TRANSITION',
        `Quy trình xử lý sự cố phải tuân thủ tuần tự từng bước: Chưa tiếp nhận ➔ Đã tiếp nhận ➔ Đang xử lý ➔ Đã giải quyết. Không thể chuyển trực tiếp từ "${statusLabels[incident.status]}" sang "${statusLabels[input.status]}".`
      );
    }

    // Cập nhật trạng thái sự cố
    const updated = await prisma.incidentReport.update({
      where: { id: incidentId },
      data: {
        status: input.status,
        handled_by: adminId,
        result_note: input.result_note || incident.result_note,
        updated_at: new Date(),
      },
      include: {
        reporter: {
          select: { id: true, full_name: true, phone: true, email: true },
        },
        handler: {
          select: { id: true, full_name: true, phone: true, email: true },
        },
      },
    });

    // Nội dung thông báo tương ứng cho người gửi báo cáo
    let notificationText = '';
    if (input.status === incident_status.RECEIVED) {
      notificationText = `Báo cáo sự cố "${incident.title}" của bạn đã được Quản trị viên tiếp nhận vào hệ thống.`;
    } else if (input.status === incident_status.PROCESSING) {
      notificationText = `Báo cáo sự cố "${incident.title}" đang được Ban quản trị tích cực điều tra và xử lý.`;
    } else if (input.status === incident_status.RESOLVED) {
      notificationText = `Báo cáo sự cố "${incident.title}" đã được giải quyết hoàn tất.${
        input.result_note ? ` Kết quả xử lý: ${input.result_note}` : ''
      }`;
    }

    if (notificationText) {
      await prisma.notification.create({
        data: {
          user_id: incident.reporter_id,
          type: 'INCIDENT_UPDATE',
          content: notificationText,
          ref_type: 'INCIDENT',
          ref_id: incidentId,
        },
      });
    }

    return {
      message: 'Cập nhật trạng thái sự cố thành công',
      incident: {
        ...updated,
        id: updated.id.toString(),
        reporter_id: updated.reporter_id.toString(),
        handled_by: updated.handled_by?.toString() || null,
        trip_id: updated.trip_id?.toString() || null,
        request_id: updated.request_id?.toString() || null,
        reporter: {
          ...updated.reporter,
          id: updated.reporter.id.toString(),
        },
        handler: updated.handler
          ? {
              ...updated.handler,
              id: updated.handler.id.toString(),
            }
          : null,
      },
    };
  }

  /**
   * AD-03: Thống kê tổng quan vận hành hệ thống (Overview KPI & Biểu đồ theo ngày giờ VN)
   */
  static async getStatisticsOverview(rawQuery: z.infer<typeof statisticsQuerySchema> | any) {
    const query = statisticsQuerySchema.parse(rawQuery);

    const now = new Date();
    const fromDate = query.from_date
      ? parseVnDayStart(query.from_date)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 ngày trước
    const toDate = query.to_date ? parseVnDayEnd(query.to_date) : now;

    // 1. Thống kê Chuyến xe
    const [
      totalTrips,
      openTrips,
      closedTrips,
      inProgressTrips,
      completedTrips,
      cancelledTrips,
      tripsInRange,
    ] = await Promise.all([
      prisma.trip.count({ where: { departure_time: { gte: fromDate, lte: toDate } } }),
      prisma.trip.count({
        where: { status: trip_status.OPEN, departure_time: { gte: fromDate, lte: toDate } },
      }),
      prisma.trip.count({
        where: { status: trip_status.CLOSED, departure_time: { gte: fromDate, lte: toDate } },
      }),
      prisma.trip.count({
        where: { status: trip_status.IN_PROGRESS, departure_time: { gte: fromDate, lte: toDate } },
      }),
      prisma.trip.count({
        where: { status: trip_status.COMPLETED, departure_time: { gte: fromDate, lte: toDate } },
      }),
      prisma.trip.count({
        where: { status: trip_status.CANCELLED, departure_time: { gte: fromDate, lte: toDate } },
      }),
      prisma.trip.findMany({
        where: { departure_time: { gte: fromDate, lte: toDate } },
        select: {
          id: true,
          status: true,
          departure_time: true,
          seats_reserved: true,
          distance_km: true,
          estimated_fuel_cost: true,
        },
      }),
    ]);

    // 2. Thống kê Yêu cầu vận chuyển
    const [
      totalRequests,
      completedRequests,
      cancelledRequests,
      requestsWithFuel,
    ] = await Promise.all([
      prisma.transportRequest.count({
        where: { created_at: { gte: fromDate, lte: toDate } },
      }),
      prisma.transportRequest.count({
        where: {
          status: request_status.COMPLETED,
          created_at: { gte: fromDate, lte: toDate },
        },
      }),
      prisma.transportRequest.count({
        where: {
          status: request_status.CANCELLED,
          created_at: { gte: fromDate, lte: toDate },
        },
      }),
      prisma.transportRequest.findMany({
        where: {
          status: request_status.COMPLETED,
          shared_fuel_cost: { gt: 0 },
          created_at: { gte: fromDate, lte: toDate },
        },
        select: {
          shared_fuel_cost: true,
          passenger_count: true,
        },
      }),
    ]);

    // Tổng ước tính chi phí nhiên liệu tham khảo (giữ field tương thích ngược test)
    const totalSharedFuelCost = requestsWithFuel.reduce(
      (sum, r) => sum + (r.shared_fuel_cost || 0),
      0
    );

    // Tổng quãng đường kết nối thực tế (km) & Tổng số lượt hành khách đã phục vụ (chuyến COMPLETED)
    const completedTripRows = tripsInRange.filter((t) => t.status === trip_status.COMPLETED);
    const totalPassengersServed = completedTripRows.reduce(
      (sum, t) => sum + (t.seats_reserved || 0),
      0
    );
    const totalDistanceKm = Number(
      completedTripRows.reduce((sum, t) => sum + (t.distance_km || 0), 0).toFixed(1)
    );

    // Tỷ lệ hủy & Tỷ lệ hoàn thành chuyến hệ thống
    const systemCancelRate =
      totalTrips > 0 ? Number(((cancelledTrips / totalTrips) * 100).toFixed(1)) : 0;
    const systemCompletionRate =
      totalTrips > 0 ? Number(((completedTrips / totalTrips) * 100).toFixed(1)) : 0;

    // 3. Thống kê Sự cố
    const [
      totalIncidents,
      notReceivedIncidents,
      receivedIncidents,
      processingIncidents,
      resolvedIncidents,
    ] = await Promise.all([
      prisma.incidentReport.count({ where: { created_at: { gte: fromDate, lte: toDate } } }),
      prisma.incidentReport.count({
        where: { status: incident_status.NOT_RECEIVED, created_at: { gte: fromDate, lte: toDate } },
      }),
      prisma.incidentReport.count({
        where: { status: incident_status.RECEIVED, created_at: { gte: fromDate, lte: toDate } },
      }),
      prisma.incidentReport.count({
        where: { status: incident_status.PROCESSING, created_at: { gte: fromDate, lte: toDate } },
      }),
      prisma.incidentReport.count({
        where: { status: incident_status.RESOLVED, created_at: { gte: fromDate, lte: toDate } },
      }),
    ]);

    // 4. Nhóm số liệu theo từng ngày chuẩn múi giờ Việt Nam (UTC+7)
    const dailyMap: Record<
      string,
      {
        date: string;
        total: number;
        completed: number;
        cancelled: number;
        in_progress: number;
        passengers: number;
      }
    > = {};

    tripsInRange.forEach((t) => {
      const dayKey = formatVnDateKey(t.departure_time);
      if (!dailyMap[dayKey]) {
        dailyMap[dayKey] = {
          date: dayKey,
          total: 0,
          completed: 0,
          cancelled: 0,
          in_progress: 0,
          passengers: 0,
        };
      }
      dailyMap[dayKey].total += 1;
      if (t.status === trip_status.COMPLETED) {
        dailyMap[dayKey].completed += 1;
        dailyMap[dayKey].passengers += t.seats_reserved || 0;
      } else if (t.status === trip_status.CANCELLED) {
        dailyMap[dayKey].cancelled += 1;
      } else if (t.status === trip_status.IN_PROGRESS) {
        dailyMap[dayKey].in_progress += 1;
      }
    });

    const dailyBreakdown = Object.values(dailyMap).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    return {
      kpi: {
        trips: {
          total: totalTrips,
          open: openTrips,
          closed: closedTrips,
          in_progress: inProgressTrips,
          completed: completedTrips,
          cancelled: cancelledTrips,
          cancel_rate_percent: systemCancelRate,
          completion_rate_percent: systemCompletionRate,
        },
        requests: {
          total: totalRequests,
          completed: completedRequests,
          cancelled: cancelledRequests,
        },
        impact: {
          total_passengers_served: totalPassengersServed,
          total_distance_km: totalDistanceKm,
          total_shared_fuel_cost: totalSharedFuelCost,
        },
        incidents: {
          total: totalIncidents,
          not_received: notReceivedIncidents,
          received: receivedIncidents,
          processing: processingIncidents,
          resolved: resolvedIncidents,
        },
      },
      daily_breakdown: dailyBreakdown,
      date_range: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      },
    };
  }

  /**
   * AD-03: Lấy danh sách chuyến xe chi tiết theo ngày cụ thể (giờ Việt Nam UTC+7)
   */
  static async getTripsByDate(rawQuery: z.infer<typeof tripsByDateQuerySchema> | any) {
    const query = tripsByDateQuerySchema.parse(rawQuery);
    const skip = (query.page - 1) * query.limit;

    const where: any = {};

    if (query.date) {
      const startOfDay = parseVnDayStart(query.date);
      const endOfDay = parseVnDayEnd(query.date);
      where.departure_time = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    if (query.status) {
      where.status = query.status as trip_status;
    }

    const [total, trips] = await Promise.all([
      prisma.trip.count({ where }),
      prisma.trip.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { departure_time: 'desc' },
        include: {
          driver: {
            select: {
              id: true,
              full_name: true,
              phone: true,
              avatar_url: true,
            },
          },
          vehicle: {
            select: {
              id: true,
              brand_model: true,
              plate_number: true,
              fuel_type: true,
            },
          },
          _count: {
            select: {
              transport_requests: true,
              incident_reports: true,
            },
          },
        },
      }),
    ]);

    const formattedTrips = trips.map((t) => ({
      ...t,
      id: t.id.toString(),
      driver_id: t.driver_id.toString(),
      vehicle_id: t.vehicle_id.toString(),
      driver: {
        ...t.driver,
        id: t.driver.id.toString(),
      },
      vehicle: {
        ...t.vehicle,
        id: t.vehicle.id.toString(),
      },
    }));

    return {
      trips: formattedTrips,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * AD-02 / AD-03 (Nâng cao): Xem chi tiết toàn diện một chuyến xe (từ trang Quản lý sự cố hoặc Thống kê)
   */
  static async getTripDetail(tripId: bigint) {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        driver: {
          select: {
            id: true,
            full_name: true,
            phone: true,
            email: true,
            avatar_url: true,
            status: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            type: true,
            brand_model: true,
            plate_number: true,
            seat_count: true,
            cargo_area_m2: true,
            cargo_max_kg: true,
            fuel_type: true,
            fuel_consumption: true,
            photo_url: true,
          },
        },
        transport_requests: {
          orderBy: { created_at: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                full_name: true,
                phone: true,
                email: true,
                avatar_url: true,
              },
            },
            package_items: true,
          },
        },
        incident_reports: {
          orderBy: { created_at: 'desc' },
          include: {
            reporter: {
              select: {
                id: true,
                full_name: true,
                phone: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!trip) {
      throw new AppError(404, 'TRIP_NOT_FOUND', 'Không tìm thấy thông tin chuyến xe.');
    }

    return {
      ...trip,
      id: trip.id.toString(),
      driver_id: trip.driver_id.toString(),
      vehicle_id: trip.vehicle_id.toString(),
      driver: {
        ...trip.driver,
        id: trip.driver.id.toString(),
      },
      vehicle: {
        ...trip.vehicle,
        id: trip.vehicle.id.toString(),
      },
      transport_requests: trip.transport_requests.map((r) => ({
        ...r,
        id: r.id.toString(),
        trip_id: r.trip_id.toString(),
        user_id: r.user_id.toString(),
        user: {
          ...r.user,
          id: r.user.id.toString(),
        },
        package_items: r.package_items.map((p) => ({
          ...p,
          id: p.id.toString(),
          request_id: p.request_id.toString(),
        })),
      })),
      incident_reports: trip.incident_reports.map((inc) => ({
        ...inc,
        id: inc.id.toString(),
        reporter_id: inc.reporter_id.toString(),
        handled_by: inc.handled_by?.toString() || null,
        trip_id: inc.trip_id?.toString() || null,
        request_id: inc.request_id?.toString() || null,
        reporter: {
          ...inc.reporter,
          id: inc.reporter.id.toString(),
        },
      })),
    };
  }

  /**
   * Dashboard Tổng quan Quản trị viên (100% dữ liệu thực tế, không hiển thị tiền tệ)
   */
  static async getDashboard() {
    const now = new Date();
    const from14Days = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalCustomers,
      totalDrivers,
      lockedAccounts,
      totalTrips,
      activeTrips,
      completedTrips,
      cancelledTrips,
      completedDistanceAgg,
      totalIncidents,
      notReceivedIncidents,
      receivedIncidents,
      processingIncidents,
      resolvedIncidents,
      tripsLast14Days,
      pendingIncidents,
      recentAuditLogs,
      recentTrips,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: user_role.USER } }),
      prisma.user.count({ where: { role: user_role.DRIVER } }),
      prisma.user.count({
        where: { status: { in: [account_status.LOCKED_TEMP, account_status.LOCKED_PERM] } },
      }),
      prisma.trip.count(),
      prisma.trip.count({
        where: { status: { in: [trip_status.OPEN, trip_status.CLOSED, trip_status.IN_PROGRESS] } },
      }),
      prisma.trip.count({ where: { status: trip_status.COMPLETED } }),
      prisma.trip.count({ where: { status: trip_status.CANCELLED } }),
      prisma.trip.aggregate({
        where: { status: trip_status.COMPLETED },
        _sum: { distance_km: true },
      }),
      prisma.incidentReport.count(),
      prisma.incidentReport.count({ where: { status: incident_status.NOT_RECEIVED } }),
      prisma.incidentReport.count({ where: { status: incident_status.RECEIVED } }),
      prisma.incidentReport.count({ where: { status: incident_status.PROCESSING } }),
      prisma.incidentReport.count({ where: { status: incident_status.RESOLVED } }),
      prisma.trip.findMany({
        where: { departure_time: { gte: from14Days, lte: now } },
        select: {
          status: true,
          departure_time: true,
          seats_reserved: true,
        },
      }),
      prisma.incidentReport.findMany({
        where: {
          status: {
            in: [incident_status.NOT_RECEIVED, incident_status.RECEIVED, incident_status.PROCESSING],
          },
        },
        orderBy: { created_at: 'desc' },
        take: 5,
        include: {
          reporter: {
            select: { id: true, full_name: true, role: true },
          },
          trip: {
            select: { id: true, code: true },
          },
        },
      }),
      prisma.auditLog.findMany({
        orderBy: { created_at: 'desc' },
        take: 5,
        include: {
          actor: { select: { id: true, full_name: true, role: true } },
        },
      }),
      prisma.trip.findMany({
        orderBy: { created_at: 'desc' },
        take: 5,
        select: {
          id: true,
          code: true,
          origin_name: true,
          dest_name: true,
          status: true,
          created_at: true,
          driver: { select: { full_name: true } },
        },
      }),
    ]);

    // Biểu đồ 14 ngày gần nhất (luôn đủ 14 cột theo ngày giờ VN)
    const dailyMap: Record<
      string,
      { date: string; total: number; completed: number; cancelled: number; in_progress: number; passengers: number }
    > = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = formatVnDateKey(d);
      dailyMap[key] = { date: key, total: 0, completed: 0, cancelled: 0, in_progress: 0, passengers: 0 };
    }
    for (const t of tripsLast14Days) {
      const key = formatVnDateKey(t.departure_time);
      if (dailyMap[key]) {
        dailyMap[key].total += 1;
        if (t.status === trip_status.COMPLETED) {
          dailyMap[key].completed += 1;
          dailyMap[key].passengers += t.seats_reserved || 0;
        } else if (t.status === trip_status.CANCELLED) {
          dailyMap[key].cancelled += 1;
        } else if (t.status === trip_status.IN_PROGRESS) {
          dailyMap[key].in_progress += 1;
        }
      }
    }

    // Tổng hợp dòng thời gian hoạt động gần đây (từ dữ liệu thật)
    type ActivityItem = {
      id: string;
      type: 'AUDIT' | 'TRIP' | 'INCIDENT';
      title: string;
      description: string;
      created_at: string;
    };

    const activities: ActivityItem[] = [];
    for (const log of recentAuditLogs) {
      const actionText =
        log.action === 'LOCK_ACCOUNT'
          ? 'Khóa tài khoản'
          : log.action === 'UNLOCK_ACCOUNT'
          ? 'Mở khóa tài khoản'
          : log.action;
      activities.push({
        id: `audit-${log.id.toString()}`,
        type: 'AUDIT',
        title: `${actionText} (#${log.target_id?.toString() || ''})`,
        description: log.reason || `Thực hiện bởi ${log.actor?.full_name || 'Hệ thống'}`,
        created_at: log.created_at.toISOString(),
      });
    }
    for (const trip of recentTrips) {
      activities.push({
        id: `trip-${trip.id.toString()}`,
        type: 'TRIP',
        title: `Chuyến ${trip.code} • ${trip.driver.full_name}`,
        description: `${trip.origin_name} ➔ ${trip.dest_name}`,
        created_at: trip.created_at.toISOString(),
      });
    }
    for (const inc of pendingIncidents) {
      activities.push({
        id: `inc-${inc.id.toString()}`,
        type: 'INCIDENT',
        title: `Sự cố #${inc.id.toString()}: ${inc.title}`,
        description: `Gửi bởi ${inc.reporter.full_name}${inc.trip ? ` • Chuyến ${inc.trip.code}` : ''}`,
        created_at: inc.created_at.toISOString(),
      });
    }

    activities.sort((a, b) => b.created_at.localeCompare(a.created_at));

    const completionRate =
      totalTrips > 0 ? Number(((completedTrips / totalTrips) * 100).toFixed(1)) : 0;

    return {
      kpi: {
        users: {
          total: totalUsers,
          customers: totalCustomers,
          drivers: totalDrivers,
          locked: lockedAccounts,
        },
        trips: {
          total: totalTrips,
          active: activeTrips,
          completed: completedTrips,
          cancelled: cancelledTrips,
          completion_rate_percent: completionRate,
          total_distance_km: Number((completedDistanceAgg._sum.distance_km || 0).toFixed(1)),
        },
        incidents: {
          total: totalIncidents,
          pending: notReceivedIncidents + receivedIncidents + processingIncidents,
          not_received: notReceivedIncidents,
          received: receivedIncidents,
          processing: processingIncidents,
          resolved: resolvedIncidents,
        },
      },
      daily_breakdown: Object.values(dailyMap),
      pending_incidents: pendingIncidents.map((inc) => ({
        id: inc.id.toString(),
        title: inc.title,
        status: inc.status,
        created_at: inc.created_at.toISOString(),
        reporter: {
          id: inc.reporter.id.toString(),
          full_name: inc.reporter.full_name,
          role: inc.reporter.role,
        },
        trip: inc.trip ? { id: inc.trip.id.toString(), code: inc.trip.code } : null,
      })),
      recent_activities: activities.slice(0, 8),
    };
  }
}
