import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Lock, AlertCircle, Loader2, ArrowLeft, KeyRound, Mail } from 'lucide-react';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Đăng nhập với vai trò ADMIN cố định
      const data = await authService.login({
        identifier: identifier.trim(),
        password,
        role: 'ADMIN',
      });

      if (data.user.role !== 'ADMIN') {
        throw new Error('Tài khoản của bạn không có quyền truy cập Cổng Quản trị viên.');
      }

      login(data.token, data.user);
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Đăng nhập quản trị viên thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-900 text-slate-100">
      <div className="max-w-md w-full space-y-8 bg-slate-800 p-8 sm:p-10 rounded-3xl border border-slate-700 shadow-2xl relative">
        {/* Nút quay lại */}
        <Link
          to="/"
          className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Quay về Trang chủ
        </Link>

        {/* Header Admin */}
        <div className="text-center pt-2">
          <div className="w-16 h-16 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-900/30">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Cổng quản trị viên
          </h2>
          <p className="mt-2 text-xs text-slate-400">
            Quản lý tài khoản, sự cố và vận hành hệ thống GoX
          </p>
        </div>

        {/* Báo lỗi nếu có */}
        {error && (
          <div className="bg-rose-950/80 border border-rose-800 text-rose-200 px-4 py-3 rounded-xl flex items-start space-x-3 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          {/* Email / SĐT */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Tài khoản Quản trị (Email hoặc SĐT)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Nhập email hoặc số điện thoại quản trị"
                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Mật khẩu */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Mật khẩu Quản trị
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu quản trị viên"
                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Nút Đăng nhập */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-900/40 flex items-center justify-center disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Đang xác thực bảo mật...
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4 mr-2" />
                Đăng nhập Hệ thống Quản trị
              </>
            )}
          </button>
        </form>

        {/* Liên kết quay lại Login Người dùng */}
        <div className="text-center pt-4 border-t border-slate-700/60">
          <Link
            to="/login"
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Bạn là Người dùng hoặc Tài xế? <span className="text-emerald-400 underline font-semibold">Đăng nhập tại đây</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
