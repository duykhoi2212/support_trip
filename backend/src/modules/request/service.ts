import {
  request_type,
  request_status,
  ride_progress,
  package_status,
  trip_status,
  actor_type,
  fail_reason_code,
  incident_status,
} from '@prisma/client';
import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { isWithinRouteDistance } from '../../utils/distance.js';
import { NotificationService } from '../notification/service.js';
import {
  createRideRequestSchema,
  createPackageRequestSchema,
  rejectRequestSchema,
  cancelRequestSchema,
  updateProgressSchema,
  reportIssueSchema,
} from './schema.js';
import { z } from 'zod';
import { calculateWeeklyCancellationRate } from '../../utils/cancellation.js';
import { getCurrentWeekRangeVN } from '../scheduler/service.js';

export class RequestService {
  /**
   * Sinh mã ngẫu nhiên dạng REQ-XXXXXX
   */
  private static async generateRequestCode(): Promise<string> {
    let code = '';
    let isUnique = false;
    while (!isUnique) {
      code = 'REQ-' + Math.floor(100000 + Math.random() * 900000);
      const existing = await prisma.transportRequest.findUnique({ where: { code } });
      if (!existing) isUnique = true;
    }
    return code;
  }

  /**
   * US-01: Tạo yêu cầu đi nhờ xe (RIDE)
   */
  static async createRideRequest(userId: bigint, input: z.infer<typeof createRideRequestSchema>) {
    const tripId = BigInt(input.trip_id);

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { driver: true },
    });

    if (!trip) {
      throw new AppError(404, 'TRIP_NOT_FOUND', 'Chuyến xe không tồn tại.');
    }

    if (trip.status !== trip_status.OPEN) {
      throw new AppError(
        400,
        'TRIP_NOT_OPEN',
        'Chuyến xe hiện không ở trạng thái mở nhận yêu cầu (OPEN).'
      );
    }

    if (trip.driver_id === userId) {
      throw new AppError(400, 'SELF_BOOKING_NOT_ALLOWED', 'Tài xế không thể tự đặt chỗ trên chuyến xe của chính mình.');
    }

    // 1. Kiểm tra sức chứa ghế ngồi còn trống
    const availableSeats = trip.seats_total - trip.seats_reserved;
    if (availableSeats < input.passenger_count) {
      throw new AppError(
        400,
        'SEATS_NOT_AVAILABLE',
        `Chuyến xe chỉ còn ${availableSeats} ghế trống, không đủ cho ${input.passenger_count} hành khách.`
      );
    }

    // 3. Kiểm tra ràng buộc duy nhất: Một người dùng chỉ có tối đa 1 yêu cầu PENDING hoặc ACCEPTED
    const existingActive = await prisma.transportRequest.findFirst({
      where: {
        trip_id: tripId,
        user_id: userId,
        status: { in: [request_status.PENDING, request_status.ACCEPTED] },
      },
    });

    if (existingActive) {
      throw new AppError(
        409,
        'DUPLICATE_ACTIVE_REQUEST',
        `Bạn đã có một yêu cầu (${existingActive.code}) đang chờ duyệt hoặc đã được chấp nhận trên chuyến xe này.`
      );
    }

    // 4. Tạo yêu cầu
    const code = await this.generateRequestCode();
    const request = await prisma.transportRequest.create({
      data: {
        code,
        trip_id: tripId,
        user_id: userId,
        type: request_type.RIDE,
        pickup_name: input.pickup_name || trip.origin_name,
        pickup_lat: input.pickup_lat ?? trip.origin_lat,
        pickup_lng: input.pickup_lng ?? trip.origin_lng,
        dropoff_name: input.dropoff_name || trip.dest_name,
        dropoff_lat: input.dropoff_lat ?? trip.dest_lat,
        dropoff_lng: input.dropoff_lng ?? trip.dest_lng,
        passenger_count: input.passenger_count,
        ride_progress: ride_progress.NOT_PICKED_UP,
        status: request_status.PENDING,
      },
      include: {
        user: { select: { id: true, full_name: true, avatar_url: true } },
      },
    });

    // 5. Gửi thông báo cho tài xế
    await NotificationService.createNotification({
      userId: trip.driver_id,
      type: 'NEW_REQUEST',
      content: `Hành khách ${request.user.full_name} vừa gửi yêu cầu đi nhờ (${input.passenger_count} người) trên chuyến ${trip.code}.`,
      refType: 'TRIP',
      refId: trip.id,
    });

    return {
      ...request,
      id: request.id.toString(),
      trip_id: request.trip_id.toString(),
      user_id: request.user_id.toString(),
    };
  }

  /**
   * US-01: Tạo yêu cầu gửi hàng (PACKAGE)
   */
  static async createPackageRequest(userId: bigint, input: z.infer<typeof createPackageRequestSchema>) {
    const tripId = BigInt(input.trip_id);

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { driver: true },
    });

    if (!trip) {
      throw new AppError(404, 'TRIP_NOT_FOUND', 'Chuyến xe không tồn tại.');
    }

    if (trip.status !== trip_status.OPEN) {
      throw new AppError(400, 'TRIP_NOT_OPEN', 'Chuyến xe hiện không ở trạng thái mở nhận yêu cầu (OPEN).');
    }

    if (trip.driver_id === userId) {
      throw new AppError(400, 'SELF_BOOKING_NOT_ALLOWED', 'Tài xế không thể tự gửi hàng trên chuyến xe của chính mình.');
    }

    // 1. Tính diện tích chiếm dụng m2 = (dài * rộng) / 10000
    const areaM2 = Math.round(((input.length_cm * input.width_cm) / 10000) * 1000) / 1000;

    // 3. Kiểm tra sức chứa cốp xe
    const availableArea = trip.cargo_area_total_m2 - trip.cargo_area_reserved_m2;
    if (availableArea < areaM2) {
      throw new AppError(
        400,
        'CARGO_AREA_EXCEEDED',
        `Cốp xe chỉ còn trống ${availableArea.toFixed(2)} m², không đủ cho kiện hàng (${areaM2.toFixed(2)} m²).`
      );
    }

    const availableWeight = trip.cargo_weight_total_kg - trip.cargo_weight_reserved_kg;
    if (availableWeight < input.weight_kg) {
      throw new AppError(
        400,
        'CARGO_WEIGHT_EXCEEDED',
        `Tải trọng xe chỉ còn ${availableWeight.toFixed(1)} kg, không đủ cho kiện hàng (${input.weight_kg} kg).`
      );
    }

    // 4. Kiểm tra ràng buộc duy nhất: Một người dùng chỉ có 1 yêu cầu active
    const existingActive = await prisma.transportRequest.findFirst({
      where: {
        trip_id: tripId,
        user_id: userId,
        status: { in: [request_status.PENDING, request_status.ACCEPTED] },
      },
    });

    if (existingActive) {
      throw new AppError(
        409,
        'DUPLICATE_ACTIVE_REQUEST',
        `Bạn đã có một yêu cầu (${existingActive.code}) đang chờ duyệt hoặc đã được chấp nhận trên chuyến xe này.`
      );
    }

    // 5. Tạo yêu cầu và bản ghi kiện hàng trong Transaction
    const code = await this.generateRequestCode();

    const request = await prisma.$transaction(async (tx) => {
      const req = await tx.transportRequest.create({
        data: {
          code,
          trip_id: tripId,
          user_id: userId,
          type: request_type.PACKAGE,
          pickup_name: input.pickup_name || trip.origin_name,
          pickup_lat: input.pickup_lat ?? trip.origin_lat,
          pickup_lng: input.pickup_lng ?? trip.origin_lng,
          dropoff_name: input.dropoff_name || trip.dest_name,
          dropoff_lat: input.dropoff_lat ?? trip.dest_lat,
          dropoff_lng: input.dropoff_lng ?? trip.dest_lng,
          status: request_status.PENDING,
        },
        include: {
          user: { select: { id: true, full_name: true, avatar_url: true } },
        },
      });

      await tx.packageItem.create({
        data: {
          request_id: req.id,
          description: input.description,
          category: input.category,
          photo_url: input.photo_url,
          weight_kg: input.weight_kg,
          area_m2: areaM2,
          recipient_name: input.recipient_name,
          recipient_phone: input.recipient_phone,
          status: package_status.AWAITING_PICKUP,
        },
      });

      return req;
    });

    // 6. Gửi thông báo cho tài xế
    await NotificationService.createNotification({
      userId: trip.driver_id,
      type: 'NEW_REQUEST',
      content: `Khách hàng ${request.user.full_name} vừa gửi yêu cầu gửi hàng (${input.description}) trên chuyến ${trip.code}.`,
      refType: 'TRIP',
      refId: trip.id,
    });

    return {
      ...request,
      id: request.id.toString(),
      trip_id: request.trip_id.toString(),
      user_id: request.user_id.toString(),
    };
  }

  /**
   * DR-02: Tài xế xem danh sách yêu cầu trên chuyến xe
   * Bảo mật: Chỉ hiện số điện thoại khách khi trạng thái là ACCEPTED!
   */
  static async getTripRequests(driverId: bigint, tripId: bigint) {
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, driver_id: driverId },
    });

    if (!trip) {
      throw new AppError(404, 'TRIP_NOT_FOUND', 'Chuyến xe không tồn tại hoặc không thuộc sở hữu của bạn.');
    }

    const requests = await prisma.transportRequest.findMany({
      where: { trip_id: tripId },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true,
            phone: true,
          },
        },
        package_items: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return requests.map((req) => {
      const isAccepted = req.status === request_status.ACCEPTED;
      return {
        ...req,
        id: req.id.toString(),
        trip_id: req.trip_id.toString(),
        user_id: req.user_id.toString(),
        user: {
          ...req.user,
          id: req.user.id.toString(),
          // Quy tắc bảo mật: Chỉ khi ACCEPTED mới được xem SĐT khách
          phone: isAccepted ? req.user.phone : undefined,
        },
        package_items: req.package_items.map((pkg) => ({
          ...pkg,
          id: pkg.id.toString(),
          request_id: pkg.request_id.toString(),
        })),
      };
    });
  }

  /**
   * US-03: Người dùng xem danh sách yêu cầu của tôi
   * Bảo mật: Chỉ hiện số điện thoại tài xế khi trạng thái là ACCEPTED!
   */
  static async getMyRequests(userId: bigint) {
    const requests = await prisma.transportRequest.findMany({
      where: { user_id: userId },
      include: {
        trip: {
          include: {
            driver: {
              select: {
                id: true,
                full_name: true,
                avatar_url: true,
                phone: true,
              },
            },
            vehicle: true,
          },
        },
        package_items: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return requests.map((req) => {
      const isAccepted = req.status === request_status.ACCEPTED;
      const trip = req.trip;
      return {
        ...req,
        id: req.id.toString(),
        trip_id: req.trip_id.toString(),
        user_id: req.user_id.toString(),
        trip: {
          ...trip,
          id: trip.id.toString(),
          driver_id: trip.driver_id.toString(),
          vehicle_id: trip.vehicle_id.toString(),
          driver: {
            ...trip.driver,
            id: trip.driver.id.toString(),
            // Quy tắc bảo mật: Chỉ khi ACCEPTED mới được xem SĐT tài xế
            phone: isAccepted ? trip.driver.phone : undefined,
          },
          vehicle: trip.vehicle
            ? {
                ...trip.vehicle,
                id: trip.vehicle.id.toString(),
                driver_id: trip.vehicle.driver_id.toString(),
              }
            : undefined,
        },
        package_items: req.package_items.map((pkg) => ({
          ...pkg,
          id: pkg.id.toString(),
          request_id: pkg.request_id.toString(),
        })),
      };
    });
  }

  /**
   * DR-02: Tài xế Chấp nhận yêu cầu (Khóa nguyên tử sức chứa)
   */
  static async acceptRequest(driverId: bigint, requestId: bigint) {
    return prisma.$transaction(async (tx) => {
      const request = await tx.transportRequest.findUnique({
        where: { id: requestId },
        include: {
          trip: { include: { driver: true } },
          package_items: true,
        },
      });

      if (!request) {
        throw new AppError(404, 'REQUEST_NOT_FOUND', 'Yêu cầu không tồn tại.');
      }

      if (request.trip.driver_id !== driverId) {
        throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền duyệt yêu cầu trên chuyến xe này.');
      }

      if (request.status !== request_status.PENDING) {
        throw new AppError(400, 'INVALID_REQUEST_STATUS', 'Chỉ có thể chấp nhận yêu cầu đang ở trạng thái chờ duyệt (PENDING).');
      }

      const trip = request.trip;
      if (trip.status !== trip_status.OPEN && trip.status !== trip_status.CLOSED) {
        throw new AppError(400, 'TRIP_CANNOT_ACCEPT', 'Chuyến xe đã khởi hành hoặc đã kết thúc, không thể nhận thêm yêu cầu.');
      }

      // Kiểm tra sức chứa nguyên tử
      if (request.type === request_type.RIDE) {
        const seatsNeeded = request.passenger_count || 1;
        if (trip.seats_reserved + seatsNeeded > trip.seats_total) {
          throw new AppError(
            400,
            'SEATS_FULL',
            `Không đủ ghế ngồi. Còn ${trip.seats_total - trip.seats_reserved} ghế, yêu cầu ${seatsNeeded} ghế.`
          );
        }

        await tx.trip.update({
          where: { id: trip.id },
          data: { seats_reserved: { increment: seatsNeeded } },
        });
      } else {
        const totalArea = request.package_items.reduce((s, p) => s + p.area_m2, 0);
        const totalWeight = request.package_items.reduce((s, p) => s + p.weight_kg, 0);

        if (trip.cargo_area_reserved_m2 + totalArea > trip.cargo_area_total_m2) {
          throw new AppError(400, 'CARGO_AREA_FULL', 'Diện tích cốp xe không đủ để nhận thêm kiện hàng này.');
        }

        if (trip.cargo_weight_reserved_kg + totalWeight > trip.cargo_weight_total_kg) {
          throw new AppError(400, 'CARGO_WEIGHT_FULL', 'Tải trọng xe không đủ để nhận thêm kiện hàng này.');
        }

        await tx.trip.update({
          where: { id: trip.id },
          data: {
            cargo_area_reserved_m2: { increment: totalArea },
            cargo_weight_reserved_kg: { increment: totalWeight },
          },
        });
      }

      // Cập nhật trạng thái yêu cầu
      const updated = await tx.transportRequest.update({
        where: { id: requestId },
        data: {
          status: request_status.ACCEPTED,
          decided_at: new Date(),
        },
      });

      // Thông báo cho hành khách kèm SĐT của tài xế
      await NotificationService.createNotification({
        userId: request.user_id,
        type: 'REQUEST_ACCEPTED',
        content: `Yêu cầu ${request.code} đã được tài xế chấp nhận! Liên hệ tài xế qua SĐT: ${trip.driver.phone}.`,
        refType: 'TRIP',
        refId: trip.id,
      });

      return {
        ...updated,
        id: updated.id.toString(),
        trip_id: updated.trip_id.toString(),
        user_id: updated.user_id.toString(),
      };
    });
  }

  /**
   * DR-02: Tài xế Từ chối yêu cầu
   */
  static async rejectRequest(driverId: bigint, requestId: bigint, input: z.infer<typeof rejectRequestSchema>) {
    const request = await prisma.transportRequest.findUnique({
      where: { id: requestId },
      include: { trip: true },
    });

    if (!request) {
      throw new AppError(404, 'REQUEST_NOT_FOUND', 'Yêu cầu không tồn tại.');
    }

    if (request.trip.driver_id !== driverId) {
      throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền từ chối yêu cầu này.');
    }

    if (request.status !== request_status.PENDING) {
      throw new AppError(400, 'INVALID_REQUEST_STATUS', 'Chỉ có thể từ chối yêu cầu đang chờ duyệt (PENDING).');
    }

    const updated = await prisma.transportRequest.update({
      where: { id: requestId },
      data: {
        status: request_status.REJECTED,
        reject_reason: input.reject_reason,
        decided_at: new Date(),
      },
    });

    // Thông báo cho người dùng
    await NotificationService.createNotification({
      userId: request.user_id,
      type: 'REQUEST_REJECTED',
      content: `Yêu cầu ${request.code} đã bị từ chối với lý do: ${input.reject_reason}`,
      refType: 'TRIP',
      refId: request.trip_id,
    });

    return {
      ...updated,
      id: updated.id.toString(),
      trip_id: updated.trip_id.toString(),
      user_id: updated.user_id.toString(),
    };
  }

  /**
   * US-03: Người dùng hủy yêu cầu
   * Nếu đã ACCEPTED: Hoàn trả lại sức chứa xe nguyên tử
   */
  static async cancelRequest(userId: bigint, requestId: bigint, input: z.infer<typeof cancelRequestSchema>) {
    return prisma.$transaction(async (tx) => {
      const request = await tx.transportRequest.findUnique({
        where: { id: requestId },
        include: {
          trip: true,
          package_items: true,
        },
      });

      if (!request) {
        throw new AppError(404, 'REQUEST_NOT_FOUND', 'Yêu cầu không tồn tại.');
      }

      if (request.user_id !== userId) {
        throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền hủy yêu cầu này.');
      }

      if (request.status !== request_status.PENDING && request.status !== request_status.ACCEPTED) {
        throw new AppError(
          400,
          'INVALID_REQUEST_STATUS',
          'Chỉ có thể hủy yêu cầu đang ở trạng thái chờ duyệt (PENDING) hoặc đã chấp nhận (ACCEPTED).'
        );
      }

      const trip = request.trip;
      if (trip.status === trip_status.IN_PROGRESS || trip.status === trip_status.COMPLETED) {
        throw new AppError(400, 'TRIP_ALREADY_STARTED', 'Chuyến xe đã khởi hành hoặc đã kết thúc, bạn không thể hủy yêu cầu.');
      }

      const wasAccepted = request.status === request_status.ACCEPTED;

      // Hoàn trả sức chứa xe nếu yêu cầu đã từng được chấp nhận
      if (wasAccepted) {
        if (request.type === request_type.RIDE) {
          const seats = request.passenger_count || 1;
          await tx.trip.update({
            where: { id: trip.id },
            data: { seats_reserved: { decrement: seats } },
          });
        } else {
          const totalArea = request.package_items.reduce((s, p) => s + p.area_m2, 0);
          const totalWeight = request.package_items.reduce((s, p) => s + p.weight_kg, 0);
          await tx.trip.update({
            where: { id: trip.id },
            data: {
              cargo_area_reserved_m2: { decrement: totalArea },
              cargo_weight_reserved_kg: { decrement: totalWeight },
            },
          });
        }
      }

      const updated = await tx.transportRequest.update({
        where: { id: requestId },
        data: {
          status: request_status.CANCELLED,
          cancel_reason: input.cancel_reason,
          cancelled_by: actor_type.USER,
          counts_toward_cancel_rate: wasAccepted,
        },
      });

      // Thông báo cho tài xế
      await NotificationService.createNotification({
        userId: trip.driver_id,
        type: 'REQUEST_CANCELLED',
        content: `Khách hàng đã hủy yêu cầu ${request.code} trên chuyến ${trip.code}. Lý do: ${input.cancel_reason}`,
        refType: 'TRIP',
        refId: trip.id,
      });

      return {
        ...updated,
        id: updated.id.toString(),
        trip_id: updated.trip_id.toString(),
        user_id: updated.user_id.toString(),
      };
    });
  }

  /**
   * Tính toán và cập nhật lại chi phí nhiên liệu/sạc chia sẻ cho các yêu cầu còn lại trên chuyến xe
   */
  static async recalculateFuelCost(tx: any, tripId: bigint) {
    const trip = await tx.trip.findUnique({
      where: { id: tripId },
      include: { vehicle: true },
    });

    if (!trip || !trip.estimated_fuel_cost || trip.estimated_fuel_cost <= 0) return;

    // Lấy các yêu cầu hợp lệ đang tham gia chuyến (ACCEPTED hoặc COMPLETED, không FAILED/CANCELLED)
    const validRequests = await tx.transportRequest.findMany({
      where: {
        trip_id: tripId,
        status: { in: [request_status.ACCEPTED, request_status.COMPLETED] },
      },
    });

    const totalUnits = validRequests.reduce((sum: number, req: any) => {
      const units = req.type === request_type.RIDE ? (req.passenger_count || 1) : 1;
      return sum + units;
    }, 0);

    const costPerUnit = totalUnits > 0 ? Math.round(trip.estimated_fuel_cost / totalUnits) : 0;

    for (const req of validRequests) {
      const units = req.type === request_type.RIDE ? (req.passenger_count || 1) : 1;
      await tx.transportRequest.update({
        where: { id: req.id },
        data: { shared_fuel_cost: costPerUnit * units },
      });
    }

    return { totalUnits, costPerUnit };
  }

  /**
   * DR-03: Tài xế bắt đầu chuyến xe (Chuyển sang IN_PROGRESS)
   * Ràng buộc: Tất cả yêu cầu ACCEPTED phải được tài xế xác nhận đón (PICKED_UP) hoặc báo vắng (FAILED)
   */
  static async startTrip(driverId: bigint, tripId: bigint) {
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, driver_id: driverId },
      include: { vehicle: true },
    });

    if (!trip) {
      throw new AppError(404, 'TRIP_NOT_FOUND', 'Chuyến xe không tồn tại hoặc không thuộc sở hữu của bạn.');
    }

    if (trip.status !== trip_status.OPEN && trip.status !== trip_status.CLOSED) {
      throw new AppError(400, 'INVALID_TRIP_STATUS', 'Chỉ có thể bắt đầu chuyến xe ở trạng thái OPEN hoặc CLOSED.');
    }

    // 1. Lấy danh sách tất cả yêu cầu đã được ACCEPTED trên chuyến xe
    const acceptedRequests = await prisma.transportRequest.findMany({
      where: { trip_id: tripId, status: request_status.ACCEPTED },
      include: { package_items: true },
    });

    // 2. Ràng buộc: Yêu cầu tài xế phải đón hoặc báo sự cố cho tất cả các khách trước khi xe lăn bánh
    const unconfirmedRequests = acceptedRequests.filter((req) => {
      if (req.type === request_type.RIDE) {
        return req.ride_progress !== ride_progress.PICKED_UP;
      } else {
        return req.package_items.some((item) => item.status !== package_status.PICKED_UP);
      }
    });

    if (unconfirmedRequests.length > 0) {
      throw new AppError(
        400,
        'UNCONFIRMED_REQUESTS',
        `Vui lòng xác nhận đón hoặc báo sự cố vắng mặt cho tất cả ${acceptedRequests.length} yêu cầu trước khi bắt đầu hành trình. Còn ${unconfirmedRequests.length} yêu cầu chưa được xác nhận.`
      );
    }

    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: {
        status: trip_status.IN_PROGRESS,
        started_at: new Date(),
      },
    });

    // 3. Tính toán chốt chi phí nhiên liệu/sạc cho các khách thực tế có mặt trên xe
    const totalParticipantUnits = acceptedRequests.reduce((sum, req) => {
      const units = req.type === request_type.RIDE ? (req.passenger_count || 1) : 1;
      return sum + units;
    }, 0);

    let costPerUnit = 0;

    if (totalParticipantUnits > 0 && trip.estimated_fuel_cost && trip.estimated_fuel_cost > 0) {
      costPerUnit = Math.round(trip.estimated_fuel_cost / totalParticipantUnits);

      for (const req of acceptedRequests) {
        const units = req.type === request_type.RIDE ? (req.passenger_count || 1) : 1;
        const reqFuelCost = costPerUnit * units;
        await prisma.transportRequest.update({
          where: { id: req.id },
          data: { shared_fuel_cost: reqFuelCost },
        });
      }
    }

    const isElectric = trip.vehicle?.fuel_type === 'ELECTRIC';
    const fuelLabel = isElectric ? 'sạc điện' : 'nhiên liệu';

    for (const req of acceptedRequests) {
      const units = req.type === request_type.RIDE ? (req.passenger_count || 1) : 1;
      const reqFuelCost = costPerUnit * units;
      const costMsg =
        reqFuelCost > 0
          ? ` Chi phí ${fuelLabel} chia sẻ của bạn (${units} suất tham gia) là: ${reqFuelCost.toLocaleString('vi-VN')} đ (tự nguyện gửi tài xế khi đến nơi).`
          : '';

      await NotificationService.createNotification({
        userId: req.user_id,
        type: 'TRIP_STARTED',
        content: `Chuyến xe ${trip.code} đã chính thức khởi hành!${costMsg} Chúc bạn một chuyến đi an toàn.`,
        refType: 'TRIP',
        refId: trip.id,
      });
    }

    if (totalParticipantUnits > 0 && costPerUnit > 0) {
      await NotificationService.createNotification({
        userId: driverId,
        type: 'TRIP_STARTED',
        content: `Chuyến xe ${trip.code} đã bắt đầu! Đã chốt chi phí ${fuelLabel} chia sẻ: ${costPerUnit.toLocaleString('vi-VN')} đ/người (Tổng ${totalParticipantUnits} người/suất tham gia thực tế từ ${acceptedRequests.length} yêu cầu).`,
        refType: 'TRIP',
        refId: trip.id,
      });
    }

    return {
      ...updatedTrip,
      id: updatedTrip.id.toString(),
      driver_id: updatedTrip.driver_id.toString(),
      vehicle_id: updatedTrip.vehicle_id.toString(),
    };
  }

  /**
   * DR-03: Cập nhật tiến trình đón/trả/giao hàng của từng khách
   */
  static async updateProgress(driverId: bigint, requestId: bigint, input: z.infer<typeof updateProgressSchema>) {
    const request = await prisma.transportRequest.findUnique({
      where: { id: requestId },
      include: {
        trip: true,
        package_items: true,
      },
    });

    if (!request) {
      throw new AppError(404, 'REQUEST_NOT_FOUND', 'Yêu cầu không tồn tại.');
    }

    if (request.trip.driver_id !== driverId) {
      throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền điều hành yêu cầu này.');
    }

    // Cho phép đón khách (PICKED_UP) khi chuyến đang OPEN, CLOSED hoặc IN_PROGRESS!
    if (input.ride_progress === ride_progress.PICKED_UP || input.package_status === package_status.PICKED_UP) {
      if (
        request.trip.status !== trip_status.OPEN &&
        request.trip.status !== trip_status.CLOSED &&
        request.trip.status !== trip_status.IN_PROGRESS
      ) {
        throw new AppError(400, 'INVALID_TRIP_STATUS', 'Không thể đón khách khi chuyến xe đã kết thúc hoặc bị hủy.');
      }
    } else {
      // Trả khách / Giao hàng (DROPPED_OFF / DELIVERED) bắt buộc xe phải đang chạy (IN_PROGRESS)
      if (request.trip.status !== trip_status.IN_PROGRESS) {
        throw new AppError(
          400,
          'TRIP_NOT_STARTED',
          'Chuyến xe chưa bắt đầu hành trình. Vui lòng bấm Bắt đầu hành trình trước khi trả khách hoặc giao hàng.'
        );
      }
    }

    if (request.status !== request_status.ACCEPTED) {
      throw new AppError(400, 'INVALID_REQUEST_STATUS', 'Chỉ có thể cập nhật tiến trình cho yêu cầu đã được chấp nhận (ACCEPTED).');
    }

    return prisma.$transaction(async (tx) => {
      // 1. Trường hợp đi nhờ xe (RIDE)
      if (request.type === request_type.RIDE && input.ride_progress) {
        const isDroppedOff = input.ride_progress === ride_progress.DROPPED_OFF;

        const updated = await tx.transportRequest.update({
          where: { id: requestId },
          data: {
            ride_progress: input.ride_progress,
            status: isDroppedOff ? request_status.COMPLETED : request_status.ACCEPTED,
          },
        });

        // Gửi thông báo
        const msg = input.ride_progress === ride_progress.PICKED_UP
          ? `Tài xế đã đón bạn lên chuyến xe ${request.trip.code}. Chúc bạn một chuyến đi an toàn!`
          : `Bạn đã đến điểm trả và hoàn thành chặng đi trên chuyến ${request.trip.code}. Cảm ơn bạn đã sử dụng GoX!`;

        await NotificationService.createNotification({
          userId: request.user_id,
          type: 'PROGRESS_UPDATE',
          content: msg,
          refType: 'TRIP',
          refId: request.trip_id,
        });

        return {
          ...updated,
          id: updated.id.toString(),
          trip_id: updated.trip_id.toString(),
          user_id: updated.user_id.toString(),
        };
      }

      // 2. Trường hợp gửi hàng (PACKAGE)
      if (request.type === request_type.PACKAGE && input.package_status) {
        const isDelivered = input.package_status === package_status.DELIVERED;

        // Cập nhật trạng thái trên bảng package_items
        if (request.package_items.length > 0) {
          await tx.packageItem.updateMany({
            where: { request_id: requestId },
            data: { status: input.package_status },
          });
        }

        const updated = await tx.transportRequest.update({
          where: { id: requestId },
          data: {
            status: isDelivered ? request_status.COMPLETED : request_status.ACCEPTED,
          },
        });

        // Gửi thông báo
        const msg = input.package_status === package_status.PICKED_UP
          ? `Kiện hàng của bạn trên chuyến ${request.trip.code} đã được tài xế nhận và đang trên đường giao.`
          : `Kiện hàng của bạn trên chuyến ${request.trip.code} đã được giao thành công tới người nhận!`;

        await NotificationService.createNotification({
          userId: request.user_id,
          type: 'PROGRESS_UPDATE',
          content: msg,
          refType: 'TRIP',
          refId: request.trip_id,
        });

        return {
          ...updated,
          id: updated.id.toString(),
          trip_id: updated.trip_id.toString(),
          user_id: updated.user_id.toString(),
        };
      }

      // 3. Trường hợp chuyến/yêu cầu bị thất bại (FAILED do khách vắng mặt, sai thông tin, không liên lạc được...)
      if (input.fail_reason_code) {
        const countsToward = input.fail_reason_code !== fail_reason_code.OTHER;
        const updated = await tx.transportRequest.update({
          where: { id: requestId },
          data: {
            status: request_status.FAILED,
            fail_reason_code: input.fail_reason_code,
            counts_toward_cancel_rate: countsToward,
          },
        });

        // Hoàn trả sức chứa xe nguyên tử
        if (request.type === request_type.RIDE) {
          const seats = request.passenger_count || 1;
          await tx.trip.update({
            where: { id: request.trip_id },
            data: { seats_reserved: { decrement: seats } },
          });
        } else {
          const totalArea = request.package_items.reduce((s, p) => s + p.area_m2, 0);
          const totalWeight = request.package_items.reduce((s, p) => s + p.weight_kg, 0);
          await tx.trip.update({
            where: { id: request.trip_id },
            data: {
              cargo_area_reserved_m2: { decrement: totalArea },
              cargo_weight_reserved_kg: { decrement: totalWeight },
            },
          });
        }

        // Gửi thông báo cho khách hàng
        await NotificationService.createNotification({
          userId: request.user_id,
          type: 'REQUEST_FAILED',
          content: `Yêu cầu ${request.code} trên chuyến ${request.trip.code} đã bị đánh dấu không hoàn thành. Lý do: ${input.fail_reason_code}`,
          refType: 'TRIP',
          refId: request.trip_id,
        });

        return {
          ...updated,
          id: updated.id.toString(),
          trip_id: updated.trip_id.toString(),
          user_id: updated.user_id.toString(),
        };
      }

      throw new AppError(400, 'INVALID_UPDATE_DATA', 'Dữ liệu cập nhật tiến trình không phù hợp.');
    });
  }

  /**
   * DR-03: Tài xế kết thúc chuyến xe (COMPLETED)
   * Quy tắc an toàn: Chỉ hoàn thành khi TẤT CẢ yêu cầu ACCEPTED đã kết thúc (COMPLETED) hoặc đã bị hủy
   */
  static async completeTrip(driverId: bigint, tripId: bigint) {
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, driver_id: driverId },
    });

    if (!trip) {
      throw new AppError(404, 'TRIP_NOT_FOUND', 'Chuyến xe không tồn tại hoặc không thuộc sở hữu của bạn.');
    }

    if (trip.status !== trip_status.IN_PROGRESS) {
      throw new AppError(400, 'INVALID_TRIP_STATUS', 'Chỉ có thể kết thúc chuyến xe đang di chuyển (IN_PROGRESS).');
    }

    // Kiểm tra xem còn yêu cầu ACCEPTED nào chưa hoàn thành hay không
    const remainingCount = await prisma.transportRequest.count({
      where: {
        trip_id: tripId,
        status: request_status.ACCEPTED,
      },
    });

    if (remainingCount > 0) {
      throw new AppError(
        400,
        'PENDING_REQUESTS_REMAINING',
        `Chuyến xe vẫn còn ${remainingCount} hành khách hoặc kiện hàng chưa được trả/giao hoàn tất. Vui lòng cập nhật trạng thái trước khi kết thúc.`
      );
    }

    const completedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: {
        status: trip_status.COMPLETED,
        completed_at: new Date(),
      },
    });

    // Thông báo cho tất cả hành khách của chuyến xe
    const completedRequests = await prisma.transportRequest.findMany({
      where: { trip_id: tripId, status: request_status.COMPLETED },
    });

    for (const req of completedRequests) {
      await NotificationService.createNotification({
        userId: req.user_id,
        type: 'TRIP_COMPLETED',
        content: `Chuyến xe ${trip.code} đã kết thúc thành công. Cảm ơn bạn đã đồng hành cùng GoX!`,
        refType: 'TRIP',
        refId: trip.id,
      });
    }

    return {
      ...completedTrip,
      id: completedTrip.id.toString(),
      driver_id: completedTrip.driver_id.toString(),
      vehicle_id: completedTrip.vehicle_id.toString(),
    };
  }

  /**
   * Đón đủ tất cả khách và nhận đủ tất cả kiện hàng lên xe (Batch Pickup)
   */
  static async pickupAll(driverId: bigint, tripId: bigint) {
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, driver_id: driverId },
    });

    if (!trip) {
      throw new AppError(404, 'TRIP_NOT_FOUND', 'Không tìm thấy chuyến xe.');
    }

    if (
      trip.status !== trip_status.OPEN &&
      trip.status !== trip_status.CLOSED &&
      trip.status !== trip_status.IN_PROGRESS
    ) {
      throw new AppError(400, 'INVALID_TRIP_STATUS', 'Chuyến xe không ở trạng thái hợp lệ để đón khách.');
    }

    return prisma.$transaction(async (tx) => {
      // 1. Cập nhật tất cả RIDE ACCEPTED chưa đón
      await tx.transportRequest.updateMany({
        where: {
          trip_id: tripId,
          status: request_status.ACCEPTED,
          type: request_type.RIDE,
          ride_progress: { not: ride_progress.PICKED_UP },
        },
        data: {
          ride_progress: ride_progress.PICKED_UP,
        },
      });

      // 2. Cập nhật tất cả PACKAGE ACCEPTED chưa nhận
      const packageRequests = await tx.transportRequest.findMany({
        where: {
          trip_id: tripId,
          status: request_status.ACCEPTED,
          type: request_type.PACKAGE,
        },
        select: { id: true, user_id: true },
      });

      for (const req of packageRequests) {
        await tx.packageItem.updateMany({
          where: { request_id: req.id },
          data: { status: package_status.PICKED_UP },
        });
      }

      // 3. Gửi thông báo đến hành khách
      const allAccepted = await tx.transportRequest.findMany({
        where: { trip_id: tripId, status: request_status.ACCEPTED },
        select: { user_id: true },
      });

      for (const req of allAccepted) {
        await NotificationService.createNotification({
          userId: req.user_id,
          type: 'PROGRESS_UPDATE',
          content: `Tài xế đã xác nhận đón toàn bộ hành khách và nhận kiện hàng lên xe trên chuyến ${trip.code}.`,
          refType: 'TRIP',
          refId: tripId,
        });
      }

      return { message: 'Đã xác nhận đón toàn bộ khách và nhận đủ kiện hàng lên xe thành công.' };
    });
  }

  /**
   * Trả đủ tất cả khách và giao đủ tất cả kiện hàng (Batch Dropoff)
   */
  static async dropoffAll(driverId: bigint, tripId: bigint) {
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, driver_id: driverId },
    });

    if (!trip) {
      throw new AppError(404, 'TRIP_NOT_FOUND', 'Không tìm thấy chuyến xe.');
    }

    if (trip.status !== trip_status.IN_PROGRESS) {
      throw new AppError(400, 'TRIP_NOT_STARTED', 'Chuyến xe chưa ở trạng thái đang di chuyển (IN_PROGRESS).');
    }

    return prisma.$transaction(async (tx) => {
      // 1. Cập nhật tất cả RIDE ACCEPTED -> DROPPED_OFF & COMPLETED
      await tx.transportRequest.updateMany({
        where: {
          trip_id: tripId,
          status: request_status.ACCEPTED,
          type: request_type.RIDE,
        },
        data: {
          ride_progress: ride_progress.DROPPED_OFF,
          status: request_status.COMPLETED,
        },
      });

      // 2. Cập nhật tất cả PACKAGE ACCEPTED -> DELIVERED & COMPLETED
      const packageRequests = await tx.transportRequest.findMany({
        where: {
          trip_id: tripId,
          status: request_status.ACCEPTED,
          type: request_type.PACKAGE,
        },
        select: { id: true, user_id: true },
      });

      for (const req of packageRequests) {
        await tx.packageItem.updateMany({
          where: { request_id: req.id },
          data: { status: package_status.DELIVERED },
        });
      }

      await tx.transportRequest.updateMany({
        where: {
          trip_id: tripId,
          status: request_status.ACCEPTED,
          type: request_type.PACKAGE,
        },
        data: {
          status: request_status.COMPLETED,
        },
      });

      // Gửi thông báo đến hành khách
      const allFinished = await tx.transportRequest.findMany({
        where: { trip_id: tripId, status: request_status.COMPLETED },
        select: { user_id: true },
      });

      for (const req of allFinished) {
        await NotificationService.createNotification({
          userId: req.user_id,
          type: 'PROGRESS_UPDATE',
          content: `Tài xế đã xác nhận trả toàn bộ khách và giao toàn bộ hàng an toàn tại điểm đến chuyến ${trip.code}. Cảm ơn bạn đã đồng hành!`,
          refType: 'TRIP',
          refId: tripId,
        });
      }

      return { message: 'Đã xác nhận trả toàn bộ khách và giao toàn bộ kiện hàng thành công.' };
    });
  }

  /**
   * Tài xế báo cáo sự cố từng yêu cầu (ví dụ: Khách vắng mặt / không nghe máy lúc xuất phát)
   * Yêu cầu chuyển FAILED, hoàn trả sức chứa xe, ghi IncidentReport cho Admin và tự động tính lại chi phí nhiên liệu.
   */
  static async reportIssue(driverId: bigint, requestId: bigint, rawInput: z.infer<typeof reportIssueSchema>) {
    const input = reportIssueSchema.parse(rawInput);

    const request = await prisma.transportRequest.findUnique({
      where: { id: requestId },
      include: {
        trip: true,
        package_items: true,
      },
    });

    if (!request) {
      throw new AppError(404, 'REQUEST_NOT_FOUND', 'Không tìm thấy yêu cầu.');
    }

    if (request.trip.driver_id !== driverId) {
      throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền thao tác trên yêu cầu này.');
    }

    if (request.status !== request_status.ACCEPTED && request.status !== request_status.PENDING) {
      throw new AppError(400, 'INVALID_REQUEST_STATUS', 'Chỉ có thể báo cáo sự cố cho yêu cầu đang chờ hoặc đã chấp nhận.');
    }

    // Các lý do do lỗi phía khách hàng thì bị tính vào tỷ lệ hủy (CS-02)
    const countsTowardCancelRate =
      input.reason_code === fail_reason_code.ABSENT ||
      input.reason_code === fail_reason_code.UNREACHABLE ||
      input.reason_code === fail_reason_code.WRONG_INFO;

    return prisma.$transaction(async (tx) => {
      // 1. Chuyển trạng thái yêu cầu sang FAILED
      const updatedReq = await tx.transportRequest.update({
        where: { id: requestId },
        data: {
          status: request_status.FAILED,
          fail_reason_code: input.reason_code,
          cancel_reason: input.note || `Tài xế báo sự cố: ${input.reason_code}`,
          counts_toward_cancel_rate: countsTowardCancelRate,
        },
      });

      // 2. Hoàn trả sức chứa xe nếu yêu cầu đã ACCEPTED
      if (request.status === request_status.ACCEPTED) {
        if (request.type === request_type.RIDE) {
          const passengers = request.passenger_count || 1;
          await tx.trip.update({
            where: { id: request.trip_id },
            data: {
              seats_reserved: { decrement: passengers },
            },
          });
        } else if (request.type === request_type.PACKAGE && request.package_items.length > 0) {
          const totalArea = request.package_items.reduce((s, p) => s + p.area_m2, 0);
          const totalWeight = request.package_items.reduce((s, p) => s + p.weight_kg, 0);
          await tx.trip.update({
            where: { id: request.trip_id },
            data: {
              cargo_area_reserved_m2: { decrement: totalArea },
              cargo_weight_reserved_kg: { decrement: totalWeight },
            },
          });
        }
      }

      // 3. Tự động tính lại chi phí nhiên liệu/sạc cho các khách còn lại trên xe
      await RequestService.recalculateFuelCost(tx, request.trip_id);

      // 4. Tạo IncidentReport cho Quản trị viên theo dõi (AD-02)
      const reasonLabels: Record<fail_reason_code, string> = {
        ABSENT: 'Hành khách vắng mặt tại điểm đón',
        UNREACHABLE: 'Không thể liên lạc qua điện thoại',
        WRONG_INFO: 'Thông tin hành khách/kiện hàng sai lệch',
        OTHER: 'Sự cố khác',
      };

      await tx.incidentReport.create({
        data: {
          reporter_id: driverId,
          trip_id: request.trip_id,
          request_id: requestId,
          title: `Tài xế báo sự cố (${request.code}): ${reasonLabels[input.reason_code]}`,
          description: `Tài xế đánh dấu yêu cầu ${request.code} thất bại do: ${reasonLabels[input.reason_code]}. ${input.note ? `Ghi chú: ${input.note}` : ''}. Chi phí nhiên liệu chia sẻ trên chuyến xe đã được tự động tính toán lại.`,
          status: incident_status.NOT_RECEIVED,
        },
      });

      // 5. Gửi thông báo đến hành khách vi phạm
      await NotificationService.createNotification({
        userId: request.user_id,
        type: 'REQUEST_FAILED',
        content: `Yêu cầu ${request.code} trên chuyến xe ${request.trip.code} đã bị đánh dấu thất bại do: ${reasonLabels[input.reason_code]}.${countsTowardCancelRate ? ' Vi phạm này sẽ được tính vào tỷ lệ hủy chuyến của bạn.' : ''}`,
        refType: 'TRIP',
        refId: request.trip_id,
      });

      return {
        message: 'Đã báo cáo sự cố thành công. Chi phí nhiên liệu của chuyến xe đã được tự động tính toán lại.',
        request: {
          ...updatedReq,
          id: updatedReq.id.toString(),
          trip_id: updatedReq.trip_id.toString(),
          user_id: updatedReq.user_id.toString(),
        },
      };
    });
  }

  /**
   * Lấy lịch sử các yêu cầu đã kết thúc (COMPLETED / CANCELLED / REJECTED / FAILED) của người dùng
   * Kèm thông tin chuyến xe, xe, tài xế, tỷ lệ hủy tuần hiện tại và thống kê tổng hợp
   */
  static async getUserHistory(
    userId: bigint,
    query?: { status?: string; type?: string; from_date?: string; to_date?: string }
  ) {
    const whereClause: any = {
      user_id: userId,
      status: {
        in: [
          request_status.COMPLETED,
          request_status.CANCELLED,
          request_status.REJECTED,
          request_status.FAILED,
        ],
      },
    };

    if (query?.status && ['COMPLETED', 'CANCELLED', 'REJECTED', 'FAILED'].includes(query.status)) {
      whereClause.status = query.status as request_status;
    }

    if (query?.type && ['RIDE', 'PACKAGE'].includes(query.type)) {
      whereClause.type = query.type as any;
    }

    if (query?.from_date || query?.to_date) {
      whereClause.trip = whereClause.trip || {};
      whereClause.trip.departure_time = {};
      if (query.from_date) {
        whereClause.trip.departure_time.gte = new Date(query.from_date);
      }
      if (query.to_date) {
        const toD = new Date(query.to_date);
        toD.setHours(23, 59, 59, 999);
        whereClause.trip.departure_time.lte = toD;
      }
    }

    const requests = await prisma.transportRequest.findMany({
      where: whereClause,
      include: {
        package_items: true,
        trip: {
          include: {
            vehicle: true,
            driver: {
              select: {
                id: true,
                full_name: true,
                avatar_url: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // Thống kê tổng hợp cho người dùng
    const allUserFinishedRequests = await prisma.transportRequest.findMany({
      where: {
        user_id: userId,
        status: {
          in: [
            request_status.COMPLETED,
            request_status.CANCELLED,
            request_status.REJECTED,
            request_status.FAILED,
          ],
        },
      },
    });

    let totalRides = 0;
    let totalPackages = 0;
    let totalFuelShared = 0;

    for (const r of allUserFinishedRequests) {
      if (r.status === request_status.COMPLETED) {
        if (r.type === request_type.RIDE) {
          totalRides += r.passenger_count || 1;
        } else {
          totalPackages++;
        }
        if (r.shared_fuel_cost && r.shared_fuel_cost > 0) {
          totalFuelShared += r.shared_fuel_cost;
        }
      }
    }

    // Tính toán tỷ lệ hủy tuần hiện tại (CS-02) và lịch sử vi phạm
    const currentWeek = getCurrentWeekRangeVN();
    const currentWeekRequests = await prisma.transportRequest.findMany({
      where: {
        user_id: userId,
        trip: {
          departure_time: {
            gte: currentWeek.weekStart,
            lte: currentWeek.weekEnd,
          },
        },
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

    const cancelRateResult = calculateWeeklyCancellationRate(weekConfirmed, weekCancelled);

    // Đếm tổng số vi phạm trong quá khứ của người dùng
    const totalViolations = await prisma.violation.count({
      where: { user_id: userId },
    });

    return {
      requests: requests.map((r) => ({
        ...r,
        id: r.id.toString(),
        trip_id: r.trip_id.toString(),
        user_id: r.user_id.toString(),
        package_items: r.package_items.map((p) => ({
          ...p,
          id: p.id.toString(),
          request_id: p.request_id.toString(),
        })),
        trip: r.trip
          ? {
              ...r.trip,
              id: r.trip.id.toString(),
              driver_id: r.trip.driver_id.toString(),
              vehicle_id: r.trip.vehicle_id.toString(),
              driver: r.trip.driver
                ? {
                    ...r.trip.driver,
                    id: r.trip.driver.id.toString(),
                  }
                : null,
            }
          : null,
      })),
      stats: {
        total_rides: totalRides,
        total_packages: totalPackages,
        total_fuel_shared: Math.round(totalFuelShared),
        cancellation: {
          week_confirmed: weekConfirmed,
          week_cancelled: weekCancelled,
          week_rate: cancelRateResult.rate,
          is_violation: cancelRateResult.isViolation,
          total_violations: totalViolations,
        },
      },
    };
  }

  /**
   * Dashboard Tổng quan Người dùng (USER) - 100% số liệu thật từ CSDL
   */
  static async getUserDashboard(userId: bigint) {
    const { weekStart, weekEnd } = getCurrentWeekRangeVN();

    const [
      totalRequests,
      pendingCount,
      acceptedCount,
      inTransitCount,
      completedCount,
      recentRequests,
      currentWeekRequests,
      totalViolations,
    ] = await Promise.all([
      prisma.transportRequest.count({ where: { user_id: userId } }),
      prisma.transportRequest.count({
        where: { user_id: userId, status: request_status.PENDING },
      }),
      prisma.transportRequest.count({
        where: { user_id: userId, status: request_status.ACCEPTED },
      }),
      prisma.transportRequest.count({
        where: {
          user_id: userId,
          status: request_status.ACCEPTED,
          OR: [
            { trip: { status: trip_status.IN_PROGRESS } },
            { ride_progress: ride_progress.PICKED_UP },
            { package_items: { some: { status: package_status.PICKED_UP } } },
          ],
        },
      }),
      prisma.transportRequest.count({
        where: { user_id: userId, status: request_status.COMPLETED },
      }),
      prisma.transportRequest.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        take: 5,
        include: {
          trip: {
            select: {
              id: true,
              code: true,
              origin_name: true,
              dest_name: true,
              departure_time: true,
              status: true,
              driver: {
                select: { id: true, full_name: true, avatar_url: true },
              },
            },
          },
          package_items: {
            select: { id: true, description: true, status: true },
          },
        },
      }),
      prisma.transportRequest.findMany({
        where: {
          user_id: userId,
          trip: { departure_time: { gte: weekStart, lte: weekEnd } },
        },
        select: {
          status: true,
          cancelled_by: true,
          counts_toward_cancel_rate: true,
          fail_reason_code: true,
        },
      }),
      prisma.violation.count({ where: { user_id: userId } }),
    ]);

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

    const cancelRateResult = calculateWeeklyCancellationRate(weekConfirmed, weekCancelled);

    return {
      stats: {
        total_requests: totalRequests,
        pending_count: pendingCount,
        accepted_count: acceptedCount,
        in_transit_count: inTransitCount,
        completed_count: completedCount,
      },
      cancellation: {
        week_confirmed: weekConfirmed,
        week_cancelled: weekCancelled,
        week_rate: cancelRateResult.rate,
        is_violation: cancelRateResult.isViolation,
        total_violations: totalViolations,
      },
      recent_requests: recentRequests.map((r) => ({
        ...r,
        id: r.id.toString(),
        trip_id: r.trip_id.toString(),
        user_id: r.user_id.toString(),
        package_items: r.package_items.map((p) => ({
          ...p,
          id: p.id.toString(),
        })),
        trip: r.trip
          ? {
              ...r.trip,
              id: r.trip.id.toString(),
              driver: r.trip.driver
                ? { ...r.trip.driver, id: r.trip.driver.id.toString() }
                : null,
            }
          : null,
      })),
    };
  }
}

