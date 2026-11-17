import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Users,
  Package,
  Fuel,
  Car,
  Clock,
  Eye,
  AlertCircle
} from 'lucide-react';
import { tripService } from '../../services/tripService';
import { Trip, DriverHistoryStats, TransportRequest } from '../../types';

export const DriverHistory: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [stats, setStats] = useState<DriverHistoryStats>({
    total_completed_trips: 0,
    total_cancelled_trips: 0,
    total_passengers_served: 0,
    total_packages_delivered: 0,
    total_fuel_received: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Bộ lọc
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const query: any = {};
      if (statusFilter !== 'ALL') query.status = statusFilter;
      if (fromDate) query.from_date = fromDate;
      if (toDate) query.to_date = toDate;

      const res = await tripService.getDriverHistory(query);
      setTrips(res.trips);
      setStats(res.stats);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Không thể tải lịch sử chuyến xe.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [statusFilter]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHistory();
  };

  const handleResetFilter = () => {
    setStatusFilter('ALL');
    setFromDate('');
    setToDate('');
    setTimeout(fetchHistory, 50);
  };

  const setQuickDate = (type: 'today' | '7days' | 'month' | 'clear') => {
    const today = new Date();
    const formatYMD = (d: Date) => d.toISOString().split('T')[0];

    if (type === 'today') {
      const dStr = formatYMD(today);
      setFromDate(dStr);
      setToDate(dStr);
    } else if (type === '7days') {
      const past = new Date();
      past.setDate(today.getDate() - 7);
      setFromDate(formatYMD(past));
      setToDate(formatYMD(today));
    } else if (type === 'month') {
      const past = new Date();
      past.setMonth(today.getMonth() - 1);
      setFromDate(formatYMD(past));
      setToDate(formatYMD(today));
    } else {
      setFromDate('');
      setToDate('');
    }
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Lịch sử Chuyến xe của Tài xế
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Theo dõi toàn bộ các chuyến xe đã hoàn thành hoặc đã hủy, thống kê lượt phục vụ và chi phí nhiên liệu/sạc chia sẻ đã nhận.
        </p>
      </div>

      {/* 4 Thẻ Dashboard Thống kê */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Chuyến hoàn thành</span>
            <strong className="text-2xl font-black text-slate-900">{stats.total_completed_trips}</strong>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Chuyến đã hủy</span>
            <strong className="text-2xl font-black text-slate-900">{stats.total_cancelled_trips}</strong>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Lượt khách & kiện hàng</span>
            <strong className="text-xl font-black text-slate-900">
              {stats.total_passengers_served} <span className="text-xs font-normal text-slate-500">khách</span> • {stats.total_packages_delivered} <span className="text-xs font-normal text-slate-500">kiện</span>
            </strong>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
            <Fuel className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-emerald-800 font-bold block">Tổng tiền hỗ trợ nhận được</span>
            <strong className="text-xl font-black text-emerald-950">
              {stats.total_fuel_received.toLocaleString('vi-VN')} đ
            </strong>
          </div>
        </div>
      </div>

      {/* Bộ lọc lịch sử */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm mb-8">
        <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-center justify-between gap-4">
          {/* Tabs trạng thái */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả ({stats.total_completed_trips + stats.total_cancelled_trips})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                statusFilter === 'COMPLETED'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Đã hoàn thành ({stats.total_completed_trips})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('CANCELLED')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                statusFilter === 'CANCELLED'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Đã hủy ({stats.total_cancelled_trips})
            </button>
          </div>

          {/* Lọc theo ngày */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 font-medium">Từ:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 font-medium">Đến:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
            >
              Áp dụng
            </button>

            {/* Quick buttons */}
            <div className="flex items-center space-x-1 border-l border-slate-200 pl-3">
              <button
                type="button"
                onClick={() => {
                  setQuickDate('today');
                  setTimeout(fetchHistory, 50);
                }}
                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors"
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuickDate('7days');
                  setTimeout(fetchHistory, 50);
                }}
                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors"
              >
                7 ngày qua
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuickDate('month');
                  setTimeout(fetchHistory, 50);
                }}
                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors"
              >
                30 ngày qua
              </button>
              {(fromDate || toDate) && (
                <button
                  type="button"
                  onClick={handleResetFilter}
                  className="px-2 py-1 text-rose-600 hover:text-rose-800 text-[11px] font-bold underline cursor-pointer"
                >
                  Xóa lọc ngày
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Thông báo lỗi nếu có */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm mb-6 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Danh sách chuyến xe lịch sử */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-white p-6 rounded-3xl border border-slate-200 h-40">
              <div className="h-4 bg-slate-200 rounded w-1/4 mb-3"></div>
              <div className="h-3 bg-slate-100 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : trips.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 text-sm shadow-sm">
          Chưa có chuyến xe nào trong lịch sử theo bộ lọc hiện tại.
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map((trip) => {
            const isCompleted = trip.status === 'COMPLETED';
            const acceptedReqs: TransportRequest[] = trip.transport_requests || [];
            const tripCollectedFuel = acceptedReqs.reduce(
              (sum: number, req: TransportRequest) => sum + (req.shared_fuel_cost || 0),
              0
            );

            return (
              <div
                key={trip.id}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
              >
                <div className="space-y-3 flex-1">
                  {/* Hàng 1: Mã chuyến & Trạng thái & Phương tiện */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                      {trip.code}
                    </span>

                    <span
                      className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {isCompleted ? '✓ Đã hoàn thành' : '✕ Đã hủy'}
                    </span>

                    {trip.vehicle && (
                      <span className="text-xs text-slate-600 bg-slate-50 px-2.5 py-0.5 rounded-lg border border-slate-200 inline-flex items-center space-x-1">
                        <Car className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {trip.vehicle.brand_model} • {trip.vehicle.plate_number} (
                          {trip.vehicle.fuel_type === 'ELECTRIC' ? 'Xe điện' : trip.vehicle.fuel_type === 'DIESEL' ? 'Dầu' : 'Xăng'})
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Hàng 2: Lộ trình xuất phát -> đến nơi */}
                  <div className="text-xs space-y-1.5">
                    <div className="flex items-start space-x-2 text-slate-800">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
                      <div>
                        <strong className="text-emerald-700">Xuất phát:</strong> {trip.origin_name}
                      </div>
                    </div>
                    <div className="flex items-start space-x-2 text-slate-800">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-1 flex-shrink-0" />
                      <div>
                        <strong className="text-rose-700">Đến nơi:</strong> {trip.dest_name}
                      </div>
                    </div>
                  </div>

                  {/* Hàng 3: Thời gian & Khoảng cách */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                    <span className="flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      <span>Khởi hành: <strong>{new Date(trip.departure_time).toLocaleString('vi-VN')}</strong></span>
                    </span>
                    <span className="flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      <span>Lộ trình: <strong>{trip.distance_km} km</strong> ({Math.round((trip.duration_min || 0) / 60)}h{(trip.duration_min || 0) % 60}p)</span>
                    </span>
                  </div>

                  {/* Lý do hủy nếu có */}
                  {!isCompleted && trip.cancel_reason && (
                    <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                      <strong>Lý do hủy:</strong> {trip.cancel_reason}
                    </div>
                  )}

                  {/* Danh sách hành khách/kiện hàng đã phục vụ (kèm tiền hỗ trợ) */}
                  {isCompleted && acceptedReqs.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-100 text-xs">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                        Thành viên tham gia ({acceptedReqs.length}):
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {acceptedReqs.map((req: TransportRequest) => (
                          <div
                            key={req.id}
                            className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center space-x-2 text-slate-700"
                          >
                            {req.type === 'RIDE' ? (
                              <Users className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Package className="w-3.5 h-3.5 text-amber-600" />
                            )}
                            <span className="font-semibold">{req.user?.full_name || 'Khách hàng'}</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-emerald-800 font-bold">
                              {(req.shared_fuel_cost || 0).toLocaleString('vi-VN')} đ
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Cột phải: Tổng tiền chia sẻ & Nút xem chi tiết */}
                <div className="lg:text-right flex flex-col justify-between items-start lg:items-end space-y-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 flex-shrink-0">
                  {isCompleted && (
                    <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200/80">
                      <span className="text-[11px] text-emerald-800 font-semibold block">Tiền hỗ trợ nhận được:</span>
                      <strong className="text-lg font-black text-emerald-950">
                        {tripCollectedFuel.toLocaleString('vi-VN')} đ
                      </strong>
                    </div>
                  )}

                  <Link
                    to={`/trips/${trip.id}`}
                    className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-emerald-700 transition-colors space-x-1"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    <span>Xem chi tiết lộ trình</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
