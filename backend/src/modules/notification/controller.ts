import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.js';
import { NotificationService } from './service.js';

export class NotificationController {
  static async getMyNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const notifications = await NotificationService.getMyNotifications(userId);
      res.json({
        success: true,
        data: notifications,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUnreadCount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const count = await NotificationService.getUnreadCount(userId);
      res.json({
        success: true,
        data: { unread_count: count },
      });
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const notificationId = BigInt(req.params.id);
      await NotificationService.markAsRead(userId, notificationId);
      res.json({
        success: true,
        message: 'Đã đánh dấu thông báo đã đọc',
      });
    } catch (error) {
      next(error);
    }
  }

  static async markAllAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      await NotificationService.markAllAsRead(userId);
      res.json({
        success: true,
        message: 'Đã đánh dấu tất cả thông báo đã đọc',
      });
    } catch (error) {
      next(error);
    }
  }
}
