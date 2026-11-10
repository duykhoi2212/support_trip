import {
  request_type,
  request_status,
  ride_progress,
  package_status,
  trip_status,
  actor_type,
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
} from './schema.js';
import { z } from 'zod';

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

    // 1. Kiểm tra trắc địa 2km với tuyến đường polyline
    if (!trip.route_polyline) {
      throw new AppError(400, 'ROUTE_POLYLINE_MISSING', 'Chuyến xe chưa có dữ liệu lộ trình đường bộ.');
    }

    let routeCoords: Array<[number, number]>;
    try {
      routeCoords = JSON.parse(trip.route_polyline);
    } catch {
      throw new AppError(500, 'INVALID_ROUTE_DATA', 'Dữ liệu lộ trình chuyến xe không hợp lệ.');
    }

    const pickupCheck = isWithinRouteDistance(input.pickup_lat, input.pickup_lng, routeCoords, 2.0);
    if (!pickupCheck.isWithin) {
      throw new AppError(
        400,
        'PICKUP_OUT_OF_RANGE',
        `Điểm đón cách lộ trình chuyến xe ${pickupCheck.distanceKm} km (vượt quá bán kính cho phép 2.0 km).`
      );
    }

    const dropoffCheck = isWithinRouteDistance(input.dropoff_lat, input.dropoff_lng, routeCoords, 2.0);
    if (!dropoffCheck.isWithin) {
      throw new AppError(
        400,
        'DROPOFF_OUT_OF_RANGE',
        `Điểm trả cách lộ trình chuyến xe ${dropoffCheck.distanceKm} km (vượt quá bán kính cho phép 2.0 km).`
      );
    }

    // 2. Kiểm tra sức chứa ghế ngồi còn trống
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
        pickup_name: input.pickup_name,
        pickup_lat: input.pickup_lat,
        pickup_lng: input.pickup_lng,
        dropoff_name: input.dropoff_name,
        dropoff_lat: input.dropoff_lat,
        dropoff_lng: input.dropoff_lng,
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

    // 1. Kiểm tra trắc địa 2km với tuyến đường polyline
    if (!trip.route_polyline) {
      throw new AppError(400, 'ROUTE_POLYLINE_MISSING', 'Chuyến xe chưa có dữ liệu lộ trình đường bộ.');
    }

    let routeCoords: Array<[number, number]>;
    try {
      routeCoords = JSON.parse(trip.route_polyline);
    } catch {
      throw new AppError(500, 'INVALID_ROUTE_DATA', 'Dữ liệu lộ trình chuyến xe không hợp lệ.');
    }

    const pickupCheck = isWithinRouteDistance(input.pickup_lat, input.pickup_lng, routeCoords, 2.0);
    if (!pickupCheck.isWithin) {
      throw new AppError(
        400,
        'PICKUP_OUT_OF_RANGE',
        `Điểm gửi hàng cách lộ trình chuyến xe ${pickupCheck.distanceKm} km (vượt quá bán kính 2.0 km).`
      );
    }

    const dropoffCheck = isWithinRouteDistance(input.dropoff_lat, input.dropoff_lng, routeCoords, 2.0);
    if (!dropoffCheck.isWithin) {
      throw new AppError(
        400,
        'DROPOFF_OUT_OF_RANGE',
        `Điểm nhận hàng cách lộ trình chuyến xe ${dropoffCheck.distanceKm} km (vượt quá bán kính 2.0 km).`
      );
    }

    // 2. Tính diện tích chiếm dụng m2 = (dài * rộng) / 10000
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
          pickup_name: input.pickup_name,
          pickup_lat: input.pickup_lat,
          pickup_lng: input.pickup_lng,
          dropoff_name: input.dropoff_name,
          dropoff_lat: input.dropoff_lat,
          dropoff_lng: input.dropoff_lng,
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
   * DR-03: Tài xế bắt đầu chuyến xe (Chuyển sang IN_PROGRESS)
   */
  static async startTrip(driverId: bigint, tripId: bigint) {
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, driver_id: driverId },
    });

    if (!trip) {
      throw new AppError(404, 'TRIP_NOT_FOUND', 'Chuyến xe không tồn tại hoặc không thuộc sở hữu của bạn.');
    }

    if (trip.status !== trip_status.OPEN && trip.status !== trip_status.CLOSED) {
      throw new AppError(400, 'INVALID_TRIP_STATUS', 'Chỉ có thể bắt đầu chuyến xe ở trạng thái OPEN hoặc CLOSED.');
    }

    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: {
        status: trip_status.IN_PROGRESS,
        started_at: new Date(),
      },
    });

    // Thông báo cho tất cả hành khách đã được ACCEPTED
    const acceptedRequests = await prisma.transportRequest.findMany({
      where: { trip_id: tripId, status: request_status.ACCEPTED },
    });

    for (const req of acceptedRequests) {
      await NotificationService.createNotification({
        userId: req.user_id,
        type: 'TRIP_STARTED',
        content: `Chuyến xe ${trip.code} đã chính thức khởi hành! Hãy chú ý điện thoại để tài xế đón bạn.`,
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
}

