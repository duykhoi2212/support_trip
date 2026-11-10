import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Package,
  MapPin,
  Phone,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Filter,
  Car
} from 'lucide-react';
import { requestService } from '../../services/requestService';
import { TransportRequest, RequestStatus } from '../../types';

export const MyRequests: React.FC = () => {
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>(''); // '' = All
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal hủy yêu cầu
  const [cancelModalReq, setCancelModalReq] = useState<TransportRequest | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await requestService.getMyRequests();
      setRequests(data);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.error?.message || err.message || 'Không thể tải danh sách yêu cầu.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleOpenCancelModal = (req: TransportRequest) => {
    setCancelModalReq(req);
    setCancelReason('');
    setCancelError(null);
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalReq) return;

    if (!cancelReason.trim() || cancelReason.trim().length < 5) {
      setCancelError('Vui lòng nhập lý do hủy (tối thiểu 5 ký tự).');
      return;
    }

    setCancelling(true);
    setCancelError(null);
    try {
      await requestService.cancelRequest(cancelModalReq.id, cancelReason.trim());
      setFeedback({
        type: 'success',
        text: `Đã hủy yêu cầu ${cancelModalReq.code} thành công.`,
      });
      setCancelModalReq(null);
      fetchRequests();
    } catch (err: any) {
      setCancelError(err.response?.data?.error?.message || err.message || 'Không thể hủy yêu cầu.');
    } finally {
      setCancelling(false);
    }
  };

  const filteredRequests = statusFilter
    ? requests.filter((r) => r.status === statusFilter)
    : requests;

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span>
            Chờ tài xế duyệt
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            Đã chấp nhận
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-blue-600" />
            Đã hoàn thành
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />
            Bị từ chối
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Đã hủy
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const statusOptions = [
    { value: '', label: 'Tất cả' },
    { value: 'PENDING', label: 'Chờ duyệt' },
    { value: 'ACCEPTED', label: 'Đã chấp nhận' },
    { value: 'COMPLETED', label: 'Đã hoàn thành' },
    { value: 'REJECTED', label: 'Bị từ chối' },
    { value: 'CANCELLED', label: 'Đã hủy' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block mb-1">
            Không gian người dùng
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Yêu cầu vận chuyển của tôi
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi tiến độ duyệt, số điện thoại liên hệ tài xế và trạng thái chuyến đi.
          </p>
        </div>

        <Link
          to="/"
          className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-emerald-600 transition-colors"
        >
          <span>Tìm chuyến xe khác</span>
          <ChevronRight className="w-4 h-4 ml-1" />
        </Link>
      </div>

      {/* Thông báo thao tác */}
      {feedback && (
        <div
          className={`mb-6 p-4 rounded-2xl flex items-center justify-between text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <span className="font-medium">{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs font-bold hover:underline ml-4">
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

      {/* Danh sách yêu cầu */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-slate-500 font-medium">Đang tải danh sách yêu cầu...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-xl mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Chưa có yêu cầu nào</h3>
          <p className="text-sm text-slate-500 mb-6">
            {statusFilter
              ? 'Không tìm thấy yêu cầu nào ở trạng thái này.'
              : 'Bạn chưa tạo yêu cầu đi nhờ xe hoặc gửi hàng nào. Hãy tìm kiếm chuyến xe phù hợp ngay!'}
          </p>
          <Link
            to="/"
            className="inline-flex items-center px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow hover:bg-emerald-700 transition-colors"
          >
            <Car className="w-4 h-4 mr-1.5" />
            <span>Tìm chuyến xe ngay</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRequests.map((req) => {
            const isAccepted = req.status === 'ACCEPTED';
            const canCancel =
              (req.status === 'PENDING' || req.status === 'ACCEPTED') &&
              req.trip?.status !== 'IN_PROGRESS' &&
              req.trip?.status !== 'COMPLETED';

            return (
              <div
                key={req.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden"
              >
                {/* Header card: Mã yêu cầu & Loại & Trạng thái */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {req.code}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        req.type === 'RIDE'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {req.type === 'RIDE' ? <Users className="w-3 h-3 mr-1" /> : <Package className="w-3 h-3 mr-1" />}
                      {req.type === 'RIDE' ? 'Đi nhờ xe' : 'Gửi hàng'}
                    </span>
                  </div>
                  {getStatusBadge(req.status)}
                </div>

                {/* Nội dung điểm đón & trả */}
                <div className="p-5 flex-1 space-y-4">
                  {/* Chuyến xe liên kết */}
                  {req.trip && (
                    <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                      <span>Chuyến: <strong>{req.trip.code}</strong></span>
                      <span>Khởi hành: {new Date(req.trip.departure_time).toLocaleDateString('vi-VN')}</span>
                    </div>
                  )}

                  {/* Lộ trình đón - trả */}
                  <div className="space-y-3 relative before:absolute before:left-3 before:top-2.5 before:bottom-2.5 before:w-0.5 before:bg-slate-200 text-xs">
                    <div className="flex items-start space-x-3 relative">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 z-10">
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Điểm đón</span>
                        <p className="font-bold text-slate-900 leading-tight">{req.pickup_name}</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 relative">
                      <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0 z-10">
                        <MapPin className="w-3.5 h-3.5 text-rose-600" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Điểm trả</span>
                        <p className="font-bold text-slate-900 leading-tight">{req.dropoff_name}</p>
                      </div>
                    </div>
                  </div>

                  {/* Chi tiết theo loại */}
                  {req.type === 'RIDE' ? (
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs flex justify-between items-center">
                      <span className="text-slate-500">Số lượng người:</span>
                      <span className="font-bold text-slate-900">{req.passenger_count} người</span>
                    </div>
                  ) : (
                    req.package_items && req.package_items[0] && (
                      <div className="p-3 rounded-2xl bg-amber-50/50 border border-amber-100 text-xs space-y-1.5">
                        <div className="flex justify-between font-semibold text-slate-800">
                          <span>{req.package_items[0].description}</span>
                          <span>{req.package_items[0].weight_kg} kg</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Người nhận: {req.package_items[0].recipient_name} ({req.package_items[0].recipient_phone})
                        </div>
                      </div>
                    )
                  )}

                  {/* HIỂN THỊ SỐ ĐIỆN THOẠI TÀI XẾ (BẢO MẬT) */}
                  <div className="pt-2 border-t border-slate-100">
                    {isAccepted && req.trip?.driver?.phone ? (
                      <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <div>
                            <span className="block text-[10px] text-emerald-700 font-medium">
                              Tài xế {req.trip.driver.full_name}:
                            </span>
                            <span className="font-mono font-bold text-sm text-emerald-950">
                              {req.trip.driver.phone}
                            </span>
                          </div>
                        </div>
                        <a
                          href={`tel:${req.trip.driver.phone}`}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
                        >
                          Gọi ngay
                        </a>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 flex items-center">
                        <Phone className="w-3.5 h-3.5 mr-1.5 text-slate-300" />
                        <span>SĐT tài xế sẽ hiển thị khi được duyệt chấp nhận.</span>
                      </div>
                    )}
                  </div>

                  {/* Lý do từ chối hoặc hủy */}
                  {req.status === 'REJECTED' && req.reject_reason && (
                    <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                      <strong>Lý do từ chối:</strong> {req.reject_reason}
                    </div>
                  )}
                  {req.status === 'CANCELLED' && req.cancel_reason && (
                    <div className="p-3 rounded-2xl bg-slate-100 text-xs text-slate-700">
                      <strong>Lý do hủy:</strong> {req.cancel_reason}
                    </div>
                  )}
                </div>

                {/* Footer card: Nút hủy */}
                {canCancel && (
                  <div className="p-4 border-t border-slate-100 bg-white flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleOpenCancelModal(req)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                    >
                      Hủy yêu cầu
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal xác nhận hủy yêu cầu */}
      {cancelModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Xác nhận hủy yêu cầu</h3>
                <p className="text-xs text-slate-500">Mã yêu cầu: {cancelModalReq.code}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4 bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-800">
              {cancelModalReq.status === 'ACCEPTED'
                ? 'Lưu ý: Yêu cầu này đã được tài xế chấp nhận. Nếu hủy, chỗ/diện tích sẽ được hoàn trả cho xe và ghi nhận vào tỷ lệ hủy của bạn.'
                : 'Yêu cầu đang chờ duyệt sẽ được hủy ngay lập tức.'}
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
                  Lý do hủy yêu cầu (bắt buộc):
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Nhập lý do bạn cần hủy yêu cầu (tối thiểu 5 ký tự)..."
                  rows={3}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalReq(null)}
                  disabled={cancelling}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                >
                  Đóng lại
                </button>
                <button
                  type="submit"
                  disabled={cancelling}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 disabled:opacity-50"
                >
                  {cancelling ? 'Đang hủy...' : 'Xác nhận hủy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
