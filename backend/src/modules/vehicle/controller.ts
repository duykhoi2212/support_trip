import { Response, NextFunction } from 'express';
import { VehicleService } from './service.js';
import { createVehicleSchema, updateVehicleSchema } from './schema.js';
import { AuthenticatedRequest } from '../../middlewares/auth.js';
import { AppError } from '../../middlewares/errorHandler.js';

export class VehicleController {
  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập.');
      if (!req.file) throw new AppError(400, 'PHOTO_REQUIRED', 'Vui lòng tải lên ảnh chụp phương tiện.');

      const validated = createVehicleSchema.parse(req.body);
      const photoUrl = `/uploads/${req.file.filename}`;

      const vehicle = await VehicleService.createVehicle(req.user.id, validated, photoUrl);

      res.status(201).json({
        success: true,
        data: vehicle,
        message: 'Thêm phương tiện thành công.',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyVehicles(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập.');

      const vehicles = await VehicleService.getMyVehicles(req.user.id);
      res.status(200).json({
        success: true,
        data: vehicles,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập.');
      const vehicleId = BigInt(req.params.id);

      const vehicle = await VehicleService.getVehicleById(req.user.id, vehicleId);
      res.status(200).json({
        success: true,
        data: vehicle,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập.');
      const vehicleId = BigInt(req.params.id);
      const validated = updateVehicleSchema.parse(req.body);

      const updated = await VehicleService.updateVehicle(req.user.id, vehicleId, validated);
      res.status(200).json({
        success: true,
        data: updated,
        message: 'Cập nhật thông tin phương tiện thành công.',
      });
    } catch (error) {
      next(error);
    }
  }

  static async deactivate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập.');
      const vehicleId = BigInt(req.params.id);

      const updated = await VehicleService.deactivateVehicle(req.user.id, vehicleId);
      res.status(200).json({
        success: true,
        data: updated,
        message: 'Đã tạm ngừng sử dụng phương tiện.',
      });
    } catch (error) {
      next(error);
    }
  }

  static async activate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập.');
      const vehicleId = BigInt(req.params.id);

      const updated = await VehicleService.activateVehicle(req.user.id, vehicleId);
      res.status(200).json({
        success: true,
        data: updated,
        message: 'Đã kích hoạt lại phương tiện sẵn sàng nhận chuyến.',
      });
    } catch (error) {
      next(error);
    }
  }
}
