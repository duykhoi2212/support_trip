import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.js';
import { RequestService } from './service.js';
import {
  createRideRequestSchema,
  createPackageRequestSchema,
  rejectRequestSchema,
  cancelRequestSchema,
  updateProgressSchema,
} from './schema.js';

export class RequestController {
  /**
   * Tạo yêu cầu đi nhờ xe (User)
   */
  static async createRide(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const input = createRideRequestSchema.parse(req.body);
      const request = await RequestService.createRideRequest(userId, input);
      res.status(201).json({
        success: true,
        data: request,
        message: 'Gửi yêu cầu đi nhờ xe thành công, vui lòng chờ tài xế xét duyệt.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Tạo yêu cầu gửi đồ (User)
   */
  static async createPackage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      if (req.file) {
        req.body.photo_url = `/uploads/${req.file.filename}`;
      }
      const input = createPackageRequestSchema.parse(req.body);
      const request = await RequestService.createPackageRequest(userId, input);
      res.status(201).json({
        success: true,
        data: request,
        message: 'Gửi yêu cầu gửi hàng thành công, vui lòng chờ tài xế xét duyệt.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Xem danh sách yêu cầu của tôi (User)
   */
  static async getMine(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const requests = await RequestService.getMyRequests(userId);
      res.json({
        success: true,
        data: requests,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Tài xế xem danh sách yêu cầu trên chuyến xe (Driver)
   */
  static async getTripRequests(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const driverId = req.user!.id;
      const tripId = BigInt(req.params.tripId);
      const requests = await RequestService.getTripRequests(driverId, tripId);
      res.json({
        success: true,
        data: requests,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Tài xế chấp nhận yêu cầu (Driver)
   */
  static async accept(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const driverId = req.user!.id;
      const requestId = BigInt(req.params.id);
      const result = await RequestService.acceptRequest(driverId, requestId);
      res.json({
        success: true,
        data: result,
        message: 'Đã chấp nhận yêu cầu vận chuyển.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Tài xế từ chối yêu cầu (Driver)
   */
  static async reject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const driverId = req.user!.id;
      const requestId = BigInt(req.params.id);
      const input = rejectRequestSchema.parse(req.body);
      const result = await RequestService.rejectRequest(driverId, requestId, input);
      res.json({
        success: true,
        data: result,
        message: 'Đã từ chối yêu cầu vận chuyển.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Người dùng hủy yêu cầu (User)
   */
  static async cancel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const requestId = BigInt(req.params.id);
      const input = cancelRequestSchema.parse(req.body);
      const result = await RequestService.cancelRequest(userId, requestId, input);
      res.json({
        success: true,
        data: result,
        message: 'Đã hủy yêu cầu vận chuyển thành công.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Tài xế bắt đầu chuyến xe (Driver)
   */
  static async startTrip(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const driverId = req.user!.id;
      const tripId = BigInt(req.params.tripId);
      const result = await RequestService.startTrip(driverId, tripId);
      res.json({
        success: true,
        data: result,
        message: 'Chuyến xe đã chính thức bắt đầu khởi hành.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Tài xế cập nhật tiến trình đón/trả/giao hàng (Driver)
   */
  static async updateProgress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const driverId = req.user!.id;
      const requestId = BigInt(req.params.id);
      const input = updateProgressSchema.parse(req.body);
      const result = await RequestService.updateProgress(driverId, requestId, input);
      res.json({
        success: true,
        data: result,
        message: 'Cập nhật tiến trình thành công.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Tài xế kết thúc chuyến xe (Driver)
   */
  static async completeTrip(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const driverId = req.user!.id;
      const tripId = BigInt(req.params.tripId);
      const result = await RequestService.completeTrip(driverId, tripId);
      res.json({
        success: true,
        data: result,
        message: 'Chuyến xe đã hoàn thành toàn bộ hành trình.',
      });
    } catch (error) {
      next(error);
    }
  }
}
