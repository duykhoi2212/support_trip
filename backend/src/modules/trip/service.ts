import { trip_status, vehicle_status, actor_type, request_status } from '@prisma/client';
import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { mapAdapter } from '../../adapters/map/ors.js';
import { createTripSchema, cancelTripSchema, searchTripsSchema } from './schema.js';
import { z } from 'zod';

export class TripService {
  /**
   * DR-01: Tạo chuyến xe mới (Tài xế)
   * Ràng buộc: >= 24h, xe ACTIVE, chống chồng lịch không đệm, snapshot sức chứa, không trạm dừng
   */
  static async createTrip(driverId: bigint, input: z.infer<typeof createTripSchema>) {
    const depTime = new Date(input.departure_time);
    const now = new Date();

    // 1. Giờ khởi hành phải cách hiện tại tối thiểu 24 giờ
    const minDepartureTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    if (depTime < minDepartureTime) {
      throw new AppError(
        400,
        'INVALID_DEPARTURE_TIME',
        'Thời gian khởi hành phải cách thời điểm hiện tại tối thiểu 24 giờ.'
      );
    }

    // 2. Phương tiện phải thuộc tài xế và đang ACTIVE
    const vehicleId = BigInt(input.vehicle_id);
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        driver_id: driverId,
      },
    });

    if (!vehicle) {
      throw new AppError(404, 'VEHICLE_NOT_FOUND', 'Phương tiện không tồn tại hoặc không thuộc quyền sở hữu của bạn.');
    }

    if (vehicle.status !== vehicle_status.ACTIVE) {
      throw new AppError(
        400,
        'VEHICLE_INACTIVE',
        'Phương tiện đang tạm ngừng sử dụng. Vui lòng kích hoạt lại phương tiện trước khi tạo chuyến.'
      );
    }

    // 3. Gọi Map Adapter lấy lộ trình tuyến đường, khoảng cách và thời gian di chuyển
    const route = await mapAdapter.getRoute(
      { lat: input.origin_lat, lng: input.origin_lng },
      { lat: input.dest_lat, lng: input.dest_lng }
    );

    // Tính thời gian dự kiến đến nơi tối thiểu: minEta = departure_time + duration
    const minEta = new Date(depTime.getTime() + route.duration_min * 60 * 1000);
    let finalEta = minEta;

    if (input.eta) {
      const userEta = new Date(input.eta);
      if (userEta < minEta) {
        throw new AppError(
          400,
          'INVALID_ETA',
          `Thời gian kết thúc chuyến dự kiến (${userEta.toLocaleString('vi-VN')}) không thể sớm hơn thời gian chạy tối thiểu từ bản đồ (${minEta.toLocaleString('vi-VN')}).`
        );
      }
      finalEta = userEta;
    }

    // 4. Chống chồng lịch xe VÀ tài xế kèm 1 giờ đệm nghỉ ngơi (Buffer 60 phút)
    const BUFFER_MS = 60 * 60 * 1000;
    const searchDep = new Date(depTime.getTime() - BUFFER_MS);
    const searchEta = new Date(finalEta.getTime() + BUFFER_MS);

    const conflictTrip = await prisma.trip.findFirst({
      where: {
        status: {
          in: [trip_status.OPEN, trip_status.CLOSED, trip_status.IN_PROGRESS],
        },
        OR: [
          { driver_id: driverId },
          { vehicle_id: vehicleId },
        ],
        departure_time: { lt: searchEta },
        eta: { gt: searchDep },
      },
      include: {
        vehicle: true,
      },
    });

    if (conflictTrip) {
      const isSameDriver = conflictTrip.driver_id === driverId;
      const startFormatted = conflictTrip.departure_time.toLocaleString('vi-VN');
      const etaFormatted = conflictTrip.eta.toLocaleString('vi-VN');
      const reason = isSameDriver
        ? `Bạn đã có lịch trình cho chuyến xe ${conflictTrip.code} từ ${startFormatted} đến ${etaFormatted} (kèm 1 giờ đệm nghỉ ngơi). Không thể tạo chuyến trùng thời gian.`
        : `Phương tiện (${conflictTrip.vehicle.plate_number}) đã có lịch trình cho chuyến ${conflictTrip.code} từ ${startFormatted} đến ${etaFormatted}. Vui lòng chọn thời gian hoặc xe khác.`;

      throw new AppError(409, 'SCHEDULE_CONFLICT', reason);
    }

    // 5. Sinh mã chuyến duy nhất (TRIP-XXXXXX)
    let code = '';
    let isUnique = false;
    while (!isUnique) {
      code = 'TRIP-' + Math.floor(100000 + Math.random() * 900000);
      const existing = await prisma.trip.findUnique({ where: { code } });
      if (!existing) isUnique = true;
    }

    // 6. Tạo chuyến xe kèm lưu Snapshot sức chứa của xe tại thời điểm tạo
    const trip = await prisma.trip.create({
      data: {
        code,
        driver_id: driverId,
        vehicle_id: vehicleId,
        origin_name: input.origin_name,
        origin_lat: input.origin_lat,
        origin_lng: input.origin_lng,
        dest_name: input.dest_name,
        dest_lat: input.dest_lat,
        dest_lng: input.dest_lng,
        departure_time: depTime,
        eta: finalEta,
        distance_km: route.distance_km,
        duration_min: route.duration_min,
        route_polyline: route.route_polyline,
        seats_total: vehicle.seat_count,
        cargo_area_total_m2: vehicle.cargo_area_m2,
        cargo_weight_total_kg: vehicle.cargo_max_kg,
        seats_reserved: 0,
        cargo_area_reserved_m2: 0,
        cargo_weight_reserved_kg: 0,
        status: trip_status.OPEN,
      },
      include: {
        vehicle: true,
      },
    });

    return trip;
  }

  /**
   * DR-05: Lấy danh sách chuyến xe của tài xế (có lọc trạng thái)
   */
  static async getMyTrips(driverId: bigint, status?: trip_status) {
    return prisma.trip.findMany({
      where: {
        driver_id: driverId,
        ...(status ? { status } : {}),
      },
      include: {
        vehicle: true,
        _count: {
          select: { transport_requests: true },
        },
      },
      orderBy: { departure_time: 'desc' },
    });
  }

  /**
   * Lấy chi tiết một chuyến xe (Tài xế hoặc Người dùng xem)
   */
  static async getTripById(tripId: bigint) {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
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
        _count: {
          select: { transport_requests: true },
        },
      },
    });

    if (!trip) {
      throw new AppError(404, 'TRIP_NOT_FOUND', 'Không tìm thấy thông tin chuyến xe.');
    }

    return trip;
  }

  /**
   * DR-05: Tài xế hủy chuyến xe
   * Quy tắc 12: Chỉ hủy khi chuyến chưa IN_PROGRESS. Các yêu cầu liên quan chuyển CANCELLED và người dùng được thông báo.
   */
  static async cancelTrip(
    driverId: bigint,
    tripId: bigint,
    input: z.infer<typeof cancelTripSchema>
  ) {
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        driver_id: driverId,
      },
    });

    if (!trip) {
      throw new AppError(404, 'TRIP_NOT_FOUND', 'Không tìm thấy chuyến xe hoặc bạn không có quyền hủy chuyến này.');
    }

    // Chỉ hủy được khi chuyến đang OPEN hoặc CLOSED (chưa IN_PROGRESS)
    if (trip.status !== trip_status.OPEN && trip.status !== trip_status.CLOSED) {
      throw new AppError(
        400,
        'CANNOT_CANCEL_TRIP',
        'Không thể hủy chuyến xe đã bắt đầu chạy hoặc đã kết thúc/hủy trước đó.'
      );
    }

    return prisma.$transaction(async (tx) => {
      // 1. Cập nhật chuyến xe sang CANCELLED
      const updatedTrip = await tx.trip.update({
        where: { id: tripId },
        data: {
          status: trip_status.CANCELLED,
          cancel_reason: input.cancel_reason,
        },
      });

      // 2. Tìm tất cả yêu cầu PENDING hoặc ACCEPTED của chuyến xe
      const activeRequests = await tx.transportRequest.findMany({
        where: {
          trip_id: tripId,
          status: { in: [request_status.PENDING, request_status.ACCEPTED] },
        },
        select: { id: true, user_id: true, code: true },
      });

      // 3. Chuyển các yêu cầu sang CANCELLED do tài xế hủy (không tính vào tỷ lệ hủy của người dùng)
      if (activeRequests.length > 0) {
        await tx.transportRequest.updateMany({
          where: {
            trip_id: tripId,
            status: { in: [request_status.PENDING, request_status.ACCEPTED] },
          },
          data: {
            status: request_status.CANCELLED,
            cancelled_by: actor_type.DRIVER,
            cancel_reason: `Tài xế đã hủy chuyến xe. Lý do: ${input.cancel_reason}`,
            counts_toward_cancel_rate: false, // Loại khỏi tỷ lệ phạt
          },
        });

        // 4. Tạo thông báo tiếng Việt cho từng hành khách bị ảnh hưởng
        for (const req of activeRequests) {
          await tx.notification.create({
            data: {
              user_id: req.user_id,
              type: 'TRIP_CANCELLED',
              content: `Chuyến xe ${trip.code} bạn đã đặt yêu cầu (${req.code}) bị tài xế hủy. Lý do: ${input.cancel_reason}`,
              ref_type: 'TRIP',
              ref_id: tripId,
            },
          });
        }
      }

      return updatedTrip;
    });
  }

  /**
   * Tìm kiếm chuyến xe công khai (Bộ lọc thường)
   * Chỉ hiển thị các chuyến OPEN và trước giờ đi > 6h (mốc -6h hệ thống đóng)
   */
  static async searchTrips(filters: z.infer<typeof searchTripsSchema>) {
    const now = new Date();
    // Quy tắc 3: Không nhận yêu cầu mới sau mốc -6h
    const minDepartureTime = new Date(now.getTime() + 6 * 60 * 60 * 1000);

    const whereClause: any = {
      status: trip_status.OPEN,
      departure_time: { gt: minDepartureTime },
    };

    if (filters.origin_name) {
      whereClause.origin_name = { contains: filters.origin_name, mode: 'insensitive' };
    }

    if (filters.dest_name) {
      whereClause.dest_name = { contains: filters.dest_name, mode: 'insensitive' };
    }

    const trips = await prisma.trip.findMany({
      where: whereClause,
      include: {
        vehicle: true,
        driver: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true,
          },
        },
        _count: {
          select: {
            transport_requests: {
              where: {
                status: request_status.ACCEPTED,
              },
            },
          },
        },
      },
      orderBy: { departure_time: 'asc' },
    });

    // Lọc theo sức chứa nếu có yêu cầu
    return trips.filter((trip) => {
      if (filters.type === 'RIDE' && filters.passenger_count) {
        const availableSeats = trip.seats_total - trip.seats_reserved;
        if (availableSeats < filters.passenger_count) return false;
      }

      if (filters.type === 'PACKAGE') {
        if (filters.cargo_weight_kg) {
          const availableWeight = trip.cargo_weight_total_kg - trip.cargo_weight_reserved_kg;
          if (availableWeight < filters.cargo_weight_kg) return false;
        }
        if (filters.cargo_area_m2) {
          const availableArea = trip.cargo_area_total_m2 - trip.cargo_area_reserved_m2;
          if (availableArea < filters.cargo_area_m2) return false;
        }
      }

      return true;
    });
  }
}

