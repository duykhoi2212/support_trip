import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { user_role, account_status } from '@prisma/client';
import { config } from '../config/index.js';
import { prisma } from '../utils/prisma.js';
import { AppError } from './errorHandler.js';

export interface AuthUserPayload {
  id: string; // BigInt converted to string
  role: user_role;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: bigint;
    phone: string;
    email: string;
    full_name: string;
    role: user_role;
    status: account_status;
  };
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    next(new AppError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập để tiếp tục.'));
    return;
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as AuthUserPayload;
    const user = await prisma.user.findUnique({
      where: { id: BigInt(decoded.id) },
      select: {
        id: true,
        phone: true,
        email: true,
        full_name: true,
        role: true,
        status: true,
        locked_until: true,
      },
    });

    if (!user) {
      next(new AppError(401, 'USER_NOT_FOUND', 'Tài khoản không tồn tại trên hệ thống.'));
      return;
    }

    // Kiểm tra trạng thái tài khoản
    if (user.status === account_status.LOCKED_PERM) {
      next(new AppError(403, 'ACCOUNT_LOCKED_PERMANENT', 'Tài khoản của bạn đã bị khóa vĩnh viễn do vi phạm quy định.'));
      return;
    }

    if (user.status === account_status.LOCKED_TEMP) {
      if (user.locked_until && user.locked_until > new Date()) {
        next(new AppError(403, 'ACCOUNT_LOCKED_TEMPORARY', `Tài khoản tạm thời bị khóa đến ${user.locked_until.toLocaleString('vi-VN')}.`));
        return;
      }
    }

    req.user = {
      id: user.id,
      phone: user.phone,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      status: user.status,
    };

    next();
  } catch (error) {
    next(new AppError(401, 'INVALID_TOKEN', 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.'));
  }
}

export function requireRole(allowedRoles: user_role[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập để tiếp tục.'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new AppError(403, 'FORBIDDEN_ROLE', 'Bạn không có quyền thực hiện hành động này.'));
      return;
    }

    next();
  };
}

