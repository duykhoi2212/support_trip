import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { AuthService } from '../src/modules/auth-account/service.js';
import { prisma } from '../src/utils/prisma.js';
import { user_role, account_status } from '@prisma/client';
import { mailer } from '../src/adapters/mail/mailer.js';

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
    const user = await prisma.user.findFirst({ where: { phone: testPhone } });
    expect(user).toBeDefined();

    const updated = await AuthService.updateProfile(user!.id, {
      full_name: 'Họ Tên Đã Cập Nhật',
    });

    expect(updated.full_name).toBe('Họ Tên Đã Cập Nhật');
  });

  it('8. CM-03: Đổi mật khẩu thành công', async () => {
    const user = await prisma.user.findFirst({ where: { phone: testPhone } });
    const newPassword = 'NewPassword@456';

    // 8.1: Chặn đổi mật khẩu nếu mật khẩu mới trùng với mật khẩu hiện tại
    await expect(
      AuthService.changePassword(user!.id, {
        current_password: testPassword,
        new_password: testPassword,
      })
    ).rejects.toThrow('Mật khẩu mới không được trùng với mật khẩu hiện tại');

    // 8.2: Đổi sang mật khẩu mới khác mật khẩu cũ
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

  it('9. Quên mật khẩu: Gửi email link 1 lần, chống lộ tài khoản và vô hiệu hóa sau khi dùng', async () => {
    let capturedMail: any = null;
    const sendSpy = vi.spyOn(mailer, 'send').mockImplementation(async (msg) => {
      capturedMail = msg;
    });

    // 9.1: Email không tồn tại: vẫn trả về thông báo chung, không gửi mail (chống dò email)
    const fakeRes = await AuthService.forgotPassword({ email: 'nonexistent@example.com' });
    expect(fakeRes.message).toContain('Nếu địa chỉ email tồn tại');
    expect(sendSpy).not.toHaveBeenCalled();

    // 9.2: Email tồn tại: gửi mail chứa đường dẫn token
    const forgotRes = await AuthService.forgotPassword({ email: testEmail });
    expect(forgotRes.message).toContain('Nếu địa chỉ email tồn tại');
    expect(sendSpy).toHaveBeenCalledOnce();
    expect(capturedMail).toBeDefined();
    expect(capturedMail.to).toBe(testEmail);

    // Trích xuất token từ link trong text email
    const match = capturedMail.text.match(/token=([^&\s]+)/);
    expect(match).not.toBeNull();
    const token = decodeURIComponent(match![1]);

    // 9.3: Đặt lại mật khẩu thành công bằng token hợp lệ
    const resetNewPass = 'ResetPassword@789';
    const resetRes = await AuthService.resetPassword({
      token,
      new_password: resetNewPass,
    });
    expect(resetRes.message).toContain('thành công');

    // 9.4: Token đã dùng KHÔNG thể tái sử dụng lần thứ hai (Single-use token)
    await expect(
      AuthService.resetPassword({
        token,
        new_password: 'AnotherPassword@123',
      })
    ).rejects.toThrow('đã hết hạn (quá 15 phút) hoặc đã được sử dụng');

    // 9.5: Đăng nhập thành công với mật khẩu mới
    const loginRes = await AuthService.login({
      identifier: testEmail,
      password: resetNewPass,
    });
    expect(loginRes.token).toBeDefined();

    sendSpy.mockRestore();
  });

  it('10. CM-02: Chặn đăng nhập khi tài khoản bị khóa vĩnh viễn (LOCKED_PERM)', async () => {
    const user = await prisma.user.findFirst({ where: { phone: testPhone } });
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

  it('11. Cho phép cùng email và số điện thoại đăng ký tài khoản DRIVER khi đã có USER', async () => {
    const driverRes = await AuthService.register({
      phone: testPhone,
      email: testEmail,
      password: 'DriverPassword@123',
      full_name: 'Tài Xế Thử Nghiệm',
      role: user_role.DRIVER,
    });

    expect(driverRes.user.role).toBe(user_role.DRIVER);
    expect(driverRes.token).toBeDefined();

    // Đăng nhập với vai trò DRIVER
    const driverLogin = await AuthService.login({
      identifier: testEmail,
      password: 'DriverPassword@123',
      role: user_role.DRIVER,
    });
    expect(driverLogin.user.role).toBe(user_role.DRIVER);

    // Chặn trùng lặp trong cùng vai trò DRIVER
    await expect(
      AuthService.register({
        phone: '0988001122',
        email: testEmail,
        password: 'DriverPassword@123',
        full_name: 'Tài Xế Trùng Email',
        role: user_role.DRIVER,
      })
    ).rejects.toThrow('Email này đã được đăng ký với vai trò Tài xế');
  });
});

