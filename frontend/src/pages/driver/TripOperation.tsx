import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Phone,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Play,
  Flag
} from 'lucide-react';
import { tripService } from '../../services/tripService';
import { requestService } from '../../services/requestService';
import { Trip, TransportRequest, RideProgress, PackageStatus } from '../../types';

export const TripOperation: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tab: 'pending' (Chờ duyệt) hoặc 'onboard' (Hành khách & Hàng đã nhận)
  const [activeTab, setActiveTab] = useState<'pending' | 'onboard'>('pending');

  // Modal Từ chối yêu cầu
  const [rejectModalReq, setRejectModalReq] = useState<TransportRequest | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [rejecting, setRejecting] = useState<boolean>(false);

  const fetchTripAndRequests = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [tripData, requestsData] = await Promise.all([
        tripService.getTripById(id),
        requestService.getTripRequests(id),
      ]);
      setTrip(tripData);
      setRequests(requestsData);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error?.message || err.message || 'Không thể tải dữ liệu điều hành chuyến xe.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTripAndRequests();
  }, [id]);

  // Chấp nhận yêu cầu
  const handleAccept = async (requestId: string) => {
    setActionLoadingId(requestId);
    setMessage(null);
    try {
      await requestService.acceptRequest(requestId);
      setMessage({ type: 'success', text: 'Đã chấp nhận yêu cầu vận chuyển.' });
      fetchTripAndRequests();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error?.message || err.message || 'Không thể chấp nhận yêu cầu.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Từ chối yêu cầu
  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalReq) return;

    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      alert('Vui lòng nhập lý do từ chối (ít nhất 5 ký tự).');
      return;
    }

    setRejecting(true);
    try {
      await requestService.rejectRequest(rejectModalReq.id, rejectReason.trim());
      setMessage({ type: 'success', text: `Đã từ chối yêu cầu ${rejectModalReq.code}.` });
      setRejectModalReq(null);
      fetchTripAndRequests();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || err.message || 'Lỗi khi từ chối yêu cầu.');
    } finally {
      setRejecting(false);
    }
  };

  // Cập nhật tiến trình đón/trả/giao hàng
  const handleUpdateProgress = async (
    requestId: string,
    data: { ride_progress?: RideProgress; package_status?: PackageStatus }
  ) => {
    setActionLoadingId(requestId);
    setMessage(null);
    try {
      await requestService.updateProgress(requestId, data as any);
      setMessage({ type: 'success', text: 'Cập nhật tiến trình thành công.' });
      fetchTripAndRequests();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error?.message || err.message || 'Không thể cập nhật tiến trình.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Bắt đầu chuyến xe
  const handleStartTrip = async () => {
    if (!trip) return;
    if (!confirm(`Bạn có chắc chắn muốn bắt đầu chuyến xe ${trip.code}? Hành khách sẽ nhận được thông báo.`)) return;

    try {
      await requestService.startTrip(trip.id);
      setMessage({ type: 'success', text: `Chuyến xe ${trip.code} đã chính thức bắt đầu!` });
      fetchTripAndRequests();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error?.message || err.message || 'Không thể bắt đầu chuyến xe.',
      });
    }
  };

  // Kết thúc chuyến xe
  const handleCompleteTrip = async () => {
    if (!trip) return;
    if (!confirm(`Xác nhận hoàn thành toàn bộ chuyến xe ${trip.code}?`)) return;

    try {
      await requestService.completeTrip(trip.id);
      setMessage({ type: 'success', text: `Chúc mừng bạn đã hoàn thành chuyến xe ${trip.code} an toàn!` });
      fetchTripAndRequests();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error?.message || err.message || 'Không thể kết thúc chuyến xe.',
      });
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm text-slate-500 font-medium">Đang tải trung tâm điều hành chuyến xe...</p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-sm text-slate-500 mb-4">Không tìm thấy thông tin chuyến xe.</p>
        <Link to="/driver/trips" className="text-emerald-600 font-bold text-xs hover:underline">
          Quay lại danh sách chuyến
        </Link>
      </div>
    );
  }

  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const onboardRequests = requests.filter((r) => r.status === 'ACCEPTED' || r.status === 'COMPLETED');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Header & Trạng thái chuyến xe */}
      <div className="mb-6">
        <Link
          to="/driver/trips"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-emerald-600 mb-2 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5 mr-1" />
          <span>Quay lại danh sách chuyến</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Điều hành chuyến {trip.code}
              </h1>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                  trip.status === 'IN_PROGRESS'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : trip.status === 'COMPLETED'
                    ? 'bg-slate-100 text-slate-700 border border-slate-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                {trip.status === 'IN_PROGRESS'
                  ? 'Đang di chuyển'
                  : trip.status === 'COMPLETED'
                  ? 'Đã kết thúc'
                  : 'Đang mở nhận yêu cầu'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Lộ trình: {trip.origin_name} → {trip.dest_name} (Khởi hành: {new Date(trip.departure_time).toLocaleString('vi-VN')})
            </p>
          </div>

          {/* Action buttons cho Chuyến xe */}
          <div className="flex items-center space-x-3">
            {(trip.status === 'OPEN' || trip.status === 'CLOSED') && (
              <button
                type="button"
                onClick={handleStartTrip}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 flex items-center space-x-1.5 transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Bắt đầu hành trình</span>
              </button>
            )}

            {trip.status === 'IN_PROGRESS' && (
              <button
                type="button"
                onClick={handleCompleteTrip}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center space-x-1.5 transition-all"
              >
                <Flag className="w-4 h-4" />
                <span>Kết thúc chuyến xe</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Thông báo thao tác */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-2xl flex items-center justify-between text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-xs font-bold hover:underline ml-4">
            Đóng
          </button>
        </div>
      )}

      {/* Sức chứa tổng quan */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 mb-8 shadow-sm grid grid-cols-3 gap-4 text-center">
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
          <span className="text-xs text-slate-500 block mb-1">Ghế đã đặt / Tổng</span>
          <span className="text-xl font-extrabold text-slate-900">
            {trip.seats_reserved}/{trip.seats_total} chỗ
          </span>
        </div>
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
          <span className="text-xs text-slate-500 block mb-1">Cốp đã chiếm / Tổng</span>
          <span className="text-xl font-extrabold text-slate-900">
            {trip.cargo_area_reserved_m2.toFixed(1)}/{trip.cargo_area_total_m2} m²
          </span>
        </div>
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
          <span className="text-xs text-slate-500 block mb-1">Tải trọng đã chiếm / Tổng</span>
          <span className="text-xl font-extrabold text-slate-900">
            {trip.cargo_weight_reserved_kg}/{trip.cargo_weight_total_kg} kg
          </span>
        </div>
      </div>

      {/* Tabs chuyển đổi: Yêu cầu chờ duyệt & Hành khách trên xe */}
      <div className="flex rounded-2xl bg-slate-100 p-1 mb-6 text-xs font-bold max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center space-x-2 ${
            activeTab === 'pending'
              ? 'bg-white text-slate-900 shadow'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Chờ duyệt</span>
          {pendingRequests.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px]">
              {pendingRequests.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('onboard')}
          className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center space-x-2 ${
            activeTab === 'onboard'
              ? 'bg-white text-slate-900 shadow'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Khách & Hàng trên xe</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px]">
            {onboardRequests.length}
          </span>
        </button>
      </div>

      {/* TAB 1: DANH SÁCH CHỜ DUYỆT */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingRequests.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 text-xs shadow-sm">
              Hiện không có yêu cầu nào đang chờ bạn duyệt.
            </div>
          ) : (
            pendingRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {req.code}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        req.type === 'RIDE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {req.type === 'RIDE' ? `Đi nhờ (${req.passenger_count} người)` : 'Gửi kiện hàng'}
                    </span>
                    <span className="text-xs text-slate-400">Khách: {req.user?.full_name}</span>
                  </div>

                  <div className="text-xs space-y-1">
                    <p className="text-slate-700">
                      <strong className="text-emerald-700">Đón:</strong> {req.pickup_name}
                    </p>
                    <p className="text-slate-700">
                      <strong className="text-rose-700">Trả:</strong> {req.dropoff_name}
                    </p>
                    {req.type === 'PACKAGE' && req.package_items && req.package_items[0] && (
                      <p className="text-slate-500 text-[11px]">
                        Hàng: {req.package_items[0].description} ({req.package_items[0].weight_kg}kg, {req.package_items[0].area_m2}m²)
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setRejectModalReq(req);
                      setRejectReason('');
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                  >
                    Từ chối
                  </button>
                  <button
                    type="button"
                    disabled={actionLoadingId === req.id}
                    onClick={() => handleAccept(req.id)}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-colors disabled:opacity-50"
                  >
                    {actionLoadingId === req.id ? 'Đang duyệt...' : 'Chấp nhận'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: DANH SÁCH ĐÃ CHẤP NHẬN & ĐIỀU HÀNH TIẾN TRÌNH */}
      {activeTab === 'onboard' && (
        <div className="space-y-4">
          {onboardRequests.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 text-xs shadow-sm">
              Chưa có hành khách hoặc kiện hàng nào được chấp nhận trên chuyến xe.
            </div>
          ) : (
            onboardRequests.map((req) => {
              const isRide = req.type === 'RIDE';
              const isCompleted = req.status === 'COMPLETED';

              return (
                <div
                  key={req.id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {req.code}
                      </span>
                      <span className="text-xs font-bold text-slate-900">{req.user?.full_name}</span>

                      {/* SĐT khách (HIỂN THỊ VÌ ĐÃ ACCEPTED) */}
                      {req.user?.phone && (
                        <a
                          href={`tel:${req.user.phone}`}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 hover:bg-emerald-100 transition-colors"
                        >
                          <Phone className="w-3 h-3 mr-1 text-emerald-600" />
                          {req.user.phone}
                        </a>
                      )}

                      {isCompleted ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          Đã hoàn thành
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                          Đang phục vụ
                        </span>
                      )}
                    </div>

                    <div className="text-xs space-y-1">
                      <p className="text-slate-700">
                        <strong className="text-emerald-700">Đón:</strong> {req.pickup_name}
                      </p>
                      <p className="text-slate-700">
                        <strong className="text-rose-700">Trả:</strong> {req.dropoff_name}
                      </p>
                      {req.package_items && req.package_items[0] && (
                        <p className="text-slate-500 text-[11px]">
                          Kiện hàng: {req.package_items[0].description} (Người nhận: {req.package_items[0].recipient_name} - {req.package_items[0].recipient_phone})
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Nút thao tác tiến trình */}
                  <div className="flex items-center space-x-2">
                    {/* Tiến trình đi nhờ (RIDE) */}
                    {isRide && !isCompleted && (
                      <>
                        {req.ride_progress === 'NOT_PICKED_UP' && (
                          <button
                            type="button"
                            disabled={actionLoadingId === req.id}
                            onClick={() => handleUpdateProgress(req.id, { ride_progress: 'PICKED_UP' })}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-sm transition-colors"
                          >
                            Đã đón khách lên xe
                          </button>
                        )}
                        {req.ride_progress === 'PICKED_UP' && (
                          <button
                            type="button"
                            disabled={actionLoadingId === req.id}
                            onClick={() => handleUpdateProgress(req.id, { ride_progress: 'DROPPED_OFF' })}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
                          >
                            Đã trả khách xuống xe
                          </button>
                        )}
                      </>
                    )}

                    {/* Tiến trình gửi hàng (PACKAGE) */}
                    {!isRide && !isCompleted && req.package_items && req.package_items[0] && (
                      <>
                        {req.package_items[0].status === 'AWAITING_PICKUP' && (
                          <button
                            type="button"
                            disabled={actionLoadingId === req.id}
                            onClick={() => handleUpdateProgress(req.id, { package_status: 'PICKED_UP' })}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-sm transition-colors"
                          >
                            Đã nhận hàng vào cốp
                          </button>
                        )}
                        {req.package_items[0].status === 'PICKED_UP' && (
                          <button
                            type="button"
                            disabled={actionLoadingId === req.id}
                            onClick={() => handleUpdateProgress(req.id, { package_status: 'DELIVERED' })}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
                          >
                            Đã giao hàng thành công
                          </button>
                        )}
                      </>
                    )}

                    {isCompleted && (
                      <span className="text-xs font-semibold text-slate-400 flex items-center">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-1" />
                        Hoàn tất
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal từ chối yêu cầu */}
      {rejectModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Từ chối yêu cầu {rejectModalReq.code}</h3>
            <p className="text-xs text-slate-500 mb-4">Vui lòng nhập lý do từ chối để thông báo đến hành khách.</p>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ví dụ: Xe không tiện đón tại điểm này, cốp xe đã xếp đồ cồng kềnh..."
                rows={3}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalReq(null)}
                  disabled={rejecting}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={rejecting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 disabled:opacity-50"
                >
                  {rejecting ? 'Đang từ chối...' : 'Xác nhận từ chối'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
