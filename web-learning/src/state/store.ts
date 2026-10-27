import { create } from 'zustand';
import type { ExerciseResultRequest, MyZooResponse } from 'common/src/api/generated/model';
import type { Avatar, ExerciseEvent, ItemId, PlacedObject, Profile, Species, ZooDoc } from './types';
import { today } from './economy';
import { applyOp, canFeed, dailyBonus, newZoo, uid, waterResult, type Op, type WaterResult } from './ops';
import { item } from '../zoo/catalog';
import {
  activeAccount,
  getMyZoo,
  httpStatus,
  listFamilyZoos,
  logout,
  onSessionExpired,
  recordResults,
  saveMyZoo,
  useAccounts,
} from '../api';

export type FeedResult = 'fed' | 'full';
export type { WaterResult } from './ops';

/**
 * - signed-out: no child is active, or the active child's session ran out (a parent signs in again)
 * - new: signed in, but the child has no zoo yet (picks an avatar first)
 * - closed: the server refused the learning module right now (outside the time a parent allowed)
 * - offline: the server is unreachable and nothing is cached on this device yet
 */
export type ZooStatus = 'signed-out' | 'loading' | 'new' | 'ready' | 'closed' | 'offline';

export interface Notice {
  text: string;
  coins: number;
}

interface ZooState {
  /** the active child's zoo first (once it exists), then the siblings' zoos, which are read-only */
  profiles: Profile[];
  activeId: string | null;
  status: ZooStatus;
  /** bonus coins from parents, shown once on the home screen */
  notices: Notice[];

  takeNotices(): Notice[];
  createZoo(avatar: Avatar): void;
  setAvatar(avatar: Avatar): void;
  /** Adds coins for finished exercise work; returns the daily bonus that was added on top, if any. */
  reward(id: string, coins: number, event: ExerciseEvent): number;
  build(id: string, kind: PlacedObject['kind'], x: number, y: number): boolean;
  addAnimal(id: string, species: Species, penId: string): boolean;
  removeObject(id: string, objectId: string): void;
  removeAnimal(id: string, animalId: string): void;
  feed(id: string, animalId: string): FeedResult;
  water(id: string, objectId: string): WaterResult;
}

// ---------- per-child cache and sync ----------

/** What this device knows about the active child's zoo: the last saved server copy plus unsaved ops. */
interface Cache {
  base: ZooDoc | null;
  version: number;
  pending: Op[];
  outbox: ExerciseResultRequest[];
}

const SAVE_DELAY_MS = 1500;
const RETRY_MS = 20_000;
const cacheKey = (userId: number) => `learning-zoo:${userId}`;

function readCache(userId: number): Cache {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (raw) return JSON.parse(raw) as Cache;
  } catch {
    // unreadable cache: start from the server copy
  }
  return { base: null, version: 0, pending: [], outbox: [] };
}

let userId: number | null = null;
let cache: Cache = readCache(-1);
let others: Profile[] = [];
let saving: Promise<void> | null = null;
let sending: Promise<void> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let retryTimer: ReturnType<typeof setTimeout> | undefined;

function writeCache() {
  if (userId === null) return;
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(cache));
  } catch {
    // storage full or blocked: the server copy still gets saved
  }
}

const current = () => cache.pending.reduce<ZooDoc | null>(applyOp, cache.base);

/** Server state is the app's own document; anything without the basic arrays is treated as no zoo. */
function asDoc(state: unknown): ZooDoc | null {
  const d = state as ZooDoc | null;
  return d && Array.isArray(d.objects) && Array.isArray(d.animals) ? d : null;
}

function publish() {
  const doc = current();
  const account = activeAccount();
  const me: Profile[] = doc && account ? [{ ...doc, id: String(account.userId), name: account.displayName }] : [];
  useZoo.setState({ profiles: [...me, ...others], activeId: account ? String(account.userId) : null });
  if (doc && account && account.avatar !== doc.avatar) useAccounts.getState().update(account.userId, { avatar: doc.avatar });
}

function dispatch(op: Op) {
  cache.pending.push(op);
  writeCache();
  publish();
  scheduleSave(SAVE_DELAY_MS);
}

function scheduleSave(ms: number) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void save(), ms);
}

function scheduleRetry() {
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => {
    void save();
    void sendResults();
  }, RETRY_MS);
}

