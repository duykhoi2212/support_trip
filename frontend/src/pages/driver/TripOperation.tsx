import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Phone,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Play,
  Flag,
  Eye,
  X,
  Maximize2,
  User,
  Box,
  Fuel,
  AlertTriangle,
  CheckCheck,
  XCircle,
  Loader2,
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

  // Modal Chi tiết yêu cầu vận chuyển
  const [selectedDetailReq, setSelectedDetailReq] = useState<TransportRequest | null>(null);

  // Modal Xem ảnh phóng to (Lightbox)
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Modal Hủy chuyến xe khẩn cấp khi đang di chuyển (gặp sự cố)
  const [showEmergencyCancelModal, setShowEmergencyCancelModal] = useState<boolean>(false);
  const [emergencyCancelReason, setEmergencyCancelReason] = useState<string>('');
  const [cancellingEmergency, setCancellingEmergency] = useState<boolean>(false);

  // Modal Báo cáo sự cố từng yêu cầu (Khách vắng mặt / không nghe máy)
  const [reportModalReq, setReportModalReq] = useState<TransportRequest | null>(null);
  const [reportReasonCode, setReportReasonCode] = useState<string>('ABSENT');
  const [reportNote, setReportNote] = useState<string>('');
  const [submittingReport, setSubmittingReport] = useState<boolean>(false);

  // Batch loading
  const [batchLoading, setBatchLoading] = useState<boolean>(false);

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

  // Đón đủ tất cả khách và nhận đủ tất cả kiện hàng lên xe (Batch Pickup)
  const handlePickupAll = async () => {
    if (!trip) return;
    if (!confirm('Xác nhận đã đón đầy đủ tất cả hành khách và nhận đủ kiện hàng lên xe?')) return;

    setBatchLoading(true);
    setMessage(null);
    try {
      const res = await requestService.pickupAll(trip.id);
      setMessage({ type: 'success', text: res.message || 'Đã xác nhận đón toàn bộ khách và hàng lên xe thành công.' });
      fetchTripAndRequests();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error?.message || err.message || 'Không thể xác nhận đón hàng loạt.',
      });
    } finally {
      setBatchLoading(false);
    }
  };

  // Trả đủ tất cả khách và giao đủ tất cả kiện hàng (Batch Dropoff)
  const handleDropoffAll = async () => {
    if (!trip) return;
    if (!confirm('Xác nhận đã trả đầy đủ tất cả hành khách xuống xe và giao toàn bộ kiện hàng an toàn?')) return;

    setBatchLoading(true);
    setMessage(null);
    try {
      const res = await requestService.dropoffAll(trip.id);
      setMessage({ type: 'success', text: res.message || 'Đã xác nhận trả toàn bộ khách và giao toàn bộ hàng thành công.' });
      fetchTripAndRequests();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error?.message || err.message || 'Không thể xác nhận trả hàng loạt.',
      });
    } finally {
      setBatchLoading(false);
    }
  };

  // Báo cáo sự cố từng yêu cầu
  const handleConfirmReportIssue = async () => {
    if (!reportModalReq) return;
    setSubmittingReport(true);
    try {
      const res = await requestService.reportIssue(reportModalReq.id, {
        reason_code: reportReasonCode,
        note: reportNote.trim() || undefined,
      });
      setMessage({ type: 'success', text: res.message });
      setReportModalReq(null);
      fetchTripAndRequests();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || err.message || 'Lỗi khi báo cáo sự cố yêu cầu.');
    } finally {
      setSubmittingReport(false);
    }
  };

  // Hủy chuyến xe khẩn cấp khi đang di chuyển (gặp sự cố)
  const handleConfirmEmergencyCancel = async () => {
    if (!trip) return;
    if (emergencyCancelReason.trim().length < 10) {
      alert('Vui lòng nhập lý do sự cố chi tiết (tối thiểu 10 ký tự).');
      return;
    }

    setCancellingEmergency(true);
    try {
      await tripService.cancelTripInProgress(trip.id, emergencyCancelReason.trim());
      setMessage({
        type: 'success',
        text: `Chuyến xe ${trip.code} đã được hủy khẩn cấp do sự cố. Ban quản trị và hành khách đã được thông báo.`,
      });
      setShowEmergencyCancelModal(false);
      fetchTripAndRequests();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || err.message || 'Không thể hủy chuyến xe.');
    } finally {
      setCancellingEmergency(false);
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
  const onboardRequests = requests.filter(
    (r) => r.status === 'ACCEPTED' || r.status === 'COMPLETED' || r.status === 'FAILED'
  );

  // Kiểm tra điều kiện bắt đầu hành trình: Tất cả yêu cầu ACCEPTED phải được PICKED_UP hoặc FAILED
  const activeOnboard = requests.filter((r) => r.status === 'ACCEPTED');
  const unconfirmedOnboard = activeOnboard.filter((r) => {
    if (r.type === 'RIDE') return r.ride_progress !== 'PICKED_UP';
    return r.package_items && r.package_items[0]?.status !== 'PICKED_UP';
  });
  const canStartTrip = unconfirmedOnboard.length === 0;

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
                    : trip.status === 'CANCELLED'
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                {trip.status === 'IN_PROGRESS'
                  ? 'Đang di chuyển'
                  : trip.status === 'COMPLETED'
                  ? 'Đã kết thúc'
                  : trip.status === 'CANCELLED'
                  ? 'Đã hủy chuyến'
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
              <div className="flex flex-col items-end">
                <button
                  type="button"
                  disabled={!canStartTrip}
                  onClick={handleStartTrip}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-md flex items-center space-x-1.5 transition-all ${
                    canStartTrip
                      ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20 cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-75 border border-slate-300'
                  }`}
                  title={
                    !canStartTrip
                      ? `Vui lòng xác nhận đón hoặc báo sự cố cho tất cả ${unconfirmedOnboard.length} yêu cầu trước khi khởi hành`
                      : 'Bắt đầu khởi hành chuyến xe'
                  }
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Bắt đầu hành trình</span>
                </button>
                {!canStartTrip && activeOnboard.length > 0 && (
                  <span className="text-[10px] text-amber-700 mt-1 font-semibold flex items-center">
                    <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                    Còn {unconfirmedOnboard.length} yêu cầu chưa xác nhận đón/vắng mặt
                  </span>
                )}
              </div>
            )}

            {trip.status === 'IN_PROGRESS' && (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setEmergencyCancelReason('');
                    setShowEmergencyCancelModal(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 flex items-center space-x-1.5 transition-all"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Hủy chuyến vì gặp sự cố</span>
                </button>

                <button
                  type="button"
                  onClick={handleCompleteTrip}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center space-x-1.5 transition-all"
                >
                  <Flag className="w-4 h-4" />
                  <span>Kết thúc chuyến xe</span>
                </button>
              </div>
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
            pendingRequests.map((req) => {
              const isPackage = req.type === 'PACKAGE';
              const pkg = isPackage && req.package_items && req.package_items[0] ? req.package_items[0] : null;

              return (
                <div
                  key={req.id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-5"
                >
                  <div className="space-y-3 flex-1">
                    {/* Header yêu cầu */}
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
                        {req.type === 'RIDE' ? `Đi nhờ (${req.passenger_count} người)` : 'Gửi kiện hàng'}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center">
                        <User className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        Khách: <strong className="ml-1 text-slate-800">{req.user?.full_name}</strong>
                      </span>
                    </div>

                    {/* Lộ trình đón - trả */}
                    <div className="text-xs space-y-1.5 pl-1">
                      <div className="flex items-start space-x-2 text-slate-700">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                        <p className="leading-tight">
                          <strong className="text-emerald-700">Đón:</strong> {req.pickup_name}
                        </p>
                      </div>
                      <div className="flex items-start space-x-2 text-slate-700">
                        <div className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                        <p className="leading-tight">
                          <strong className="text-rose-700">Trả:</strong> {req.dropoff_name}
                        </p>
                      </div>
                    </div>

                    {/* Chi tiết kiện hàng kèm ảnh (nếu là PACKAGE) */}
                    {pkg && (
                      <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                        {pkg.photo_url ? (
                          <div
                            onClick={() => setPreviewImage(pkg.photo_url)}
                            className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer group border border-slate-200 shadow-sm"
                            title="Bấm để xem ảnh phóng to"
                          >
                            <img
                              src={pkg.photo_url}
                              alt={pkg.description}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold">
                              <Maximize2 className="w-4 h-4" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-slate-200 text-slate-400 flex items-center justify-center flex-shrink-0">
                            <Box className="w-6 h-6" />
                          </div>
                        )}

                        <div className="text-xs space-y-0.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900">{pkg.description}</span>
                            {pkg.category && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                                {pkg.category}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-600 text-[11px]">
                            Trọng lượng: <strong className="text-slate-900">{pkg.weight_kg} kg</strong> • Thể tích cốp: <strong className="text-slate-900">{pkg.area_m2} m²</strong>
                          </p>
                          <p className="text-slate-500 text-[11px]">
                            Người nhận: <strong className="text-slate-800">{pkg.recipient_name}</strong>
                            {pkg.recipient_phone && (
                              <span className="ml-1 text-slate-600 font-mono">({pkg.recipient_phone})</span>
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Nhóm nút thao tác */}
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedDetailReq(req)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-emerald-700 transition-colors flex items-center space-x-1"
                      title="Xem toàn bộ thông tin yêu cầu"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Chi tiết</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectModalReq(req);
                        setRejectReason('');
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                    >
                      Từ chối
                    </button>
                    <button
                      type="button"
                      disabled={actionLoadingId === req.id}
                      onClick={() => handleAccept(req.id)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-colors disabled:opacity-50"
                    >
                      {actionLoadingId === req.id ? 'Đang duyệt...' : 'Chấp nhận'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: DANH SÁCH ĐÃ CHẤP NHẬN & ĐIỀU HÀNH TIẾN TRÌNH */}
      {activeTab === 'onboard' && (
        <div className="space-y-4">
          {/* Thông báo hướng dẫn & Nút hành động hàng loạt (Batch Actions) */}
          {trip.status !== 'IN_PROGRESS' && trip.status !== 'COMPLETED' && trip.status !== 'CANCELLED' && (
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
              <div className="flex items-start space-x-2.5 text-xs text-emerald-950">
                <CheckCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-emerald-900 font-bold mb-0.5">Xác nhận đón khách & nhận hàng tại điểm xuất phát:</strong>
                  <p className="text-emerald-800">
                    Vui lòng bấm <strong>"Đã đón khách lên xe"</strong> / <strong>"Đã nhận hàng vào cốp"</strong> (hoặc <strong>"Báo sự cố"</strong> nếu khách vắng mặt) cho từng yêu cầu.
                    Sau khi xác nhận đầy đủ, nút <strong>"Bắt đầu hành trình"</strong> sẽ mở khóa để khởi hành và tính mức hỗ trợ nhiên liệu.
                  </p>
                </div>
              </div>
              {unconfirmedOnboard.length > 0 && (
                <button
                  type="button"
                  disabled={batchLoading}
                  onClick={handlePickupAll}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 flex items-center space-x-1.5 whitespace-nowrap disabled:opacity-50 flex-shrink-0 cursor-pointer transition-all"
                >
                  {batchLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCheck className="w-4 h-4" />
                  )}
                  <span>Đã đón đủ tất cả khách & kiện hàng</span>
                </button>
              )}
            </div>
          )}

          {trip.status === 'IN_PROGRESS' && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
              <div className="flex items-start space-x-2.5 text-xs text-blue-950">
                <CheckCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-blue-900 font-bold mb-0.5">Thao tác trả khách & giao hàng nhanh:</strong>
                  <p className="text-blue-800">
                    Khi đã tới trạm đến, bạn có thể bấm 1 chạm để xác nhận trả toàn bộ khách và giao toàn bộ các kiện hàng trên xe.
                  </p>
                </div>
              </div>
              {onboardRequests.some(
                (r) =>
                  (r.ride_progress === 'PICKED_UP' || (r.package_items && r.package_items[0]?.status === 'PICKED_UP')) &&
                  r.status !== 'COMPLETED' &&
                  r.status !== 'FAILED'
              ) && (
                <button
                  type="button"
                  disabled={batchLoading}
                  onClick={handleDropoffAll}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 flex items-center space-x-1.5 whitespace-nowrap disabled:opacity-50 flex-shrink-0 cursor-pointer transition-all"
                >
                  {batchLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCheck className="w-4 h-4" />
                  )}
                  <span>Đã trả đủ tất cả khách & kiện hàng</span>
                </button>
              )}
            </div>
          )}

          {onboardRequests.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 text-xs shadow-sm">
              Chưa có hành khách hoặc kiện hàng nào được chấp nhận trên chuyến xe.
            </div>
          ) : (
            onboardRequests.map((req) => {
              const isRide = req.type === 'RIDE';
              const isCompleted = req.status === 'COMPLETED';
              const pkg = !isRide && req.package_items && req.package_items[0] ? req.package_items[0] : null;

              return (
                <div
                  key={req.id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-5"
                >
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                        {req.code}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          isRide ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {isRide ? `Đi nhờ (${req.passenger_count} người)` : 'Kiện hàng'}
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
                      ) : req.status === 'FAILED' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                          Thất bại ({req.fail_reason_code || 'Sự cố'})
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                          Đang phục vụ
                        </span>
                      )}
                    </div>

                    <div className="text-xs space-y-1.5 pl-1">
                      <div className="flex items-start space-x-2 text-slate-700">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                        <p className="leading-tight">
                          <strong className="text-emerald-700">Đón:</strong> {req.pickup_name}
                        </p>
                      </div>
                      <div className="flex items-start space-x-2 text-slate-700">
                        <div className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                        <p className="leading-tight">
                          <strong className="text-rose-700">Trả:</strong> {req.dropoff_name}
                        </p>
                      </div>
                    </div>

                    {/* Chi tiết kiện hàng kèm ảnh nếu là PACKAGE */}
                    {pkg && (
                      <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                        {pkg.photo_url ? (
                          <div
                            onClick={() => setPreviewImage(pkg.photo_url)}
                            className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer group border border-slate-200 shadow-sm"
                            title="Bấm để xem ảnh phóng to"
                          >
                            <img
                              src={pkg.photo_url}
                              alt={pkg.description}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold">
                              <Maximize2 className="w-4 h-4" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-slate-200 text-slate-400 flex items-center justify-center flex-shrink-0">
                            <Box className="w-6 h-6" />
                          </div>
                        )}

                        <div className="text-xs space-y-0.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900">{pkg.description}</span>
                            {pkg.category && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                                {pkg.category}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-600 text-[11px]">
                            Trọng lượng: <strong className="text-slate-900">{pkg.weight_kg} kg</strong> • Thể tích cốp: <strong className="text-slate-900">{pkg.area_m2} m²</strong>
                          </p>
                          <p className="text-slate-500 text-[11px]">
                            Người nhận: <strong className="text-slate-800">{pkg.recipient_name}</strong>
                            {pkg.recipient_phone && (
                              <span className="ml-1 text-slate-600 font-mono">({pkg.recipient_phone})</span>
                            )}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Hiển thị mức hỗ trợ nhiên liệu/sạc chia sẻ: Chỉ hiển thị khi tài xế bấm Bắt đầu hành trình */}
                    {(trip.status === 'IN_PROGRESS' || trip.status === 'COMPLETED') && req.shared_fuel_cost !== undefined && req.shared_fuel_cost !== null && req.shared_fuel_cost > 0 && (
                      <div className="inline-flex items-center px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
                        <Fuel className="w-3.5 h-3.5 mr-1.5 text-teal-600 flex-shrink-0" />
                        <span>Hỗ trợ nhiên liệu/sạc chia sẻ: <strong className="font-bold text-teal-950">{req.shared_fuel_cost.toLocaleString('vi-VN')} đ</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Nút thao tác tiến trình & Xem chi tiết */}
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedDetailReq(req)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-emerald-700 transition-colors flex items-center space-x-1"
                      title="Xem toàn bộ thông tin yêu cầu"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Chi tiết</span>
                    </button>

                    {/* Nút Báo sự cố: Cho phép tài xế báo cáo khi khách vắng mặt hoặc gặp vấn đề để tính lại tiền */}
                    {!isCompleted && req.status !== 'FAILED' && (
                      <button
                        type="button"
                        onClick={() => {
                          setReportModalReq(req);
                          setReportReasonCode('ABSENT');
                          setReportNote('');
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center space-x-1"
                        title="Báo cáo khách vắng mặt hoặc sự cố để loại khỏi chuyến & tính lại chi phí"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Báo sự cố</span>
                      </button>
                    )}

                    {/* Tiến trình đi nhờ (RIDE) */}
                    {isRide && !isCompleted && req.status !== 'FAILED' && (
                      <>
                        {req.ride_progress === 'NOT_PICKED_UP' && (
                          <button
                            type="button"
                            disabled={actionLoadingId === req.id}
                            onClick={() => handleUpdateProgress(req.id, { ride_progress: 'PICKED_UP' })}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-sm transition-all"
                            title="Xác nhận khách đã lên xe"
                          >
                            Đã đón khách lên xe
                          </button>
                        )}
                        {req.ride_progress === 'PICKED_UP' && (
                          trip.status === 'IN_PROGRESS' ? (
                            <button
                              type="button"
                              disabled={actionLoadingId === req.id}
                              onClick={() => handleUpdateProgress(req.id, { ride_progress: 'DROPPED_OFF' })}
                              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
                            >
                              Đã trả khách xuống xe
                            </button>
                          ) : (
                            <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Đã lên xe (Chờ khởi hành)
                            </span>
                          )
                        )}
                      </>
                    )}

                    {/* Tiến trình gửi hàng (PACKAGE) */}
                    {!isRide && !isCompleted && req.status !== 'FAILED' && req.package_items && req.package_items[0] && (
                      <>
                        {req.package_items[0].status === 'AWAITING_PICKUP' && (
                          <button
                            type="button"
                            disabled={actionLoadingId === req.id}
                            onClick={() => handleUpdateProgress(req.id, { package_status: 'PICKED_UP' })}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-sm transition-all"
                            title="Xác nhận đã nhận hàng vào cốp"
                          >
                            Đã nhận hàng vào cốp
                          </button>
                        )}
                        {req.package_items[0].status === 'PICKED_UP' && (
                          trip.status === 'IN_PROGRESS' ? (
                            <button
                              type="button"
                              disabled={actionLoadingId === req.id}
                              onClick={() => handleUpdateProgress(req.id, { package_status: 'DELIVERED' })}
                              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
                            >
                              Đã giao hàng thành công
                            </button>
                          ) : (
                            <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Đã nhận hàng (Chờ khởi hành)
                            </span>
                          )
                        )}
                      </>
                    )}

                    {req.status === 'FAILED' && (
                      <span className="text-xs font-semibold text-rose-600 flex items-center px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200">
                        <XCircle className="w-3.5 h-3.5 mr-1 text-rose-500" />
                        Đã loại khỏi chuyến
                      </span>
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

      {/* Modal Chi Tiết Yêu Cầu Vận Chuyển */}
      {selectedDetailReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            {/* Header Modal */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                    {selectedDetailReq.code}
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      selectedDetailReq.type === 'RIDE'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {selectedDetailReq.type === 'RIDE' ? 'Đi nhờ xe (RIDE)' : 'Gửi kiện hàng (PACKAGE)'}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      selectedDetailReq.status === 'PENDING'
                        ? 'bg-amber-100 text-amber-800'
                        : selectedDetailReq.status === 'ACCEPTED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedDetailReq.status === 'COMPLETED'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {selectedDetailReq.status === 'PENDING'
                      ? 'Chờ duyệt'
                      : selectedDetailReq.status === 'ACCEPTED'
                      ? 'Đã chấp nhận'
                      : selectedDetailReq.status === 'COMPLETED'
                      ? 'Đã hoàn thành'
                      : selectedDetailReq.status}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">Chi tiết yêu cầu vận chuyển</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailReq(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Modal */}
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Người đặt */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Thông tin hành khách / người gửi
                </span>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                      {selectedDetailReq.user?.full_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{selectedDetailReq.user?.full_name}</p>
                      <p className="text-xs text-slate-500">Khách hàng GoX</p>
                    </div>
                  </div>

                  <div>
                    {selectedDetailReq.user?.phone ? (
                      <a
                        href={`tel:${selectedDetailReq.user.phone}`}
                        className="inline-flex items-center px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 hover:bg-emerald-100 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                        {selectedDetailReq.user.phone}
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400 italic">
                        🔒 SĐT bảo mật (mở khi duyệt)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Lộ trình */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Địa điểm đón & trả
                </span>
                <div className="flex items-start space-x-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-emerald-800">Điểm đón: </span>
                    <span className="text-slate-800">{selectedDetailReq.pickup_name}</span>
                  </div>
                </div>
                <div className="flex items-start space-x-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-1 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-rose-800">Điểm trả: </span>
                    <span className="text-slate-800">{selectedDetailReq.dropoff_name}</span>
                  </div>
                </div>
              </div>

              {/* Nếu là PACKAGE: Thông tin kiện hàng & Hình ảnh */}
              {selectedDetailReq.type === 'PACKAGE' && selectedDetailReq.package_items && selectedDetailReq.package_items[0] && (
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Hình ảnh & Thông số kiện hàng
                  </span>

                  {/* Ảnh chụp kiện hàng thực tế */}
                  {selectedDetailReq.package_items[0].photo_url ? (
                    <div>
                      <div
                        onClick={() => setPreviewImage(selectedDetailReq.package_items![0].photo_url)}
                        className="relative w-full h-56 rounded-2xl overflow-hidden cursor-pointer group border border-slate-200 bg-slate-100 flex items-center justify-center shadow-inner"
                      >
                        <img
                          src={selectedDetailReq.package_items[0].photo_url}
                          alt={selectedDetailReq.package_items[0].description}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold space-x-2 transition-opacity">
                          <Maximize2 className="w-4 h-4" />
                          <span>Bấm để xem ảnh phóng to</span>
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-400 text-center block mt-1">
                        (Nhấp vào ảnh để xem kích thước lớn)
                      </span>
                    </div>
                  ) : (
                    <div className="p-6 rounded-2xl bg-slate-100 text-center text-slate-400 text-xs">
                      Không có ảnh đính kèm
                    </div>
                  )}

                  {/* Bảng chi tiết kiện hàng */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                      <span className="text-slate-400 block text-[11px]">Mô tả kiện hàng</span>
                      <strong className="text-slate-900 block mt-0.5">{selectedDetailReq.package_items[0].description}</strong>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                      <span className="text-slate-400 block text-[11px]">Danh mục hàng</span>
                      <strong className="text-slate-900 block mt-0.5">{selectedDetailReq.package_items[0].category || 'Hàng phổ thông'}</strong>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                      <span className="text-slate-400 block text-[11px]">Khối lượng</span>
                      <strong className="text-slate-900 block mt-0.5">{selectedDetailReq.package_items[0].weight_kg} kg</strong>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                      <span className="text-slate-400 block text-[11px]">Diện tích chiếm cốp</span>
                      <strong className="text-slate-900 block mt-0.5">{selectedDetailReq.package_items[0].area_m2} m²</strong>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                      <span className="text-slate-400 block text-[11px]">Người nhận</span>
                      <strong className="text-slate-900 block mt-0.5">{selectedDetailReq.package_items[0].recipient_name}</strong>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                      <span className="text-slate-400 block text-[11px]">SĐT người nhận</span>
                      <strong className="text-slate-900 block mt-0.5 font-mono">{selectedDetailReq.package_items[0].recipient_phone}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Nếu là RIDE: Thông tin đi nhờ */}
              {selectedDetailReq.type === 'RIDE' && (
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Thông tin hành khách đi cùng
                  </span>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-100 text-xs">
                    <span className="text-slate-500">Số lượng chỗ đặt: </span>
                    <strong className="text-slate-900">{selectedDetailReq.passenger_count} chỗ ngồi</strong>
                  </div>
                </div>
              )}

              {/* Mức hỗ trợ chi phí nhiên liệu/sạc chia sẻ (chỉ hiển thị khi đã bấm Bắt đầu hành trình) */}
              {(trip.status === 'IN_PROGRESS' || trip.status === 'COMPLETED') && selectedDetailReq.shared_fuel_cost !== undefined && selectedDetailReq.shared_fuel_cost !== null && selectedDetailReq.shared_fuel_cost > 0 ? (
                <div className="p-3.5 bg-teal-50 rounded-2xl border border-teal-200 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-teal-900 flex items-center">
                      <Fuel className="w-4 h-4 mr-1.5 text-teal-600" />
                      Khoản hỗ trợ nhiên liệu/sạc chia sẻ:
                    </span>
                    <strong className="text-teal-950 text-sm font-black">
                      {selectedDetailReq.shared_fuel_cost.toLocaleString('vi-VN')} đ
                    </strong>
                  </div>
                  <p className="text-[11px] text-teal-700 mt-1 italic">
                    (Đã chốt và chia đều khi tài xế bấm "Bắt đầu hành trình")
                  </p>
                </div>
              ) : trip.status !== 'IN_PROGRESS' && trip.status !== 'COMPLETED' ? (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 italic">
                  💡 Chi phí hỗ trợ nhiên liệu/sạc từ khách sẽ được hệ thống tính toán và hiển thị tại đây khi bạn bấm "Bắt đầu hành trình".
                </div>
              ) : null}
            </div>

            {/* Footer Modal: Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={() => setSelectedDetailReq(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Đóng
              </button>

              {selectedDetailReq.status === 'PENDING' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const reqToReject = selectedDetailReq;
                      setSelectedDetailReq(null);
                      setRejectModalReq(reqToReject);
                      setRejectReason('');
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                  >
                    Từ chối
                  </button>

                  <button
                    type="button"
                    disabled={actionLoadingId === selectedDetailReq.id}
                    onClick={async () => {
                      const reqId = selectedDetailReq.id;
                      setSelectedDetailReq(null);
                      await handleAccept(reqId);
                    }}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-colors disabled:opacity-50"
                  >
                    Chấp nhận yêu cầu
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Phóng to ảnh (Lightbox) */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              title="Đóng (Esc)"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewImage}
              alt="Ảnh phóng to"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
          </div>
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

      {/* Modal Báo cáo sự cố từng yêu cầu (Khách vắng mặt / không đến / sai hàng) */}
      {reportModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in duration-200">
            <div className="flex items-center space-x-2 text-rose-600 mb-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <h3 className="text-lg font-bold text-slate-900">Báo sự cố yêu cầu {reportModalReq.code}</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Nếu hành khách không có mặt, không nghe máy hoặc thông tin không chính xác, hệ thống sẽ hủy yêu cầu này, hoàn trả chỗ trống và <strong>tự động tính lại chi phí nhiên liệu chia đều</strong> cho các thành viên còn lại trên xe.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Lý do sự cố</label>
                <select
                  value={reportReasonCode}
                  onChange={(e) => setReportReasonCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="ABSENT">Khách không có mặt tại điểm đón (No-show) - Phạt khách</option>
                  <option value="UNREACHABLE">Không liên lạc được / Tắt máy - Phạt khách</option>
                  <option value="WRONG_INFO">Thông tin sai lệch / Hàng hóa vi phạm - Phạt khách</option>
                  <option value="OTHER">Lý do bất khả kháng / Khách báo bận - Không phạt</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Ghi chú chi tiết (tùy chọn)</label>
                <textarea
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  placeholder="Mô tả cụ thể (Ví dụ: Gọi 3 cuộc không nghe máy, đã chờ quá 15 phút so với giờ hẹn...)"
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReportModalReq(null)}
                  disabled={submittingReport}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={submittingReport}
                  onClick={handleConfirmReportIssue}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 disabled:opacity-50 transition-all flex items-center space-x-1.5"
                >
                  {submittingReport ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <span>Xác nhận & Tính lại chi phí</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hủy chuyến xe khẩn cấp khi đang di chuyển (IN_PROGRESS) */}
      {showEmergencyCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in duration-200">
            <div className="flex items-center space-x-2 text-rose-600 mb-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <h3 className="text-lg font-bold text-slate-900">Hủy chuyến xe vì sự cố khẩn cấp</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Chỉ dùng khi xe gặp sự cố hỏng hóc, tai nạn, thời tiết nguy hiểm hoặc sức khỏe không đảm bảo. Hệ thống sẽ hủy chuyến ngay lập tức, thông báo cho hành khách và gửi hồ sơ sự cố tới <strong>Quản trị viên (Admin)</strong> để thẩm tra.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Lý do khẩn cấp chi tiết <span className="text-rose-500">*</span> (tối thiểu 10 ký tự)
                </label>
                <textarea
                  value={emergencyCancelReason}
                  onChange={(e) => setEmergencyCancelReason(e.target.value)}
                  placeholder="Ví dụ: Xe bị nổ lốp trên đường cao tốc không thể tiếp tục di chuyển, đã gọi cứu hộ..."
                  rows={4}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmergencyCancelModal(false)}
                  disabled={cancellingEmergency}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={cancellingEmergency || emergencyCancelReason.trim().length < 10}
                  onClick={handleConfirmEmergencyCancel}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 disabled:opacity-50 transition-all flex items-center space-x-1.5"
                >
                  {cancellingEmergency ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang xử lý hủy...</span>
                    </>
                  ) : (
                    <span>Xác nhận hủy khẩn cấp</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
