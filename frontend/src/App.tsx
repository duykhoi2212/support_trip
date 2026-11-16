import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
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
import { UserHistory } from './pages/user/UserHistory';
import { DriverHistory } from './pages/driver/DriverHistory';
import { UserManagement } from './pages/admin/UserManagement';
import { IncidentManagement } from './pages/admin/IncidentManagement';
import { TripStatistics } from './pages/admin/TripStatistics';
import { Notifications } from './pages/notification/Notifications';

// Trang chủ thông minh theo vai trò
const HomeRoute = () => {
  const { user } = useAuth();
  if (user?.role === 'DRIVER') {
    return <Navigate to="/driver/trips" replace />;
  }
  if (user?.role === 'ADMIN') {
    return <Navigate to="/admin/users" replace />;
  }
  return <SearchTrips />;
};

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
          <Navbar />

          <main className="flex-1 flex flex-col">
            <Routes>
              {/* Trang chủ & Tìm chuyến */}
              <Route path="/" element={<HomeRoute />} />
              <Route path="/trips" element={<HomeRoute />} />
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
                  <ProtectedRoute allowedRoles={['USER']}>
                    <MyRequests />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/user/history"
                element={
                  <ProtectedRoute allowedRoles={['USER']}>
                    <UserHistory />
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
                path="/driver/history"
                element={
                  <ProtectedRoute allowedRoles={['DRIVER']}>
                    <DriverHistory />
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

              {/* Tuyến đường Quản trị viên (Admin Dashboard: AD-01, AD-02, AD-03) */}
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <UserManagement />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/incidents"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <IncidentManagement />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/statistics"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <TripStatistics />
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
