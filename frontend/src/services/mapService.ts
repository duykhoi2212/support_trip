import { api } from './api';
import { ApiSuccessResponse, RouteResult } from '../types';

export const mapService = {
  async getRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ): Promise<RouteResult> {
    const res = await api.post<ApiSuccessResponse<RouteResult>>('/map/route', {
      origin,
      destination,
    });
    return res.data.data;
  },
};
