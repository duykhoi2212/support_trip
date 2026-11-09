import { vehicle_status, trip_status } from '@prisma/client';
import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { createVehicleSchema, updateVehicleSchema } from './schema.js';
import { z } from 'zod';

export class VehicleService {
  /**
   * DR-04: Thêm phương tiện mới kèm ảnh xe bắt buộc
   */
  static async createVehicle(
    driverId: bigint,
    input: z.infer<typeof createVehicleSchema>,
    photoUrl: string
  ) {
    if (!photoUrl) {
      throw new AppError(400, 'PHOTO_REQUIRED', 'Ảnh chụp phương tiện là bắt buộc.');
    }

    // 1. Kiểm tra không trùng (loại xe + biển số)
    const existing = await prisma.vehicle.findUnique({
      where: {
        type_plate_number: {
          type: input.type,
          plate_number: input.plate_number,
        },
      },
    });

    if (existing) {
      throw new AppError(
        409,
        'VEHICLE_EXISTS',
        `Biển số ${input.plate_number} đã được đăng ký cho loại xe này trong hệ thống.`
      );
    }

    // 2. Tạo bản ghi phương tiện
    const vehicle = await prisma.vehicle.create({
      data: {
        driver_id: driverId,
        type: input.type,
        plate_number: input.plate_number,
        brand_model: input.brand_model,
        color: input.color,
        seat_count: input.seat_count,
        cargo_area_m2: input.cargo_area_m2,
        cargo_max_kg: input.cargo_max_kg,
        photo_url: photoUrl,
        status: vehicle_status.ACTIVE,
      },
    });

    return vehicle;
  }

  /**
   * DR-04: Lấy danh sách phương tiện của tài xế
   */
  static async getMyVehicles(driverId: bigint) {
    return prisma.vehicle.findMany({
      where: { driver_id: driverId },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * DR-04: Lấy chi tiết phương tiện
   */
  static async getVehicleById(driverId: bigint, vehicleId: bigint) {
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        driver_id: driverId,
      },
    });

    if (!vehicle) {
      throw new AppError(404, 'VEHICLE_NOT_FOUND', 'Không tìm thấy phương tiện hoặc bạn không có quyền truy cập.');
    }

    return vehicle;
  }

  /**
   * DR-04: Cập nhật thông tin phương tiện (màu sắc, dòng xe)
   */
  static async updateVehicle(
    driverId: bigint,
    vehicleId: bigint,
    input: z.infer<typeof updateVehicleSchema>
  ) {
    await this.getVehicleById(driverId, vehicleId);

    return prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        brand_model: input.brand_model,
        color: input.color,
      },
    });
  }

  /**
   * DR-04: Ngừng sử dụng xe (Chuyển sang INACTIVE)
   * Quy tắc nghiệp vụ số 10: Không ngừng sử dụng được xe đang gắn chuyến hoạt động (OPEN, CLOSED, IN_PROGRESS)
   */
  static async deactivateVehicle(driverId: bigint, vehicleId: bigint) {
    const vehicle = await this.getVehicleById(driverId, vehicleId);

    if (vehicle.status === vehicle_status.INACTIVE) {
      return vehicle;
    }

    // Kiểm tra xe có chuyến đang hoạt động không
    const activeTrip = await prisma.trip.findFirst({
      where: {
        vehicle_id: vehicleId,
        status: {
          in: [trip_status.OPEN, trip_status.CLOSED, trip_status.IN_PROGRESS],
        },
      },
    });

    if (activeTrip) {
      throw new AppError(
        400,
        'VEHICLE_IN_ACTIVE_TRIP',
        `Không thể ngừng sử dụng phương tiện vì đang gắn với chuyến xe ${activeTrip.code} chưa kết thúc.`
      );
    }

    return prisma.vehicle.update({
      where: { id: vehicleId },
      data: { status: vehicle_status.INACTIVE },
    });
  }

  /**
   * DR-04: Kích hoạt lại phương tiện (Chuyển sang ACTIVE)
   */
  static async activateVehicle(driverId: bigint, vehicleId: bigint) {
    await this.getVehicleById(driverId, vehicleId);

    return prisma.vehicle.update({
      where: { id: vehicleId },
      data: { status: vehicle_status.ACTIVE },
    });
  }
}

