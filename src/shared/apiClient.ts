let token: string | null = null;

export const setClientToken = (newToken: string | null) => {
  token = newToken;
};

export const getClientHeaders = (customToken?: string | null) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const activeToken = customToken !== undefined 
    ? customToken 
    : (token || (typeof localStorage !== 'undefined' ? (localStorage.getItem('jwtToken') || localStorage.getItem('token')) : null));
    
  if (activeToken && typeof activeToken === 'string' && activeToken.trim() !== '' && activeToken !== 'null' && activeToken !== 'undefined') {
    headers['Authorization'] = `Bearer ${activeToken.trim()}`;
  }
  return headers;
};

const handle401 = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    window.dispatchEvent(new Event('auth:session_expired'));
  }
};

const handleResponseError = async (res: Response, url?: string): Promise<never> => {
  const errText = await res.text().catch(() => '');
  let errMsg = `HTTP error! status: ${res.status}`;
  let errCode = '';
  try {
    const errData = JSON.parse(errText);
    if (errData && errData.error) {
      errMsg = errData.error;
    }
    if (errData && errData.code) {
      errCode = errData.code;
    }
  } catch (e) {
    if (errText && errText.length < 300 && !errText.includes('<!DOCTYPE')) {
      errMsg = errText;
    }
  }

  // Only expire session on true token expiration (401 with TOKEN_EXPIRED or session expired message)
  // Never log out on 403 Forbidden or regular permission denials
  if (res.status === 401 && (errCode === 'TOKEN_EXPIRED' || errMsg.toLowerCase().includes('session expired') || errMsg.toLowerCase().includes('token expired') || url === '/api/auth/me')) {
    handle401();
  }

  throw new Error(errMsg);
};

const safeParseJson = async <T>(res: Response): Promise<T> => {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await res.json();
    } catch {
      // Fallback
    }
  }
  const text = await res.text().catch(() => '');
  try {
    return JSON.parse(text);
  } catch {
    return text as unknown as T;
  }
};

export const apiClient = {
  get: async <T>(url: string, customToken?: string | null): Promise<T> => {
    const headers = getClientHeaders(customToken);
    // Remove Content-Type for GET requests
    delete headers['Content-Type'];
    const res = await fetch(url, { headers });
    if (!res.ok) {
      await handleResponseError(res, url);
    }
    return safeParseJson<T>(res);
  },
  post: async <T>(url: string, body?: any, customToken?: string | null): Promise<T> => {
    const headers = getClientHeaders(customToken);
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      await handleResponseError(res, url);
    }
    return safeParseJson<T>(res);
  },
  put: async <T>(url: string, body?: any, customToken?: string | null): Promise<T> => {
    const headers = getClientHeaders(customToken);
    const res = await fetch(url, {
      method: 'PUT',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      await handleResponseError(res, url);
    }
    return safeParseJson<T>(res);
  },
  delete: async <T>(url: string, customToken?: string | null): Promise<T> => {
    const headers = getClientHeaders(customToken);
    delete headers['Content-Type'];
    const res = await fetch(url, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) {
      await handleResponseError(res, url);
    }
    return safeParseJson<T>(res);
  },
};
export default apiClient;
