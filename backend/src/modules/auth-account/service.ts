import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { account_status, user_role } from '@prisma/client';
import { prisma } from '../../utils/prisma.js';
import { config } from '../../config/index.js';
import { AppError } from '../../middlewares/errorHandler.js';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './schema.js';
import { z } from 'zod';

export class AuthService {
  /**
   * CM-01: Đăng ký tài khoản (USER hoặc DRIVER)
   * Không thể đổi vai trò và số điện thoại sau khi đăng ký
   */
  static async register(input: z.infer<typeof registerSchema>) {
    // 1. Kiểm tra trùng số điện thoại
    const existingPhone = await prisma.user.findUnique({
      where: { phone: input.phone },
    });
    if (existingPhone) {
      throw new AppError(409, 'PHONE_EXISTS', 'Số điện thoại này đã được đăng ký trên hệ thống.');
    }

    // 2. Kiểm tra trùng email
    const existingEmail = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existingEmail) {
      throw new AppError(409, 'EMAIL_EXISTS', 'Email này đã được đăng ký trên hệ thống.');
    }

    // 3. Băm mật khẩu (bcrypt 10 rounds)
    const passwordHash = await bcrypt.hash(input.password, 10);

    // 4. Tạo tài khoản trong CSDL
    const user = await prisma.user.create({
      data: {
        phone: input.phone,
        email: input.email,
        password_hash: passwordHash,
        full_name: input.full_name,
        role: input.role,
        status: account_status.ACTIVE,
      },
      select: {
        id: true,
        phone: true,
        email: true,
        full_name: true,
        role: true,
        status: true,
        avatar_url: true,
        created_at: true,
      },
    });

    // 5. Cấp phát JWT token
    const token = jwt.sign(
      { id: user.id.toString(), role: user.role },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return { user, token };
  }

