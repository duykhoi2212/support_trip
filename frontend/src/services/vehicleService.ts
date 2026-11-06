import { api } from './api';
import { ApiSuccessResponse, Vehicle } from '../types';

export const vehicleService = {
  async getMyVehicles(): Promise<Vehicle[]> {
    const res = await api.get<ApiSuccessResponse<Vehicle[]>>('/vehicles');
    return res.data.data;
  },

  async getVehicleById(id: string): Promise<Vehicle> {
    const res = await api.get<ApiSuccessResponse<Vehicle>>(`/vehicles/${id}`);
    return res.data.data;
  },

  async createVehicle(formData: FormData): Promise<Vehicle> {
    const res = await api.post<ApiSuccessResponse<Vehicle>>('/vehicles', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.data;
  },

  async updateVehicle(
    id: string,
    data: { brand_model?: string; color?: string }
  ): Promise<Vehicle> {
    const res = await api.patch<ApiSuccessResponse<Vehicle>>(`/vehicles/${id}`, data);
    return res.data.data;
  },

  async deactivateVehicle(id: string): Promise<Vehicle> {
    const res = await api.post<ApiSuccessResponse<Vehicle>>(`/vehicles/${id}/deactivate`);
    return res.data.data;
  },

  async activateVehicle(id: string): Promise<Vehicle> {
    const res = await api.post<ApiSuccessResponse<Vehicle>>(`/vehicles/${id}/activate`);
    return res.data.data;
  },
};
