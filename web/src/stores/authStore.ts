import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setTokenStorage, type TokenStorage } from 'common';

export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
  familyId: number;
  familyName: string;
  familyRole: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setAuth: (accessToken: string, refreshToken: string, user: AuthUser) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      setAuth: (accessToken, refreshToken, user) =>
        set({ accessToken, refreshToken, user, isAuthenticated: true }),
      clearAuth: () =>
        set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    },
  ),
);

// Wire up token storage so the API client reads tokens from the store
const storeTokenStorage: TokenStorage = {
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  setTokens: (accessToken: string, refreshToken: string) => {
    useAuthStore.setState({ accessToken, refreshToken });
  },
  clearTokens: () => {
    useAuthStore.getState().clearAuth();
  },
  onAuthFailure: () => {
    useAuthStore.getState().clearAuth();
  },
};

setTokenStorage(storeTokenStorage);
