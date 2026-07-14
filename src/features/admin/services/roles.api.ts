import apiClient from '../../../shared/apiClient';
import { CustomRole } from '../../../types';

export const rolesApi = {
  getAll: (token?: string | null) => apiClient.get<CustomRole[]>('/api/roles', token),
  create: (data: any, token?: string | null) => apiClient.post<any>('/api/roles', data, token),
  update: (name: string, data: any, token?: string | null) => apiClient.put<any>(`/api/roles/${name}`, data, token),
  delete: (name: string, token?: string | null) => apiClient.delete<any>(`/api/roles/${name}`, token),
};
