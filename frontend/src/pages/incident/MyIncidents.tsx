import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Car,
  Calendar,
  FileText,
  Plus,
  X,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { incidentService } from '../../services/incidentService';
import { IncidentStatus, MyIncidentItem } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const MyIncidents: React.FC = () => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<MyIncidentItem[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    not_received: 0,
    received: 0,
    processing: 0,
    resolved: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // New Incident Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchMyIncidents = async (override?: { status?: string; from_date?: string; to_date?: string }) => {
    try {
      setLoading(true);
      setError(null);
      const effStatus = override?.status !== undefined ? override.status : statusFilter;
      const effFrom = override?.from_date !== undefined ? override.from_date : fromDate;
      const effTo = override?.to_date !== undefined ? override.to_date : toDate;

      const res = await incidentService.getMyIncidents({
        status: (effStatus as IncidentStatus) || undefined,
        from_date: effFrom || undefined,
        to_date: effTo || undefined,
      });
      setIncidents(res.incidents);
      setSummary(res.summary);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Không thể tải danh sách báo cáo sự cố');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyIncidents();
  }, [statusFilter]);

  const setQuickDate = (preset: 'today' | '7days' | '30days' | 'clear') => {
    const toLocalDateStr = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const now = new Date();
    let nextFrom = '';
    let nextTo = '';
    if (preset === 'today') {
      nextFrom = toLocalDateStr(now);
      nextTo = toLocalDateStr(now);
    } else if (preset === '7days') {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      nextFrom = toLocalDateStr(d);
      nextTo = toLocalDateStr(now);
    } else if (preset === '30days') {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      nextFrom = toLocalDateStr(d);
      nextTo = toLocalDateStr(now);
    }
    setFromDate(nextFrom);
    setToDate(nextTo);
    fetchMyIncidents({ from_date: nextFrom, to_date: nextTo });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3) {
      setSubmitError('Tiêu đề sự cố phải có ít nhất 3 ký tự');
      return;
    }
    if (description.trim().length < 10) {
      setSubmitError('Mô tả chi tiết sự cố phải có ít nhất 10 ký tự');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);
      await incidentService.reportIncident({
        title: title.trim(),
        description: description.trim(),
      });
      setCreateModalOpen(false);
      setTitle('');
      setDescription('');
      setSuccessMsg('Đã gửi báo cáo sự cố thành công! Bạn có thể theo dõi tiến độ xử lý ngay tại đây.');
      fetchMyIncidents();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setSubmitError(err.response?.data?.error?.message || err.message || 'Không thể gửi báo cáo sự cố');
    } finally {
      setSubmitting(false);
    }
  };

  const statusSteps: IncidentStatus[] = ['NOT_RECEIVED', 'RECEIVED', 'PROCESSING', 'RESOLVED'];
  const stepLabels: Record<IncidentStatus, string> = {
    NOT_RECEIVED: 'Chưa tiếp nhận',
    RECEIVED: 'Đã tiếp nhận',
    PROCESSING: 'Đang xử lý',
    RESOLVED: 'Đã giải quyết',
  };

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case 'NOT_RECEIVED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <Clock className="w-3 h-3 mr-1" /> Chưa tiếp nhận
          </span>
        );
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Admin đã tiếp nhận
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Đang điều tra & xử lý
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Đã giải quyết
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center">
              <AlertTriangle className="w-7 h-7 mr-2 text-amber-600" />
              Theo dõi Báo cáo Sự cố của tôi
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Xem trực tiếp trạng thái tiếp nhận, điều tra và kết quả xử lý từ Quản trị viên cho các sự cố bạn đã gửi.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCreateModalOpen(true);
              setSubmitError(null);
            }}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors flex-shrink-0"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Gửi báo cáo mới
          </button>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <div className="text-xs font-medium text-slate-500">Tổng báo cáo</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{summary.total}</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-rose-200 shadow-sm">
            <div className="text-xs font-medium text-rose-600">Chờ tiếp nhận</div>
            <div className="text-2xl font-extrabold text-rose-700 mt-1">{summary.not_received}</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-blue-200 shadow-sm">
            <div className="text-xs font-medium text-blue-600">Đang tiếp nhận / xử lý</div>
            <div className="text-2xl font-extrabold text-blue-700 mt-1">
              {summary.received + summary.processing}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-sm">
            <div className="text-xs font-medium text-emerald-600">Đã giải quyết</div>
            <div className="text-2xl font-extrabold text-emerald-700 mt-1">{summary.resolved}</div>
          </div>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center text-emerald-800 text-sm">
            <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {[
              { key: '', label: 'Tất cả' },
              { key: 'NOT_RECEIVED', label: 'Chưa tiếp nhận' },
              { key: 'RECEIVED', label: 'Đã tiếp nhận' },
              { key: 'PROCESSING', label: 'Đang xử lý' },
              { key: 'RESOLVED', label: 'Đã giải quyết' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  statusFilter === tab.key
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <span className="text-slate-400">đến</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              type="button"
              onClick={() => fetchMyIncidents()}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold transition-colors"
            >
              Áp dụng
            </button>

            <div className="flex items-center gap-1.5 ml-auto flex-wrap">
              <button
                type="button"
                onClick={() => setQuickDate('today')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]"
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => setQuickDate('7days')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]"
              >
                7 ngày qua
              </button>
              <button
                type="button"
                onClick={() => setQuickDate('30days')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]"
              >
                30 ngày qua
              </button>
              {(fromDate || toDate) && (
                <button
                  type="button"
                  onClick={() => setQuickDate('clear')}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px]"
                >
                  Xóa lọc
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Incident List */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 flex flex-col items-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600 mb-2" />
            <span className="text-sm">Đang tải danh sách báo cáo sự cố...</span>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center text-rose-600">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : incidents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-semibold text-slate-700">Bạn chưa có báo cáo sự cố nào trong mục này</p>
            <p className="text-xs text-slate-400 mt-1">
              Mọi báo cáo sự cố bạn gửi từ Lịch sử chuyến đi hoặc Điều hành chuyến xe sẽ hiển thị tiến trình xử lý tại đây.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {incidents.map((inc) => {
              const currentStep = statusSteps.indexOf(inc.status);
              const tripUrl = inc.trip
                ? user?.role === 'DRIVER'
                  ? `/driver/trips/${inc.trip.id}/manage`
                  : `/trips/${inc.trip.id}`
                : null;

              return (
                <div
                  key={inc.id}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4"
                >
                  {/* Top Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400">INCIDENT-#{inc.id}</span>
                      {getStatusBadge(inc.status)}
                    </div>
                    <div className="text-xs text-slate-400">
                      Gửi lúc: {new Date(inc.created_at).toLocaleString('vi-VN')}
                      {inc.updated_at && (
                        <span className="ml-2">
                          • Cập nhật: {new Date(inc.updated_at).toLocaleString('vi-VN')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{inc.title}</h3>
                    <p className="text-sm text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-100 mt-2 whitespace-pre-line">
                      {inc.description}
                    </p>
                  </div>

                  {/* Trip reference if any */}
                  {inc.trip && (
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 text-xs">
                      <div className="flex items-center gap-2 text-emerald-900">
                        <Car className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>
                          <strong>Chuyến xe {inc.trip.code}:</strong> {inc.trip.origin_name} ➔ {inc.trip.dest_name}
                        </span>
                      </div>
                      {tripUrl && (
                        <Link
                          to={tripUrl}
                          className="inline-flex items-center text-emerald-700 hover:text-emerald-900 font-bold hover:underline"
                        >
                          Xem chuyến xe <ExternalLink className="w-3.5 h-3.5 ml-1" />
                        </Link>
                      )}
                    </div>
                  )}

                  {/* 4-Step Visual Progress Bar */}
                  <div className="pt-2">
                    <div className="text-xs font-semibold text-slate-500 mb-2.5">
                      Tiến trình xử lý từ Ban quản trị:
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {statusSteps.map((step, idx) => {
                        const isDone = idx < currentStep;
                        const isCurrent = idx === currentStep;
                        return (
                          <div
                            key={step}
                            className={`flex items-center p-2.5 rounded-xl border text-xs transition-all ${
                              isCurrent
                                ? step === 'RESOLVED'
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                  : 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                                : isDone
                                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-700 font-medium'
                                : 'bg-slate-50 border-slate-200 text-slate-400'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mr-2 flex-shrink-0 ${
                                isCurrent
                                  ? step === 'RESOLVED'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-amber-600 text-white'
                                  : isDone
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-200 text-slate-500'
                              }`}
                            >
                              {isDone || (isCurrent && step === 'RESOLVED') ? '✓' : idx + 1}
                            </div>
                            <span className="truncate">{stepLabels[step]}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Admin Result Note / Handler Info */}
                  {(inc.handler || inc.result_note) && (
                    <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-1">
                      <div className="font-bold text-emerald-900 flex items-center">
                        <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-600" />
                        Phản hồi từ Quản trị viên
                        {inc.handler && (
                          <span className="font-normal text-emerald-700 ml-1">({inc.handler.full_name})</span>
                        )}
                      </div>
                      {inc.result_note ? (
                        <p className="text-emerald-950 font-medium leading-relaxed">{inc.result_note}</p>
                      ) : (
                        <p className="text-emerald-700 italic">
                          Quản trị viên đã tiếp nhận hồ sơ của bạn và đang tiến hành kiểm tra xử lý.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Gửi Báo Cáo Sự Cố Mới */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 relative">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Gửi báo cáo sự cố mới</h3>
                <p className="text-xs text-slate-500">
                  Mô tả chi tiết vấn đề bạn gặp phải để Quản trị viên tiếp nhận và hỗ trợ.
                </p>
              </div>
            </div>

            {submitError && (
              <div className="p-3 mb-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1.5 flex-shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tiêu đề sự cố <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Khiếu nại tỷ lệ hủy chuyến hoặc hỗ trợ tài khoản..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả chi tiết <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Nhập đầy đủ thông tin, mã chuyến (nếu có) và diễn biến sự việc..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-100"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center shadow-md"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                      Đang gửi...
                    </>
                  ) : (
                    'Gửi báo cáo'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyIncidents;
