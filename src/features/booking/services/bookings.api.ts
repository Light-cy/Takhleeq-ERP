import apiClient from '../../../shared/apiClient';
import { Booking } from '../../../types';

export const bookingsApi = {
  getAll: (token?: string | null) => apiClient.get<Booking[]>('/api/bookings', token),
  submit: (data: any, token?: string | null) => apiClient.post<any>('/api/bookings', data, token),
  approve: (id: string, token?: string | null) => apiClient.post<any>(`/api/bookings/${id}/approve`, null, token),
  reject: (id: string, reason: string, token?: string | null) => apiClient.post<any>(`/api/bookings/${id}/reject`, { reason }, token),
  override: (id: string, updateData: any, token?: string | null) => apiClient.post<any>(`/api/bookings/${id}/override`, updateData, token),
  cancel: (id: string, reason: string, token?: string | null) => apiClient.post<any>(`/api/bookings/${id}/cancel`, { reason }, token),
};
