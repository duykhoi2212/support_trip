import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Car,
  Bell,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Shield,
  CheckCheck,
  Package,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';
import { Notification } from '../../types';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [recentNotifs, setRecentNotifs] = useState<Notification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [navImgError, setNavImgError] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Lấy số lượng thông báo chưa đọc
  const fetchUnreadCount = async () => {
    if (!user) return;
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Bỏ qua lỗi ngầm
    }
  };

  // Lấy các thông báo mới khi mở dropdown
  const fetchRecentNotifs = async () => {
    if (!user) return;
    try {
      setLoadingNotifs(true);
      const data = await notificationService.getMyNotifications();
      setRecentNotifs(data.slice(0, 5));
    } catch {
      // Bỏ qua lỗi ngầm
    } finally {
      setLoadingNotifs(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchUnreadCount();

    // Polling định kỳ mỗi 20 giây
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 20000);

    return () => clearInterval(interval);
  }, [user]);

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleNotif = () => {
    if (!notifOpen) {
      fetchRecentNotifs();
    }
    setNotifOpen(!notifOpen);
    setDropdownOpen(false);
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setUnreadCount(0);
      setRecentNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // ignore
    }
  };

  const handleNotifItemClick = async (notif: Notification) => {
    if (!notif.is_read) {
      await notificationService.markAsRead(notif.id);
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    setNotifOpen(false);

    // Đối với tài xế: chuyển ngay sang trang điều hành chuyến xe để xử lý duyệt yêu cầu
    if (user?.role === 'DRIVER') {
      if (notif.ref_id) {
        navigate(`/driver/trips/${notif.ref_id}/manage`);
      } else {
        navigate('/driver/trips');
      }
      return;
    }

    if (notif.ref_type === 'TRIP' && notif.ref_id) {
      navigate(`/trips/${notif.ref_id}`);
    } else if (notif.ref_type === 'REQUEST') {
      navigate('/user/requests');
    } else {
      navigate('/notifications');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800">
            <Shield className="w-3 h-3 mr-1" /> Quản trị viên
          </span>
        );
      case 'DRIVER':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">
            <Car className="w-3 h-3 mr-1" /> Tài xế
          </span>
        );
      case 'USER':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
            <UserIcon className="w-3 h-3 mr-1" /> Người dùng
          </span>
        );
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo GoX */}
        <Link
          to={user?.role === 'DRIVER' ? '/driver/trips' : user?.role === 'ADMIN' ? '/admin/users' : '/'}
          className="flex items-center space-x-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-600 group-hover:bg-emerald-700 transition-colors flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <span className="font-bold text-xl text-slate-900 tracking-tight block leading-tight">
              GoX
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Kết nối hành trình – Tối ưu chuyến đi
            </span>
          </div>
        </Link>

        {/* Navigation Links theo Vai trò */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-slate-600">
          {/* USER hoặc Khách vãng lai: Tìm chuyến xe */}
          {(!user || user.role === 'USER') && (
            <Link to="/" className="hover:text-emerald-600 transition-colors">
              Tìm chuyến xe
            </Link>
          )}

          {/* CHỈ DÀNH CHO USER: Yêu cầu của tôi */}
          {user?.role === 'USER' && (
            <Link to="/user/requests" className="hover:text-emerald-600 transition-colors">
              Yêu cầu của tôi
            </Link>
          )}

          {/* DÀNH CHO TÀI XẾ: Chuyến xe của tôi, Đăng chuyến mới, Phương tiện */}
          {user?.role === 'DRIVER' && (
            <>
              <Link to="/driver/trips" className="hover:text-emerald-600 transition-colors font-semibold">
                Chuyến xe của tôi
              </Link>
              <Link to="/driver/trips/create" className="hover:text-emerald-600 transition-colors font-semibold">
                Đăng chuyến mới
              </Link>
              <Link to="/driver/vehicles" className="hover:text-emerald-600 transition-colors font-semibold">
                Phương tiện
              </Link>
            </>
          )}

          {user?.role === 'ADMIN' && (
            <>
              <Link to="/admin/users" className="hover:text-emerald-600 transition-colors">
                Tài khoản
              </Link>
              <Link to="/admin/incidents" className="hover:text-emerald-600 transition-colors">
                Sự cố
              </Link>
              <Link to="/admin/statistics" className="hover:text-emerald-600 transition-colors">
                Thống kê
              </Link>
            </>
          )}
        </nav>

        {/* User Account / Auth Actions */}
        <div className="flex items-center space-x-3">
          {user ? (
            <>
              {/* Notification Popover */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={handleToggleNotif}
                  className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-xl transition-colors relative"
                  title="Thông báo"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[18px] text-[10px] font-bold bg-rose-500 text-white rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Dropdown thông báo */}
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-sm">Thông báo</span>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-700 rounded-full">
                            {unreadCount} mới
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Đã đọc hết</span>
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {loadingNotifs ? (
                        <div className="p-6 text-center text-xs text-slate-400">
                          Đang tải thông báo...
                        </div>
                      ) : recentNotifs.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400">
                          Bạn chưa có thông báo nào.
                        </div>
                      ) : (
                        recentNotifs.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => handleNotifItemClick(n)}
                            className={`p-3 text-left hover:bg-slate-50 cursor-pointer transition-colors flex items-start space-x-3 ${
                              !n.is_read ? 'bg-emerald-50/50' : ''
                            }`}
                          >
                            <div className="mt-0.5">
                              {!n.is_read ? (
                                <span className="w-2 h-2 rounded-full bg-emerald-500 block"></span>
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-slate-300 block"></span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-800 line-clamp-2 leading-relaxed">
                                {n.content}
                              </p>
                              <span className="text-[10px] text-slate-400 mt-1 block">
                                {new Date(n.created_at).toLocaleTimeString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  day: '2-digit',
                                  month: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="p-2 border-t border-slate-100 bg-slate-50/50 text-center">
                      <Link
                        to="/notifications"
                        onClick={() => setNotifOpen(false)}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center space-x-1"
                      >
                        <span>Xem toàn bộ thông báo</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm overflow-hidden border border-emerald-200">
                    {user.avatar_url && !navImgError ? (
                      <img
                        src={user.avatar_url}
                        alt={user.full_name}
                        className="w-full h-full object-cover"
                        onError={() => setNavImgError(true)}
                      />
                    ) : (
                      user.full_name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-xs font-semibold text-slate-900 leading-tight">
                      {user.full_name}
                    </div>
                    <div className="mt-0.5">{getRoleBadge(user.role)}</div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-slate-100 sm:hidden">
                      <div className="font-semibold text-slate-900 text-sm">{user.full_name}</div>
                      <div className="mt-1">{getRoleBadge(user.role)}</div>
                    </div>

                    <Link
                      to="/profile"
                      className="flex items-center space-x-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                    >
                      <UserIcon className="w-4 h-4" />
                      <span>Thông tin tài khoản</span>
                    </Link>

                    {user.role === 'USER' && (
                      <Link
                        to="/user/requests"
                        className="flex items-center space-x-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                      >
                        <Package className="w-4 h-4" />
                        <span>Yêu cầu vận chuyển</span>
                      </Link>
                    )}

                    {user.role === 'DRIVER' && (
                      <>
                        <Link
                          to="/driver/trips"
                          className="flex items-center space-x-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                        >
                          <Car className="w-4 h-4" />
                          <span>Chuyến xe của tôi</span>
                        </Link>
                        <Link
                          to="/driver/vehicles"
                          className="flex items-center space-x-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                        >
                          <Car className="w-4 h-4" />
                          <span>Phương tiện</span>
                        </Link>
                      </>
                    )}

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center space-x-3">
              <Link
                to="/login"
                className="text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors px-3 py-2"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl shadow-sm transition-colors"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
