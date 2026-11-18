import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Clock,
  CheckCircle2,
  Truck,
  Search,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Car,
} from 'lucide-react';
import { requestService } from '../../services/requestService';
import { UserDashboardData } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/common/StatCard';
import { RequestStatusBadge } from '../../components/common/StatusBadge';

export const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<UserDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await requestService.getUserDashboard();
        setData(res);
      } catch (err: any) {
        setError(err.message || 'Không thể tải dữ liệu tổng quan.');
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
        <span className="text-sm font-medium">Đang tải trang tổng quan...</span>
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

  const ratePercent = Number((data.cancellation.week_rate * 100).toFixed(1));
  const rateBadge =
    ratePercent > 5
      ? { text: 'Nguy cơ vi phạm', cls: 'bg-rose-50 text-rose-700 border-rose-200' }
      : ratePercent >= 3
      ? { text: 'Cần lưu ý', cls: 'bg-amber-50 text-amber-700 border-amber-200' }
      : { text: 'An toàn', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header + Quick Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Xin chào, {user?.full_name || 'bạn'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tổng quan nhanh các yêu cầu đi nhờ, gửi hàng và tình trạng tài khoản của bạn.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link
            to="/?type=RIDE"
            className="inline-flex items-center px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-colors"
          >
            <Search className="w-4 h-4 mr-1.5" />
            Tìm chuyến đi nhờ
          </Link>
          <Link
            to="/?type=PACKAGE"
            className="inline-flex items-center px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-sm font-semibold transition-colors"
          >
            <Package className="w-4 h-4 mr-1.5 text-emerald-600" />
            Gửi hàng theo chuyến
          </Link>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Tổng số yêu cầu"
          value={data.stats.total_requests}
          icon={<Package className="w-5 h-5" />}
          accent="slate"
          subtext={
            <span>
              Đã hoàn thành: <strong className="text-emerald-700">{data.stats.completed_count}</strong>
            </span>
          }
        />
        <StatCard
          label="Chờ tài xế duyệt"
          value={data.stats.pending_count}
          icon={<Clock className="w-5 h-5" />}
          accent="amber"
          subtext="Yêu cầu đang chờ phản hồi"
        />
        <StatCard
          label="Đã được chấp nhận"
          value={data.stats.accepted_count}
          icon={<CheckCircle2 className="w-5 h-5" />}
          accent="sky"
          subtext="Sẵn sàng khởi hành cùng tài xế"
        />
        <StatCard
          label="Đang vận chuyển"
          value={data.stats.in_transit_count}
          icon={<Truck className="w-5 h-5" />}
          accent="emerald"
          subtext="Chuyến đang di chuyển hoặc đã đón/lấy hàng"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Requests (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Yêu cầu gần đây</h2>
            <Link
              to="/user/requests"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center"
            >
              Xem tất cả <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>

          {data.recent_requests.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-400">
              Bạn chưa có yêu cầu nào. Hãy tìm chuyến xe phù hợp ngay!
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recent_requests.map((req) => (
                <div
                  key={req.id}
                  className="px-6 py-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-600">{req.code}</span>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {req.type === 'RIDE' ? `Đi nhờ (${req.passenger_count || 1} người)` : 'Gửi hàng'}
                      </span>
                      <RequestStatusBadge status={req.status} />
                    </div>
                    {req.trip && (
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {req.trip.origin_name} ➔ {req.trip.dest_name}
                      </div>
                    )}
                    <div className="text-xs text-slate-500">
                      {req.trip
                        ? `Khởi hành: ${new Date(req.trip.departure_time).toLocaleString('vi-VN')} • Tài xế: ${req.trip.driver?.full_name || 'Đang cập nhật'}`
                        : `Tạo lúc: ${new Date(req.created_at).toLocaleString('vi-VN')}`}
                    </div>
                  </div>
                  {req.trip && (
                    <Link
                      to={`/trips/${req.trip.id}`}
                      className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-xs font-semibold flex-shrink-0 transition-colors"
                    >
                      Xem chuyến <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Cancel Rate + Shortcuts */}
        <div className="space-y-6">
          {/* Weekly Cancel Rate Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center">
                <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-600" />
                Tỷ lệ hủy chuyến tuần này
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${rateBadge.cls}`}>
                {rateBadge.text}
              </span>
            </div>
            <div className="text-3xl font-extrabold text-slate-900">{ratePercent}%</div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Đã hủy/vắng mặt <strong>{data.cancellation.week_cancelled}</strong> trên tổng{' '}
              <strong>{data.cancellation.week_confirmed}</strong> chuyến xác nhận trong tuần (giới hạn an toàn ≤ 5%).
            </p>
            <Link
              to="/user/history"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center"
            >
              Xem lịch sử chuyến đi <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2.5">
            <h2 className="text-sm font-bold text-slate-900 mb-3">Lối tắt nhanh</h2>
            <Link
              to="/?mode=ai"
              className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200/70 text-emerald-900 transition-colors"
            >
              <div className="flex items-center gap-2.5 text-xs font-semibold">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Tìm chuyến nhanh bằng AI</span>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-600" />
            </Link>
            <Link
              to="/my-incidents"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2.5 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Theo dõi báo cáo sự cố</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
            <Link
              to="/profile"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2.5 text-xs font-semibold">
                <Car className="w-4 h-4 text-slate-600" />
                <span>Cập nhật hồ sơ cá nhân</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
