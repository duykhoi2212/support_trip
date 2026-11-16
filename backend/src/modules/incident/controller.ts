import { Response, NextFunction } from 'express';
import { IncidentService } from './service.js';
import { createIncidentSchema } from './schema.js';
import { AuthenticatedRequest } from '../../middlewares/auth.js';
import { AppError } from '../../middlewares/errorHandler.js';

export class IncidentController {
  static async report(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập.');

      const validated = createIncidentSchema.parse(req.body);
      const report = await IncidentService.reportIncident(req.user.id, validated);

      res.status(201).json({
        success: true,
        data: report,
        message: 'Gửi báo cáo sự cố thành công. Quản trị viên sẽ kiểm tra và hỗ trợ bạn trong thời gian sớm nhất.',
      });
    } catch (error) {
      next(error);
    }
  }
}
