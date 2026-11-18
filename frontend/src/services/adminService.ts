import { api } from './api';
import {
  AdminUser,
  AdminUserDetail,
  AdminIncident,
  AdminStatsOverview,
  AdminTripDetail,
  Trip,
  IncidentStatus,
  UserRole,
  AccountStatus,
} from '../types';

export interface GetUsersParams {
  role?: UserRole;
  status?: AccountStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface GetUsersResponse {
  users: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GetIncidentsParams {
  status?: IncidentStatus;
  from_date?: string;
  to_date?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface GetIncidentsResponse {
  incidents: AdminIncident[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GetTripsParams {
  date?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface GetTripsResponse {
  trips: Trip[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const adminService = {
  // AD-01: Quản lý, xem chi tiết, khóa và mở khóa tài khoản
  async getUsers(params?: GetUsersParams): Promise<GetUsersResponse> {
    const response = await api.get('/admin/users', { params });
    return response.data.data;
  },

  async getUserDetail(userId: string): Promise<AdminUserDetail> {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data.data;
  },

  async lockUser(
    userId: string,
    data: { lock_type: 'LOCKED_TEMP' | 'LOCKED_PERM'; duration_days?: number; reason: string }
  ): Promise<{ message: string; user: AdminUser }> {
    const response = await api.post(`/admin/users/${userId}/lock`, data);
    return response.data.data;
  },

  async unlockUser(userId: string, reason: string): Promise<{ message: string; user: AdminUser }> {
    const response = await api.post(`/admin/users/${userId}/unlock`, { reason });
    return response.data.data;
  },

  // AD-02: Quản lý và xử lý sự cố
  async getIncidents(params?: GetIncidentsParams): Promise<GetIncidentsResponse> {
    const response = await api.get('/admin/incidents', { params });
    return response.data.data;
  },

  async updateIncidentStatus(
    incidentId: string,
    data: { status: IncidentStatus; result_note?: string }
  ): Promise<{ message: string; incident: AdminIncident }> {
    const response = await api.patch(`/admin/incidents/${incidentId}/status`, data);
    return response.data.data;
  },

  // AD-03: Thống kê chuyến theo ngày, KPI tổng quan & Xem chi tiết chuyến xe
  async getStatisticsOverview(params?: { from_date?: string; to_date?: string }): Promise<AdminStatsOverview> {
    const response = await api.get('/admin/statistics/overview', { params });
    return response.data.data;
  },

  async getTripsByDate(params?: GetTripsParams): Promise<GetTripsResponse> {
    const response = await api.get('/admin/statistics/trips', { params });
    return response.data.data;
  },

  async getTripDetail(tripId: string): Promise<AdminTripDetail> {
    const response = await api.get(`/admin/trips/${tripId}`);
    return response.data.data;
  },
};
