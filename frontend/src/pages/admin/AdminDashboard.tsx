import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Car,
  Navigation,
  AlertTriangle,
  ArrowRight,
  Loader2,
  TrendingUp,
  Activity,
  Shield,
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
import { AdminDashboardData } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { IncidentStatusBadge } from '../../components/common/StatusBadge';
import { getRoleLabel } from '../../lib/formatters';

export const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await adminService.getDashboard();
        setData(res);
      } catch (err: any) {
        setError(err.message || 'Không thể tải dữ liệu tổng quan quản trị.');
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
        <span className="text-sm font-medium">Đang tải tổng quan hệ thống...</span>
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

  const chartData = data.daily_breakdown.map((d) => ({
    ...d,
    shortDate: d.date.slice(5).split('-').reverse().join('/'),
  }));

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tổng quan hệ thống</h1>
          <p className="text-sm text-slate-500 mt-1">
            Giám sát tài khoản, chuyến xe đang hoạt động, sự cố chờ xử lý và xu hướng vận hành thực tế.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin/incidents"
            className="inline-flex items-center px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <AlertTriangle className="w-4 h-4 mr-1.5" />
            Xử lý sự cố ({data.kpi.incidents.pending})
          </Link>
          <Link
            to="/admin/statistics"
            className="inline-flex items-center px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <TrendingUp className="w-4 h-4 mr-1.5" />
            Thống kê chi tiết
          </Link>
        </div>
      </div>

      {/* 5 KPI Cards (100% số liệu thật, không hiển thị tiền tệ) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Tổng tài khoản"
          value={data.kpi.users.total}
          icon={<Users className="w-5 h-5" />}
          accent="slate"
          subtext={
            <span>
              Người dùng: <strong>{data.kpi.users.customers}</strong> • Đang khóa:{' '}
              <strong className="text-rose-600">{data.kpi.users.locked}</strong>
            </span>
          }
        />
        <StatCard
          label="Tổng tài xế"
          value={data.kpi.users.drivers}
          icon={<Shield className="w-5 h-5" />}
          accent="sky"
          subtext="Tài khoản đối tác vận chuyển"
        />
        <StatCard
          label="Tổng chuyến xe"
          value={data.kpi.trips.total}
          icon={<Car className="w-5 h-5" />}
          accent="emerald"
          subtext={
            <span>
              Hoàn thành: <strong className="text-emerald-700">{data.kpi.trips.completion_rate_percent}%</strong>
            </span>
          }
        />
        <StatCard
          label="Chuyến hoạt động"
          value={data.kpi.trips.active}
          icon={<Navigation className="w-5 h-5" />}
          accent="emerald"
          subtext={
            <span className="inline-flex items-center">
              <Route className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              {data.kpi.trips.total_distance_km.toLocaleString('vi-VN')} km kết nối
            </span>
          }
        />
        <StatCard
          label="Sự cố chờ xử lý"
          value={data.kpi.incidents.pending}
          icon={<AlertTriangle className="w-5 h-5" />}
          accent={data.kpi.incidents.pending > 0 ? 'rose' : 'slate'}
          subtext={
            <span>
              Chưa tiếp nhận: <strong className="text-rose-600">{data.kpi.incidents.not_received}</strong>
            </span>
          }
        />
      </div>

      {/* Chart 14 ngày (Recharts) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">Xu hướng chuyến xe 14 ngày gần nhất</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Phân bố số chuyến hoàn thành, đang di chuyển và đã hủy theo múi giờ Việt Nam.
            </p>
          </div>
          <Link
            to="/admin/statistics"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center"
          >
            Xem báo cáo chi tiết <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

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
      </div>

      {/* Bottom 2 Columns: Pending Incidents + Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Incidents */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Sự cố cần xử lý</h2>
            <Link
              to="/admin/incidents"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center"
            >
              Xem tất cả <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>
          {data.pending_incidents.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              Không có sự cố tồn đọng. Hệ thống đang hoạt động ổn định.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.pending_incidents.map((inc) => (
                <div key={inc.id} className="px-6 py-3.5 hover:bg-slate-50/70 transition-colors space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-slate-500">Sự cố #{inc.id}</span>
                    <IncidentStatusBadge status={inc.status} />
                  </div>
                  <div className="text-sm font-semibold text-slate-900 line-clamp-1">{inc.title}</div>
                  <div className="text-xs text-slate-500 flex items-center justify-between">
                    <span>
                      {inc.reporter.full_name} ({getRoleLabel(inc.reporter.role)})
                      {inc.trip ? ` • ${inc.trip.code}` : ''}
                    </span>
                    <span>{new Date(inc.created_at).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center">
              <Activity className="w-4 h-4 mr-1.5 text-emerald-600" />
              Hoạt động gần đây
            </h2>
          </div>
          {data.recent_activities.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">Chưa ghi nhận hoạt động nào.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recent_activities.map((act) => (
                <div key={act.id} className="px-6 py-3.5 flex items-start gap-3">
                  <div
                    className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      act.type === 'INCIDENT'
                        ? 'bg-rose-500'
                        : act.type === 'AUDIT'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 truncate">{act.title}</div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">{act.description}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {new Date(act.created_at).toLocaleString('vi-VN')}
                    </div>
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

export default AdminDashboard;
