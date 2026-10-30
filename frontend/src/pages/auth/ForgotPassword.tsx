import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { authService } from '../../services/authService';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const message = await authService.forgotPassword({ email });
      setSuccessMessage(message);
    } catch (err: any) {
      setError(err.message || 'Không thể gửi yêu cầu đặt lại mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full space-y-6 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl">
        <div className="text-center">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Mail className="w-7 h-7" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Quên mật khẩu
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Nhập email tài khoản để nhận đường dẫn đặt lại mật khẩu bảo mật
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-start space-x-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMessage ? (
          <div className="space-y-6">
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-5 rounded-2xl flex items-start space-x-3 text-sm leading-relaxed">
              <CheckCircle2 className="w-6 h-6 flex-shrink-0 text-emerald-600 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-900 mb-1">Kiểm tra hộp thư của bạn</p>
                <p>{successMessage}</p>
                <p className="mt-2 text-xs text-emerald-700">
                  Lưu ý: Đường dẫn có hiệu lực trong vòng <strong>15 phút</strong> và chỉ sử dụng được <strong>1 lần</strong>.
                </p>
              </div>
            </div>

            <Link
              to="/login"
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại trang Đăng nhập</span>
            </Link>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Địa chỉ Email đã đăng ký
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>Gửi link đặt lại mật khẩu</span>
              )}
            </button>

            <div className="text-center text-sm pt-2 border-t border-slate-100">
              <Link
                to="/login"
                className="inline-flex items-center text-slate-600 hover:text-emerald-600 font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                <span>Quay lại trang Đăng nhập</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
