import apiClient from '../../../shared/apiClient';
import { User } from '../../../types';

export const usersApi = {
  getAll: (token?: string | null) => apiClient.get<User[]>('/api/users', token),
  create: (data: any, token?: string | null) => apiClient.post<any>('/api/users', data, token),
  assignRole: (email: string, role: string, token?: string | null) => apiClient.post<any>('/api/users/assign-role', { email, role }, token),
  delete: (email: string, token?: string | null) => apiClient.delete<any>(`/api/users/${encodeURIComponent(email)}`, token),
};
