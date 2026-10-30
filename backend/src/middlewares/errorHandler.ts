import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

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

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Lỗi validate từ Zod
  if (err instanceof ZodError) {
    const firstIssue = err.issues[0];
    const message = firstIssue ? `${firstIssue.path.join('.')}: ${firstIssue.message}` : 'Dữ liệu gửi lên không hợp lệ';
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: message,
        details: err.issues,
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

