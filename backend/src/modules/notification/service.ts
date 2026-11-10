import { prisma } from '../../utils/prisma.js';

export class NotificationService {
  /**
   * Tạo thông báo mới cho người dùng
   */
  static async createNotification(data: {
    userId: bigint;
    type: string;
    content: string;
    refType?: string;
    refId?: bigint;
  }) {
    return prisma.notification.create({
      data: {
        user_id: data.userId,
        type: data.type,
        content: data.content,
        ref_type: data.refType,
        ref_id: data.refId,
        is_read: false,
      },
    });
  }

  /**
   * Lấy danh sách thông báo của người dùng (tối đa 50 thông báo gần nhất)
   */
  static async getMyNotifications(userId: bigint) {
    const list = await prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    return list.map((n) => ({
      ...n,
      id: n.id.toString(),
      user_id: n.user_id.toString(),
      ref_id: n.ref_id ? n.ref_id.toString() : null,
    }));
  }

  /**
   * Đếm số lượng thông báo chưa đọc
   */
  static async getUnreadCount(userId: bigint) {
    return prisma.notification.count({
      where: {
        user_id: userId,
        is_read: false,
      },
    });
  }

  /**
   * Đánh dấu 1 thông báo đã đọc
   */
  static async markAsRead(userId: bigint, notificationId: bigint) {
    return prisma.notification.updateMany({
      where: {
        id: notificationId,
        user_id: userId,
      },
      data: {
        is_read: true,
      },
    });
  }

  /**
   * Đánh dấu tất cả thông báo của người dùng đã đọc
   */
  static async markAllAsRead(userId: bigint) {
    return prisma.notification.updateMany({
      where: {
        user_id: userId,
        is_read: false,
      },
      data: {
        is_read: true,
      },
    });
  }
}

