import { trip_status, vehicle_status, actor_type, request_status, incident_status, fail_reason_code } from '@prisma/client';
import axios from 'axios';
import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { mapAdapter } from '../../adapters/map/ors.js';
import { GeminiAdapter } from '../../adapters/ai/gemini.js';
import { calculateHaversineDistanceKm } from '../../utils/distance.js';
import { createTripSchema, cancelTripSchema, cancelTripInProgressSchema, searchTripsSchema } from './schema.js';
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

    // Kiểm tra an toàn kỹ thuật: Hạn đăng kiểm của xe phải còn hiệu lực tới lúc khởi hành
    if (vehicle.inspection_expiry_date && new Date(vehicle.inspection_expiry_date) < depTime) {
      throw new AppError(
        400,
        'VEHICLE_INSPECTION_EXPIRED',
        `Phương tiện (${vehicle.plate_number}) có hạn kiểm định đến ${new Date(vehicle.inspection_expiry_date).toLocaleDateString('vi-VN')}, sẽ hết hạn trước thời gian khởi hành. Vui lòng cập nhật giấy đăng kiểm mới trước khi tạo chuyến.`
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

    // 6. Tính toán chi phí năng lượng/nhiên liệu dự kiến của chuyến xe
    let unitPrice = input.fuel_price;
    if (!unitPrice || unitPrice <= 0) {
      if (vehicle.fuel_type === 'ELECTRIC') {
        unitPrice = 3850; // VNĐ / kWh (Sạc xe điện)
      } else if (vehicle.fuel_type === 'DIESEL') {
        unitPrice = 20000; // VNĐ / Lít (Dầu DO)
      } else {
        unitPrice = 22500; // VNĐ / Lít (Xăng RON 95)
      }
    }
    const consumption = vehicle.fuel_consumption || 7.0;
    const distanceKm = route.distance_km || 0;
    const estimatedFuelCost = Math.round(((distanceKm / 100) * consumption) * unitPrice);

    // 7. Tạo chuyến xe kèm lưu Snapshot sức chứa và chi phí nhiên liệu
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
        estimated_fuel_cost: estimatedFuelCost,
        fuel_price: unitPrice,
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
   * Hủy chuyến xe khẩn cấp khi đang di chuyển do gặp sự cố (IN_PROGRESS -> CANCELLED)
   * Tự động tạo IncidentReport cho Admin và gửi thông báo khẩn cho toàn bộ hành khách.
   */
  static async cancelTripInProgress(
    driverId: bigint,
    tripId: bigint,
    input: z.infer<typeof cancelTripInProgressSchema>
  ) {
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        driver_id: driverId,
      },
      include: {
        vehicle: true,
      },
    });

    if (!trip) {
      throw new AppError(404, 'TRIP_NOT_FOUND', 'Không tìm thấy chuyến xe hoặc bạn không có quyền thao tác.');
    }

    if (trip.status !== trip_status.IN_PROGRESS) {
      throw new AppError(
        400,
        'INVALID_TRIP_STATUS',
        'Chức năng này chỉ áp dụng cho chuyến xe đang trong quá trình di chuyển (IN_PROGRESS).'
      );
    }

    return prisma.$transaction(async (tx) => {
      // 1. Cập nhật chuyến xe sang CANCELLED
      const updatedTrip = await tx.trip.update({
        where: { id: tripId },
        data: {
          status: trip_status.CANCELLED,
          cancel_reason: `Sự cố khi đang di chuyển: ${input.reason}`,
        },
      });

      // 2. Tìm tất cả yêu cầu đang phục vụ trên xe (ACCEPTED hoặc PENDING)
      const activeRequests = await tx.transportRequest.findMany({
        where: {
          trip_id: tripId,
          status: { in: [request_status.ACCEPTED, request_status.PENDING] },
        },
        select: { id: true, user_id: true, code: true },
      });

      // 3. Chuyển các yêu cầu sang CANCELLED do sự cố tài xế (không tính lỗi cho khách)
      if (activeRequests.length > 0) {
        await tx.transportRequest.updateMany({
          where: {
            trip_id: tripId,
            status: { in: [request_status.ACCEPTED, request_status.PENDING] },
          },
          data: {
            status: request_status.CANCELLED,
            cancelled_by: actor_type.DRIVER,
            cancel_reason: `Chuyến xe bị hủy giữa đường do tài xế gặp sự cố: ${input.reason}`,
            fail_reason_code: fail_reason_code.OTHER,
            counts_toward_cancel_rate: false,
          },
        });

        // Gửi thông báo khẩn cấp đến từng hành khách
        for (const req of activeRequests) {
          await tx.notification.create({
            data: {
              user_id: req.user_id,
              type: 'TRIP_EMERGENCY_CANCELLED',
              content: `Khẩn cấp: Chuyến xe ${trip.code} đã bị tài xế hủy giữa đường do gặp sự cố: "${input.reason}". Vui lòng tìm kiếm phương án di chuyển thay thế hoặc liên hệ hỗ trợ.`,
              ref_type: 'TRIP',
              ref_id: tripId,
            },
          });
        }
      }

      // 4. Tự động ghi nhận IncidentReport cho Quản trị viên xử lý (AD-02)
      await tx.incidentReport.create({
        data: {
          reporter_id: driverId,
          trip_id: tripId,
          title: `Tài xế hủy chuyến xe ${trip.code} giữa đường do sự cố`,
          description: `Chuyến xe đang di chuyển (IN_PROGRESS) bị tài xế hủy khẩn cấp. Lý do: ${input.reason}. Xe: ${trip.vehicle?.brand_model || ''} (${trip.vehicle?.plate_number || ''}). Số yêu cầu bị ảnh hưởng: ${activeRequests.length}.`,
          status: incident_status.NOT_RECEIVED,
        },
      });

      return {
        ...updatedTrip,
        id: updatedTrip.id.toString(),
        driver_id: updatedTrip.driver_id.toString(),
        vehicle_id: updatedTrip.vehicle_id.toString(),
      };
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

    if (filters.departure_date) {
      const depDate = new Date(filters.departure_date);
      if (!isNaN(depDate.getTime())) {
        const startOfDay = new Date(depDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(depDate);
        endOfDay.setHours(23, 59, 59, 999);

        whereClause.departure_time = {
          gt: minDepartureTime,
          gte: startOfDay > minDepartureTime ? startOfDay : minDepartureTime,
          lte: endOfDay,
        };
      }
    }

    const hasPickupCoords = filters.pickup_lat !== undefined && filters.pickup_lng !== undefined;
    const hasDropoffCoords = filters.dropoff_lat !== undefined && filters.dropoff_lng !== undefined;

    // Chỉ lọc chuỗi bằng SQL khi không cung cấp tọa độ cho điểm tương ứng
    if (filters.origin_name && !hasPickupCoords) {
      whereClause.origin_name = { contains: filters.origin_name, mode: 'insensitive' };
    }

    if (filters.dest_name && !hasDropoffCoords) {
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

    const matchedTrips: any[] = [];

    for (const trip of trips) {
      // 1. Lọc theo sức chứa nếu có yêu cầu
      if (filters.type === 'RIDE' && filters.passenger_count) {
        const availableSeats = trip.seats_total - trip.seats_reserved;
        if (availableSeats < filters.passenger_count) continue;
      }

      if (filters.type === 'PACKAGE') {
        if (filters.cargo_weight_kg) {
          const availableWeight = trip.cargo_weight_total_kg - trip.cargo_weight_reserved_kg;
          if (availableWeight < filters.cargo_weight_kg) continue;
        }
        if (filters.cargo_area_m2) {
          const availableArea = trip.cargo_area_total_m2 - trip.cargo_area_reserved_m2;
          if (availableArea < filters.cargo_area_m2) continue;
        }
      }

      // 2. So sánh khoảng cách trắc địa điểm đón <= 15km và điểm trả <= 15km
      let pickupDist: number | undefined = undefined;
      let dropoffDist: number | undefined = undefined;

      if (hasPickupCoords) {
        pickupDist = calculateHaversineDistanceKm(
          filters.pickup_lat!,
          filters.pickup_lng!,
          trip.origin_lat,
          trip.origin_lng
        );
        if (pickupDist > 15) continue;
      }

      if (hasDropoffCoords) {
        dropoffDist = calculateHaversineDistanceKm(
          filters.dropoff_lat!,
          filters.dropoff_lng!,
          trip.dest_lat,
          trip.dest_lng
        );
        if (dropoffDist > 15) continue;
      }

      matchedTrips.push({
        ...trip,
        pickup_distance_km: pickupDist,
        dropoff_distance_km: dropoffDist,
      });
    }

    if (hasPickupCoords || hasDropoffCoords) {
      // Sắp xếp ưu tiên các chuyến có cự ly đón + trả gần nhất
      matchedTrips.sort((a, b) => {
        const sumA = (a.pickup_distance_km || 0) + (a.dropoff_distance_km || 0);
        const sumB = (b.pickup_distance_km || 0) + (b.dropoff_distance_km || 0);
        return sumA - sumB;
      });
    }

    return matchedTrips;
  }

  /**
   * US-02: Tìm kiếm chuyến xe bằng Ngôn ngữ tự nhiên với Gemini AI
   * Kết hợp Geocoding và bộ lọc bán kính <= 15km
   */
  static async searchTripsWithAi(prompt: string) {
    const parsed = await GeminiAdapter.parseSearchPrompt(prompt);

    let pickupCoords: { lat: number; lng: number } | null = null;
    let dropoffCoords: { lat: number; lng: number } | null = null;

    if (parsed.origin_name) {
      try {
        const res = await axios.get(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(parsed.origin_name)}&limit=1`,
          { timeout: 3000 }
        );
        const feat = res.data?.features?.[0];
        if (feat?.geometry?.coordinates) {
          pickupCoords = {
            lng: feat.geometry.coordinates[0],
            lat: feat.geometry.coordinates[1],
          };
        }
      } catch {}
    }

    if (parsed.dest_name) {
      try {
        const res = await axios.get(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(parsed.dest_name)}&limit=1`,
          { timeout: 3000 }
        );
        const feat = res.data?.features?.[0];
        if (feat?.geometry?.coordinates) {
          dropoffCoords = {
            lng: feat.geometry.coordinates[0],
            lat: feat.geometry.coordinates[1],
          };
        }
      } catch {}
    }

    const searchFilters: any = {
      origin_name: parsed.origin_name,
      dest_name: parsed.dest_name,
      departure_date: parsed.departure_date,
      pickup_lat: pickupCoords?.lat,
      pickup_lng: pickupCoords?.lng,
      dropoff_lat: dropoffCoords?.lat,
      dropoff_lng: dropoffCoords?.lng,
      seat_count: parsed.type === 'RIDE' ? parsed.passenger_count : undefined,
    };

    const trips = await this.searchTrips(searchFilters);

    return {
      trips,
      extracted_criteria: parsed,
      is_fallback: parsed.is_fallback,
      explanation: parsed.explanation,
    };
  }

  /**
   * Lấy lịch sử các chuyến xe đã kết thúc (COMPLETED / CANCELLED) của tài xế
   * Kèm thống kê tổng hợp số lượt khách, số kiện hàng, tổng tiền nhiên liệu nhận được
   */
  static async getDriverHistory(
    driverId: bigint,
    query?: { status?: string; from_date?: string; to_date?: string }
  ) {
    const whereClause: any = {
      driver_id: driverId,
      status: {
        in: [trip_status.COMPLETED, trip_status.CANCELLED],
      },
    };

    if (query?.status && (query.status === 'COMPLETED' || query.status === 'CANCELLED')) {
      whereClause.status = query.status as trip_status;
    }

    if (query?.from_date || query?.to_date) {
      whereClause.departure_time = {};
      if (query.from_date) {
        whereClause.departure_time.gte = new Date(query.from_date);
      }
      if (query.to_date) {
        const toD = new Date(query.to_date);
        toD.setHours(23, 59, 59, 999);
        whereClause.departure_time.lte = toD;
      }
    }

    const trips = await prisma.trip.findMany({
      where: whereClause,
      include: {
        vehicle: true,
        transport_requests: {
          where: {
            status: { in: [request_status.ACCEPTED, request_status.COMPLETED] },
          },
          include: {
            package_items: true,
            user: {
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
      orderBy: { departure_time: 'desc' },
    });

    // Tính thống kê tổng hợp
    const allDriverFinishedTrips = await prisma.trip.findMany({
      where: {
        driver_id: driverId,
        status: { in: [trip_status.COMPLETED, trip_status.CANCELLED] },
      },
      include: {
        transport_requests: {
          where: {
            status: { in: [request_status.ACCEPTED, request_status.COMPLETED] },
          },
          include: { package_items: true },
        },
      },
    });

    let totalCompletedTrips = 0;
    let totalCancelledTrips = 0;
    let totalPassengersServed = 0;
    let totalPackagesDelivered = 0;
    let totalFuelReceived = 0;

    for (const t of allDriverFinishedTrips) {
      if (t.status === trip_status.COMPLETED) {
        totalCompletedTrips++;
        for (const req of t.transport_requests) {
          if (req.type === 'RIDE') {
            totalPassengersServed += req.passenger_count || 1;
          } else {
            totalPackagesDelivered += req.package_items.length || 1;
          }
          if (req.shared_fuel_cost && req.shared_fuel_cost > 0) {
            totalFuelReceived += req.shared_fuel_cost;
          }
        }
      } else if (t.status === trip_status.CANCELLED) {
        totalCancelledTrips++;
      }
    }

    return {
      trips: trips.map((t) => ({
        ...t,
        id: t.id.toString(),
        driver_id: t.driver_id.toString(),
        vehicle_id: t.vehicle_id.toString(),
        transport_requests: t.transport_requests.map((r) => ({
          ...r,
          id: r.id.toString(),
          trip_id: r.trip_id.toString(),
          user_id: r.user_id.toString(),
          user: r.user ? { ...r.user, id: r.user.id.toString() } : null,
          package_items: r.package_items.map((p) => ({
            ...p,
            id: p.id.toString(),
            request_id: p.request_id.toString(),
          })),
        })),
      })),
      stats: {
        total_completed_trips: totalCompletedTrips,
        total_cancelled_trips: totalCancelledTrips,
        total_passengers_served: totalPassengersServed,
        total_packages_delivered: totalPackagesDelivered,
        total_fuel_received: Math.round(totalFuelReceived),
      },
    };
  }
}

