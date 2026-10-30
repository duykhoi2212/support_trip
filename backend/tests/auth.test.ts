import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AuthService } from '../src/modules/auth-account/service.js';
import { prisma } from '../src/utils/prisma.js';
import { user_role, account_status } from '@prisma/client';

describe('Kiểm thử Module Xác thực & Tài khoản (CM-01, CM-02, CM-03, Forgot Password)', () => {
  const testPhone = '0988776655';
  const testEmail = 'authtest@example.com';
  const testPassword = 'Password@123';

  beforeAll(async () => {
    // Xóa user test nếu tồn tại trước đó
    await prisma.user.deleteMany({
      where: { OR: [{ phone: testPhone }, { email: testEmail }] },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { OR: [{ phone: testPhone }, { email: testEmail }] },
    });
  });

  it('1. CM-01: Đăng ký tài khoản USER thành công và trả về JWT token', async () => {
    const result = await AuthService.register({
      phone: testPhone,
      email: testEmail,
      password: testPassword,
      full_name: 'Người Dùng Kiểm Thử',
      role: user_role.USER,
    });

    expect(result.user).toBeDefined();
    expect(result.user.phone).toBe(testPhone);
    expect(result.user.role).toBe(user_role.USER);
    expect(result.token).toBeDefined();
  });

  it('2. CM-01: Chặn đăng ký trùng số điện thoại', async () => {
    await expect(
      AuthService.register({
        phone: testPhone,
        email: 'other_email@example.com',
        password: testPassword,
        full_name: 'Người Dùng 2',
        role: user_role.USER,
      })
    ).rejects.toThrow('Số điện thoại này đã được đăng ký');
  });

  it('3. CM-01: Chặn đăng ký trùng email', async () => {
    await expect(
      AuthService.register({
        phone: '0977665544',
        email: testEmail,
        password: testPassword,
        full_name: 'Người Dùng 3',
        role: user_role.USER,
      })
    ).rejects.toThrow('Email này đã được đăng ký');
  });

  it('4. CM-02: Đăng nhập thành công bằng Số điện thoại', async () => {
    const result = await AuthService.login({
      identifier: testPhone,
      password: testPassword,
    });

    expect(result.user.email).toBe(testEmail);
    expect(result.token).toBeDefined();
  });

  it('5. CM-02: Đăng nhập thành công bằng Email', async () => {
    const result = await AuthService.login({
      identifier: testEmail,
      password: testPassword,
    });

    expect(result.user.phone).toBe(testPhone);
    expect(result.token).toBeDefined();
  });

  it('6. CM-02: Báo lỗi khi sai mật khẩu', async () => {
    await expect(
      AuthService.login({
        identifier: testPhone,
        password: 'WrongPassword@123',
      })
    ).rejects.toThrow('Số điện thoại, email hoặc mật khẩu không chính xác');
  });

  it('7. CM-03: Cập nhật thông tin cá nhân (họ tên)', async () => {
    const user = await prisma.user.findUnique({ where: { phone: testPhone } });
    expect(user).toBeDefined();

    const updated = await AuthService.updateProfile(user!.id, {
      full_name: 'Họ Tên Đã Cập Nhật',
    });

    expect(updated.full_name).toBe('Họ Tên Đã Cập Nhật');
  });

  it('8. CM-03: Đổi mật khẩu thành công', async () => {
    const user = await prisma.user.findUnique({ where: { phone: testPhone } });
    const newPassword = 'NewPassword@456';

    const res = await AuthService.changePassword(user!.id, {
      current_password: testPassword,
      new_password: newPassword,
    });

    expect(res.message).toContain('thành công');

    // Đăng nhập lại với mật khẩu mới
    const loginRes = await AuthService.login({
      identifier: testPhone,
      password: newPassword,
    });
    expect(loginRes.token).toBeDefined();
  });

  it('9. Quên mật khẩu: Xác nhận SĐT + Email và đặt lại mật khẩu bằng Token', async () => {
    const forgotRes = await AuthService.forgotPassword({
      phone: testPhone,
      email: testEmail,
    });

    expect(forgotRes.reset_token).toBeDefined();

    const resetNewPass = 'ResetPassword@789';
    const resetRes = await AuthService.resetPassword({
      reset_token: forgotRes.reset_token,
      new_password: resetNewPass,
    });

    expect(resetRes.message).toContain('thành công');

    // Đăng nhập bằng mật khẩu vừa reset
    const loginRes = await AuthService.login({
      identifier: testPhone,
      password: resetNewPass,
    });
    expect(loginRes.token).toBeDefined();
  });

  it('10. CM-02: Chặn đăng nhập khi tài khoản bị khóa vĩnh viễn (LOCKED_PERM)', async () => {
    const user = await prisma.user.findUnique({ where: { phone: testPhone } });
    await prisma.user.update({
      where: { id: user!.id },
      data: { status: account_status.LOCKED_PERM },
    });

    await expect(
      AuthService.login({
        identifier: testPhone,
        password: 'ResetPassword@789',
      })
    ).rejects.toThrow('khóa vĩnh viễn');
  });
});
