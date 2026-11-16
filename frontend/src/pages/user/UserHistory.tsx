import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Users,
  Package,
  Fuel,
  Car,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Phone,
  User as UserIcon,
  AlertCircle,
  X
} from 'lucide-react';
import { requestService } from '../../services/requestService';
import { incidentService } from '../../services/incidentService';
import { TransportRequest, UserHistoryStats } from '../../types';

export const UserHistory: React.FC = () => {
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [stats, setStats] = useState<UserHistoryStats>({
    total_rides: 0,
    total_packages: 0,
    total_fuel_shared: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Bộ lọc
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'CANCELLED' | 'REJECTED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'RIDE' | 'PACKAGE'>('ALL');

  // Modal Báo cáo sự cố
  const [selectedIncidentReq, setSelectedIncidentReq] = useState<TransportRequest | null>(null);
  const [incidentTitle, setIncidentTitle] = useState<string>('Tài xế trễ giờ / không xuất hiện');
  const [incidentDesc, setIncidentDesc] = useState<string>('');
  const [reporting, setReporting] = useState<boolean>(false);
  const [incidentSuccessMsg, setIncidentSuccessMsg] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const query: any = {};
      if (statusFilter !== 'ALL') query.status = statusFilter;
      if (typeFilter !== 'ALL') query.type = typeFilter;

      const res = await requestService.getUserHistory(query);
      setRequests(res.requests);
      setStats(res.stats);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Không thể tải lịch sử chuyến đi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [statusFilter, typeFilter]);

  const handleSubmitIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncidentReq) return;
    if (!incidentDesc.trim() || incidentDesc.trim().length < 10) {
      alert('Vui lòng nhập mô tả sự cố ít nhất 10 ký tự.');
      return;
    }

    try {
      setReporting(true);
      await incidentService.reportIncident({
        trip_id: selectedIncidentReq.trip_id,
        request_id: selectedIncidentReq.id,
        title: incidentTitle,
        description: incidentDesc.trim(),
      });
      setIncidentSuccessMsg('Báo cáo sự cố của bạn đã được gửi thành công tới Quản trị viên (Admin). Chúng tôi sẽ xác minh và liên hệ sớm!');
      setIncidentDesc('');
      setTimeout(() => {
        setIncidentSuccessMsg(null);
        setSelectedIncidentReq(null);
      }, 3000);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || err.message || 'Không thể gửi báo cáo sự cố.');
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Lịch sử Chuyến đi của Bạn
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Xem lại toàn bộ các chuyến đi nhờ và kiện hàng đã hoàn thành, khoản chi phí hỗ trợ nhiên liệu/sạc đã đóng góp tự nguyện và gửi báo cáo sự cố khi cần thiết.
        </p>
      </div>

      {/* 3 Thẻ Dashboard Thống kê */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Chuyến đi nhờ hoàn thành</span>
            <strong className="text-2xl font-black text-slate-900">{stats.total_rides}</strong>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Kiện hàng đã gửi</span>
            <strong className="text-2xl font-black text-slate-900">{stats.total_packages}</strong>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50/50 to-emerald-50/50 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
            <Fuel className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-teal-800 font-bold block">Tổng tiền hỗ trợ đã chia sẻ</span>
            <strong className="text-xl font-black text-teal-950">
              {stats.total_fuel_shared.toLocaleString('vi-VN')} đ
            </strong>
          </div>
        </div>
      </div>

      {/* Bộ lọc lịch sử */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm mb-8 flex flex-wrap items-center justify-between gap-4">
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
            Tất cả
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
            Đã hoàn thành
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
            Đã hủy
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
              statusFilter === 'REJECTED'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Bị từ chối
          </button>
        </div>

        {/* Tabs loại hình */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setTypeFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              typeFilter === 'ALL' ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Mọi loại
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('RIDE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              typeFilter === 'RIDE' ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Đi nhờ xe
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('PACKAGE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              typeFilter === 'PACKAGE' ? 'bg-amber-100 text-amber-800' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Gửi hàng
          </button>
        </div>
      </div>

      {/* Thông báo lỗi nếu có */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm mb-6 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Danh sách yêu cầu */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-white p-6 rounded-3xl border border-slate-200 h-40">
              <div className="h-4 bg-slate-200 rounded w-1/4 mb-3"></div>
              <div className="h-3 bg-slate-100 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 text-sm shadow-sm">
          Chưa có yêu cầu nào trong lịch sử theo bộ lọc hiện tại.
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const isCompleted = req.status === 'COMPLETED';
            const isCancelled = req.status === 'CANCELLED';
            const isRejected = req.status === 'REJECTED';
            const trip = req.trip;

            return (
              <div
                key={req.id}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
              >
                <div className="space-y-3 flex-1">
                  {/* Hàng 1: Mã yêu cầu & Loại hình & Trạng thái */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                      {req.code}
                    </span>

                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        req.type === 'RIDE'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {req.type === 'RIDE' ? `Đi nhờ (${req.passenger_count || 1} người)` : 'Gửi kiện hàng'}
                    </span>

                    <span
                      className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : isCancelled
                          ? 'bg-slate-100 text-slate-700 border border-slate-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {isCompleted ? '✓ Đã hoàn thành' : isCancelled ? '✕ Đã hủy' : '✕ Bị từ chối'}
                    </span>

                    {trip?.code && (
                      <span className="text-xs text-slate-500 font-mono">
                        Thuộc chuyến: <strong>{trip.code}</strong>
                      </span>
                    )}
                  </div>

                  {/* Hàng 2: Lộ trình & Thông tin tài xế */}
                  {trip && (
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
                  )}

                  {/* Thông tin tài xế & phương tiện */}
                  {trip && (
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                      <span className="flex items-center font-bold text-slate-900">
                        <UserIcon className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        {trip.driver?.full_name || 'Tài xế GoX'}
                      </span>
                      {trip.driver?.phone && (
                        <a
                          href={`tel:${trip.driver.phone}`}
                          className="text-emerald-700 font-bold hover:underline flex items-center"
                        >
                          <Phone className="w-3 h-3 mr-1" />
                          {trip.driver.phone}
                        </a>
                      )}
                      {trip.vehicle && (
                        <span className="text-slate-500 flex items-center">
                          <Car className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          {trip.vehicle.brand_model} • {trip.vehicle.plate_number} (
                          {trip.vehicle.fuel_type === 'ELECTRIC' ? 'Xe điện' : trip.vehicle.fuel_type === 'DIESEL' ? 'Dầu' : 'Xăng'})
                        </span>
                      )}
                    </div>
                  )}

                  {/* Thời gian */}
                  {trip && (
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        <span>Khởi hành: <strong>{new Date(trip.departure_time).toLocaleString('vi-VN')}</strong></span>
                      </span>
                    </div>
                  )}

                  {/* Lý do từ chối hoặc hủy nếu có */}
                  {isRejected && req.reject_reason && (
                    <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                      <strong>Lý do từ chối:</strong> {req.reject_reason}
                    </div>
                  )}
                  {isCancelled && req.cancel_reason && (
                    <div className="p-3 rounded-2xl bg-slate-100 text-xs text-slate-700">
                      <strong>Lý do hủy:</strong> {req.cancel_reason}
                    </div>
                  )}
                </div>

                {/* Cột phải: Tiền nhiên liệu đã chia sẻ & Hành động */}
                <div className="lg:text-right flex flex-col justify-between items-start lg:items-end space-y-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 flex-shrink-0">
                  {isCompleted && req.shared_fuel_cost !== undefined && req.shared_fuel_cost !== null && req.shared_fuel_cost > 0 && (
                    <div className="bg-teal-50/80 p-3 rounded-2xl border border-teal-200">
                      <span className="text-[11px] text-teal-800 font-bold block flex items-center lg:justify-end">
                        <Fuel className="w-3 h-3 mr-1 text-teal-600" />
                        Tiền hỗ trợ nhiên liệu đã chia sẻ:
                      </span>
                      <strong className="text-lg font-black text-teal-950">
                        {req.shared_fuel_cost.toLocaleString('vi-VN')} đ
                      </strong>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    {trip?.id && (
                      <Link
                        to={`/trips/${trip.id}`}
                        className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-emerald-700 transition-colors space-x-1"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        <span>Xem chuyến</span>
                      </Link>
                    )}

                    {/* NÚT BÁO CÁO SỰ CỐ */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedIncidentReq(req);
                        setIncidentSuccessMsg(null);
                      }}
                      className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors space-x-1 cursor-pointer"
                    >
                      <AlertTriangle className="w-4 h-4 mr-1 text-rose-600" />
                      <span>Báo cáo sự cố</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL BÁO CÁO SỰ CỐ */}
      {selectedIncidentReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 relative animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Báo cáo sự cố chuyến đi</h3>
                  <span className="text-xs text-slate-500 font-mono">
                    Yêu cầu: {selectedIncidentReq.code} • Chuyến: {selectedIncidentReq.trip?.code || 'N/A'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIncidentReq(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {incidentSuccessMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs space-y-2">
                <div className="flex items-center space-x-2 font-bold text-sm text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Gửi báo cáo thành công!</span>
                </div>
                <p>{incidentSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitIncident} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phân loại sự cố:
                  </label>
                  <select
                    value={incidentTitle}
                    onChange={(e) => setIncidentTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="Tài xế trễ giờ / không xuất hiện">Tài xế trễ giờ / không xuất hiện</option>
                    <option value="Phương tiện không đúng mô tả / không an toàn">Phương tiện không đúng mô tả / không an toàn</option>
                    <option value="Thái độ tài xế không phù hợp">Thái độ tài xế không phù hợp</option>
                    <option value="Hàng hóa bị thất lạc / hư hỏng">Hàng hóa bị thất lạc / hư hỏng</option>
                    <option value="Yêu cầu thu tiền trái quy định chia sẻ">Yêu cầu thu tiền trái quy định chia sẻ</option>
                    <option value="Vấn đề an toàn giao thông khác">Vấn đề an toàn giao thông khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mô tả chi tiết sự cố: <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={incidentDesc}
                    onChange={(e) => setIncidentDesc(e.target.value)}
                    placeholder="Vui lòng cung cấp chi tiết sự việc, địa điểm, thời gian và bất kỳ bằng chứng cụ thể nào để Admin hỗ trợ xác minh..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 placeholder-slate-400"
                    required
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Tối thiểu 10 ký tự. Báo cáo sẽ được gửi tới Ban quản trị GoX.
                  </span>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedIncidentReq(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={reporting || incidentDesc.trim().length < 10}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md transition-all disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
                  >
                    {reporting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Đang gửi...</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Gửi báo cáo tới Admin</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
