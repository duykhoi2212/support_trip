import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Car,
  Package,
  Clock,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import { Notification } from '../../types';

export const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [markingAll, setMarkingAll] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await notificationService.getMyNotifications();
      setNotifications(data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Không thể tải danh sách thông báo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Lỗi khi đánh dấu đã đọc:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAll(true);
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Không thể đánh dấu tất cả đã đọc.');
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.is_read) {
      await handleMarkAsRead(notif.id);
    }

    if (notif.ref_type === 'TRIP' && notif.ref_id) {
      navigate(`/trips/${notif.ref_id}`);
    } else if (notif.ref_type === 'REQUEST') {
      navigate('/user/requests');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'RIDE_REQUEST_CREATED':
      case 'PACKAGE_REQUEST_CREATED':
        return (
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5" />
          </div>
        );
      case 'REQUEST_ACCEPTED':
        return (
          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        );
      case 'REQUEST_REJECTED':
      case 'REQUEST_CANCELLED':
      case 'TRIP_CANCELLED':
        return (
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
        );
      case 'TRIP_STARTED':
      case 'PASSENGER_PICKED_UP':
      case 'PACKAGE_PICKED_UP':
        return (
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Car className="w-5 h-5" />
          </div>
        );
      case 'PASSENGER_DROPPED_OFF':
      case 'PACKAGE_DELIVERED':
      case 'TRIP_COMPLETED':
        return (
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5" />
          </div>
        );
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Vừa xong';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
    return date.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  };

  const filteredNotifications = notifications.filter((n) =>
    filter === 'all' ? true : !n.is_read
  );

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Tiêu đề & Hành động */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block mb-1">
            GoX – Hộp thư thông báo
          </span>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Thông báo của bạn
            </h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white shadow-sm">
                {unreadCount} mới
              </span>
            )}
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={markingAll}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4" />
            <span>{markingAll ? 'Đang cập nhật...' : 'Đánh dấu tất cả đã đọc'}</span>
          </button>
        )}
      </div>

      {/* Tabs lọc */}
      <div className="flex items-center space-x-2 border-b border-slate-200 mb-6">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`pb-3 px-3 text-sm font-bold border-b-2 transition-colors ${
            filter === 'all'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Tất cả ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('unread')}
          className={`pb-3 px-3 text-sm font-bold border-b-2 transition-colors ${
            filter === 'unread'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Chưa đọc ({unreadCount})
        </button>
      </div>

      {/* Thông báo lỗi nếu có */}
      {error && (
        <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-sm flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Nội dung danh sách */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse bg-white p-4 rounded-2xl border border-slate-200 flex space-x-4">
              <div className="w-10 h-10 rounded-xl bg-slate-200"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-3 bg-slate-100 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            {filter === 'unread' ? 'Không có thông báo chưa đọc nào' : 'Bạn chưa có thông báo nào'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Mọi cập nhật về trạng thái chuyến xe, yêu cầu đặt chỗ và vận chuyển hàng sẽ hiển thị tại đây.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start space-x-4 relative ${
                !notif.is_read
                  ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50/60 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {getNotificationIcon(notif.type)}

              <div className="flex-1 min-w-0 pr-6">
                <p className={`text-sm leading-relaxed ${!notif.is_read ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                  {notif.content}
                </p>
                <div className="flex items-center space-x-3 mt-1.5 text-xs text-slate-400">
                  <span className="flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    {formatRelativeTime(notif.created_at)}
                  </span>
                  {notif.ref_type && (
                    <span className="inline-flex items-center text-emerald-600 font-semibold hover:underline">
                      Xem chi tiết <ArrowRight className="w-3 h-3 ml-0.5" />
                    </span>
                  )}
                </div>
              </div>

              {!notif.is_read && (
                <div className="absolute right-4 top-4 flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <button
                    type="button"
                    title="Đánh dấu đã đọc"
                    onClick={(e) => handleMarkAsRead(notif.id, e)}
                    className="p-1 rounded text-slate-400 hover:text-emerald-600 transition-colors"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
