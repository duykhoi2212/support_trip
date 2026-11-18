import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Car,
  Users,
  AlertTriangle,
  Calendar,
  Filter,
  Loader2,
  BarChart3,
  Search,
  Route,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { adminService } from '../../services/adminService';
import { AdminStatsOverview, Trip } from '../../types';
import { formatLocalYMD } from '../../lib/formatters';
import { StatCard } from '../../components/common/StatCard';
import { TripStatusBadge } from '../../components/common/StatusBadge';

export const TripStatistics: React.FC = () => {
  const [stats, setStats] = useState<AdminStatsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date range filters for overview (chuẩn ngày nội bộ VN)
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return formatLocalYMD(d);
  });
  const [toDate, setToDate] = useState(() => formatLocalYMD(new Date()));

  // Daily trip lookup states
  const [selectedDate, setSelectedDate] = useState(() => formatLocalYMD(new Date()));
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
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });
      setStats(res);
    } catch (err: any) {
      setError(err.message || 'Không thể tải thống kê vận hành.');
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

  const chartData = (stats?.daily_breakdown || []).map((day) => ({
    ...day,
    shortDate: day.date.slice(5).split('-').reverse().join('/'),
  }));

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center">
              <BarChart3 className="w-6 h-6 mr-2 text-emerald-600" />
              Thống kê vận hành
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Theo dõi số chuyến xe, lượt hành khách, quãng đường kết nối và tỷ lệ hoàn thành theo ngày.
            </p>
          </div>

          <form onSubmit={handleFilterOverview} className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
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
            <span className="text-sm">Đang tổng hợp dữ liệu thống kê...</span>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center text-rose-600">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
            <p className="text-sm">{error}</p>
          </div>
        ) : stats ? (
          <>
            {/* Top 4 KPI Cards (Phương án B: Thuần vận hành, không hiển thị tiền tệ) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Tổng chuyến xe"
                value={stats.kpi.trips.total}
                icon={<Car className="w-5 h-5" />}
                accent="sky"
                subtext={
                  <div className="flex items-center justify-between">
                    <span>
                      Hoàn thành: <strong className="text-emerald-700">{stats.kpi.trips.completed}</strong>
                    </span>
                    <span>
                      Hủy: <strong className="text-rose-600">{stats.kpi.trips.cancelled}</strong>
                    </span>
                    <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-semibold">
                      {stats.kpi.trips.cancel_rate_percent}% hủy
                    </span>
                  </div>
                }
              />

              <StatCard
                label="Lượt phục vụ"
                value={stats.kpi.impact.total_passengers_served}
                icon={<Users className="w-5 h-5" />}
                accent="emerald"
                subtext={
                  <span>
                    Tổng yêu cầu: <strong className="text-slate-700">{stats.kpi.requests.total}</strong> (
                    {stats.kpi.requests.completed} hoàn thành)
                  </span>
                }
              />

              <StatCard
                label="Quãng đường kết nối"
                value={`${(stats.kpi.impact.total_distance_km || 0).toLocaleString('vi-VN')} km`}
                icon={<Route className="w-5 h-5" />}
                accent="emerald"
                subtext={
                  <span>
                    Tỷ lệ hoàn thành chuyến:{' '}
                    <strong className="text-emerald-700">
                      {stats.kpi.trips.completion_rate_percent ?? 0}%
                    </strong>
                  </span>
                }
              />

              <StatCard
                label="Sự cố & Khiếu nại"
                value={stats.kpi.incidents.total}
                icon={<AlertTriangle className="w-5 h-5" />}
                accent="rose"
                subtext={
                  <div className="flex items-center justify-between">
                    <span>
                      Đã xử lý: <strong className="text-emerald-700">{stats.kpi.incidents.resolved}</strong>
                    </span>
                    <span>
                      Đang xử lý: <strong className="text-sky-700">{stats.kpi.incidents.processing}</strong>
                    </span>
                    <span>
                      Chờ: <strong className="text-rose-600">{stats.kpi.incidents.not_received}</strong>
                    </span>
                  </div>
                }
              />
            </div>

            {/* Biểu đồ phân rã theo ngày bằng Recharts */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-emerald-600" />
                  Biểu đồ hoạt động chuyến xe theo ngày
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thống kê số chuyến hoàn thành, đang di chuyển và đã hủy theo múi giờ Việt Nam.
                </p>
              </div>

              {chartData.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Không có chuyến xe nào trong khoảng thời gian này.
                </div>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="shortDate" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="completed" name="Hoàn thành" fill="#059669" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="in_progress" name="Đang di chuyển" fill="#0284c7" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="cancelled" name="Đã hủy" fill="#e11d48" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Bảng Tra cứu Chuyến xe Chi tiết theo Ngày */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center">
                    <Search className="w-5 h-5 mr-2 text-emerald-600" />
                    Danh sách chuyến xe theo ngày
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tra cứu chi tiết các chuyến xe khởi hành trong ngày đã chọn.
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
                    <option value="CLOSED">Đã chốt chuyến</option>
                    <option value="IN_PROGRESS">Đang di chuyển</option>
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
                        <th className="py-3 px-3 text-right">Quãng đường</th>
                        <th className="py-3 px-3 text-right">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {trips.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">{t.code}</td>
                          <td className="py-3 px-3 text-slate-600">
                            {new Date(t.departure_time).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-800">{t.driver?.full_name}</div>
                            <div className="text-[11px] text-slate-400">
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
                          <td className="py-3 px-3 text-right font-semibold text-slate-700">
                            {t.distance_km ? `${t.distance_km.toFixed(1)} km` : '—'}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <TripStatusBadge status={t.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {tripTotalPages > 1 && (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Trang {tripPage} / {tripTotalPages}
                  </span>
                  <div className="space-x-1">
                    <button
                      type="button"
                      disabled={tripPage <= 1}
                      onClick={() => setTripPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1 border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40"
                    >
                      Trước
                    </button>
                    <button
                      type="button"
                      disabled={tripPage >= tripTotalPages}
                      onClick={() => setTripPage((p) => Math.min(tripTotalPages, p + 1))}
                      className="px-3 py-1 border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40"
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
