import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, User, Car, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

export const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [role, setRole] = useState<'USER' | 'DRIVER'>('USER');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);

    try {
      const data = await authService.register({
        phone,
        email,
        password,
        full_name: fullName,
        role: role as 'USER' | 'DRIVER',
      });

      login(data.token, data.user);

      if (data.user.role === 'DRIVER') {
        navigate('/driver/vehicles');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Đăng ký không thành công.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-xl w-full space-y-6 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl">
        <div className="text-center">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <UserPlus className="w-7 h-7" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Đăng ký tài khoản
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Chọn vai trò phù hợp và bắt đầu trải nghiệm hệ thống
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-start space-x-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* Lựa chọn vai trò (Role Selector) */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Bạn tham gia với tư cách nào?
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole('USER')}
                className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between relative ${
                  role === 'USER'
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-xl ${role === 'USER' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <User className="w-5 h-5" />
                  </div>
                  {role === 'USER' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900">Người dùng</div>
                  <div className="text-xs text-slate-500 mt-0.5">Đặt chỗ đi nhờ hoặc gửi hàng hóa</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRole('DRIVER')}
                className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between relative ${
                  role === 'DRIVER'
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-xl ${role === 'DRIVER' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Car className="w-5 h-5" />
                  </div>
                  {role === 'DRIVER' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900">Tài xế</div>
                  <div className="text-xs text-slate-500 mt-0.5">Đăng chuyến đi và nhận chở đồ</div>
                </div>
              </button>
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg mt-2 border border-amber-200 leading-relaxed">
              ⚠️ <strong>Lưu ý:</strong> Vai trò và số điện thoại được gắn cố định với tài khoản và không thể thay đổi sau khi đăng ký thành công.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Họ và tên
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Số điện thoại
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0912345678"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Địa chỉ Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@gmail.com"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Mật khẩu (≥ 8 ký tự)
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Xác nhận mật khẩu
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Hoàn tất đăng ký</span>
              </>
            )}
          </button>

          <div className="text-center text-sm text-slate-500 pt-2 border-t border-slate-100">
            Đã có tài khoản?{' '}
            <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-700">
              Đăng nhập tại đây
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
