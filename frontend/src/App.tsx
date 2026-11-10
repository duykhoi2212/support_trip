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
import { TripOperation } from './pages/driver/TripOperation';
import { SearchTrips } from './pages/trip/SearchTrips';
import { TripDetails } from './pages/trip/TripDetails';
import { MyRequests } from './pages/user/MyRequests';
import { Notifications } from './pages/notification/Notifications';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
          <Navbar />

          <main className="flex-1 flex flex-col">
            <Routes>
              {/* Công khai (Public Routes) */}
              <Route path="/" element={<SearchTrips />} />
              <Route path="/trips" element={<SearchTrips />} />
              <Route path="/trips/:id" element={<TripDetails />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Tuyến đường yêu cầu xác thực (Protected Routes) */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/user/requests"
                element={
                  <ProtectedRoute>
                    <MyRequests />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <Notifications />
                  </ProtectedRoute>
                }
              />

              {/* Tuyến đường dành cho Tài xế (Driver Routes) */}
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

              <Route
                path="/driver/trips/:id/manage"
                element={
                  <ProtectedRoute allowedRoles={['DRIVER']}>
                    <TripOperation />
                  </ProtectedRoute>
                }
              />

              {/* Tuyến đường 404 Không tìm thấy */}
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
