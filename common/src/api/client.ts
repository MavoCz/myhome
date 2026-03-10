import { getTokenStorage } from './auth';

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  const storage = getTokenStorage();
  if (!storage) return false;

  const refreshToken = storage.getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    storage.setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

interface OrvalRequestConfig {
  url: string;
  method: string;
  headers?: Record<string, string>;
  data?: unknown;
  params?: Record<string, unknown>;
  signal?: AbortSignal;
}

export const customFetch = async <T>(
  urlOrConfig: string | OrvalRequestConfig,
  options?: RequestInit,
): Promise<T> => {
  let url: string;
  let fetchOptions: RequestInit;

  if (typeof urlOrConfig === 'string') {
    url = urlOrConfig;
    fetchOptions = options ?? {};
  } else {
    const { url: configUrl, method, headers: configHeaders, data, params, signal } = urlOrConfig;
    url = configUrl;
    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value != null) searchParams.set(key, String(value));
      }
      url += `?${searchParams.toString()}`;
    }
    const isFormData = data instanceof FormData;
    fetchOptions = {
      method,
      headers: isFormData ? undefined : configHeaders,
      body: data != null ? (isFormData ? data : JSON.stringify(data)) : undefined,
      signal,
      ...options,
    };
  }

  const storage = getTokenStorage();

  const headers = new Headers(fetchOptions.headers);
  // Do NOT set Content-Type for FormData — the browser sets it automatically with the boundary
  if (!headers.has('Content-Type') && fetchOptions.body && !(fetchOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const accessToken = storage?.getAccessToken();
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  let response = await fetch(url, { ...fetchOptions, headers });

  if (response.status === 401 && storage?.getRefreshToken()) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshTokens().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }

    const refreshed = await refreshPromise;

    if (refreshed) {
      const retryHeaders = new Headers(headers);
      const newAccessToken = storage.getAccessToken();
      if (newAccessToken) {
        retryHeaders.set('Authorization', `Bearer ${newAccessToken}`);
      }
      response = await fetch(url, { ...fetchOptions, headers: retryHeaders });
    } else {
      storage.clearTokens();
      storage.onAuthFailure();
      throw new Error('Authentication failed');
    }
  }

  if (!response.ok) {
    const errorBody = await response.text();
    let parsed;
    try {
      parsed = JSON.parse(errorBody);
    } catch {
      parsed = { message: errorBody || response.statusText };
    }
    throw { status: response.status, ...parsed };
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text);
};

export default customFetch;
