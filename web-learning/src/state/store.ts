import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Avatar, ItemId, PlacedObject, Profile, Species } from './types';
import { DAILY_BONUS, FEED_COOLDOWN_MS, REFUND_RATE, START_COINS, WATER_COOLDOWN_MS, today } from './economy';
import { item } from '../zoo/catalog';

// crypto.randomUUID only exists on https/localhost, and the tablet may open the dev server over plain http
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export type FeedResult = 'fed' | 'full';
export type WaterResult = 'grew' | 'wait' | 'bloom';

interface ZooState {
  profiles: Profile[];
  activeId: string | null;

  setActive(id: string | null): void;
  createProfile(name: string, avatar: Avatar): string;
  updateProfile(id: string, patch: Partial<Pick<Profile, 'name' | 'avatar'>>): void;
  deleteProfile(id: string): void;

  /** Adds coins for finished exercise work; returns the daily bonus that was added on top, if any. */
  reward(id: string, coins: number): number;
  build(id: string, kind: PlacedObject['kind'], x: number, y: number): boolean;
  addAnimal(id: string, species: Species, penId: string): boolean;
  removeObject(id: string, objectId: string): void;
  removeAnimal(id: string, animalId: string): void;
  feed(id: string, animalId: string): FeedResult;
  water(id: string, objectId: string): WaterResult;

  importBackup(json: string): number;
}

function starterObjects(): PlacedObject[] {
  const objects: PlacedObject[] = [];
  for (let y = 13; y <= 16; y++) objects.push({ id: uid(), kind: 'path', x: 12, y });
  objects.push({ id: uid(), kind: 'tree', x: 1, y: 1 });
  objects.push({ id: uid(), kind: 'tree', x: 22, y: 2 });
  objects.push({ id: uid(), kind: 'flowerbed', x: 10, y: 15, stage: 0 });
  return objects;
}

const priceOf = (id: ItemId) => item(id).price;

export const useZoo = create<ZooState>()(
  persist(
    (set, get) => {
      const patch = (id: string, fn: (p: Profile) => Profile | null) => {
        let changed = false;
        set(s => ({
          profiles: s.profiles.map(p => {
            if (p.id !== id) return p;
            const next = fn(p);
            if (!next) return p;
            changed = true;
            return next;
          }),
        }));
        return changed;
      };

      return {
        profiles: [],
        activeId: null,

        setActive: id => set({ activeId: id }),

        createProfile(name, avatar) {
          const profile: Profile = {
            id: uid(),
            name: name.trim() || 'Bez jména',
            avatar,
            coins: START_COINS,
            earned: 0,
            objects: starterObjects(),
            animals: [],
            createdAt: Date.now(),
          };
          set(s => ({ profiles: [...s.profiles, profile], activeId: profile.id }));
          return profile.id;
        },

        updateProfile(id, changes) {
          patch(id, p => ({ ...p, ...changes, name: (changes.name ?? p.name).trim() || p.name }));
        },

        deleteProfile(id) {
          set(s => ({ profiles: s.profiles.filter(p => p.id !== id), activeId: s.activeId === id ? null : s.activeId }));
        },

        reward(id, coins) {
          let bonus = 0;
          patch(id, p => {
            const day = today();
            bonus = p.lastExerciseDay === day ? 0 : DAILY_BONUS;
            const total = coins + bonus;
            return { ...p, coins: p.coins + total, earned: p.earned + total, lastExerciseDay: day };
          });
          return bonus;
        },

        build(id, kind, x, y) {
          return patch(id, p => {
            const price = priceOf(kind);
            if (p.coins < price) return null;
            const obj: PlacedObject = { id: uid(), kind, x, y };
            if (kind === 'flowerbed') obj.stage = 0;
            return { ...p, coins: p.coins - price, objects: [...p.objects, obj] };
          });
        },

        addAnimal(id, species, penId) {
          return patch(id, p => {
            const price = priceOf(`animal-${species}`);
            if (p.coins < price) return null;
            return { ...p, coins: p.coins - price, animals: [...p.animals, { id: uid(), species, penId, joy: 0 }] };
          });
        },

        removeObject(id, objectId) {
          patch(id, p => {
            const obj = p.objects.find(o => o.id === objectId);
            if (!obj) return null;
            if (p.animals.some(a => a.penId === objectId)) return null;
            const refund = Math.floor(priceOf(obj.kind) * REFUND_RATE);
            return { ...p, coins: p.coins + refund, objects: p.objects.filter(o => o.id !== objectId) };
          });
        },

        removeAnimal(id, animalId) {
          patch(id, p => {
            const a = p.animals.find(x => x.id === animalId);
            if (!a) return null;
            const refund = Math.floor(priceOf(`animal-${a.species}`) * REFUND_RATE);
            return { ...p, coins: p.coins + refund, animals: p.animals.filter(x => x.id !== animalId) };
          });
        },

        feed(id, animalId) {
          const now = Date.now();
          const a = get().profiles.find(p => p.id === id)?.animals.find(x => x.id === animalId);
          if (!a || (a.lastFed && now - a.lastFed < FEED_COOLDOWN_MS)) return 'full';
          patch(id, p => ({
            ...p,
            animals: p.animals.map(x => (x.id === animalId ? { ...x, lastFed: now, joy: x.joy + 1 } : x)),
          }));
          return 'fed';
        },

        water(id, objectId) {
          const now = Date.now();
          const o = get().profiles.find(p => p.id === id)?.objects.find(x => x.id === objectId);
          if (!o) return 'wait';
          if ((o.stage ?? 0) >= 3) return 'bloom';
          if (o.lastWatered && now - o.lastWatered < WATER_COOLDOWN_MS) return 'wait';
          patch(id, p => ({
            ...p,
            objects: p.objects.map(x => (x.id === objectId ? { ...x, stage: (x.stage ?? 0) + 1, lastWatered: now } : x)),
          }));
          return 'grew';
        },

        importBackup(json) {
          const data = JSON.parse(json) as { profiles?: Profile[] };
          if (!Array.isArray(data.profiles)) throw new Error('V souboru nejsou žádné profily.');
          const valid = data.profiles.filter(p => p && typeof p.id === 'string' && typeof p.name === 'string' && Array.isArray(p.objects));
          set(s => ({ profiles: [...s.profiles.filter(p => !valid.some(v => v.id === p.id)), ...valid] }));
          return valid.length;
        },
      };
    },
    {
      name: 'skolni-zoo',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: s => ({ profiles: s.profiles, activeId: s.activeId }),
    },
  ),
);

export const getProfile = (id: string) => useZoo.getState().profiles.find(p => p.id === id);

export function exportBackup(): string {
  return JSON.stringify({ app: 'skolni-zoo', version: 1, exportedAt: new Date().toISOString(), profiles: useZoo.getState().profiles }, null, 2);
}
