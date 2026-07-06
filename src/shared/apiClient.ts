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

export const apiClient = {
  get: async <T>(url: string, customToken?: string | null): Promise<T> => {
    const headers = getClientHeaders(customToken);
    // Remove Content-Type for GET requests
    delete headers['Content-Type'];
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error! status: ${res.status}`);
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
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error! status: ${res.status}`);
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
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error! status: ${res.status}`);
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
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error! status: ${res.status}`);
    }
    return res.json();
  },
};
export default apiClient;
