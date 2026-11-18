import { AccountStatus, FuelType, IncidentStatus, RequestStatus, TripStatus, UserRole } from '../types';

/**
 * Định dạng ngày YYYY-MM-DD theo múi giờ nội bộ (tránh lỗi lệch 1 ngày của toISOString UTC)
 */
export function formatLocalYMD(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getRoleLabel(role?: UserRole | string | null): string {
  switch (role) {
    case 'ADMIN':
      return 'Quản trị viên';
    case 'DRIVER':
      return 'Tài xế';
    case 'USER':
      return 'Người dùng';
    case 'SYSTEM':
      return 'Hệ thống';
    default:
      return 'Người dùng';
  }
}

export function getAccountStatusLabel(status?: AccountStatus | string | null): string {
  switch (status) {
    case 'ACTIVE':
      return 'Đang hoạt động';
    case 'LOCKED_TEMP':
      return 'Tạm khóa';
    case 'LOCKED_PERM':
      return 'Khóa vĩnh viễn';
    default:
      return 'Không xác định';
  }
}

export function getTripStatusLabel(status?: TripStatus | string | null): string {
  switch (status) {
    case 'OPEN':
      return 'Đang nhận khách';
    case 'CLOSED':
      return 'Đã chốt chuyến';
    case 'IN_PROGRESS':
      return 'Đang di chuyển';
    case 'COMPLETED':
      return 'Hoàn thành';
    case 'CANCELLED':
      return 'Đã hủy';
    default:
      return 'Không xác định';
  }
}

export function getRequestStatusLabel(status?: RequestStatus | string | null): string {
  switch (status) {
    case 'PENDING':
      return 'Chờ duyệt';
    case 'ACCEPTED':
      return 'Đã chấp nhận';
    case 'REJECTED':
      return 'Bị từ chối';
    case 'EXPIRED':
      return 'Hết hạn';
    case 'CANCELLED':
      return 'Đã hủy';
    case 'FAILED':
      return 'Bị hủy do sự cố';
    case 'COMPLETED':
      return 'Hoàn thành';
    default:
      return 'Không xác định';
  }
}

export function getIncidentStatusLabel(status?: IncidentStatus | string | null): string {
  switch (status) {
    case 'NOT_RECEIVED':
      return 'Chưa tiếp nhận';
    case 'RECEIVED':
      return 'Đã tiếp nhận';
    case 'PROCESSING':
      return 'Đang xử lý';
    case 'RESOLVED':
      return 'Đã giải quyết';
    default:
      return 'Không xác định';
  }
}

export function getFuelTypeLabel(fuelType?: FuelType | string | null): string {
  switch (fuelType) {
    case 'GASOLINE':
      return 'Xăng';
    case 'DIESEL':
      return 'Dầu Diesel';
    case 'ELECTRIC':
      return 'Xe điện';
    default:
      return 'Nhiên liệu';
  }
}

export function getLockTypeLabel(lockType?: string | null): string {
  switch (lockType) {
    case 'TEMP_14D':
    case 'LOCKED_TEMP':
      return 'Tạm khóa có thời hạn';
    case 'PERMANENT':
    case 'LOCKED_PERM':
      return 'Khóa vĩnh viễn';
    default:
      return lockType || 'Khóa tài khoản';
  }
}
