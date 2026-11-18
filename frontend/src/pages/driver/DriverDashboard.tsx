import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Car,
  Clock,
  Navigation,
  Bell,
  PlusCircle,
  ArrowRight,
  Loader2,
  AlertTriangle,
  Users,
  Package,
  Fuel,
} from 'lucide-react';
import { tripService } from '../../services/tripService';
import { DriverDashboardData } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/common/StatCard';
import { TripStatusBadge } from '../../components/common/StatusBadge';
import { getFuelTypeLabel } from '../../lib/formatters';

export const DriverDashboard: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DriverDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await tripService.getDriverDashboard();
        setData(res);
      } catch (err: any) {
        setError(err.message || 'Không thể tải dữ liệu tổng quan tài xế.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="w-7 h-7 animate-spin text-emerald-600 mr-2" />
        <span className="text-sm font-medium">Đang tải tổng quan tài xế...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-rose-600">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
        <p className="text-sm font-medium">{error || 'Không có dữ liệu.'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Bảng điều khiển tài xế • {user?.full_name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi chuyến sắp khởi hành, yêu cầu cần duyệt và tình trạng sức chứa phương tiện.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link
            to="/driver/trips/create"
            className="inline-flex items-center px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Đăng chuyến mới
          </Link>
          <Link
            to="/driver/vehicles"
            className="inline-flex items-center px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-sm font-semibold transition-colors"
          >
            <Car className="w-4 h-4 mr-1.5 text-emerald-600" />
            Quản lý phương tiện
          </Link>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Tổng số chuyến xe"
          value={data.stats.total_trips}
          icon={<Car className="w-5 h-5" />}
          accent="slate"
          subtext={
            <span>
              Đã hoàn thành: <strong className="text-emerald-700">{data.stats.completed_trips}</strong>
            </span>
          }
        />
        <StatCard
          label="Chuyến đang mở"
          value={data.stats.open_trips}
          icon={<Clock className="w-5 h-5" />}
          accent="emerald"
          subtext="Đang nhận yêu cầu đặt chỗ & gửi hàng"
        />
        <StatCard
          label="Chuyến đang thực hiện"
          value={data.stats.in_progress_trips}
          icon={<Navigation className="w-5 h-5" />}
          accent="sky"
          subtext="Đang di chuyển trên hành trình"
        />
        <StatCard
          label="Yêu cầu chờ duyệt"
          value={data.stats.pending_requests_count}
          icon={<Bell className="w-5 h-5" />}
          accent={data.stats.pending_requests_count > 0 ? 'amber' : 'slate'}
          subtext={
            data.stats.pending_requests_count > 0
              ? 'Cần xem xét chấp nhận hoặc từ chối'
              : 'Không có yêu cầu tồn đọng'
          }
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 cols: Upcoming Trips + Pending Requests */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Trips */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Chuyến sắp khởi hành & đang chạy</h2>
              <Link
                to="/driver/trips"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center"
              >
                Tất cả chuyến xe <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>

            {data.upcoming_trips.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-400">
                Hiện chưa có chuyến xe nào sắp khởi hành.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.upcoming_trips.map((trip) => (
                  <div
                    key={trip.id}
                    className="px-6 py-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-700">{trip.code}</span>
                        <TripStatusBadge status={trip.status} />
                        {trip.pending_count > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                            {trip.pending_count} chờ duyệt
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {trip.origin_name} ➔ {trip.dest_name}
                      </div>
                      <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
                        <span>Khởi hành: {new Date(trip.departure_time).toLocaleString('vi-VN')}</span>
                        <span>• Xe {trip.vehicle.plate_number}</span>
                        <span>
                          • Ghế: <strong>{trip.seats_reserved}/{trip.seats_total}</strong>
                        </span>
                      </div>
                    </div>

                    <Link
                      to={`/driver/trips/${trip.id}/manage`}
                      className="inline-flex items-center justify-center px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex-shrink-0 transition-colors"
                    >
                      Điều hành <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Requests Queue */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                Yêu cầu cần xử lý ({data.stats.pending_requests_count})
              </h2>
            </div>

            {data.pending_requests.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                Tất cả yêu cầu của hành khách đã được xử lý.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.pending_requests.map((req) => (
                  <div
                    key={req.id}
                    className="px-6 py-3.5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-bold text-slate-900">{req.user.full_name}</span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                          {req.type === 'RIDE' ? (
                            <span className="inline-flex items-center">
                              <Users className="w-3 h-3 mr-1" /> Đi nhờ ({req.passenger_count || 1} người)
                            </span>
                          ) : (
                            <span className="inline-flex items-center">
                              <Package className="w-3 h-3 mr-1" /> Gửi hàng
                            </span>
                          )}
                        </span>
                        <span className="text-slate-400 font-mono">{req.trip.code}</span>
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {req.trip.origin_name} ➔ {req.trip.dest_name}
                      </div>
                    </div>
                    <Link
                      to={`/driver/trips/${req.trip.id}/manage`}
                      className="inline-flex items-center px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold flex-shrink-0 transition-colors"
                    >
                      Duyệt ngay <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Fleet Capacity */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-fit">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Sức chứa phương tiện ({data.vehicles.length})
            </h2>
            <Link
              to="/driver/vehicles"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Chi tiết
            </Link>
          </div>
          {data.vehicles.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Bạn chưa đăng ký phương tiện nào.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.vehicles.map((v) => (
                <div key={v.id} className="p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{v.plate_number}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        v.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {v.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm ngưng'}
                    </span>
                  </div>
                  <div className="text-slate-600">{v.brand_model || 'Phương tiện cá nhân'}</div>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] text-slate-600">
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                      <span className="block text-slate-400">Ghế ngồi</span>
                      <strong className="text-slate-800">{v.seat_count} chỗ</strong>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                      <span className="block text-slate-400">Cốp xe</span>
                      <strong className="text-slate-800">{v.cargo_area_m2} m²</strong>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                      <span className="block text-slate-400">Tải trọng</span>
                      <strong className="text-slate-800">{v.cargo_max_kg} kg</strong>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center">
                    <Fuel className="w-3 h-3 mr-1" />
                    Nhiên liệu: {getFuelTypeLabel(v.fuel_type)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;
