import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Car, Bell, User as UserIcon, LogOut, ChevronDown, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 group-hover:bg-emerald-700 transition-colors flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <span className="font-bold text-lg text-slate-900 tracking-tight block leading-tight">
              DiNho & GuiDo AI
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Điều phối chuyến xe thông minh
            </span>
          </div>
        </Link>

        {/* Navigation Links based on Role */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-slate-600">
          <Link to="/" className="hover:text-emerald-600 transition-colors">
            Tìm chuyến xe
          </Link>

          {user?.role === 'USER' && (
            <Link to="/user/requests" className="hover:text-emerald-600 transition-colors">
              Yêu cầu của tôi
            </Link>
          )}

          {user?.role === 'DRIVER' && (
            <>
              <Link to="/driver/trips" className="hover:text-emerald-600 transition-colors">
                Chuyến xe của tôi
              </Link>
              <Link to="/driver/vehicles" className="hover:text-emerald-600 transition-colors">
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
        <div className="flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-3">
              {/* Notification Bell */}
              <Link
                to="/notifications"
                className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-full transition-colors relative"
                title="Thông báo"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
              </Link>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-3 p-1.5 rounded-xl hover:bg-slate-100 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm overflow-hidden border border-emerald-200">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.full_name}
                        className="w-full h-full object-cover"
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
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50"
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
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-emerald-600 transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm shadow-emerald-500/20 transition-colors"
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
