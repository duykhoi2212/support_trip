import { api } from './api';
import { ApiSuccessResponse, Trip, AiSearchResult, DriverHistoryResponse } from '../types';

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
    eta?: string;
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
    pickup_lat?: number;
    pickup_lng?: number;
    dropoff_lat?: number;
    dropoff_lng?: number;
    departure_date?: string;
    type?: 'RIDE' | 'PACKAGE';
    passenger_count?: number;
    cargo_weight_kg?: number;
    cargo_area_m2?: number;
  }): Promise<Trip[]> {
    const res = await api.get<ApiSuccessResponse<Trip[]>>('/trips/search', { params: filters });
    return res.data.data;
  },

  async searchTripsWithAi(prompt: string): Promise<AiSearchResult> {
    const res = await api.post<ApiSuccessResponse<AiSearchResult>>('/trips/search/ai', { prompt });
    return res.data.data;
  },

  async getDriverHistory(query?: {
    status?: string;
    from_date?: string;
    to_date?: string;
  }): Promise<DriverHistoryResponse> {
    const res = await api.get<ApiSuccessResponse<DriverHistoryResponse>>('/trips/driver/history', {
      params: query,
    });
    return res.data.data;
  },
};

