import { Request, Response, NextFunction } from 'express';
import { AdminService } from './service.js';
import { AuthenticatedRequest } from '../../middlewares/auth.js';
import { AppError } from '../../middlewares/errorHandler.js';

export class AdminController {
  static async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AdminService.getUsers(req.query);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async unlockUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập.');
      const adminId = BigInt(req.user.id);
      const targetUserId = BigInt(req.params.id);
      const result = await AdminService.unlockUser(adminId, targetUserId, req.body);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getIncidents(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AdminService.getIncidents(req.query);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateIncidentStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập.');
      const adminId = BigInt(req.user.id);
      const incidentId = BigInt(req.params.id);
      const result = await AdminService.updateIncidentStatus(adminId, incidentId, req.body);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getStatisticsOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AdminService.getStatisticsOverview(req.query);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTripsByDate(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AdminService.getTripsByDate(req.query);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
