let token: string | null = null;

export const setClientToken = (newToken: string | null) => {
  token = newToken;
};

export const getClientHeaders = (customToken?: string | null) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const activeToken = customToken !== undefined ? customToken : token;
  if (activeToken) {
    headers['Authorization'] = `Bearer ${activeToken}`;
  }
  return headers;
};

const handle401 = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('currentUser');
    window.dispatchEvent(new Event('auth:session_expired'));
  }
};

const handleResponseError = async (res: Response): Promise<never> => {
  if (res.status === 401) {
    handle401();
  }
  const errText = await res.text().catch(() => '');
  let errMsg = `HTTP error! status: ${res.status}`;
  try {
    const errData = JSON.parse(errText);
    if (errData && errData.error) {
      errMsg = errData.error;
    }
  } catch (e) {
    if (errText && errText.length < 300 && !errText.includes('<!DOCTYPE')) {
      errMsg = errText;
    }
  }
  throw new Error(errMsg);
};

export const apiClient = {
  get: async <T>(url: string, customToken?: string | null): Promise<T> => {
    const headers = getClientHeaders(customToken);
    // Remove Content-Type for GET requests
    delete headers['Content-Type'];
    const res = await fetch(url, { headers });
    if (!res.ok) {
      await handleResponseError(res);
    }
    return res.json();
  },
  post: async <T>(url: string, body?: any, customToken?: string | null): Promise<T> => {
    const headers = getClientHeaders(customToken);
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      await handleResponseError(res);
    }
    return res.json();
  },
  put: async <T>(url: string, body?: any, customToken?: string | null): Promise<T> => {
    const headers = getClientHeaders(customToken);
    const res = await fetch(url, {
      method: 'PUT',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      await handleResponseError(res);
    }
    return res.json();
  },
  delete: async <T>(url: string, customToken?: string | null): Promise<T> => {
    const headers = getClientHeaders(customToken);
    delete headers['Content-Type'];
    const res = await fetch(url, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) {
      await handleResponseError(res);
    }
    return res.json();
  },
};
export default apiClient;
