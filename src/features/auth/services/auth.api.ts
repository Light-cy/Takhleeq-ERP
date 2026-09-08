import apiClient from '../../../shared/apiClient';

export const authApi = {
  loginSimulated: (email: string, password?: string) => apiClient.post<any>('/api/auth/simulated', { email, password }),
  loginMicrosoft: (accessToken: string) => apiClient.post<any>('/api/auth/azure-sso', { accessToken }),
  getMe: (token?: string | null) => apiClient.get<{ user: any }>('/api/auth/me', token),
};
export default authApi;
