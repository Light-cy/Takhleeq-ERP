import apiClient from '../../../shared/apiClient';

export interface BookingTypeItem {
  id: number;
  name: string;
  description?: string;
  isActive?: boolean;
  is_active?: boolean;
}

export const bookingTypesApi = {
  getAll: (token?: string | null) => apiClient.get<BookingTypeItem[]>('/api/booking-types', token),
  create: (data: { name: string; description?: string; isActive?: boolean }, token?: string | null) => 
    apiClient.post<BookingTypeItem>('/api/booking-types', data, token),
  update: (id: number | string, data: { name: string; description?: string; isActive?: boolean }, token?: string | null) => 
    apiClient.put<BookingTypeItem>(`/api/booking-types/${id}`, data, token),
  delete: (id: number | string, token?: string | null) => 
    apiClient.delete<{ success: boolean; message?: string }>(`/api/booking-types/${id}`, token),
};
export default bookingTypesApi;
