import { api } from './api';
import { ApiSuccessResponse, Notification } from '../types';

export const notificationService = {
  async getMyNotifications(): Promise<Notification[]> {
    const res = await api.get<ApiSuccessResponse<Notification[]>>('/notifications');
    return res.data.data;
  },

  async getUnreadCount(): Promise<number> {
    const res = await api.get<ApiSuccessResponse<{ unread_count: number }>>('/notifications/unread-count');
    return res.data.data.unread_count;
  },

  async markAsRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await api.patch('/notifications/read-all');
  },
};
