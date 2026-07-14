import apiClient from '../../../shared/apiClient';
import { AuditRecord } from '../../../types';

export const auditApi = {
  getLogs: (token?: string | null) => apiClient.get<AuditRecord[]>('/api/audit-logs', token),
  getReports: (token?: string | null) => apiClient.get<any>('/api/reports', token),
};
