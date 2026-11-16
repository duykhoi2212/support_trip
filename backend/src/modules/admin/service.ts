import { prisma } from '../../utils/prisma.js';
import {
  user_role,
  account_status,
  incident_status,
  trip_status,
  request_status,
} from '@prisma/client';
import {
  unlockUserSchema,
  updateIncidentStatusSchema,
  listUsersQuerySchema,
  listIncidentsQuerySchema,
  statisticsQuerySchema,
  tripsByDateQuerySchema,
} from './schema.js';
import { z } from 'zod';

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
      throw new Error('Không tìm thấy tài khoản người dùng.');
    }

    if (user.status === account_status.ACTIVE) {
      throw new Error('Tài khoản hiện đang ở trạng thái Hoạt động (ACTIVE), không cần mở khóa.');
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
   * AD-02: Lấy danh sách toàn bộ sự cố trong hệ thống
   */
  static async getIncidents(rawQuery: z.infer<typeof listIncidentsQuerySchema> | any) {
    const query = listIncidentsQuerySchema.parse(rawQuery);
    const skip = (query.page - 1) * query.limit;

    const where: any = {};
    if (query.status) {
      where.status = query.status;
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
      throw new Error('Không tìm thấy sự cố.');
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
      throw new Error(
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
   * AD-03: Thống kê tổng quan vận hành hệ thống (Overview KPI & Biểu đồ theo ngày)
   */
  static async getStatisticsOverview(rawQuery: z.infer<typeof statisticsQuerySchema> | any) {
    const query = statisticsQuerySchema.parse(rawQuery);

    const now = new Date();
    const fromDate = query.from_date
      ? new Date(query.from_date)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 ngày trước
    const toDate = query.to_date ? new Date(query.to_date) : now;

    // 1. Thống kê Chuyến xe
    const [
      totalTrips,
      openTrips,
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

    // Tổng số tiền nhiên liệu/sạc đã chia sẻ
    const totalSharedFuelCost = requestsWithFuel.reduce(
      (sum, r) => sum + (r.shared_fuel_cost || 0),
      0
    );

    // Tổng số lượt hành khách đã phục vụ (từ các chuyến COMPLETED)
    const totalPassengersServed = tripsInRange
      .filter((t) => t.status === trip_status.COMPLETED)
      .reduce((sum, t) => sum + (t.seats_reserved || 0), 0);

    // Tỷ lệ hủy chuyến hệ thống
    const systemCancelRate =
      totalTrips > 0 ? Number(((cancelledTrips / totalTrips) * 100).toFixed(1)) : 0;

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

    // 4. Nhóm số liệu theo từng ngày cho biểu đồ trực quan
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
      const dayKey = t.departure_time.toISOString().split('T')[0];
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
          in_progress: inProgressTrips,
          completed: completedTrips,
          cancelled: cancelledTrips,
          cancel_rate_percent: systemCancelRate,
        },
        requests: {
          total: totalRequests,
          completed: completedRequests,
          cancelled: cancelledRequests,
        },
        impact: {
          total_passengers_served: totalPassengersServed,
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
   * AD-03: Lấy danh sách chuyến xe chi tiết theo ngày cụ thể kèm bộ lọc trạng thái
   */
  static async getTripsByDate(rawQuery: z.infer<typeof tripsByDateQuerySchema> | any) {
    const query = tripsByDateQuerySchema.parse(rawQuery);
    const skip = (query.page - 1) * query.limit;

    const where: any = {};

    if (query.date) {
      const startOfDay = new Date(`${query.date}T00:00:00.000Z`);
      const endOfDay = new Date(`${query.date}T23:59:59.999Z`);
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
}
