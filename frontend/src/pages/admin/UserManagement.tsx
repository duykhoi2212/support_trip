import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Mail,
  Shield,
  Car,
  X,
  Loader2,
  Eye,
  Clock,
  FileText,
  History,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { AdminUser, AdminUserDetail, UserRole, AccountStatus } from '../../types';
import { AccountStatusBadge, RoleBadge } from '../../components/common/StatusBadge';
import { getFuelTypeLabel, getLockTypeLabel, getRoleLabel } from '../../lib/formatters';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Unlock Modal State
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [unlockReason, setUnlockReason] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  // Lock Modal State
  const [lockTargetUser, setLockTargetUser] = useState<AdminUser | null>(null);
  const [lockType, setLockType] = useState<'LOCKED_TEMP' | 'LOCKED_PERM'>('LOCKED_TEMP');
  const [lockDays, setLockDays] = useState<number>(14);
  const [lockReason, setLockReason] = useState('');
  const [locking, setLocking] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);

  // Detail Modal State
  const [detailUser, setDetailUser] = useState<AdminUserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.getUsers({
        search: search || undefined,
        role: (roleFilter as UserRole) || undefined,
        status: (statusFilter as AccountStatus) || undefined,
        page,
        limit: 15,
      });
      setUsers(res.users);
      setTotalPages(res.pagination.totalPages);
      setTotalCount(res.pagination.total);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách tài khoản');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleOpenUnlockModal = (user: AdminUser) => {
    setSelectedUser(user);
    setUnlockReason('');
    setUnlockError(null);
  };

  const handleOpenLockModal = (user: AdminUser) => {
    setLockTargetUser(user);
    setLockType('LOCKED_TEMP');
    setLockDays(14);
    setLockReason('');
    setLockError(null);
  };

  const handleOpenDetailModal = async (userId: string) => {
    setDetailModalOpen(true);
    setDetailUser(null);
    setDetailError(null);
    setLoadingDetail(true);
    try {
      const detail = await adminService.getUserDetail(userId);
      setDetailUser(detail);
    } catch (err: any) {
      setDetailError(err.response?.data?.error?.message || err.message || 'Không thể tải chi tiết tài khoản');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleConfirmLock = async () => {
    if (!lockTargetUser) return;
    if (lockReason.trim().length < 10) {
      setLockError('Lý do khóa tài khoản phải có ít nhất 10 ký tự');
      return;
    }

    try {
      setLocking(true);
      setLockError(null);
      const res = await adminService.lockUser(lockTargetUser.id, {
        lock_type: lockType,
        duration_days: lockType === 'LOCKED_TEMP' ? lockDays : undefined,
        reason: lockReason.trim(),
      });
      setSuccessMsg(res.message || `Đã khóa tài khoản ${lockTargetUser.full_name}`);
      setLockTargetUser(null);
      setDetailModalOpen(false);
      fetchUsers();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setLockError(err.response?.data?.error?.message || err.message || 'Không thể khóa tài khoản');
    } finally {
      setLocking(false);
    }
  };

  const handleConfirmUnlock = async () => {
    if (!selectedUser) return;
    if (unlockReason.trim().length < 10) {
      setUnlockError('Lý do giải trình phải có ít nhất 10 ký tự');
      return;
    }

    try {
      setUnlocking(true);
      setUnlockError(null);
      const res = await adminService.unlockUser(selectedUser.id, unlockReason.trim());
      setSuccessMsg(res.message || `Đã mở khóa tài khoản cho ${selectedUser.full_name}`);
      setSelectedUser(null);
      setDetailModalOpen(false);
      fetchUsers();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setUnlockError(err.response?.data?.error?.message || err.message || 'Không thể mở khóa tài khoản');
    } finally {
      setUnlocking(false);
    }
  };

  const getRoleBadge = (role: UserRole) => <RoleBadge role={role} />;

  const getStatusBadge = (status: AccountStatus, lockedUntil?: string | null) => (
    <AccountStatusBadge status={status} lockedUntil={lockedUntil} />
  );

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center">
              <Shield className="w-6 h-6 mr-2 text-emerald-600" />
              Quản lý tài khoản
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Theo dõi tài khoản, kiểm soát vi phạm tỷ lệ hủy chuyến và khóa hoặc mở khóa có lưu vết kiểm toán.
            </p>
          </div>
          <div className="text-sm text-slate-600 bg-slate-100 px-4 py-2 rounded-xl font-medium">
            Tổng cộng: <strong className="text-emerald-700 font-bold">{totalCount}</strong> tài khoản
          </div>
        </div>

        {/* Thông báo thành công */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center text-emerald-800 text-sm animate-fade-in">
            <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Bộ lọc & Tìm kiếm */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo họ tên, số điện thoại, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Role Filter */}
            <div className="md:col-span-3">
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="">Tất cả vai trò</option>
                <option value="USER">Người dùng</option>
                <option value="DRIVER">Tài xế</option>
                <option value="ADMIN">Quản trị viên</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="md:col-span-3">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="LOCKED_TEMP">Tạm khóa</option>
                <option value="LOCKED_PERM">Khóa vĩnh viễn</option>
              </select>
            </div>

            {/* Submit Button */}
            <div className="md:col-span-1">
              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center"
              >
                Lọc
              </button>
            </div>
          </form>
        </div>

        {/* Danh sách Tài khoản */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
              <span>Đang tải danh sách người dùng...</span>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-600">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
              <p>{error}</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">Không tìm thấy tài khoản nào phù hợp.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Người dùng</th>
                    <th className="py-3.5 px-4">Liên hệ</th>
                    <th className="py-3.5 px-4">Vai trò</th>
                    <th className="py-3.5 px-4">Trạng thái</th>
                    <th className="py-3.5 px-4">Lịch sử vi phạm</th>
                    <th className="py-3.5 px-4 text-center">Hoạt động</th>
                    <th className="py-3.5 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const latestViolation = u.violations?.[0];
                    const isLocked = u.status === 'LOCKED_TEMP' || u.status === 'LOCKED_PERM';

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Avatar & Họ tên */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center flex-shrink-0 text-sm overflow-hidden">
                              {u.avatar_url ? (
                                <img
                                  src={u.avatar_url}
                                  alt={u.full_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                u.full_name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">{u.full_name}</div>
                              <div className="text-[11px] text-slate-400">
                                ID: #{u.id} • Ngày tạo: {new Date(u.created_at).toLocaleDateString('vi-VN')}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Thông tin liên hệ */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <div className="flex items-center text-slate-700 font-medium">
                              <Phone className="w-3.5 h-3.5 mr-1 text-slate-400" />
                              {u.phone}
                            </div>
                            <div className="flex items-center text-slate-500 text-xs">
                              <Mail className="w-3.5 h-3.5 mr-1 text-slate-400" />
                              {u.email}
                            </div>
                          </div>
                        </td>

                        {/* Vai trò */}
                        <td className="py-3.5 px-4">{getRoleBadge(u.role)}</td>

                        {/* Trạng thái */}
                        <td className="py-3.5 px-4">{getStatusBadge(u.status, u.locked_until)}</td>

                        {/* Vi phạm */}
                        <td className="py-3.5 px-4">
                          {latestViolation ? (
                            <div className="text-xs bg-rose-50 text-rose-800 p-2 rounded-lg border border-rose-200">
                              <div className="font-bold flex items-center">
                                <AlertTriangle className="w-3 h-3 mr-1 text-rose-600" />
                                Tỷ lệ hủy: {(latestViolation.cancel_rate * 100).toFixed(1)}%
                              </div>
                              <div className="text-[11px] text-rose-700 mt-0.5">
                                Hủy: {latestViolation.cancelled_count}/{latestViolation.confirmed_count} yêu cầu
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Không có vi phạm</span>
                          )}
                        </td>

                        {/* Thống kê hoạt động */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="text-xs text-slate-600">
                            {u.role === 'DRIVER' ? (
                              <span>
                                <strong>{u._count.trips}</strong> chuyến xe
                              </span>
                            ) : (
                              <span>
                                <strong>{u._count.transport_requests}</strong> yêu cầu
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Nút hành động */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenDetailModal(u.id)}
                              className="inline-flex items-center px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                              title="Xem chi tiết thông tin tài khoản"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Chi tiết
                            </button>

                            {isLocked ? (
                              <button
                                type="button"
                                onClick={() => handleOpenUnlockModal(u)}
                                className="inline-flex items-center px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                              >
                                <Unlock className="w-3.5 h-3.5 mr-1" />
                                Mở khóa
                              </button>
                            ) : u.role !== 'ADMIN' ? (
                              <button
                                type="button"
                                onClick={() => handleOpenLockModal(u)}
                                className="inline-flex items-center px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors"
                                title="Khóa tài khoản kèm lý do"
                              >
                                <Lock className="w-3.5 h-3.5 mr-1" />
                                Khóa
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="py-3 px-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>
                Trang {page} / {totalPages} (Tổng {totalCount} kết quả)
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
      </div>

      {/* Modal Mở khóa tài khoản (AD-01) */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
                <Unlock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Mở khóa tài khoản</h3>
                <p className="text-xs text-slate-500">Xác thực quyền quản trị và lưu vết kiểm toán hệ thống</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 mb-4 text-xs space-y-1.5 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Tài khoản:</span>
                <strong className="text-slate-800">{selectedUser.full_name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số điện thoại:</span>
                <strong className="text-slate-800">{selectedUser.phone}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Trạng thái hiện tại:</span>
                <strong className="text-rose-700">
                  {selectedUser.status === 'LOCKED_TEMP' ? 'Tạm khóa' : 'Khóa vĩnh viễn'}
                </strong>
              </div>
            </div>

            {unlockError && (
              <div className="p-3 mb-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1.5 flex-shrink-0" />
                <span>{unlockError}</span>
              </div>
            )}

            <div className="space-y-2 mb-4">
              <label className="block text-xs font-semibold text-slate-700">
                Lý do giải trình mở khóa <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                placeholder="Nhập chi tiết lý do mở khóa (ví dụ: Người dùng đã gửi đơn giải trình và có bằng chứng việc hủy do sự cố bất khả kháng)..."
                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Tối thiểu 10 ký tự</span>
                <span className={unlockReason.trim().length < 10 ? 'text-amber-600' : 'text-emerald-600 font-semibold'}>
                  {unlockReason.trim().length} ký tự
                </span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-100 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={unlocking || unlockReason.trim().length < 10}
                onClick={handleConfirmUnlock}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center shadow-md"
              >
                {unlocking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    Đang xử lý...
                  </>
                ) : (
                  'Xác nhận mở khóa'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Khóa tài khoản thủ công (AD-01 Nâng cao) */}
      {lockTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setLockTargetUser(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-xl">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Khóa tài khoản người dùng</h3>
                <p className="text-xs text-slate-500">
                  Hệ thống sẽ lập tức chặn truy cập, lưu AuditLog và gửi thông báo lý do đến tài khoản này.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 mb-4 text-xs space-y-1.5 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Tài khoản:</span>
                <strong className="text-slate-800">{lockTargetUser.full_name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vai trò:</span>
                <strong className="text-slate-800">
                  {getRoleLabel(lockTargetUser.role)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số điện thoại:</span>
                <strong className="text-slate-800">{lockTargetUser.phone}</strong>
              </div>
            </div>

            {lockError && (
              <div className="p-3 mb-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1.5 flex-shrink-0" />
                <span>{lockError}</span>
              </div>
            )}

            {/* Chọn hình thức khóa */}
            <div className="space-y-3 mb-4">
              <label className="block text-xs font-semibold text-slate-700">Hình thức khóa</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setLockType('LOCKED_TEMP')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    lockType === 'LOCKED_TEMP'
                      ? 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-200'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" /> Tạm khóa có thời hạn
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Tự động mở lại khi hết hạn</p>
                </button>
                <button
                  type="button"
                  onClick={() => setLockType('LOCKED_PERM')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    lockType === 'LOCKED_PERM'
                      ? 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-200'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-600" /> Khóa vĩnh viễn
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Chỉ mở lại khi Admin duyệt</p>
                </button>
              </div>

              {lockType === 'LOCKED_TEMP' && (
                <div className="flex items-center gap-3 bg-amber-50/60 border border-amber-200 rounded-xl p-3">
                  <label className="text-xs font-semibold text-amber-900 whitespace-nowrap">
                    Thời hạn khóa (ngày):
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={lockDays}
                    onChange={(e) => setLockDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
                    className="w-24 px-3 py-1.5 border border-amber-300 rounded-lg text-sm font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="flex gap-1.5 flex-wrap">
                    {[3, 7, 14, 30].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setLockDays(d)}
                        className={`px-2 py-1 rounded text-[11px] font-semibold ${
                          lockDays === d
                            ? 'bg-amber-600 text-white'
                            : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-100'
                        }`}
                      >
                        {d} ngày
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2 mb-5">
              <label className="block text-xs font-semibold text-slate-700">
                Lý do khóa tài khoản (sẽ gửi thông báo cho người dùng) <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                placeholder="Ví dụ: Vi phạm nghiêm trọng nội quy ứng xử hoặc có nhiều báo cáo sự cố gian lận thông tin chuyến đi..."
                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
              />
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Tối thiểu 10 ký tự</span>
                <span className={lockReason.trim().length < 10 ? 'text-amber-600' : 'text-emerald-600 font-semibold'}>
                  {lockReason.trim().length} ký tự
                </span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setLockTargetUser(null)}
                className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-100 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={locking || lockReason.trim().length < 10}
                onClick={handleConfirmLock}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center shadow-md"
              >
                {locking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    Đang xử lý...
                  </>
                ) : (
                  'Xác nhận khóa tài khoản'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xem chi tiết thông tin tài khoản (AD-01 Nâng cao) */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <Eye className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-900">Chi tiết Hồ sơ Tài khoản</h3>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/70 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {loadingDetail ? (
                <div className="py-16 text-center text-slate-500 flex flex-col items-center">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
                  <span className="text-sm">Đang tải hồ sơ tài khoản...</span>
                </div>
              ) : detailError ? (
                <div className="p-6 text-center text-rose-600 bg-rose-50 rounded-xl border border-rose-200">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm font-medium">{detailError}</p>
                </div>
              ) : detailUser ? (
                <>
                  {/* 1. Thông tin định danh */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 font-bold text-2xl flex items-center justify-center flex-shrink-0 overflow-hidden border border-emerald-200">
                      {detailUser.avatar_url ? (
                        <img
                          src={detailUser.avatar_url}
                          alt={detailUser.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        detailUser.full_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-lg font-bold text-slate-900">{detailUser.full_name}</h4>
                        {getRoleBadge(detailUser.role)}
                        {getStatusBadge(detailUser.status, detailUser.locked_until)}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                        <span className="flex items-center">
                          <Phone className="w-3.5 h-3.5 mr-1 text-slate-400" /> {detailUser.phone}
                        </span>
                        <span className="flex items-center">
                          <Mail className="w-3.5 h-3.5 mr-1 text-slate-400" /> {detailUser.email}
                        </span>
                        <span className="text-slate-400">
                          ID: #{detailUser.id} • Tham gia: {new Date(detailUser.created_at).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Thống kê hoạt động & Tỷ lệ hủy */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {detailUser.role === 'DRIVER' ? (
                      <>
                        <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
                          <div className="text-[11px] text-blue-600 font-medium">Tổng chuyến xe</div>
                          <div className="text-xl font-extrabold text-blue-900">{detailUser.stats.total_trips}</div>
                        </div>
                        <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                          <div className="text-[11px] text-emerald-600 font-medium">Hoàn thành</div>
                          <div className="text-xl font-extrabold text-emerald-900">{detailUser.stats.completed_trips}</div>
                        </div>
                        <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-xl">
                          <div className="text-[11px] text-rose-600 font-medium">Chuyến đã hủy</div>
                          <div className="text-xl font-extrabold text-rose-900">{detailUser.stats.cancelled_trips}</div>
                        </div>
                        <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl">
                          <div className="text-[11px] text-amber-600 font-medium">Báo cáo sự cố</div>
                          <div className="text-xl font-extrabold text-amber-900">{detailUser.stats.incident_reports_count}</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                          <div className="text-[11px] text-emerald-600 font-medium">Tổng yêu cầu</div>
                          <div className="text-xl font-extrabold text-emerald-900">{detailUser.stats.total_requests}</div>
                        </div>
                        <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
                          <div className="text-[11px] text-blue-600 font-medium">Hoàn thành</div>
                          <div className="text-xl font-extrabold text-blue-900">{detailUser.stats.completed_requests}</div>
                        </div>
                        <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-xl">
                          <div className="text-[11px] text-rose-600 font-medium">Sự cố vắng mặt</div>
                          <div className="text-xl font-extrabold text-rose-900">{detailUser.stats.failed_requests}</div>
                        </div>
                        <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl">
                          <div className="text-[11px] text-amber-700 font-medium">Tỷ lệ hủy chuyến tuần này</div>
                          <div className="text-xl font-extrabold text-amber-950">
                            {detailUser.cancellation ? `${(detailUser.cancellation.week_rate * 100).toFixed(1)}%` : '0.0%'}
                          </div>
                          {detailUser.cancellation && (
                            <div className="text-[10px] text-amber-700">
                              {detailUser.cancellation.week_cancelled}/{detailUser.cancellation.week_confirmed} chuyến tuần này
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* 3. Danh sách phương tiện (Nếu là Tài xế) */}
                  {detailUser.role === 'DRIVER' && (
                    <div className="space-y-2.5">
                      <h5 className="text-sm font-bold text-slate-800 flex items-center">
                        <Car className="w-4 h-4 mr-1.5 text-blue-600" />
                        Phương tiện đăng ký ({detailUser.vehicles.length})
                      </h5>
                      {detailUser.vehicles.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">Tài xế chưa đăng ký phương tiện nào.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {detailUser.vehicles.map((v) => (
                            <div
                              key={v.id}
                              className="p-3 rounded-xl border border-slate-200 bg-white flex items-center gap-3 text-xs"
                            >
                              <div className="w-14 h-12 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                                {v.photo_url ? (
                                  <img src={v.photo_url} alt={v.plate_number} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                                    <Car className="w-5 h-5" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>{v.plate_number}</span>
                                  {v.is_deleted && (
                                    <span className="px-1.5 py-0.5 text-[10px] bg-slate-200 text-slate-600 rounded">Đã xóa</span>
                                  )}
                                </div>
                                <div className="text-slate-600 truncate">
                                  {v.brand_model || v.type} • {v.seat_count} chỗ • Cốp {v.cargo_area_m2}m²/{v.cargo_max_kg}kg
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  Nhiên liệu: {getFuelTypeLabel(v.fuel_type)} ({v.fuel_consumption}/100km)
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4. Lịch sử Vi phạm (CS-02) */}
                  <div className="space-y-2.5">
                    <h5 className="text-sm font-bold text-slate-800 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-1.5 text-rose-600" />
                      Lịch sử Vi phạm Tỷ lệ hủy ({detailUser.violations.length})
                    </h5>
                    {detailUser.violations.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Tài khoản chưa ghi nhận vi phạm tỷ lệ hủy nào.</p>
                    ) : (
                      <div className="space-y-2">
                        {detailUser.violations.map((v) => (
                          <div
                            key={v.id}
                            className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2 text-xs"
                          >
                            <div>
                              <span className="font-bold text-rose-700">
                                Tỷ lệ hủy: {(v.cancel_rate * 100).toFixed(1)}% ({v.cancelled_count}/{v.confirmed_count})
                              </span>
                              <div className="text-[11px] text-slate-500">
                                Tuần bắt đầu: {new Date(v.week_start).toLocaleDateString('vi-VN')} • Hình thức: {getLockTypeLabel(v.lock_type)}
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                v.status === 'ACTIVE'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {v.status === 'ACTIVE' ? 'Đang hiệu lực' : 'Đã thu hồi'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 5. Lịch sử Kiểm toán Khóa / Mở khóa */}
                  <div className="space-y-2.5">
                    <h5 className="text-sm font-bold text-slate-800 flex items-center">
                      <History className="w-4 h-4 mr-1.5 text-slate-600" />
                      Lịch sử Kiểm toán Khóa / Mở khóa ({detailUser.audit_logs.length})
                    </h5>
                    {detailUser.audit_logs.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Chưa có lịch sử tác động từ Quản trị viên hoặc Hệ thống.</p>
                    ) : (
                      <div className="space-y-2">
                        {detailUser.audit_logs.map((log) => (
                          <div
                            key={log.id}
                            className="p-3 rounded-xl border border-slate-200 bg-white text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={`font-bold flex items-center ${
                                  log.action.includes('UNLOCK') ? 'text-emerald-700' : 'text-rose-700'
                                }`}
                              >
                                <FileText className="w-3.5 h-3.5 mr-1" />
                                {log.action === 'LOCK_ACCOUNT'
                                  ? 'Khóa tài khoản'
                                  : log.action === 'UNLOCK_ACCOUNT'
                                  ? 'Mở khóa tài khoản'
                                  : log.action}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {new Date(log.created_at).toLocaleString('vi-VN')}
                              </span>
                            </div>
                            {log.reason && <p className="text-slate-700">{log.reason}</p>}
                            <div className="text-[11px] text-slate-400">
                              Thực hiện bởi:{' '}
                              {log.actor
                                ? `${log.actor.full_name} (${getRoleLabel(log.actor.role)})`
                                : getRoleLabel(log.actor_type)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            {detailUser && (
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-colors"
                >
                  Đóng
                </button>
                {detailUser.role !== 'ADMIN' && (
                  <div className="flex items-center gap-2">
                    {detailUser.status === 'ACTIVE' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setDetailModalOpen(false);
                          handleOpenLockModal({
                            ...detailUser,
                            _count: {
                              trips: detailUser.stats.total_trips,
                              transport_requests: detailUser.stats.total_requests,
                              violations: detailUser.violations.length,
                            },
                          });
                        }}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center shadow-sm"
                      >
                        <Lock className="w-3.5 h-3.5 mr-1.5" /> Khóa tài khoản này
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setDetailModalOpen(false);
                          handleOpenUnlockModal({
                            ...detailUser,
                            _count: {
                              trips: detailUser.stats.total_trips,
                              transport_requests: detailUser.stats.total_requests,
                              violations: detailUser.violations.length,
                            },
                          });
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center shadow-sm"
                      >
                        <Unlock className="w-3.5 h-3.5 mr-1.5" /> Mở khóa tài khoản này
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default UserManagement;
