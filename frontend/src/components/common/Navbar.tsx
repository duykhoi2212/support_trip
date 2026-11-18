import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Car,
  Bell,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Shield,
  CheckCheck,
  Package,
  ArrowRight,
  Clock,
  AlertTriangle,
  BarChart3,
  LayoutDashboard,
  Menu,
  X,
  Search,
  PlusCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';
import { Notification } from '../../types';
import { RoleBadge } from './StatusBadge';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [recentNotifs, setRecentNotifs] = useState<Notification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [navImgError, setNavImgError] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = async () => {
    if (!user) return;
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Bỏ qua lỗi ngầm
    }
  };

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
    const interval = setInterval(fetchUnreadCount, 20000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

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
    if (!notifOpen) fetchRecentNotifs();
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

    if (notif.type === 'INCIDENT_UPDATE' || notif.ref_type === 'INCIDENT') {
      navigate('/my-incidents');
      return;
    }

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
    const wasAdmin = user?.role === 'ADMIN';
    logout();
    navigate(wasAdmin ? '/admin/login' : '/login');
  };

  // Danh sách điều hướng chuẩn hóa theo từng vai trò (ngắn gọn, hiển thị đều 1 hàng)
  const navItems: NavItem[] = !user
    ? [{ to: '/', label: 'Tìm chuyến xe', icon: <Search className="w-4 h-4" /> }]
    : user.role === 'USER'
    ? [
        { to: '/', label: 'Tìm chuyến xe', icon: <Search className="w-4 h-4" /> },
        { to: '/user/dashboard', label: 'Tổng quan', icon: <LayoutDashboard className="w-4 h-4" /> },
        { to: '/user/requests', label: 'Yêu cầu của tôi', icon: <Package className="w-4 h-4" /> },
        { to: '/user/history', label: 'Lịch sử chuyến đi', icon: <Clock className="w-4 h-4" /> },
        { to: '/my-incidents', label: 'Sự cố của tôi', icon: <AlertTriangle className="w-4 h-4" /> },
      ]
    : user.role === 'DRIVER'
    ? [
        { to: '/driver/dashboard', label: 'Tổng quan', icon: <LayoutDashboard className="w-4 h-4" /> },
        { to: '/driver/trips', label: 'Chuyến xe', icon: <Car className="w-4 h-4" /> },
        { to: '/driver/trips/create', label: 'Đăng chuyến', icon: <PlusCircle className="w-4 h-4" /> },
        { to: '/driver/vehicles', label: 'Phương tiện', icon: <Car className="w-4 h-4" /> },
        { to: '/driver/history', label: 'Lịch sử chuyến xe', icon: <Clock className="w-4 h-4" /> },
        { to: '/my-incidents', label: 'Sự cố của tôi', icon: <AlertTriangle className="w-4 h-4" /> },
      ]
    : [
        { to: '/admin/dashboard', label: 'Tổng quan', icon: <LayoutDashboard className="w-4 h-4" /> },
        { to: '/admin/users', label: 'Quản lý tài khoản', icon: <Shield className="w-4 h-4" /> },
        { to: '/admin/incidents', label: 'Quản lý sự cố', icon: <AlertTriangle className="w-4 h-4" /> },
        { to: '/admin/statistics', label: 'Thống kê vận hành', icon: <BarChart3 className="w-4 h-4" /> },
      ];

  const isActive = (to: string) => {
    if (to === '/') return location.pathname === '/' || location.pathname === '/trips';
    if (to === '/driver/trips') {
      return (
        location.pathname === '/driver/trips' ||
        (location.pathname.startsWith('/driver/trips/') && !location.pathname.startsWith('/driver/trips/create'))
      );
    }
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  const homePath =
    user?.role === 'DRIVER'
      ? '/driver/dashboard'
      : user?.role === 'ADMIN'
      ? '/admin/dashboard'
      : '/';

  return (
    <header className="bg-white/95 backdrop-blur border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Mobile menu trigger + Logo */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Mở menu điều hướng"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link
            to={homePath}
            className="flex items-center space-x-2.5 group rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-600 group-hover:bg-emerald-700 transition-colors flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <Car className="w-5 h-5" />
            </div>
            <div className="leading-tight">
              <span className="font-bold text-lg text-slate-900 tracking-tight block whitespace-nowrap">
                GoX
              </span>
              <span className="text-[11px] text-slate-500 font-medium hidden xl:block whitespace-nowrap">
                Kết nối hành trình – Tối ưu chuyến đi
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation Links - Luôn nằm gọn trên 1 hàng đều đặn */}
        <nav className="hidden lg:flex items-center justify-center gap-1 xl:gap-1.5 text-[13px] xl:text-sm font-medium min-w-0">
          {navItems.map((item) => {
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`px-2.5 xl:px-3.5 py-2 rounded-xl whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-emerald-50 text-emerald-700 font-semibold'
                    : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {user ? (
            <>
              {/* Notification Bell */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={handleToggleNotif}
                  className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-xl transition-colors relative"
                  title="Thông báo"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[18px] text-[10px] font-bold bg-rose-500 text-white rounded-full flex items-center justify-center ring-2 ring-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                      <span className="font-bold text-sm text-slate-900">Thông báo</span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Đọc tất cả</span>
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {loadingNotifs ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                          Đang tải thông báo...
                        </div>
                      ) : recentNotifs.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                          Chưa có thông báo nào.
                        </div>
                      ) : (
                        recentNotifs.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => handleNotifItemClick(n)}
                            className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start space-x-3 ${
                              !n.is_read ? 'bg-emerald-50/40' : ''
                            }`}
                          >
                            <div
                              className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                !n.is_read ? 'bg-emerald-600' : 'bg-transparent'
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs leading-relaxed ${!n.is_read ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                                {n.content}
                              </p>
                              <span className="text-[10px] text-slate-400 mt-1 block">
                                {new Date(n.created_at).toLocaleString('vi-VN')}
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>

                    <Link
                      to="/notifications"
                      onClick={() => setNotifOpen(false)}
                      className="block px-4 py-2.5 text-center text-xs font-semibold text-emerald-700 bg-slate-50 hover:bg-emerald-50 border-t border-slate-100 transition-colors"
                    >
                      Xem tất cả thông báo <ArrowRight className="w-3 h-3 inline ml-0.5" />
                    </Link>
                  </div>
                )}
              </div>

              {/* Profile Dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(!dropdownOpen);
                    setNotifOpen(false);
                  }}
                  className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs overflow-hidden border border-emerald-200">
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
                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-semibold text-slate-900 leading-tight max-w-[120px] truncate">
                      {user.full_name}
                    </div>
                    <div className="mt-0.5">
                      <RoleBadge role={user.role} />
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
                </button>

                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-slate-100 sm:hidden">
                      <div className="font-semibold text-slate-900 text-sm">{user.full_name}</div>
                      <div className="mt-1">
                        <RoleBadge role={user.role} />
                      </div>
                    </div>

                    <Link
                      to="/profile"
                      className="flex items-center space-x-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                    >
                      <UserIcon className="w-4 h-4" />
                      <span>Thông tin tài khoản</span>
                    </Link>

                    <div className="border-t border-slate-100 my-1" />

                    {navItems.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </Link>
                    ))}

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      type="button"
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
            <div className="flex items-center space-x-2">
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

      {/* Mobile / Tablet Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1 shadow-lg">
          {navItems.map((item) => {
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  active
                    ? 'bg-emerald-50 text-emerald-700 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
};