/** Takes the server copy as the new base and replays the unsaved ops on top of it. */
function rebase(server: MyZooResponse) {
  cache.base = asDoc(server.state);
  cache.version = server.version ?? 0;
  const pendingIds = new Set((server.pendingGrants ?? []).map(g => g.id));
  // a grant that is no longer pending was claimed (by this device's lost response, or another tablet)
  cache.pending = cache.pending.filter(op => op.type !== 'grant' || pendingIds.has(op.grantId));
  const known = new Set(cache.pending.flatMap(op => (op.type === 'grant' ? [op.grantId] : [])));
  for (const g of server.pendingGrants ?? []) {
    if (g.id == null || known.has(g.id) || !current()) continue;
    cache.pending.push({ type: 'grant', grantId: g.id, amount: g.amount ?? 0 });
    const notices = useZoo.getState().notices;
    useZoo.setState({ notices: [...notices, { text: g.note ? `Bonus od rodičů: ${g.note}` : 'Bonus od rodičů', coins: g.amount ?? 0 }] });
  }
  writeCache();
  publish();
}

function fail(e: unknown) {
  const status = httpStatus(e);
  if (status === 403) useZoo.setState({ status: 'closed' });
  else if (status === null) scheduleRetry(); // offline or server down; customFetch already handled 401
  else console.error('Learning sync failed', e);
}

async function save() {
  if (saving) return saving;
  const doc = current();
  if (userId === null || !doc || !cache.pending.length) return;
  const owner = userId;
  const sent = cache.pending.length;
  const claimedGrantIds = cache.pending.slice(0, sent).flatMap(op => (op.type === 'grant' ? [op.grantId] : []));
  saving = (async () => {
    try {
      const res = await saveMyZoo({ version: cache.version, state: doc as unknown as Record<string, unknown>, claimedGrantIds });
      if (owner !== userId) return;
      cache.base = doc;
      cache.version = res.version ?? cache.version + 1;
      cache.pending = cache.pending.slice(sent);
      writeCache();
      if (cache.pending.length) scheduleSave(SAVE_DELAY_MS);
    } catch (e) {
      if (owner !== userId) return;
      if (httpStatus(e) === 409) {
        // saved from another tablet in between: take that copy, replay what this one did, try again
        try {
          rebase(await getMyZoo());
          scheduleSave(0);
        } catch (e2) {
          fail(e2);
        }
        return;
      }
      fail(e);
    } finally {
      saving = null;
    }
  })();
  return saving;
}

async function sendResults() {
  if (sending || userId === null || !cache.outbox.length) return;
  const owner = userId;
  const batch = cache.outbox.slice(0, 200);
  sending = (async () => {
    try {
      await recordResults(batch);
      if (owner !== userId) return;
      const sentIds = new Set(batch.map(r => r.clientId));
      cache.outbox = cache.outbox.filter(r => !sentIds.has(r.clientId));
      writeCache();
      if (cache.outbox.length) void sendResults();
    } catch (e) {
      if (owner === userId) fail(e);
    } finally {
      sending = null;
    }
  })();
  return sending;
}

/** Saves what can be saved now; used before switching child and when the tablet goes to sleep. */
export async function flushNow() {
  clearTimeout(saveTimer);
  await Promise.allSettled([save(), sendResults()]);
}

/** Loads the server copy of the active child's zoo (and the siblings'); falls back to this device's cache. */
export async function refresh() {
  const account = activeAccount();
  if (!account) return;
  if (!account.refreshToken) {
    useZoo.setState({ status: 'signed-out' });
    return;
  }
  const owner = account.userId;
  if (!current()) useZoo.setState({ status: 'loading' });
  try {
    const server = await getMyZoo();
    if (owner !== userId) return;
    rebase(server);
    useZoo.setState({ status: current() ? 'ready' : 'new' });
    void flushNow();
  } catch (e) {
    if (owner !== userId) return;
    const status = httpStatus(e);
    if (status === 403) useZoo.setState({ status: 'closed' });
    else if (status === null) {
      useZoo.setState({ status: current() ? 'ready' : 'offline' });
      scheduleRetry();
    } else useZoo.setState({ status: current() ? 'ready' : 'offline' });
    return;
  }
  try {
    const zoos = await listFamilyZoos();
    if (owner !== userId) return;
    others = zoos.flatMap(z => {
      const doc = asDoc(z.state);
      return doc && z.userId !== owner ? [{ ...doc, id: String(z.userId), name: z.displayName ?? '' }] : [];
    });
    publish();
  } catch {
    // siblings' zoos are a nice extra; the child's own zoo works without them
  }
}

