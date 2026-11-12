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
   * Kích hoạt thủ công xử lý chuyến xe quá hạn khởi hành > 2h
   */
  static async triggerOverdueTrips(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SchedulerService.handleOverdueTrips();
      res.status(200).json({
        success: true,
        data: result,
        message: `Đã nhắc nhở ${result.remindedCount} chuyến, hủy ${result.autoCancelledCount} chuyến quá hạn 2h và tạo ${result.incidentReportsCreated} báo cáo sự cố gửi Admin.`,
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
        activeJobs: [
          'CS-01 (Mỗi phút: Đóng chuyến -6h & Hết hạn PENDING)',
          'CS-OVERDUE (Mỗi phút: Nhắc nhở giờ đi & Hủy chuyến quá hạn 2h tạo sự cố)',
          'CS-02 (23:59 CN: Chốt tỷ lệ hủy tuần giờ VN)',
          'CS-03 (Mỗi 10 phút: Mở khóa tài khoản hết hạn phạt 14 ngày)',
        ],
        timezone: 'Asia/Ho_Chi_Minh',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

