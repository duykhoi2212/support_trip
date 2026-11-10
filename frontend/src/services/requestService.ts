import { api } from './api';
import { ApiSuccessResponse, TransportRequest, Trip } from '../types';

export const requestService = {
  /**
   * Tạo yêu cầu đi nhờ xe
   */
  async createRideRequest(data: {
    trip_id: string;
    pickup_name: string;
    pickup_lat: number;
    pickup_lng: number;
    dropoff_name: string;
    dropoff_lat: number;
    dropoff_lng: number;
    passenger_count: number;
  }): Promise<TransportRequest> {
    const res = await api.post<ApiSuccessResponse<TransportRequest>>('/requests/ride', data);
    return res.data.data;
  },

  /**
   * Tạo yêu cầu gửi hàng (FormData chứa file ảnh)
   */
  async createPackageRequest(formData: FormData): Promise<TransportRequest> {
    const res = await api.post<ApiSuccessResponse<TransportRequest>>('/requests/package', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.data;
  },

  /**
   * Xem danh sách yêu cầu của tôi (Người dùng)
   */
  async getMyRequests(): Promise<TransportRequest[]> {
    const res = await api.get<ApiSuccessResponse<TransportRequest[]>>('/requests/mine');
    return res.data.data;
  },

  /**
   * Tài xế xem danh sách yêu cầu trên chuyến xe
   */
  async getTripRequests(tripId: string): Promise<TransportRequest[]> {
    const res = await api.get<ApiSuccessResponse<TransportRequest[]>>(`/requests/trip/${tripId}`);
    return res.data.data;
  },

  /**
   * Tài xế chấp nhận yêu cầu
   */
  async acceptRequest(id: string): Promise<TransportRequest> {
    const res = await api.post<ApiSuccessResponse<TransportRequest>>(`/requests/${id}/accept`);
    return res.data.data;
  },

  /**
   * Tài xế từ chối yêu cầu
   */
  async rejectRequest(id: string, reject_reason: string): Promise<TransportRequest> {
    const res = await api.post<ApiSuccessResponse<TransportRequest>>(`/requests/${id}/reject`, {
      reject_reason,
    });
    return res.data.data;
  },

  /**
   * Người dùng hủy yêu cầu
   */
  async cancelRequest(id: string, cancel_reason: string): Promise<TransportRequest> {
    const res = await api.post<ApiSuccessResponse<TransportRequest>>(`/requests/${id}/cancel`, {
      cancel_reason,
    });
    return res.data.data;
  },

  /**
   * Tài xế cập nhật tiến trình đón/trả/giao hàng
   */
  async updateProgress(
    id: string,
    data: {
      ride_progress?: 'NOT_PICKED_UP' | 'PICKED_UP' | 'DROPPED_OFF';
      package_status?: 'AWAITING_PICKUP' | 'PICKED_UP' | 'DELIVERED';
      fail_reason_code?: string;
    }
  ): Promise<TransportRequest> {
    const res = await api.patch<ApiSuccessResponse<TransportRequest>>(`/requests/${id}/progress`, data);
    return res.data.data;
  },

  /**
   * Tài xế bắt đầu chuyến xe
   */
  async startTrip(tripId: string): Promise<Trip> {
    const res = await api.post<ApiSuccessResponse<Trip>>(`/requests/trip/${tripId}/start`);
    return res.data.data;
  },

  /**
   * Tài xế kết thúc chuyến xe
   */
  async completeTrip(tripId: string): Promise<Trip> {
    const res = await api.post<ApiSuccessResponse<Trip>>(`/requests/trip/${tripId}/complete`);
    return res.data.data;
  },
};

