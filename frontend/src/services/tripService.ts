import { api } from './api';
import { ApiSuccessResponse, Trip } from '../types';

export const tripService = {
  async getMyTrips(status?: string): Promise<Trip[]> {
    const params = status ? { status } : {};
    const res = await api.get<ApiSuccessResponse<Trip[]>>('/trips/mine', { params });
    return res.data.data;
  },

  async getTripById(id: string): Promise<Trip> {
    const res = await api.get<ApiSuccessResponse<Trip>>(`/trips/${id}`);
    return res.data.data;
  },

  async createTrip(data: {
    vehicle_id: string;
    origin_name: string;
    origin_lat: number;
    origin_lng: number;
    dest_name: string;
    dest_lat: number;
    dest_lng: number;
    departure_time: string;
  }): Promise<Trip> {
    const res = await api.post<ApiSuccessResponse<Trip>>('/trips', data);
    return res.data.data;
  },

  async cancelTrip(id: string, cancel_reason: string): Promise<Trip> {
    const res = await api.post<ApiSuccessResponse<Trip>>(`/trips/${id}/cancel`, {
      cancel_reason,
    });
    return res.data.data;
  },

  async searchTrips(filters: {
    origin_name?: string;
    dest_name?: string;
    type?: 'RIDE' | 'PACKAGE';
    passenger_count?: number;
    cargo_weight_kg?: number;
    cargo_area_m2?: number;
  }): Promise<Trip[]> {
    const res = await api.get<ApiSuccessResponse<Trip[]>>('/trips/search', { params: filters });
    return res.data.data;
  },
};
