import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { account_status, user_role } from '@prisma/client';
import { prisma } from '../../utils/prisma.js';
import { config } from '../../config/index.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { mailer } from '../../adapters/mail/mailer.js';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './schema.js';
import { z } from 'zod';

// Bộ nhớ đệm giới hạn tần suất yêu cầu quên mật khẩu (chống spam)
// Map: email -> danh sách mốc thời gian yêu cầu [number]
const forgotPasswordAttempts = new Map<string, number[]>();

function checkForgotPasswordRateLimit(email: string): void {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 phút
  const maxAttempts = 3;

  const attempts = (forgotPasswordAttempts.get(email) || []).filter((time) => now - time < windowMs);

  if (attempts.length >= maxAttempts) {
    throw new AppError(
      429,
      'TOO_MANY_REQUESTS',
      'Bạn đã yêu cầu đặt lại mật khẩu quá nhiều lần. Vui lòng thử lại sau 15 phút.'
    );
  }

  attempts.push(now);
  forgotPasswordAttempts.set(email, attempts);
}

export class AuthService {
  /**
   * CM-01: Đăng ký tài khoản (USER hoặc DRIVER)
   * Không thể đổi vai trò và số điện thoại sau khi đăng ký
   */
  static async register(input: z.infer<typeof registerSchema>) {
    // 1. Kiểm tra trùng số điện thoại theo vai trò
    const existingPhone = await prisma.user.findFirst({
      where: { phone: input.phone, role: input.role },
    });
    if (existingPhone) {
      throw new AppError(409, 'PHONE_EXISTS', `Số điện thoại này đã được đăng ký với vai trò ${input.role === user_role.DRIVER ? 'Tài xế' : 'Người dùng'}.`);
    }

    // 2. Kiểm tra trùng email theo vai trò
    const existingEmail = await prisma.user.findFirst({
      where: { email: input.email, role: input.role },
    });
    if (existingEmail) {
      throw new AppError(409, 'EMAIL_EXISTS', `Email này đã được đăng ký với vai trò ${input.role === user_role.DRIVER ? 'Tài xế' : 'Người dùng'}.`);
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
    // 1. Tìm user theo số điện thoại hoặc email (và vai trò nếu có)
    const whereClause: any = {
      OR: [{ phone: input.identifier }, { email: input.identifier }],
    };
    if (input.role) {
      whereClause.role = input.role;
    }

    const user = await prisma.user.findFirst({
      where: whereClause,
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

    // Kiểm tra mật khẩu mới không được trùng với mật khẩu hiện tại
    if (input.current_password === input.new_password) {
      throw new AppError(400, 'SAME_AS_CURRENT_PASSWORD', 'Mật khẩu mới không được trùng với mật khẩu hiện tại.');
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
   * Quên mật khẩu: Gửi đường dẫn đặt lại mật khẩu qua email (bảo mật, 1 lần dùng)
   */
  static async forgotPassword(input: z.infer<typeof forgotPasswordSchema>) {
    checkForgotPasswordRateLimit(input.email);

    const genericSuccessMessage =
      'Nếu địa chỉ email tồn tại trên hệ thống, chúng tôi đã gửi đường dẫn đặt lại mật khẩu đến hòm thư của bạn. Vui lòng kiểm tra (bao gồm cả thư mục Spam).';

    const whereClause: any = { email: input.email };
    if (input.role) {
      whereClause.role = input.role;
    }

    const user = await prisma.user.findFirst({
      where: whereClause,
    });

    // Không báo lỗi khi không tìm thấy email để chống kẻ xấu dò quét tài khoản
    if (!user) {
      return { message: genericSuccessMessage };
    }

    // Token được ký bằng JWT_SECRET + password_hash hiện tại.
    // Khi mật khẩu thay đổi thành công, password_hash thay đổi -> token tự động vô hiệu hóa vĩnh viễn (chỉ dùng 1 lần)
    const secretKey = `${config.JWT_SECRET}_${user.password_hash}`;
    const token = jwt.sign(
      { id: user.id.toString(), purpose: 'RESET_PASSWORD' },
      secretKey,
      { expiresIn: '15m' }
    );

    const resetLink = `${config.FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
    const roleLabel = user.role === 'DRIVER' ? 'Tài xế' : user.role === 'ADMIN' ? 'Quản trị viên' : 'Người dùng';

    await mailer.send({
      to: user.email,
      subject: `[GoX] Yêu cầu đặt lại mật khẩu tài khoản ${roleLabel}`,
      text: `Xin chào ${user.full_name},\n\nBạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu cho tài khoản ${roleLabel} (${user.email}).\n\nVui lòng truy cập đường dẫn sau để tạo mật khẩu mới (có hiệu lực trong 15 phút và chỉ sử dụng 1 lần):\n${resetLink}\n\nNếu bạn không yêu cầu hành động này, vui lòng bỏ qua email và tài khoản của bạn vẫn được an toàn.\n\nTrân trọng,\nĐội ngũ hỗ trợ GoX – Kết nối hành trình, tối ưu chuyến đi`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
          <h2 style="color: #059669; margin-top: 0;">GoX – Yêu cầu đặt lại mật khẩu</h2>
          <p>Xin chào <strong>${user.full_name}</strong>,</p>
          <p>Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong>${roleLabel}</strong> liên kết với email <strong>${user.email}</strong>.</p>
          <p>Vui lòng nhấn vào nút bên dưới để tiến hành đặt lại mật khẩu mới:</p>
          <div style="margin: 25px 0;">
            <a href="${resetLink}" style="background-color: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Đặt lại mật khẩu ${roleLabel}</a>
          </div>
          <p style="font-size: 13px; color: #64748b;">
            Đường dẫn này chỉ có hiệu lực trong <strong>15 phút</strong> và chỉ sử dụng được <strong>1 lần duy nhất</strong>.<br/>
            Nếu không thể nhấn vào nút trên, bạn có thể sao chép liên kết này vào trình duyệt:<br/>
            <a href="${resetLink}" style="color: #059669; word-break: break-all;">${resetLink}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này. Tài khoản của bạn vẫn được bảo mật an toàn.</p>
        </div>
      `,
    });

    return { message: genericSuccessMessage };
  }

  /**
   * Đặt lại mật khẩu mới bằng Token bảo mật 1 lần
   */
  static async resetPassword(input: z.infer<typeof resetPasswordSchema>) {
    // 1. Giải mã token thô để lấy userId
    const decodedRaw = jwt.decode(input.token) as { id?: string; purpose?: string } | null;
    if (!decodedRaw || !decodedRaw.id || decodedRaw.purpose !== 'RESET_PASSWORD') {
      throw new AppError(400, 'INVALID_RESET_TOKEN', 'Đường dẫn đặt lại mật khẩu không hợp lệ.');
    }

    // 2. Tìm user trong CSDL
    const user = await prisma.user.findUnique({
      where: { id: BigInt(decodedRaw.id) },
    });

    if (!user) {
      throw new AppError(400, 'INVALID_RESET_TOKEN', 'Tài khoản không tồn tại hoặc đã bị xóa.');
    }

    // 3. Xác minh chữ ký với Secret Key gắn chặt với password_hash hiện tại
    const secretKey = `${config.JWT_SECRET}_${user.password_hash}`;
    try {
      jwt.verify(input.token, secretKey);
    } catch {
      throw new AppError(
        400,
        'EXPIRED_RESET_TOKEN',
        'Đường dẫn đặt lại mật khẩu đã hết hạn (quá 15 phút) hoặc đã được sử dụng trước đó. Vui lòng gửi lại yêu cầu mới.'
      );
    }

    // 4. Băm mật khẩu mới và lưu vào CSDL
    const newPasswordHash = await bcrypt.hash(input.new_password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash: newPasswordHash },
    });

    return { message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay bằng mật khẩu mới.' };
  }
}
