import { api } from './api';
import { ApiSuccessResponse, IncidentStatus, MyIncidentsResponse } from '../types';

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

  async getMyIncidents(params?: {
    status?: IncidentStatus;
    from_date?: string;
    to_date?: string;
  }): Promise<MyIncidentsResponse> {
    const res = await api.get<ApiSuccessResponse<MyIncidentsResponse>>('/incidents/my', { params });
    return res.data.data;
  },
};
