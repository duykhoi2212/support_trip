import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { MulterError } from 'multer';
import { Prisma } from '@prisma/client';
import { config } from '../config/index.js';

export class AppError extends Error {
  public statusCode: number;
  public code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Chuyển đổi tham số URL sang BigInt an toàn, trả về HTTP 400 nếu ID không hợp lệ
 */
export function parseBigIntId(raw: string | undefined, label = 'ID'): bigint {
  if (!raw || !/^\d+$/.test(raw.trim())) {
    throw new AppError(400, 'INVALID_ID', `${label} không hợp lệ.`);
  }
  return BigInt(raw.trim());
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Lỗi validate từ Zod
  if (err instanceof ZodError) {
    const firstIssue = err.issues[0];
    const message = firstIssue
      ? `${firstIssue.path.join('.') ? `${firstIssue.path.join('.')}: ` : ''}${firstIssue.message}`
      : 'Dữ liệu gửi lên không hợp lệ.';
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message,
        details: err.issues,
      },
    });
    return;
  }

  // Lỗi upload file từ Multer (quá dung lượng, sai trường...)
  if (err instanceof MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `Dung lượng ảnh vượt quá giới hạn tối đa ${config.MAX_FILE_SIZE_MB || 5} MB.`
        : 'Tải ảnh lên thất bại. Vui lòng kiểm tra định dạng và dung lượng tệp.';
    res.status(400).json({
      success: false,
      error: {
        code: err.code,
        message,
      },
    });
    return;
  }

  // Lỗi nghiệp vụ có kiểm soát (AppError)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // Lỗi chuyển đổi BigInt từ URL param không hợp lệ
  if (err instanceof SyntaxError && typeof err.message === 'string' && err.message.includes('BigInt')) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Mã định danh không hợp lệ.',
      },
    });
    return;
  }

  // Lỗi Prisma thường gặp
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Dữ liệu bị trùng lặp trên hệ thống.',
        },
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Không tìm thấy bản ghi dữ liệu yêu cầu.',
        },
      });
      return;
    }
  }

  // Lỗi không lường trước
  console.error('🔥 Lỗi máy chủ chưa được xử lý:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Đã xảy ra lỗi máy chủ nội bộ. Vui lòng thử lại sau.',
    },
  });
}

