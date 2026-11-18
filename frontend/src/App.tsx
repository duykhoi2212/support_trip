import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Code-splitting theo từng trang (tối ưu bundle production)
const Login = React.lazy(() => import('./pages/auth/Login').then((m) => ({ default: m.Login })));
const Register = React.lazy(() => import('./pages/auth/Register').then((m) => ({ default: m.Register })));
const ForgotPassword = React.lazy(() => import('./pages/auth/ForgotPassword').then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = React.lazy(() => import('./pages/auth/ResetPassword').then((m) => ({ default: m.ResetPassword })));
const Profile = React.lazy(() => import('./pages/profile/Profile').then((m) => ({ default: m.Profile })));
const SearchTrips = React.lazy(() => import('./pages/trip/SearchTrips').then((m) => ({ default: m.SearchTrips })));
const TripDetails = React.lazy(() => import('./pages/trip/TripDetails').then((m) => ({ default: m.TripDetails })));
const UserDashboard = React.lazy(() => import('./pages/user/UserDashboard'));
const MyRequests = React.lazy(() => import('./pages/user/MyRequests').then((m) => ({ default: m.MyRequests })));
const UserHistory = React.lazy(() => import('./pages/user/UserHistory').then((m) => ({ default: m.UserHistory })));
const DriverDashboard = React.lazy(() => import('./pages/driver/DriverDashboard'));
const Vehicles = React.lazy(() => import('./pages/driver/Vehicles').then((m) => ({ default: m.Vehicles })));
const MyTrips = React.lazy(() => import('./pages/driver/MyTrips').then((m) => ({ default: m.MyTrips })));
const CreateTrip = React.lazy(() => import('./pages/driver/CreateTrip').then((m) => ({ default: m.CreateTrip })));
const TripOperation = React.lazy(() => import('./pages/driver/TripOperation').then((m) => ({ default: m.TripOperation })));
const DriverHistory = React.lazy(() => import('./pages/driver/DriverHistory').then((m) => ({ default: m.DriverHistory })));
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const UserManagement = React.lazy(() => import('./pages/admin/UserManagement').then((m) => ({ default: m.UserManagement })));
const IncidentManagement = React.lazy(() => import('./pages/admin/IncidentManagement').then((m) => ({ default: m.IncidentManagement })));
const TripStatistics = React.lazy(() => import('./pages/admin/TripStatistics').then((m) => ({ default: m.TripStatistics })));
const AdminLogin = React.lazy(() => import('./pages/admin/AdminLogin').then((m) => ({ default: m.AdminLogin })));
const Notifications = React.lazy(() => import('./pages/notification/Notifications').then((m) => ({ default: m.Notifications })));
const MyIncidents = React.lazy(() => import('./pages/incident/MyIncidents').then((m) => ({ default: m.MyIncidents })));

const PageLoader = () => (
  <div className="flex-1 flex items-center justify-center py-24 text-slate-500">
    <Loader2 className="w-7 h-7 animate-spin text-emerald-600 mr-2" />
    <span className="text-sm font-medium">Đang tải trang...</span>
  </div>
);

// Trang chủ mặc định theo vai trò (USER giữ nguyên mặc định Tìm chuyến xe)
const HomeRoute = () => {
  const { user } = useAuth();
  if (user?.role === 'DRIVER') {
    return <Navigate to="/driver/dashboard" replace />;
  }
  if (user?.role === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <SearchTrips />;
};

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <Toaster position="top-right" richColors closeButton />
          <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
            <Navbar />

            <main className="flex-1 flex flex-col">
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Trang chủ & Tìm chuyến */}
                  <Route path="/" element={<HomeRoute />} />
                  <Route path="/trips" element={<HomeRoute />} />
                  <Route path="/trips/:id" element={<TripDetails />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />

                  {/* Tuyến đường dùng chung (yêu cầu đăng nhập) */}
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
                        <Notifications />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/my-incidents"
                    element={
                      <ProtectedRoute allowedRoles={['USER', 'DRIVER']}>
                        <MyIncidents />
                      </ProtectedRoute>
                    }
                  />

                  {/* Tuyến đường dành cho Người dùng (USER) */}
                  <Route
                    path="/user/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={['USER']}>
                        <UserDashboard />
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

                  {/* Tuyến đường dành cho Tài xế (DRIVER) */}
                  <Route
                    path="/driver/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={['DRIVER']}>
                        <DriverDashboard />
                      </ProtectedRoute>
                    }
                  />
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

                  {/* Tuyến đường Quản trị viên (ADMIN) */}
                  <Route
                    path="/admin/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />
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

                  {/* 404 */}
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
              </Suspense>
            </main>

            <footer className="bg-white border-t border-slate-200 py-5 mt-auto">
              <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
                GoX • Kết nối hành trình – Tối ưu chuyến đi
              </div>
            </footer>
          </div>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}
