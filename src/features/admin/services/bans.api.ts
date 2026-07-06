import apiClient from '../../../shared/apiClient';
import { Ban } from '../../../types';

export const bansApi = {
  getAll: (token?: string | null) => apiClient.get<Ban[]>('/api/bans', token),
  issue: (data: any, token?: string | null) => apiClient.post<any>('/api/bans', data, token),
  lift: (id: string, reason: string, token?: string | null) => apiClient.post<any>(`/api/bans/${id}/lift`, { reason }, token),
};
