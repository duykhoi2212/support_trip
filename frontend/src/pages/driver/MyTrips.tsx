import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Car,
  Plus,
  MapPin,
  Calendar,
  Clock,
  Users,
  Package,
  Weight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Filter
} from 'lucide-react';
import { tripService } from '../../services/tripService';
import { Trip, TripStatus } from '../../types';

export const MyTrips: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>(''); // '' = ALL
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal Hủy chuyến
  const [cancelModalTrip, setCancelModalTrip] = useState<Trip | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const data = await tripService.getMyTrips(statusFilter || undefined);
      setTrips(data);
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.response?.data?.error?.message || err.message || 'Không thể tải danh sách chuyến xe.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, [statusFilter]);

  const handleOpenCancelModal = (trip: Trip) => {
    setCancelModalTrip(trip);
    setCancelReason('');
    setCancelError(null);
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalTrip) return;

    if (!cancelReason.trim() || cancelReason.trim().length < 5) {
      setCancelError('Vui lòng nhập lý do hủy chuyến (ít nhất 5 ký tự).');
      return;
    }

    setCancelling(true);
    setCancelError(null);
    try {
      await tripService.cancelTrip(cancelModalTrip.id, cancelReason.trim());
      setFeedbackMessage({
        type: 'success',
        text: `Đã hủy chuyến xe mã ${cancelModalTrip.code} thành công.`,
      });
      setCancelModalTrip(null);
      fetchTrips();
    } catch (err: any) {
      setCancelError(err.response?.data?.error?.message || err.message || 'Không thể hủy chuyến xe.');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status: TripStatus) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
            Đang nhận yêu cầu
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            Đã chốt sổ
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-ping"></span>
            Đang di chuyển
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <CheckCircle2 className="w-3 h-3 mr-1 text-slate-500" />
            Đã hoàn thành
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3 mr-1 text-rose-500" />
            Đã hủy chuyến
          </span>
        );
      default:
        return null;
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const statusOptions = [
    { value: '', label: 'Tất cả' },
    { value: 'OPEN', label: 'Đang mở' },
    { value: 'CLOSED', label: 'Đã chốt' },
    { value: 'IN_PROGRESS', label: 'Đang chạy' },
    { value: 'COMPLETED', label: 'Hoàn thành' },
    { value: 'CANCELLED', label: 'Đã hủy' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Tiêu đề & Nút Tạo chuyến */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block mb-1">
            GoX – Không gian quản lý tài xế
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Chuyến xe của tôi
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi danh sách các chuyến đi, tình trạng chỗ trống và quản lý hủy chuyến kịp thời.
          </p>
        </div>

        <Link
          to="/driver/trips/create"
          className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          <span>Tạo chuyến xe mới</span>
        </Link>
      </div>

      {/* Thông báo thao tác */}
      {feedbackMessage && (
        <div
          className={`mb-6 p-4 rounded-2xl flex items-center justify-between text-sm ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <span className="font-medium">{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs font-bold hover:underline ml-4"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Bộ lọc trạng thái */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
        <Filter className="w-4 h-4 text-slate-400 mr-1 flex-shrink-0" />
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              statusFilter === opt.value
                ? 'bg-slate-900 text-white shadow'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Danh sách chuyến xe */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-slate-500 font-medium">Đang tải danh sách chuyến xe...</p>
        </div>
      ) : trips.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-xl mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <Car className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Chưa có chuyến xe nào</h3>
          <p className="text-sm text-slate-500 mb-6">
            {statusFilter
              ? 'Không tìm thấy chuyến xe nào ở trạng thái này.'
              : 'Bạn chưa đăng chuyến xe nào. Hãy tạo chuyến xe đầu tiên để bắt đầu kết nối hành trình.'}
          </p>
          <Link
            to="/driver/trips/create"
            className="inline-flex items-center px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Tạo chuyến xe ngay</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden"
            >
              {/* Header card: Mã chuyến & Trạng thái */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                    {trip.code}
                  </span>
                  {trip.vehicle && (
                    <span className="text-xs font-semibold text-slate-500">
                      {trip.vehicle.brand_model || trip.vehicle.plate_number}
                    </span>
                  )}
                </div>
                {getStatusBadge(trip.status)}
              </div>

              {/* Lộ trình */}
              <div className="p-5 flex-1 space-y-4">
                <div className="space-y-3 relative before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                  <div className="flex items-start space-x-3 relative">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 z-10">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-slate-400 block">Điểm xuất phát</span>
                      <p className="text-sm font-bold text-slate-900 leading-tight">{trip.origin_name}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 relative">
                    <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0 z-10">
                      <MapPin className="w-3.5 h-3.5 text-rose-600" />
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-slate-400 block">Điểm đến</span>
                      <p className="text-sm font-bold text-slate-900 leading-tight">{trip.dest_name}</p>
                    </div>
                  </div>
                </div>

                {/* Thời gian */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
                  <div className="flex items-center text-slate-700">
                    <Calendar className="w-3.5 h-3.5 mr-2 text-emerald-600 flex-shrink-0" />
                    <span>Khởi hành: <strong>{formatDateTime(trip.departure_time)}</strong></span>
                  </div>
                  <div className="flex items-center text-slate-500">
                    <Clock className="w-3.5 h-3.5 mr-2 text-slate-400 flex-shrink-0" />
                    <span>Dự kiến đến (ETA): {formatDateTime(trip.eta)}</span>
                  </div>
                  {trip.distance_km && (
                    <div className="text-[11px] text-slate-400 pt-1">
                      Lộ trình: {trip.distance_km} km ({Math.floor((trip.duration_min || 0) / 60)}h {(trip.duration_min || 0) % 60}m)
                    </div>
                  )}
                </div>

                {/* Sức chứa còn trống */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-center text-slate-400 mb-0.5">
                      <Users className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                      <span className="text-[10px] font-medium">Ghế</span>
                    </div>
                    <span className="font-bold text-slate-900">
                      {trip.seats_total - trip.seats_reserved}/{trip.seats_total}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-center text-slate-400 mb-0.5">
                      <Package className="w-3.5 h-3.5 mr-1 text-amber-600" />
                      <span className="text-[10px] font-medium">Cốp</span>
                    </div>
                    <span className="font-bold text-slate-900">
                      {(trip.cargo_area_total_m2 - trip.cargo_area_reserved_m2).toFixed(1)} m²
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-center text-slate-400 mb-0.5">
                      <Weight className="w-3.5 h-3.5 mr-1 text-blue-600" />
                      <span className="text-[10px] font-medium">Tải</span>
                    </div>
                    <span className="font-bold text-slate-900">
                      {trip.cargo_weight_total_kg - trip.cargo_weight_reserved_kg} kg
                    </span>
                  </div>
                </div>

                {/* Nếu bị hủy: Hiển thị lý do hủy */}
                {trip.status === 'CANCELLED' && trip.cancel_reason && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                    <span className="font-bold block mb-0.5">Lý do hủy chuyến:</span>
                    <span>{trip.cancel_reason}</span>
                  </div>
                )}
              </div>

                {/* Footer Card: Hành động */}
              <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {trip._count?.transport_requests || 0} yêu cầu đặt
                </span>

                <div className="flex items-center space-x-2">
                  {/* Nút Hủy chuyến: chỉ khả dụng khi OPEN hoặc CLOSED */}
                  {(trip.status === 'OPEN' || trip.status === 'CLOSED') && (
                    <button
                      type="button"
                      onClick={() => handleOpenCancelModal(trip)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                    >
                      Hủy chuyến
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal xác nhận Hủy chuyến xe */}
      {cancelModalTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Xác nhận hủy chuyến xe</h3>
                <p className="text-xs text-slate-500">Mã chuyến: {cancelModalTrip.code}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4 bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-800">
              <strong>Lưu ý quan trọng:</strong> Khi hủy chuyến, hệ thống sẽ tự động hủy các yêu cầu đặt chỗ/gửi hàng đã được duyệt và gửi thông báo trực tiếp đến hành khách.
            </p>

            {cancelError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{cancelError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmCancel} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lý do hủy chuyến (bắt buộc):
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Nhập chi tiết lý do bạn cần hủy chuyến (tối thiểu 5 ký tự)..."
                  rows={3}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalTrip(null)}
                  disabled={cancelling}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Đóng lại
                </button>
                <button
                  type="submit"
                  disabled={cancelling}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 disabled:opacity-50 transition-colors"
                >
                  {cancelling ? 'Đang xử lý hủy...' : 'Xác nhận hủy chuyến'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
