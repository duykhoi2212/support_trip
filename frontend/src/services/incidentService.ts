import { api } from './api';
import { ApiSuccessResponse } from '../types';

export const incidentService = {
  async reportIncident(data: {
    trip_id?: string;
    request_id?: string;
    title: string;
    description: string;
  }) {
    const res = await api.post<ApiSuccessResponse<any>>('/incidents', data);
    return res.data;
  },
};
