import { Checkin, CheckinChecklistItem, CreateCheckinPayload, UpdateCheckinPayload } from '../../../types/checkin.types';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('jwtToken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse(res: Response) {
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new Error(`Server error (${res.status}): ${text.slice(0, 100)}`);
  }
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Request failed with status ${res.status}`);
  }
  return json;
}

export async function fetchStartupCheckins(startupProfileId: number): Promise<Checkin[]> {
  const res = await fetch(`/api/startup-profiles/${startupProfileId}/checkins`, {
    headers: getHeaders()
  });
  const json = await handleResponse(res);
  return json.data || [];
}

export async function fetchCohortCheckins(cohortId: number): Promise<Checkin[]> {
  const res = await fetch(`/api/cohorts/${cohortId}/checkins`, {
    headers: getHeaders()
  });
  const json = await handleResponse(res);
  return json.data || [];
}

export async function fetchCheckinById(checkinId: number): Promise<Checkin> {
  const res = await fetch(`/api/checkins/${checkinId}`, {
    headers: getHeaders()
  });
  const json = await handleResponse(res);
  return json.data;
}

export async function createCheckin(payload: CreateCheckinPayload): Promise<Checkin> {
  const res = await fetch('/api/checkins', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const json = await handleResponse(res);
  return json.data;
}

export async function updateCheckin(checkinId: number, payload: UpdateCheckinPayload): Promise<Checkin> {
  const res = await fetch(`/api/checkins/${checkinId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const json = await handleResponse(res);
  return json.data;
}

export async function deleteCheckin(checkinId: number): Promise<void> {
  const res = await fetch(`/api/checkins/${checkinId}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  await handleResponse(res);
}

export async function addChecklistItem(checkinId: number, description: string): Promise<CheckinChecklistItem> {
  const res = await fetch(`/api/checkins/${checkinId}/checklist`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ description })
  });
  const json = await handleResponse(res);
  return json.data;
}

export async function updateChecklistItem(itemId: number, payload: { is_completed?: boolean; description?: string }): Promise<CheckinChecklistItem> {
  const res = await fetch(`/api/checkin-checklist-items/${itemId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const json = await handleResponse(res);
  return json.data;
}

export async function deleteChecklistItem(itemId: number): Promise<void> {
  const res = await fetch(`/api/checkin-checklist-items/${itemId}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  await handleResponse(res);
}

