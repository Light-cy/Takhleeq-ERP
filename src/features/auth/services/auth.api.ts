import apiClient from '../../../shared/apiClient';

export const authApi = {
  loginSimulated: (email: string) => apiClient.post<any>('/api/auth/simulated', { email }),
  loginMicrosoft: (accessToken: string) => apiClient.post<any>('/api/auth/azure-sso', { accessToken }),
};
export default authApi;
