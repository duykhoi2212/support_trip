import { z } from 'zod';
import { user_role } from '@prisma/client';

// Regex kiểm tra số điện thoại Việt Nam (10 chữ số, đầu 03, 05, 07, 08, 09)
const phoneRegex = /(03|05|07|08|09)+([0-9]{8})\b/;

export const registerSchema = z.object({
  phone: z
    .string({ required_error: 'Vui lòng nhập số điện thoại' })
    .regex(phoneRegex, 'Số điện thoại không đúng định dạng Việt Nam (10 số, đầu 03, 05, 07, 08, 09)'),
  email: z
    .string({ required_error: 'Vui lòng nhập email' })
    .email('Định dạng email không hợp lệ'),
  password: z
    .string({ required_error: 'Vui lòng nhập mật khẩu' })
    .min(8, 'Mật khẩu phải có độ dài tối thiểu 8 ký tự'),
  full_name: z
    .string({ required_error: 'Vui lòng nhập họ và tên' })
    .min(2, 'Họ và tên phải có ít nhất 2 ký tự')
    .max(100, 'Họ và tên không được vượt quá 100 ký tự'),
  role: z.enum([user_role.USER, user_role.DRIVER], {
    required_error: 'Vui lòng chọn vai trò (Người dùng hoặc Tài xế)',
  }),
});

export const loginSchema = z.object({
  // Cho phép đăng nhập bằng số điện thoại hoặc email
  identifier: z
    .string({ required_error: 'Vui lòng nhập số điện thoại hoặc email' })
    .min(1, 'Vui lòng nhập số điện thoại hoặc email'),
  password: z
    .string({ required_error: 'Vui lòng nhập mật khẩu' })
    .min(1, 'Vui lòng nhập mật khẩu'),
});

export const updateProfileSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Họ và tên phải có ít nhất 2 ký tự')
    .max(100, 'Họ và tên không được vượt quá 100 ký tự')
    .optional(),
  email: z.string().email('Định dạng email không hợp lệ').optional(),
});

export const changePasswordSchema = z.object({
  current_password: z
    .string({ required_error: 'Vui lòng nhập mật khẩu hiện tại' })
    .min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  new_password: z
    .string({ required_error: 'Vui lòng nhập mật khẩu mới' })
    .min(8, 'Mật khẩu mới phải có tối thiểu 8 ký tự'),
});

export const forgotPasswordSchema = z.object({
  phone: z
    .string({ required_error: 'Vui lòng nhập số điện thoại' })
    .regex(phoneRegex, 'Số điện thoại không đúng định dạng'),
  email: z
    .string({ required_error: 'Vui lòng nhập email' })
    .email('Định dạng email không hợp lệ'),
});

export const resetPasswordSchema = z.object({
  reset_token: z
    .string({ required_error: 'Mã xác thực đặt lại mật khẩu không được để trống' }),
  new_password: z
    .string({ required_error: 'Vui lòng nhập mật khẩu mới' })
    .min(8, 'Mật khẩu mới phải có tối thiểu 8 ký tự'),
});
