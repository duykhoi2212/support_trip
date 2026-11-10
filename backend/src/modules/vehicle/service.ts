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
   * DR-04: Lấy danh sách phương tiện của tài xế (chưa bị xóa)
   */
  static async getMyVehicles(driverId: bigint) {
    return prisma.vehicle.findMany({
      where: {
        driver_id: driverId,
        is_deleted: false,
      },
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
        is_deleted: false,
      },
    });

    if (!vehicle) {
      throw new AppError(404, 'VEHICLE_NOT_FOUND', 'Không tìm thấy phương tiện hoặc bạn không có quyền truy cập.');
    }

    return vehicle;
  }

  /**
   * DR-04: Cập nhật thông tin phương tiện (dòng xe, màu sắc, sức chứa, ảnh)
   */
  static async updateVehicle(
    driverId: bigint,
    vehicleId: bigint,
    input: z.infer<typeof updateVehicleSchema>,
    newPhotoUrl?: string
  ) {
    const vehicle = await this.getVehicleById(driverId, vehicleId);

    // Kiểm tra nếu xe đang gắn với chuyến xe hoạt động (OPEN, CLOSED, IN_PROGRESS)
    const activeTrip = await prisma.trip.findFirst({
      where: {
        vehicle_id: vehicleId,
        status: { in: [trip_status.OPEN, trip_status.CLOSED, trip_status.IN_PROGRESS] },
      },
    });

    if (activeTrip) {
      // Nếu có chuyến đang mở hoặc đang chạy, chặn sửa đổi sức chứa
      if (
        (input.seat_count !== undefined && input.seat_count !== vehicle.seat_count) ||
        (input.cargo_area_m2 !== undefined && input.cargo_area_m2 !== vehicle.cargo_area_m2) ||
        (input.cargo_max_kg !== undefined && input.cargo_max_kg !== vehicle.cargo_max_kg)
      ) {
        throw new AppError(
          400,
          'VEHICLE_IN_ACTIVE_TRIP',
          `Không thể thay đổi sức chứa của phương tiện vì đang gắn với chuyến xe ${activeTrip.code} chưa kết thúc.`
        );
      }
    }

    const dataToUpdate: any = {};
    if (input.brand_model !== undefined) dataToUpdate.brand_model = input.brand_model;
    if (input.color !== undefined) dataToUpdate.color = input.color;
    if (input.seat_count !== undefined) dataToUpdate.seat_count = input.seat_count;
    if (input.cargo_area_m2 !== undefined) dataToUpdate.cargo_area_m2 = input.cargo_area_m2;
    if (input.cargo_max_kg !== undefined) dataToUpdate.cargo_max_kg = input.cargo_max_kg;
    if (newPhotoUrl) dataToUpdate.photo_url = newPhotoUrl;

    return prisma.vehicle.update({
      where: { id: vehicleId },
      data: dataToUpdate,
    });
  }

  /**
   * DR-04: Xóa phương tiện
   * Ràng buộc:
   * 1. Chặn xóa nếu xe đang gắn với chuyến xe chưa kết thúc
   * 2. Nếu xe chưa có chuyến nào -> Xóa vĩnh viễn
   * 3. Nếu xe đã từng có chuyến trong quá khứ -> Xóa mềm để bảo toàn lịch sử chuyến đi
   */
  static async deleteVehicle(driverId: bigint, vehicleId: bigint) {
    await this.getVehicleById(driverId, vehicleId);

    // 1. Chặn xóa nếu xe đang gắn với chuyến xe chưa kết thúc
    const activeTrip = await prisma.trip.findFirst({
      where: {
        vehicle_id: vehicleId,
        status: { in: [trip_status.OPEN, trip_status.CLOSED, trip_status.IN_PROGRESS] },
      },
    });

    if (activeTrip) {
      throw new AppError(
        400,
        'VEHICLE_IN_ACTIVE_TRIP',
        `Không thể xóa phương tiện vì đang gắn với chuyến xe ${activeTrip.code} chưa kết thúc.`
      );
    }

    // 2. Kiểm tra xem xe đã có chuyến đi nào trong quá khứ chưa
    const tripCount = await prisma.trip.count({
      where: { vehicle_id: vehicleId },
    });

    if (tripCount === 0) {
      // Chưa từng chạy chuyến nào -> Xóa vĩnh viễn khỏi CSDL
      await prisma.vehicle.delete({
        where: { id: vehicleId },
      });
      return { message: 'Đã xóa hoàn toàn phương tiện khỏi hệ thống.' };
    } else {
      // Đã có chuyến xe trong quá khứ -> Soft delete để bảo toàn lịch sử chuyến đi
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: {
          is_deleted: true,
          status: vehicle_status.INACTIVE,
        },
      });
      return { message: 'Đã xóa phương tiện khỏi danh sách của bạn (lịch sử các chuyến đi cũ vẫn được lưu trữ an toàn).' };
    }
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

