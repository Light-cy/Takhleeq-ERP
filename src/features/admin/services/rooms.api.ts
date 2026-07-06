import apiClient from '../../../shared/apiClient';
import { Room } from '../../../types';

export const roomsApi = {
  getAll: (token?: string | null) => apiClient.get<Room[]>('/api/rooms', token),
  add: (data: any, token?: string | null) => apiClient.post<any>('/api/rooms', data, token),
  update: (id: string, updateData: any, token?: string | null) => apiClient.put<any>(`/api/rooms/${id}`, updateData, token),
};
