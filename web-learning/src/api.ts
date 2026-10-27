import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { customFetch, setTokenStorage } from 'common';
import type {
  AuthResponse,
  ExerciseResultRequest,
  MyZooResponse,
  SaveZooRequest,
  SaveZooResponse,
  ZooResponse,
} from 'common/src/api/generated/model';
import type { Avatar } from './state/types';

/** A child signed in on this device. Several can be, so switching is just a tap on the avatar. */
export interface Account {
  userId: number;
  displayName: string;
  accessToken: string | null;
  refreshToken: string | null;
  /** last known avatar, for the profile picker */
  avatar?: Avatar;
}

interface AccountsState {
  accounts: Account[];
  activeUserId: number | null;
  setActive(userId: number | null): void;
  upsert(account: Account): void;
  update(userId: number, patch: Partial<Account>): void;
  remove(userId: number): void;
}

// Own storage key: signing a child in here never signs anybody in to the myhome web app (auth-storage)
export const useAccounts = create<AccountsState>()(
  persist(
    set => ({
      accounts: [],
      activeUserId: null,
      setActive: userId => set({ activeUserId: userId }),
      upsert: account =>
        set(s => ({
          accounts: s.accounts.some(a => a.userId === account.userId)
            ? s.accounts.map(a => (a.userId === account.userId ? { ...a, ...account } : a))
            : [...s.accounts, account],
        })),
      update: (userId, patch) => set(s => ({ accounts: s.accounts.map(a => (a.userId === userId ? { ...a, ...patch } : a)) })),
      remove: userId =>
        set(s => ({
          accounts: s.accounts.filter(a => a.userId !== userId),
          activeUserId: s.activeUserId === userId ? null : s.activeUserId,
        })),
    }),
    { name: 'learning-accounts', version: 1, storage: createJSONStorage(() => localStorage) },
  ),
);

export const activeAccount = () => {
  const s = useAccounts.getState();
  return s.accounts.find(a => a.userId === s.activeUserId) ?? null;
};

let sessionExpired: (userId: number) => void = () => {};
/** Called when the active child's refresh token stopped working; a parent has to sign them in again. */
export function onSessionExpired(fn: (userId: number) => void) {
  sessionExpired = fn;
}

// customFetch always talks as the active child
setTokenStorage({
  getAccessToken: () => activeAccount()?.accessToken ?? null,
  getRefreshToken: () => activeAccount()?.refreshToken ?? null,
  setTokens: (accessToken, refreshToken) => {
    const a = activeAccount();
    if (a) useAccounts.getState().update(a.userId, { accessToken, refreshToken });
  },
  clearTokens: () => {
    const a = activeAccount();
    if (a) useAccounts.getState().update(a.userId, { accessToken: null, refreshToken: null });
  },
  onAuthFailure: () => {
    const a = activeAccount();
    if (a) sessionExpired(a.userId);
  },
});

/** The error customFetch throws for a non-2xx response; network failures throw a TypeError instead. */
export const httpStatus = (e: unknown): number | null =>
  e && typeof e === 'object' && 'status' in e && typeof e.status === 'number' ? e.status : null;

export type LoginResult = { ok: true; account: Account } | { ok: false; reason: 'credentials' | 'not-child' | 'network' };

// Plain fetch on purpose: customFetch would try to refresh the *active* child's token on a wrong password
export async function login(email: string, password: string): Promise<LoginResult> {
  let res: Response;
  try {
    res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    });
  } catch {
    return { ok: false, reason: 'network' };
  }
  if (!res.ok) return { ok: false, reason: res.status >= 500 ? 'network' : 'credentials' };
  const auth = (await res.json()) as AuthResponse;
  if (auth.user?.familyRole !== 'CHILD') {
    await logout(auth.refreshToken ?? null);
    return { ok: false, reason: 'not-child' };
  }
  return {
    ok: true,
    account: {
      userId: auth.user.id!,
      displayName: auth.user.displayName ?? '',
      accessToken: auth.accessToken ?? null,
      refreshToken: auth.refreshToken ?? null,
    },
  };
}

export async function logout(refreshToken: string | null) {
  if (!refreshToken) return;
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // the token expires on its own
  }
}

export const getMyZoo = () => customFetch<MyZooResponse>('/api/learning/zoo');

export const saveMyZoo = (body: SaveZooRequest) =>
  customFetch<SaveZooResponse>('/api/learning/zoo', { method: 'PUT', body: JSON.stringify(body) });

export const listFamilyZoos = () => customFetch<ZooResponse[]>('/api/learning/zoos');

export const recordResults = (results: ExerciseResultRequest[]) =>
  customFetch<void>('/api/learning/results', { method: 'POST', body: JSON.stringify({ results }) });
