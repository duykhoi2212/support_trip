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
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { AdminUser, UserRole, AccountStatus } from '../../types';

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
      fetchUsers();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setUnlockError(err.message || 'Không thể mở khóa tài khoản');
    } finally {
      setUnlocking(false);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <Shield className="w-3 h-3 mr-1" /> Quản trị viên
          </span>
        );
      case 'DRIVER':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Car className="w-3 h-3 mr-1" /> Tài xế
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Users className="w-3 h-3 mr-1" /> Hành khách
          </span>
        );
    }
  };

  const getStatusBadge = (status: AccountStatus, lockedUntil?: string | null) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Hoạt động
          </span>
        );
      case 'LOCKED_TEMP':
        return (
          <div className="flex flex-col items-start gap-0.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
              <Lock className="w-3 h-3 mr-1" /> Tạm khóa 14 ngày
            </span>
            {lockedUntil && (
              <span className="text-[10px] text-amber-900 font-medium">
                Đến: {new Date(lockedUntil).toLocaleDateString('vi-VN')}
              </span>
            )}
          </div>
        );
      case 'LOCKED_PERM':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertTriangle className="w-3 h-3 mr-1" /> Khóa vĩnh viễn
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center">
              <Shield className="w-7 h-7 mr-2 text-emerald-600" />
              Quản lý Tài khoản & Xử lý Vi phạm (AD-01)
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Theo dõi tình trạng hoạt động, kiểm soát vi phạm tỷ lệ hủy chuyến và mở khóa tài khoản có lưu vết kiểm toán.
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
                <option value="USER">Hành khách (USER)</option>
                <option value="DRIVER">Tài xế (DRIVER)</option>
                <option value="ADMIN">Quản trị viên (ADMIN)</option>
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
                <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                <option value="LOCKED_TEMP">Tạm khóa 14 ngày (LOCKED_TEMP)</option>
                <option value="LOCKED_PERM">Khóa vĩnh viễn (LOCKED_PERM)</option>
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
                          {isLocked ? (
                            <button
                              onClick={() => handleOpenUnlockModal(u)}
                              className="inline-flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                            >
                              <Unlock className="w-3.5 h-3.5 mr-1" />
                              Mở khóa
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">Hợp lệ</span>
                          )}
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
                  {selectedUser.status === 'LOCKED_TEMP' ? 'Tạm khóa 14 ngày' : 'Khóa vĩnh viễn'}
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
    </div>
  );
};
export default UserManagement;