/** Makes a signed-in child the active one: saves the previous child's work first, then loads theirs. */
export async function openAccount(next: number) {
  if (userId !== null && userId !== next) await flushNow();
  clearTimeout(retryTimer);
  useAccounts.getState().setActive(next);
  userId = next;
  cache = readCache(next);
  others = [];
  useZoo.setState({ notices: [] });
  publish();
  await refresh();
}

/** Whether the child has work on this device that the server does not have yet. */
export function hasUnsaved(id: number) {
  const c = id === userId ? cache : readCache(id);
  return c.pending.length > 0 || c.outbox.length > 0;
}

/** Signs a child out of this device and forgets the local copy of their zoo. */
export async function forgetAccount(id: number) {
  const account = useAccounts.getState().accounts.find(a => a.userId === id);
  if (id === userId) {
    clearTimeout(saveTimer);
    clearTimeout(retryTimer);
    userId = null;
    cache = readCache(-1);
    others = [];
  }
  try {
    localStorage.removeItem(cacheKey(id));
  } catch {
    // nothing to clean up
  }
  useAccounts.getState().remove(id);
  await logout(account?.refreshToken ?? null);
  if (useAccounts.getState().activeUserId === null) useZoo.setState({ profiles: [], activeId: null, status: 'signed-out' });
}

onSessionExpired(id => {
  if (id === userId) useZoo.setState({ status: 'signed-out' });
});

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void flushNow());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushNow();
    else if (useZoo.getState().status !== 'loading') void refresh();
  });
}

// ---------- the store the screens and the zoo scene use ----------

/** Only the active child's own zoo changes; visits are read-only. */
const mine = (id: string) => (userId !== null && id === String(userId) ? current() : null);

export const useZoo = create<ZooState>()((set, get) => ({
  profiles: [],
  activeId: null,
  // the accounts store hydrates synchronously, so a remembered child starts out loading, not signed out
  status: useAccounts.getState().activeUserId !== null ? 'loading' : 'signed-out',
  notices: [],

  takeNotices() {
    const notices = get().notices;
    if (notices.length) set({ notices: [] });
    return notices;
  },

  createZoo(avatar) {
    if (userId === null || current()) return;
    // first, so bonus coins waiting for the child land on the new zoo
    cache.pending.unshift({ type: 'init', doc: newZoo(avatar) });
    writeCache();
    set({ status: 'ready' });
    publish();
    // grants that waited for the zoo to exist
    void refresh();
  },

  setAvatar(avatar) {
    if (current()) dispatch({ type: 'avatar', avatar });
  },

  reward(id, coins, event) {
    const doc = mine(id);
    if (!doc) return 0;
    const day = today();
    const bonus = dailyBonus(doc, day);
    const { exercise, ...rest } = event;
    cache.outbox.push({ clientId: uid(), exercise, event: rest, coins, solvedAt: new Date().toISOString() });
    dispatch({ type: 'reward', coins, day });
    void sendResults();
    return bonus;
  },

  build(id, kind, x, y) {
    const doc = mine(id);
    if (!doc || doc.coins < item(kind as ItemId).price) return false;
    dispatch({ type: 'build', objectId: uid(), kind, x, y });
    return true;
  },

  addAnimal(id, species, penId) {
    const doc = mine(id);
    if (!doc || doc.coins < item(`animal-${species}`).price) return false;
    dispatch({ type: 'addAnimal', animalId: uid(), species, penId });
    return true;
  },

  removeObject(id, objectId) {
    if (mine(id)) dispatch({ type: 'removeObject', objectId });
  },

  removeAnimal(id, animalId) {
    if (mine(id)) dispatch({ type: 'removeAnimal', animalId });
  },

  feed(id, animalId) {
    const doc = mine(id), at = Date.now();
    if (!doc || !canFeed(doc, animalId, at)) return 'full';
    dispatch({ type: 'feed', animalId, at });
    return 'fed';
  },

  water(id, objectId) {
    const doc = mine(id), at = Date.now();
    if (!doc) return 'wait';
    const result = waterResult(doc, objectId, at);
    if (result === 'grew') dispatch({ type: 'water', objectId, at });
    return result;
  },
}));

export const getProfile = (id: string) => useZoo.getState().profiles.find(p => p.id === id);
