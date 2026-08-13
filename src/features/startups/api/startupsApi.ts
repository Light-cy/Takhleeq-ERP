import { 
  StartupProfile, 
  Industry, 
  StartupStageHistory, 
  StartupPivot, 
  StartupAuditLog,
  StartupProgressStage
} from '../../../types/startup.types';

async function parseResponse(res: Response, fallbackError: string) {
  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch (e) {
    throw new Error(fallbackError || `Server error (${res.status}): ${text.slice(0, 100)}`);
  }
  if (!res.ok || json.success === false) {
    throw new Error(json.error || fallbackError);
  }
  return json;
}

export async function fetchIndustries(): Promise<Industry[]> {
  const res = await fetch('/api/industries');
  const json = await parseResponse(res, 'Failed to fetch industries');
  return json.data || [];
}

export async function fetchStartupProfiles(params: {
  page?: number;
  limit?: number;
  search?: string;
  cohort_id?: number;
  stage?: string;
  program_status?: string;
  industry_id?: number;
}): Promise<{ data: StartupProfile[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.cohort_id) query.set('cohort_id', String(params.cohort_id));
  if (params.stage) query.set('stage', params.stage);
  if (params.program_status) query.set('program_status', params.program_status);
  if (params.industry_id) query.set('industry_id', String(params.industry_id));

  const res = await fetch(`/api/startup-profiles?${query.toString()}`);
  const json = await parseResponse(res, 'Failed to fetch startup profiles');
  return { data: json.data || [], pagination: json.pagination };
}

export async function fetchFounderOwnProfile(): Promise<StartupProfile> {
  const res = await fetch('/api/startup-profiles/me');
  const json = await parseResponse(res, 'Failed to fetch founder profile');
  return json.data;
}

export async function fetchStartupProfileById(id: number): Promise<StartupProfile> {
  const res = await fetch(`/api/startup-profiles/${id}`);
  const json = await parseResponse(res, 'Failed to fetch startup profile');
  return json.data;
}

export async function updateStartupProfile(id: number, payload: Partial<StartupProfile>): Promise<StartupProfile> {
  const res = await fetch(`/api/startup-profiles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const json = await parseResponse(res, 'Failed to update profile');
  return json.data;
}

export async function updateStartupProgressStage(id: number, newStage: StartupProgressStage, comments?: string): Promise<StartupProfile> {
  const res = await fetch(`/api/startup-profiles/${id}/stage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ new_stage: newStage, comments })
  });
  const json = await parseResponse(res, 'Failed to update stage');
  return json.data;
}

export async function fetchStageHistory(id: number, page: number = 1, limit: number = 10): Promise<{ data: StartupStageHistory[]; pagination: any }> {
  const res = await fetch(`/api/startup-profiles/${id}/stage-history?page=${page}&limit=${limit}`);
  const json = await parseResponse(res, 'Failed to fetch stage history');
  return { data: json.data || [], pagination: json.pagination };
}

export async function recordStartupPivot(id: number, payload: {
  new_idea: string;
  new_industry_id?: number | null;
  reason: string;
  supporting_notes?: string;
}): Promise<{ pivot: StartupPivot; updatedProfile: StartupProfile }> {
  const res = await fetch(`/api/startup-profiles/${id}/pivots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const json = await parseResponse(res, 'Failed to record pivot');
  return json.data;
}

export async function fetchStartupPivots(id: number, page: number = 1, limit: number = 10): Promise<{ data: StartupPivot[]; pagination: any }> {
  const res = await fetch(`/api/startup-profiles/${id}/pivots?page=${page}&limit=${limit}`);
  const json = await parseResponse(res, 'Failed to fetch pivots');
  return { data: json.data || [], pagination: json.pagination };
}

export async function fetchStartupAuditLogs(id: number, page: number = 1, limit: number = 20): Promise<{ data: StartupAuditLog[]; pagination: any }> {
  const res = await fetch(`/api/startup-profiles/${id}/audit-logs?page=${page}&limit=${limit}`);
  const json = await parseResponse(res, 'Failed to fetch audit logs');
  return { data: json.data || [], pagination: json.pagination };
}

export async function revertStartupAuditLog(id: number, logId: number): Promise<StartupProfile> {
  const res = await fetch(`/api/startup-profiles/${id}/audit-logs/${logId}/revert`, {
    method: 'POST'
  });
  const json = await parseResponse(res, 'Failed to revert change');
  return json.data;
}

export async function syncAcceptedStartups(): Promise<string> {
  const res = await fetch('/api/startup-profiles/sync-accepted', { method: 'POST' });
  const json = await parseResponse(res, 'Failed to sync accepted startups');
  return json.message;
}

export async function fetchStartupFullDetails(id: number): Promise<any> {
  const res = await fetch(`/api/startup-profiles/${id}/full-details`);
  const json = await parseResponse(res, 'Failed to fetch startup full details');
  return json.data;
}

export async function adminUpdateStartupProfile(id: number, payload: any): Promise<any> {
  const res = await fetch(`/api/startup-profiles/${id}/admin-update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const json = await parseResponse(res, 'Failed to update startup details');
  return json;
}

export async function issueStartupWarning(id: number, payload: {
  reason: string;
  severity: 'YELLOW' | 'RED';
  category?: string;
}): Promise<any> {
  const res = await fetch(`/api/startup-profiles/${id}/warnings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const json = await parseResponse(res, 'Failed to issue performance warning');
  return json;
}

export async function resolveStartupWarning(warningId: number, payload: {
  status: 'RESOLVED' | 'REVOKED';
  resolution_notes: string;
}): Promise<any> {
  const res = await fetch(`/api/startup-profiles/warnings/${warningId}/resolve`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const json = await parseResponse(res, 'Failed to resolve warning');
  return json;
}