  /**
   * CM-02: Đăng nhập hệ thống (Bằng số điện thoại hoặc email)
   */
  static async login(input: z.infer<typeof loginSchema>) {
    // 1. Tìm user theo số điện thoại hoặc email
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ phone: input.identifier }, { email: input.identifier }],
      },
    });

    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Số điện thoại, email hoặc mật khẩu không chính xác.');
    }

    // 2. Kiểm tra mật khẩu
    const isPasswordValid = await bcrypt.compare(input.password, user.password_hash);
    if (!isPasswordValid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Số điện thoại, email hoặc mật khẩu không chính xác.');
    }

    // 3. Kiểm tra trạng thái tài khoản
    if (user.status === account_status.LOCKED_PERM) {
      throw new AppError(
        403,
        'ACCOUNT_LOCKED_PERMANENT',
        'Tài khoản của bạn đã bị khóa vĩnh viễn do vi phạm quy định của hệ thống.'
      );
    }

    if (user.status === account_status.LOCKED_TEMP) {
      const now = new Date();
      if (user.locked_until && user.locked_until > now) {
        const formattedDate = user.locked_until.toLocaleString('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
        });
        throw new AppError(
          403,
          'ACCOUNT_LOCKED_TEMPORARY',
          `Tài khoản của bạn đang bị khóa tạm thời đến ${formattedDate} do vượt quá tỷ lệ hủy chuyến.`
        );
      } else {
        // Đã hết thời hạn khóa tạm, tự động khôi phục ACTIVE
        await prisma.user.update({
          where: { id: user.id },
          data: { status: account_status.ACTIVE, locked_until: null },
        });
        user.status = account_status.ACTIVE;
      }
    }

    // 4. Tạo token
    const token = jwt.sign(
      { id: user.id.toString(), role: user.role },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        status: user.status,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
      },
      token,
    };
  }

  /**
   * CM-03: Lấy thông tin cá nhân hiện tại
   */
  static async getProfile(userId: bigint) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        email: true,
        full_name: true,
        role: true,
        status: true,
        avatar_url: true,
        created_at: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Không tìm thấy thông tin tài khoản.');
    }

    return user;
  }

  /**
   * CM-03: Cập nhật thông tin cá nhân (họ tên, email)
   * Tuyệt đối không cho phép đổi SĐT và Role
   */
  static async updateProfile(userId: bigint, input: z.infer<typeof updateProfileSchema>) {
    // Nếu có đổi email, kiểm tra trùng lặp
    if (input.email) {
      const existingEmail = await prisma.user.findFirst({
        where: {
          email: input.email,
          NOT: { id: userId },
        },
      });
      if (existingEmail) {
        throw new AppError(409, 'EMAIL_EXISTS', 'Email này đã được sử dụng bởi một tài khoản khác.');
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        full_name: input.full_name,
        email: input.email,
      },
      select: {
        id: true,
        phone: true,
        email: true,
        full_name: true,
        role: true,
        status: true,
        avatar_url: true,
        created_at: true,
      },
    });

    return updatedUser;
  }

  /**
   * CM-03: Đổi mật khẩu tài khoản
   */
  static async changePassword(userId: bigint, input: z.infer<typeof changePasswordSchema>) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Không tìm thấy thông tin tài khoản.');
    }

    // Kiểm tra mật khẩu hiện tại
    const isCurrentPasswordValid = await bcrypt.compare(input.current_password, user.password_hash);
    if (!isCurrentPasswordValid) {
      throw new AppError(400, 'INCORRECT_CURRENT_PASSWORD', 'Mật khẩu hiện tại không chính xác.');
    }

    // Băm mật khẩu mới
    const newPasswordHash = await bcrypt.hash(input.new_password, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password_hash: newPasswordHash },
    });

    return { message: 'Đổi mật khẩu thành công.' };
  }

  /**
   * CM-03: Cập nhật ảnh đại diện (Avatar)
   */
  static async updateAvatar(userId: bigint, relativeFilePath: string) {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatar_url: relativeFilePath },
      select: {
        id: true,
        phone: true,
        email: true,
        full_name: true,
        role: true,
        status: true,
        avatar_url: true,
        created_at: true,
      },
    });

    return updatedUser;
  }

  /**
   * Quên mật khẩu: Xác thực SĐT + Email và sinh mã Token đặt lại
   */
  static async forgotPassword(input: z.infer<typeof forgotPasswordSchema>) {
    const user = await prisma.user.findFirst({
      where: {
        phone: input.phone,
        email: input.email,
      },
    });

    if (!user) {
      throw new AppError(
        404,
        'USER_NOT_FOUND',
        'Không tìm thấy tài khoản khớp với số điện thoại và email đã cung cấp.'
      );
    }

    // Tạo JWT token đặt lại mật khẩu có thời hạn 15 phút
    const resetToken = jwt.sign(
      { id: user.id.toString(), purpose: 'RESET_PASSWORD' },
      config.JWT_SECRET,
      { expiresIn: '15m' }
    );

    return {
      message: 'Mã xác nhận đặt lại mật khẩu hợp lệ (hiệu lực trong 15 phút).',
      reset_token: resetToken,
    };
  }

  /**
   * Đặt lại mật khẩu mới bằng Token
   */
  static async resetPassword(input: z.infer<typeof resetPasswordSchema>) {
    try {
      const decoded = jwt.verify(input.reset_token, config.JWT_SECRET) as {
        id: string;
        purpose: string;
      };

      if (decoded.purpose !== 'RESET_PASSWORD') {
        throw new AppError(400, 'INVALID_RESET_TOKEN', 'Mã xác nhận không hợp lệ.');
      }

      const newPasswordHash = await bcrypt.hash(input.new_password, 10);

      await prisma.user.update({
        where: { id: BigInt(decoded.id) },
        data: { password_hash: newPasswordHash },
      });

      return { message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.' };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        400,
        'EXPIRED_RESET_TOKEN',
        'Mã đặt lại mật khẩu đã hết hạn hoặc không hợp lệ. Vui lòng thử lại.'
      );
    }
  }
}
