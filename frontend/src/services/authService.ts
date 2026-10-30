import { api } from './api';
import { AuthResponse, User, ApiSuccessResponse } from '../types';

export const authService = {
  // CM-01: Đăng ký
  async register(data: {
    phone: string;
    email: string;
    password: string;
    full_name: string;
    role: 'USER' | 'DRIVER';
  }): Promise<AuthResponse> {
    const res = await api.post<ApiSuccessResponse<AuthResponse>>('/auth/register', data);
    return res.data.data;
  },

  // CM-02: Đăng nhập
  async login(data: { identifier: string; password: string }): Promise<AuthResponse> {
    const res = await api.post<ApiSuccessResponse<AuthResponse>>('/auth/login', data);
    return res.data.data;
  },

  // CM-03: Lấy hồ sơ cá nhân
  async getProfile(): Promise<User> {
    const res = await api.get<ApiSuccessResponse<User>>('/me');
    return res.data.data;
  },

  // CM-03: Cập nhật thông tin cá nhân
  async updateProfile(data: { full_name?: string; email?: string }): Promise<User> {
    const res = await api.patch<ApiSuccessResponse<User>>('/me', data);
    return res.data.data;
  },

  // CM-03: Đổi mật khẩu
  async changePassword(data: { current_password: string; new_password: string }): Promise<string> {
    const res = await api.patch<{ success: boolean; message: string }>('/me/password', data);
    return res.data.message;
  },

  // CM-03: Upload Avatar
  async updateAvatar(file: File): Promise<User> {
    const formData = new FormData();
    formData.append('avatar', file);

    const res = await api.post<ApiSuccessResponse<User>>('/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.data;
  },

  // Quên mật khẩu: Yêu cầu mã token
  async forgotPassword(data: { phone: string; email: string }): Promise<{ message: string; reset_token: string }> {
    const res = await api.post<ApiSuccessResponse<{ message: string; reset_token: string }>>(
      '/auth/forgot-password',
      data
    );
    return res.data.data;
  },

  // Quên mật khẩu: Đặt lại mật khẩu
  async resetPassword(data: { reset_token: string; new_password: string }): Promise<string> {
    const res = await api.post<{ success: boolean; message: string }>('/auth/reset-password', data);
    return res.data.message;
  },
};
