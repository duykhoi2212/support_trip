import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Car,
  Users,
  Fuel,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Filter,
  Loader2,
  BarChart3,
  Search,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { AdminStatsOverview, Trip } from '../../types';

export const TripStatistics: React.FC = () => {
  const [stats, setStats] = useState<AdminStatsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date range filters for overview
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Daily trip lookup states
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [tripPage, setTripPage] = useState(1);
  const [tripTotalPages, setTripTotalPages] = useState(1);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.getStatisticsOverview({
        from_date: fromDate ? `${fromDate}T00:00:00.000Z` : undefined,
        to_date: toDate ? `${toDate}T23:59:59.999Z` : undefined,
      });
      setStats(res);
    } catch (err: any) {
      setError(err.message || 'Không thể tải thống kê vận hành');
    } finally {
      setLoading(false);
    }
  };

  const fetchTripsByDate = async () => {
    try {
      setLoadingTrips(true);
      const res = await adminService.getTripsByDate({
        date: selectedDate || undefined,
        status: selectedStatus || undefined,
        page: tripPage,
        limit: 10,
      });
      setTrips(res.trips);
      setTripTotalPages(res.pagination.totalPages);
    } catch (err: any) {
      console.error('Lỗi tải danh sách chuyến theo ngày:', err);
    } finally {
      setLoadingTrips(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    fetchTripsByDate();
  }, [selectedDate, selectedStatus, tripPage]);

  const handleFilterOverview = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOverview();
  };

  const getTripStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3 mr-1" /> Đang nhận khách
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Đang di chuyển
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Hoàn thành
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 mr-1" /> Đã hủy
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center">
              <BarChart3 className="w-7 h-7 mr-2 text-emerald-600" />
              Thống kê Vận hành & Báo cáo Chuyến xe (AD-03)
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Phân tích chỉ số chuyến xe, lượt phục vụ, chi phí nhiên liệu chia sẻ và tỷ lệ hủy theo ngày/tuần/tháng.
            </p>
          </div>

          {/* Bộ lọc khoảng ngày tổng quan */}
          <form onSubmit={handleFilterOverview} className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400 mr-2" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent text-slate-700 font-medium focus:outline-none"
              />
              <span className="mx-2 text-slate-400">➔</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent text-slate-700 font-medium focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center"
            >
              <Filter className="w-3.5 h-3.5 mr-1" /> Lọc
            </button>
          </form>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center text-slate-500 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
            <span>Đang tổng hợp dữ liệu thống kê...</span>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center text-rose-600">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
            <p>{error}</p>
          </div>
        ) : stats ? (
          <>
            {/* Top 4 KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Chuyến xe */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng Chuyến xe</span>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Car className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900">{stats.kpi.trips.total}</div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Hoàn thành: <strong className="text-emerald-700">{stats.kpi.trips.completed}</strong></span>
                  <span>Hủy: <strong className="text-rose-600">{stats.kpi.trips.cancelled}</strong></span>
                  <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-bold">
                    {stats.kpi.trips.cancel_rate_percent}% hủy
                  </span>
                </div>
              </div>

              {/* Card 2: Lượt phục vụ */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lượt phục vụ</span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-black text-emerald-950">
                  {stats.kpi.impact.total_passengers_served}
                </div>
                <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
                  Tổng yêu cầu: <strong className="text-slate-700">{stats.kpi.requests.total}</strong> ({stats.kpi.requests.completed} thành công)
                </div>
              </div>

              {/* Card 3: Chi phí chia sẻ */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hỗ trợ Nhiên liệu/Sạc</span>
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <Fuel className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-amber-950 truncate">
                  {stats.kpi.impact.total_shared_fuel_cost.toLocaleString('vi-VN')} đ
                </div>
                <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 flex items-center">
                  <Zap className="w-3.5 h-3.5 mr-1 text-cyan-600" />
                  Đã tự nguyện chia sẻ qua hệ thống
                </div>
              </div>

              {/* Card 4: Sự cố */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sự cố & Khiếu nại</span>
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900">{stats.kpi.incidents.total}</div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Đã xử lý: <strong className="text-emerald-700">{stats.kpi.incidents.resolved}</strong></span>
                  <span>Đang xử lý: <strong className="text-blue-700">{stats.kpi.incidents.processing}</strong></span>
                  <span>Chờ: <strong className="text-rose-600">{stats.kpi.incidents.not_received}</strong></span>
                </div>
              </div>
            </div>

            {/* Biểu đồ phân rã theo ngày */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-emerald-600" />
                    Biểu đồ Hoạt động Chuyến xe theo Ngày
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Thống kê tỷ lệ hoàn thành, hủy chuyến và số khách thực tế từng ngày trong chu kỳ.
                  </p>
                </div>
              </div>

              {stats.daily_breakdown.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Không có chuyến xe nào trong khoảng thời gian này.
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.daily_breakdown.map((day) => {
                    const completedRate = day.total > 0 ? (day.completed / day.total) * 100 : 0;
                    const cancelledRate = day.total > 0 ? (day.cancelled / day.total) * 100 : 0;

                    return (
                      <div
                        key={day.date}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
                      >
                        <div className="w-32 flex-shrink-0 font-bold text-slate-800 flex items-center">
                          <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          {day.date}
                        </div>

                        {/* Progress Bar */}
                        <div className="flex-1 bg-slate-200 h-3 rounded-full overflow-hidden flex">
                          <div
                            style={{ width: `${completedRate}%` }}
                            className="bg-emerald-500 h-full"
                            title={`Hoàn thành: ${day.completed}`}
                          />
                          <div
                            style={{ width: `${cancelledRate}%` }}
                            className="bg-rose-500 h-full"
                            title={`Hủy: ${day.cancelled}`}
                          />
                        </div>

                        <div className="flex items-center space-x-4 text-slate-600 flex-shrink-0 text-[11px]">
                          <span>
                            Tổng: <strong>{day.total}</strong>
                          </span>
                          <span className="text-emerald-700 font-semibold">
                            ✓ {day.completed}
                          </span>
                          <span className="text-rose-600 font-semibold">
                            ✗ {day.cancelled}
                          </span>
                          <span className="text-slate-500">
                            👥 {day.passengers} khách
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bảng Tra cứu Chuyến xe Chi tiết theo Ngày */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center">
                    <Search className="w-5 h-5 mr-2 text-emerald-600" />
                    Danh sách Chuyến xe Chi tiết theo Ngày
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tra cứu và kiểm toán các chuyến xe hoạt động trong ngày đã chọn.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setTripPage(1);
                    }}
                    className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                  <select
                    value={selectedStatus}
                    onChange={(e) => {
                      setSelectedStatus(e.target.value);
                      setTripPage(1);
                    }}
                    className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="">Tất cả trạng thái</option>
                    <option value="OPEN">Đang nhận khách</option>
                    <option value="IN_PROGRESS">Đang chạy</option>
                    <option value="COMPLETED">Hoàn thành</option>
                    <option value="CANCELLED">Đã hủy</option>
                  </select>
                </div>
              </div>

              {loadingTrips ? (
                <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mb-2" />
                  <span>Đang tải chuyến xe...</span>
                </div>
              ) : trips.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Không có chuyến xe nào vào ngày {selectedDate}.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                        <th className="py-3 px-3">Mã chuyến</th>
                        <th className="py-3 px-3">Khởi hành</th>
                        <th className="py-3 px-3">Tài xế & Xe</th>
                        <th className="py-3 px-3">Lộ trình</th>
                        <th className="py-3 px-3 text-center">Ghế nhận</th>
                        <th className="py-3 px-3">Chi phí nhiên liệu</th>
                        <th className="py-3 px-3 text-right">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {trips.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3 font-bold text-slate-900">{t.code}</td>
                          <td className="py-3 px-3 text-slate-600">
                            {new Date(t.departure_time).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-800">{t.driver?.full_name}</div>
                            <div className="text-[11px] text-slate-400 flex items-center">
                              {t.vehicle?.brand_model} • {t.vehicle?.plate_number}
                            </div>
                          </td>
                          <td className="py-3 px-3 max-w-xs truncate text-slate-700">
                            <span className="font-medium">{t.origin_name}</span> ➔{' '}
                            <span className="font-medium">{t.dest_name}</span>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-800">
                            {t.seats_reserved}/{t.seats_total}
                          </td>
                          <td className="py-3 px-3 font-semibold text-emerald-800">
                            {t.estimated_fuel_cost ? `${t.estimated_fuel_cost.toLocaleString('vi-VN')} đ` : '0 đ'}
                          </td>
                          <td className="py-3 px-3 text-right">{getTripStatusBadge(t.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Trip Pagination */}
              {tripTotalPages > 1 && (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Trang {tripPage} / {tripTotalPages}</span>
                  <div className="space-x-1">
                    <button
                      disabled={tripPage <= 1}
                      onClick={() => setTripPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40"
                    >
                      Trước
                    </button>
                    <button
                      disabled={tripPage >= tripTotalPages}
                      onClick={() => setTripPage((p) => Math.min(tripTotalPages, p + 1))}
                      className="px-2.5 py-1 border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
export default TripStatistics;
