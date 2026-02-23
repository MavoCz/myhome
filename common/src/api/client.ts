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

export const customFetch = async <T>(url: string, options: RequestInit): Promise<T> => {
  const storage = getTokenStorage();

  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const accessToken = storage?.getAccessToken();
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  let response = await fetch(url, { ...options, headers });

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
      response = await fetch(url, { ...options, headers: retryHeaders });
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

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
};

export default customFetch;
