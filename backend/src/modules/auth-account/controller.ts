import { Request, Response, NextFunction } from 'express';
import { AuthService } from './service.js';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './schema.js';
import { AuthenticatedRequest } from '../../middlewares/auth.js';
import { AppError } from '../../middlewares/errorHandler.js';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = registerSchema.parse(req.body);
      const result = await AuthService.register(validatedData);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Đăng ký tài khoản thành công.',
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = loginSchema.parse(req.body);
      const result = await AuthService.login(validatedData);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Đăng nhập thành công.',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập.');
      }
      const user = await AuthService.getProfile(req.user.id);
      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập.');
      }
      const validatedData = updateProfileSchema.parse(req.body);
      const updatedUser = await AuthService.updateProfile(req.user.id, validatedData);
      res.status(200).json({
        success: true,
        data: updatedUser,
        message: 'Cập nhật thông tin cá nhân thành công.',
      });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập.');
      }
      const validatedData = changePasswordSchema.parse(req.body);
      const result = await AuthService.changePassword(req.user.id, validatedData);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateAvatar(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập.');
      }
      if (!req.file) {
        throw new AppError(400, 'FILE_MISSING', 'Vui lòng chọn một tệp hình ảnh để tải lên.');
      }

      const relativePath = `/uploads/${req.file.filename}`;
      const updatedUser = await AuthService.updateAvatar(req.user.id, relativePath);

      res.status(200).json({
        success: true,
        data: updatedUser,
        message: 'Cập nhật ảnh đại diện thành công.',
      });
    } catch (error) {
      next(error);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = forgotPasswordSchema.parse(req.body);
      const result = await AuthService.forgotPassword(validatedData);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = resetPasswordSchema.parse(req.body);
      const result = await AuthService.resetPassword(validatedData);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

