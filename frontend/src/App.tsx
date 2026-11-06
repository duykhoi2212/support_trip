import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { Profile } from './pages/profile/Profile';
import { Vehicles } from './pages/driver/Vehicles';
import { MyTrips } from './pages/driver/MyTrips';
import { CreateTrip } from './pages/driver/CreateTrip';
import { Car, Package, Sparkles, ShieldCheck } from 'lucide-react';

const HomePage = () => {
  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden mb-12">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4 border border-white/20">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>GoX – Kết nối hành trình, tối ưu chuyến đi</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight mb-4">
            Chia sẻ hành trình, gửi đồ tiện lợi & tiết kiệm
          </h1>
          <p className="text-emerald-100 text-base sm:text-lg mb-8 leading-relaxed">
            Kết nối người đi nhờ và người gửi hàng với những chuyến xe đường dài thực tế. Tích hợp AI điều phối bằng ngôn ngữ tự nhiên và tính toán lộ trình chuẩn xác.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              to="/register"
              className="px-6 py-3 rounded-xl bg-white text-emerald-800 font-bold text-sm shadow-lg hover:bg-emerald-50 transition-colors"
            >
              Bắt đầu ngay hôm nay
            </Link>
            <Link
              to="/login"
              className="px-6 py-3 rounded-xl bg-emerald-800/60 hover:bg-emerald-800 text-white font-bold text-sm border border-emerald-400/30 transition-colors"
            >
              Đăng nhập tài khoản
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Highlight Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
            <Car className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-lg mb-2">Tài xế linh hoạt</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Đăng chuyến đi trước 24h, chia sẻ ghế trống và khoang hành lý để tăng thu nhập trên cung đường thực tế.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-lg mb-2">Gửi đồ an toàn</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Gửi kiện hàng nhanh chóng theo chuyến xe chạy thẳng, không qua nhiều kho trung chuyển phức tạp.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-lg mb-2">Minh bạch & Tự động</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Khóa nguyên tử chống vượt sức chứa xe, hiển thị số điện thoại hai bên sau khi duyệt, xử phạt hủy chuyến công bằng.
          </p>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
          <Navbar />

          <main className="flex-1 flex flex-col">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Protected Routes */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <div className="max-w-4xl mx-auto px-4 py-10">
                      <h1 className="text-2xl font-bold text-slate-900 mb-4">Thông báo của bạn</h1>
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 text-slate-500 text-sm">
                        Chức năng thông báo sẽ hoạt động cùng với luồng yêu cầu vận chuyển ở Giai đoạn 4.
                      </div>
                    </div>
                  </ProtectedRoute>
                }
              />

              {/* Driver Routes */}
              <Route
                path="/driver/vehicles"
                element={
                  <ProtectedRoute allowedRoles={['DRIVER']}>
                    <Vehicles />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/driver/trips"
                element={
                  <ProtectedRoute allowedRoles={['DRIVER']}>
                    <MyTrips />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/driver/trips/create"
                element={
                  <ProtectedRoute allowedRoles={['DRIVER']}>
                    <CreateTrip />
                  </ProtectedRoute>
                }
              />

              {/* 404 Route */}
              <Route
                path="*"
                element={
                  <div className="flex-1 flex items-center justify-center p-6 text-center">
                    <div>
                      <h2 className="text-4xl font-extrabold text-slate-900 mb-2">404</h2>
                      <p className="text-sm text-slate-600 mb-4">Trang bạn tìm kiếm không tồn tại.</p>
                      <Link to="/" className="text-sm font-semibold text-emerald-600 hover:underline">
                        Quay về trang chủ
                      </Link>
                    </div>
                  </div>
                }
              />
            </Routes>
          </main>

          <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
            <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
              GoX • Kết nối hành trình – Tối ưu chuyến đi
            </div>
          </footer>
        </div>
      </AuthProvider>
    </Router>
  );
}
