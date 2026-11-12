import { Request, Response, NextFunction } from 'express';
import { SchedulerService } from './service.js';

export class SchedulerController {
  /**
   * Kích hoạt thủ công CS-01: Quét đóng chuyến -6h
   */
  static async triggerCloseTrips(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SchedulerService.closeTripsBefore6h();
      res.status(200).json({
        success: true,
        data: result,
        message: `Đã đóng ${result.closedTripsCount} chuyến xe và hết hạn ${result.expiredRequestsCount} yêu cầu.`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Kích hoạt thủ công CS-02: Chốt tỷ lệ hủy tuần
   */
  static async triggerWeeklyCancellation(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SchedulerService.settleWeeklyCancellationRate();
      res.status(200).json({
        success: true,
        data: result,
        message: `Đã đánh giá ${result.evaluatedUsersCount} người dùng, xử phạt ${result.violationsCount} trường hợp vi phạm.`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Kích hoạt thủ công CS-03: Mở khóa tài khoản tạm khóa hết hạn
   */
  static async triggerUnlockAccounts(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SchedulerService.unlockExpiredLockedAccounts();
      res.status(200).json({
        success: true,
        data: result,
        message: `Đã mở khóa tự động cho ${result.unlockedCount} tài khoản.`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lấy trạng thái hoạt động của Scheduler
   */
  static async getStatus(_req: Request, res: Response) {
    res.status(200).json({
      success: true,
      data: {
        activeJobs: ['CS-01 (Mỗi phút)', 'CS-02 (23:59 CN)', 'CS-03 (Mỗi 10 phút)'],
        timezone: 'Asia/Ho_Chi_Minh',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

