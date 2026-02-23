export interface TokenStorage {
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  setTokens(accessToken: string, refreshToken: string): void;
  clearTokens(): void;
  onAuthFailure(): void;
}

let tokenStorage: TokenStorage | null = null;

export function setTokenStorage(storage: TokenStorage): void {
  tokenStorage = storage;
}

export function getTokenStorage(): TokenStorage | null {
  return tokenStorage;
}

export class LocalStorageTokenStorage implements TokenStorage {
  private static ACCESS_KEY = 'auth_access_token';
  private static REFRESH_KEY = 'auth_refresh_token';
  private authFailureCallback: () => void;

  constructor(onAuthFailure: () => void) {
    this.authFailureCallback = onAuthFailure;
  }

  getAccessToken(): string | null {
    return localStorage.getItem(LocalStorageTokenStorage.ACCESS_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(LocalStorageTokenStorage.REFRESH_KEY);
  }

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(LocalStorageTokenStorage.ACCESS_KEY, accessToken);
    localStorage.setItem(LocalStorageTokenStorage.REFRESH_KEY, refreshToken);
  }

  clearTokens(): void {
    localStorage.removeItem(LocalStorageTokenStorage.ACCESS_KEY);
    localStorage.removeItem(LocalStorageTokenStorage.REFRESH_KEY);
  }

  onAuthFailure(): void {
    this.authFailureCallback();
  }
}
