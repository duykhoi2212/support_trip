import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Phone,
  Mail,
  Car,
  FileText,
  User,
  X,
  Loader2,
  Search,
  Calendar,
  Eye,
  MapPin,
  Fuel,
  Package,
  Users,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { AdminIncident, AdminTripDetail, IncidentStatus } from '../../types';

export const IncidentManagement: React.FC = () => {
  const [incidents, setIncidents] = useState<AdminIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter & Pagination
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Resolve Modal State
  const [selectedIncident, setSelectedIncident] = useState<AdminIncident | null>(null);
  const [resultNote, setResultNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Trip Detail Modal State
  const [tripDetailModalOpen, setTripDetailModalOpen] = useState(false);
  const [tripDetail, setTripDetail] = useState<AdminTripDetail | null>(null);
  const [loadingTripDetail, setLoadingTripDetail] = useState(false);
  const [tripDetailError, setTripDetailError] = useState<string | null>(null);

  const fetchIncidents = async (overrideParams?: {
    from_date?: string;
    to_date?: string;
    search?: string;
    page?: number;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const effectiveFrom = overrideParams?.from_date !== undefined ? overrideParams.from_date : fromDate;
      const effectiveTo = overrideParams?.to_date !== undefined ? overrideParams.to_date : toDate;
      const effectiveSearch = overrideParams?.search !== undefined ? overrideParams.search : search;
      const effectivePage = overrideParams?.page !== undefined ? overrideParams.page : page;

      const res = await adminService.getIncidents({
        status: (statusFilter as IncidentStatus) || undefined,
        from_date: effectiveFrom || undefined,
        to_date: effectiveTo || undefined,
        search: effectiveSearch.trim() || undefined,
        page: effectivePage,
        limit: 10,
      });
      setIncidents(res.incidents);
      setTotalPages(res.pagination.totalPages);
      setTotalCount(res.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Không thể tải danh sách sự cố');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [page, statusFilter]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchIncidents({ page: 1 });
  };

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
    setPage(1);
    fetchIncidents({ from_date: nextFrom, to_date: nextTo, page: 1 });
  };

  const handleOpenTripDetail = async (tripId: string) => {
    setTripDetailModalOpen(true);
    setTripDetail(null);
    setTripDetailError(null);
    setLoadingTripDetail(true);
    try {
      const detail = await adminService.getTripDetail(tripId);
      setTripDetail(detail);
    } catch (err: any) {
      setTripDetailError(err.response?.data?.error?.message || err.message || 'Không thể tải chi tiết chuyến xe');
    } finally {
      setLoadingTripDetail(false);
    }
  };

  const handleUpdateStatus = async (incidentId: string, nextStatus: IncidentStatus, note?: string) => {
    try {
      setUpdating(true);
      setUpdateError(null);
      const res = await adminService.updateIncidentStatus(incidentId, {
        status: nextStatus,
        result_note: note,
      });
      setSuccessMsg(res.message || 'Cập nhật trạng thái sự cố thành công');
      setSelectedIncident(null);
      fetchIncidents();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setUpdateError(err.message || 'Không thể cập nhật trạng thái');
    } finally {
      setUpdating(false);
    }
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
            <CheckCircle2 className="w-3 h-3 mr-1" /> Đã tiếp nhận
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Đang xử lý
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

  // Steps definition for visual timeline
  const statusSteps: IncidentStatus[] = ['NOT_RECEIVED', 'RECEIVED', 'PROCESSING', 'RESOLVED'];
  const stepLabels: Record<IncidentStatus, string> = {
    NOT_RECEIVED: 'Chưa tiếp nhận',
    RECEIVED: 'Đã tiếp nhận',
    PROCESSING: 'Đang xử lý',
    RESOLVED: 'Đã giải quyết',
  };

  const getStepIndex = (status: IncidentStatus) => statusSteps.indexOf(status);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center">
              <AlertTriangle className="w-7 h-7 mr-2 text-amber-600" />
              Tiếp nhận & Xử lý Sự cố (AD-02)
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Quy trình 4 bước chuẩn mực: Chưa tiếp nhận ➔ Đã tiếp nhận ➔ Đang xử lý ➔ Đã giải quyết. Tự động gửi thông báo cho các bên.
            </p>
          </div>
          <div className="text-sm text-slate-600 bg-slate-100 px-4 py-2 rounded-xl font-medium">
            Tổng cộng: <strong className="text-amber-700 font-bold">{totalCount}</strong> báo cáo sự cố
          </div>
        </div>

        {/* Thông báo thành công */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center text-emerald-800 text-sm animate-fade-in">
            <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tabs lọc trạng thái + Bộ lọc ngày & Từ khóa */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {[
              { key: '', label: 'Tất cả trạng thái' },
              { key: 'NOT_RECEIVED', label: 'Chưa tiếp nhận' },
              { key: 'RECEIVED', label: 'Đã tiếp nhận' },
              { key: 'PROCESSING', label: 'Đang xử lý' },
              { key: 'RESOLVED', label: 'Đã giải quyết' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setStatusFilter(tab.key);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  statusFilter === tab.key
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleFilterSubmit} className="pt-3 border-t border-slate-100 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-5 relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo tiêu đề, mã chuyến xe, tên/SĐT người báo cáo..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="md:col-span-3 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  title="Từ ngày"
                />
              </div>

              <div className="md:col-span-3 flex items-center gap-1.5">
                <span className="text-xs text-slate-400">đến</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  title="Đến ngày"
                />
              </div>

              <div className="md:col-span-1">
                <button
                  type="submit"
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Lọc
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="text-slate-500 font-medium">Chọn nhanh:</span>
              <button
                type="button"
                onClick={() => setQuickDate('today')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => setQuickDate('7days')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
              >
                7 ngày qua
              </button>
              <button
                type="button"
                onClick={() => setQuickDate('30days')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
              >
                30 ngày qua
              </button>
              {(fromDate || toDate || search) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setQuickDate('clear');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold transition-colors"
                >
                  Xóa lọc
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Danh sách Sự cố */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center text-slate-500 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600 mb-2" />
            <span>Đang tải danh sách sự cố...</span>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center text-rose-600">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
            <p>{error}</p>
          </div>
        ) : incidents.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
            <p className="font-semibold text-slate-700">Không có sự cố nào trong mục này</p>
            <p className="text-xs text-slate-400 mt-1">Hệ thống đang vận hành trơn tru và an toàn.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {incidents.map((inc) => {
              const currentStep = getStepIndex(inc.status);

              return (
                <div
                  key={inc.id}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 transition-all hover:border-slate-300"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    {/* Thông tin chính sự cố */}
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">INCIDENT-#{inc.id}</span>
                        {getStatusBadge(inc.status)}
                        <span className="text-xs text-slate-400">
                          • Ngày gửi: {new Date(inc.created_at).toLocaleString('vi-VN')}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900">{inc.title}</h3>

                      <p className="text-sm text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-100 whitespace-pre-line leading-relaxed">
                        {inc.description}
                      </p>

                      {/* Người báo cáo & Chuyến xe liên quan */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                        <div className="flex items-center space-x-2 text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                          <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <div className="truncate">
                            <span className="font-semibold text-slate-800">{inc.reporter.full_name}</span>
                            <span className="text-slate-400 ml-1">({inc.reporter.role})</span>
                            <div className="text-slate-500 text-[11px] flex items-center gap-2 mt-0.5">
                              <span className="flex items-center">
                                <Phone className="w-3 h-3 mr-0.5" /> {inc.reporter.phone}
                              </span>
                              <span className="flex items-center truncate">
                                <Mail className="w-3 h-3 mr-0.5" /> {inc.reporter.email}
                              </span>
                            </div>
                          </div>
                        </div>

                        {inc.trip ? (
                          <div className="flex items-center justify-between gap-2 text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                            <div className="flex items-center space-x-2 min-w-0">
                              <Car className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                              <div className="truncate">
                                <span className="font-semibold text-emerald-900">Mã chuyến: {inc.trip.code}</span>
                                <div className="text-slate-500 text-[11px] truncate mt-0.5">
                                  {inc.trip.origin_name} ➔ {inc.trip.dest_name}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenTripDetail(inc.trip!.id)}
                              className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold flex-shrink-0 transition-colors"
                              title="Xem chi tiết toàn diện chuyến xe này"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Xem chi tiết chuyến
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 text-slate-400 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                            <FileText className="w-4 h-4 text-slate-300" />
                            <span>Báo cáo sự cố chung</span>
                          </div>
                        )}
                      </div>

                      {/* Ghi chú kết quả xử lý nếu đã hoàn thành */}
                      {inc.result_note && (
                        <div className="mt-2 p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs text-emerald-900">
                          <div className="font-bold flex items-center mb-1 text-emerald-800">
                            <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" />
                            Kết quả xử lý từ Quản trị viên:
                          </div>
                          <p className="text-emerald-950 font-medium">{inc.result_note}</p>
                          {inc.handler && (
                            <div className="text-[11px] text-emerald-700 mt-1">
                              Người xử lý: {inc.handler.full_name} ({inc.handler.phone})
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Tiến trình 4 bước & Thao tác xử lý */}
                    <div className="lg:w-72 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6 space-y-4">
                      {/* 4-Step Indicator */}
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-slate-500">Tiến trình xử lý:</div>
                        <div className="space-y-1.5">
                          {statusSteps.map((step, idx) => {
                            const isDone = idx < currentStep;
                            const isCurrent = idx === currentStep;

                            return (
                              <div
                                key={step}
                                className={`flex items-center text-xs p-1.5 rounded-lg transition-colors ${
                                  isCurrent
                                    ? 'bg-amber-50 text-amber-900 font-bold border border-amber-200'
                                    : isDone
                                    ? 'text-emerald-700 font-medium'
                                    : 'text-slate-400'
                                }`}
                              >
                                <div
                                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] mr-2 font-bold ${
                                    isCurrent
                                      ? 'bg-amber-600 text-white'
                                      : isDone
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-200 text-slate-500'
                                  }`}
                                >
                                  {isDone ? '✓' : idx + 1}
                                </div>
                                <span>{stepLabels[step]}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Nút hành động theo từng bước */}
                      <div className="pt-2 border-t border-slate-100">
                        {inc.status === 'NOT_RECEIVED' && (
                          <button
                            disabled={updating}
                            onClick={() => handleUpdateStatus(inc.id, 'RECEIVED')}
                            className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1.5" />
                            Tiếp nhận sự cố (Bước 2)
                          </button>
                        )}

                        {inc.status === 'RECEIVED' && (
                          <button
                            disabled={updating}
                            onClick={() => handleUpdateStatus(inc.id, 'PROCESSING')}
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center"
                          >
                            <ArrowRight className="w-4 h-4 mr-1.5" />
                            Bắt đầu điều tra & Xử lý (Bước 3)
                          </button>
                        )}

                        {inc.status === 'PROCESSING' && (
                          <button
                            onClick={() => {
                              setSelectedIncident(inc);
                              setResultNote('');
                              setUpdateError(null);
                            }}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1.5" />
                            Hoàn tất giải quyết (Bước 4)
                          </button>
                        )}

                        {inc.status === 'RESOLVED' && (
                          <div className="text-center text-xs text-emerald-700 font-semibold bg-emerald-50 py-2 rounded-xl border border-emerald-200">
                            ✓ Sự cố đã khép lại
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 py-3 px-4 flex items-center justify-between text-xs text-slate-500">
            <span>
              Trang {page} / {totalPages} (Tổng {totalCount} báo cáo)
            </span>
            <div className="space-x-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-40 transition-colors"
              >
                Trước
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-40 transition-colors"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Hoàn tất Giải quyết Sự cố (AD-02 Bước 4) */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setSelectedIncident(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Hoàn tất giải quyết sự cố</h3>
                <p className="text-xs text-slate-500">Khép lại khiếu nại và gửi thông báo kết quả cho người báo cáo</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 mb-4 text-xs space-y-1.5 border border-slate-200">
              <div>
                <span className="text-slate-500">Tiêu đề:</span>{' '}
                <strong className="text-slate-800">{selectedIncident.title}</strong>
              </div>
              <div>
                <span className="text-slate-500">Người gửi:</span>{' '}
                <strong className="text-slate-800">{selectedIncident.reporter.full_name}</strong> ({selectedIncident.reporter.phone})
              </div>
            </div>

            {updateError && (
              <div className="p-3 mb-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1.5 flex-shrink-0" />
                <span>{updateError}</span>
              </div>
            )}

            <div className="space-y-2 mb-4">
              <label className="block text-xs font-semibold text-slate-700">
                Ghi chú / Kết luận giải quyết sự cố <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={resultNote}
                onChange={(e) => setResultNote(e.target.value)}
                placeholder="Nhập nội dung xử lý (ví dụ: Đã làm việc với tài xế, tài xế xin lỗi và hoàn trả chi phí xăng cho khách, sự cố đã được hòa giải thành công)..."
                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-100 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={updating || !resultNote.trim()}
                onClick={() => handleUpdateStatus(selectedIncident.id, 'RESOLVED', resultNote.trim())}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center shadow-md"
              >
                {updating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    Đang lưu...
                  </>
                ) : (
                  'Xác nhận giải quyết'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xem Chi tiết Chuyến xe từ Quản lý Sự cố */}
      {tripDetailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <Car className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  Chi tiết Chuyến xe {tripDetail ? `(${tripDetail.code})` : ''}
                </h3>
              </div>
              <button
                onClick={() => setTripDetailModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/70 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {loadingTripDetail ? (
                <div className="py-16 text-center text-slate-500 flex flex-col items-center">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
                  <span className="text-sm">Đang tải thông tin chi tiết chuyến xe...</span>
                </div>
              ) : tripDetailError ? (
                <div className="p-6 text-center text-rose-600 bg-rose-50 rounded-xl border border-rose-200">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm font-medium">{tripDetailError}</p>
                </div>
              ) : tripDetail ? (
                <>
                  {/* 1. Lộ trình & Trạng thái */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-extrabold text-emerald-800">{tripDetail.code}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-800">
                        Trạng thái: {tripDetail.status}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <span>
                          <strong className="text-slate-700">Xuất phát:</strong> {tripDetail.origin_name}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                        <span>
                          <strong className="text-slate-700">Điểm đến:</strong> {tripDetail.dest_name}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 text-xs">
                      <div>
                        <span className="text-slate-400 block">Khởi hành</span>
                        <strong className="text-slate-800">
                          {new Date(tripDetail.departure_time).toLocaleString('vi-VN')}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Quãng đường</span>
                        <strong className="text-slate-800">{tripDetail.distance_km?.toFixed(1) || 0} km</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Chi phí nhiên liệu</span>
                        <strong className="text-teal-700 flex items-center">
                          <Fuel className="w-3.5 h-3.5 mr-1" />
                          {(tripDetail.estimated_fuel_cost || 0).toLocaleString('vi-VN')} đ
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Ghế đã đặt</span>
                        <strong className="text-slate-800">
                          {tripDetail.seats_reserved}/{tripDetail.seats_total} ghế
                        </strong>
                      </div>
                    </div>

                    {tripDetail.cancel_reason && (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                        <strong>Lý do hủy chuyến:</strong> {tripDetail.cancel_reason}
                      </div>
                    )}
                  </div>

                  {/* 2. Tài xế & Phương tiện */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                      <div className="font-bold text-slate-800 flex items-center mb-1">
                        <User className="w-4 h-4 mr-1.5 text-blue-600" /> Tài xế điều khiển
                      </div>
                      <div className="font-semibold text-slate-900">{tripDetail.driver.full_name}</div>
                      <div className="text-slate-600">SĐT: {tripDetail.driver.phone}</div>
                      <div className="text-slate-500">Email: {tripDetail.driver.email}</div>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                      <div className="font-bold text-slate-800 flex items-center mb-1">
                        <Car className="w-4 h-4 mr-1.5 text-emerald-600" /> Phương tiện
                      </div>
                      <div className="font-semibold text-slate-900">
                        {tripDetail.vehicle.plate_number} ({tripDetail.vehicle.brand_model || tripDetail.vehicle.type})
                      </div>
                      <div className="text-slate-600">
                        Sức chứa: {tripDetail.vehicle.seat_count} chỗ • Cốp {tripDetail.vehicle.cargo_area_m2}m² /{' '}
                        {tripDetail.vehicle.cargo_max_kg}kg
                      </div>
                      <div className="text-slate-500">
                        Nhiên liệu: {tripDetail.vehicle.fuel_type} ({tripDetail.vehicle.fuel_consumption}/100km)
                      </div>
                    </div>
                  </div>

                  {/* 3. Danh sách hành khách & Kiện hàng */}
                  <div className="space-y-2.5">
                    <h5 className="text-sm font-bold text-slate-800 flex items-center">
                      <Users className="w-4 h-4 mr-1.5 text-emerald-600" />
                      Danh sách Yêu cầu trên chuyến ({tripDetail.transport_requests.length})
                    </h5>
                    {tripDetail.transport_requests.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Chuyến xe này chưa có yêu cầu tham gia nào.</p>
                    ) : (
                      <div className="space-y-2">
                        {tripDetail.transport_requests.map((req) => (
                          <div
                            key={req.id}
                            className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs space-y-1.5"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-700">{req.code}</span>
                                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-semibold text-slate-700 flex items-center">
                                  {req.type === 'RIDE' ? (
                                    <>
                                      <Users className="w-3 h-3 mr-1 text-emerald-600" /> Đi nhờ ({req.passenger_count || 1} người)
                                    </>
                                  ) : (
                                    <>
                                      <Package className="w-3 h-3 mr-1 text-amber-600" /> Gửi hàng
                                    </>
                                  )}
                                </span>
                                <span className="font-bold text-slate-900">{req.user.full_name}</span>
                                <span className="text-slate-500">({req.user.phone})</span>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                  req.status === 'COMPLETED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : req.status === 'FAILED' || req.status === 'CANCELLED'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {req.status}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-600">
                              <span>
                                Đón: {req.pickup_name} ➔ Trả: {req.dropoff_name}
                              </span>
                              {req.shared_fuel_cost ? (
                                <strong className="text-teal-700">
                                  Hỗ trợ xăng/điện: {req.shared_fuel_cost.toLocaleString('vi-VN')} đ
                                </strong>
                              ) : null}
                            </div>

                            {req.cancel_reason && (
                              <div className="text-[11px] text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-200">
                                Ghi chú/Lý do: {req.cancel_reason}
                                {req.fail_reason_code ? ` (${req.fail_reason_code})` : ''}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setTripDetailModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default IncidentManagement;
