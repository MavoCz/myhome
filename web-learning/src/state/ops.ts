import type { Avatar, PlacedObject, Species, ZooDoc } from './types';
import { DAILY_BONUS, FEED_COOLDOWN_MS, REFUND_RATE, START_COINS, WATER_COOLDOWN_MS } from './economy';
import { item } from '../zoo/catalog';

// crypto.randomUUID only exists on https/localhost, and the tablet may open the dev server over plain http
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/**
 * One change to a zoo. Ids and times are fixed when the child acts, so replaying the same ops on a newer
 * server copy (after a conflict) gives the same result. An op that no longer fits is simply skipped.
 */
export type Op =
  | { type: 'init'; doc: ZooDoc }
  | { type: 'avatar'; avatar: Avatar }
  | { type: 'reward'; coins: number; day: string }
  | { type: 'grant'; grantId: number; amount: number }
  | { type: 'build'; objectId: string; kind: PlacedObject['kind']; x: number; y: number }
  | { type: 'addAnimal'; animalId: string; species: Species; penId: string }
  | { type: 'removeObject'; objectId: string }
  | { type: 'removeAnimal'; animalId: string }
  | { type: 'feed'; animalId: string; at: number }
  | { type: 'water'; objectId: string; at: number };

function starterObjects(): PlacedObject[] {
  const objects: PlacedObject[] = [];
  for (let y = 13; y <= 16; y++) objects.push({ id: uid(), kind: 'path', x: 12, y });
  objects.push({ id: uid(), kind: 'tree', x: 1, y: 1 });
  objects.push({ id: uid(), kind: 'tree', x: 22, y: 2 });
  objects.push({ id: uid(), kind: 'flowerbed', x: 10, y: 15, stage: 0 });
  return objects;
}

export function newZoo(avatar: Avatar, now = Date.now()): ZooDoc {
  return { schema: 1, avatar, coins: START_COINS, earned: 0, objects: starterObjects(), animals: [], createdAt: now };
}

export const dailyBonus = (doc: ZooDoc, day: string) => (doc.lastExerciseDay === day ? 0 : DAILY_BONUS);

export const canFeed = (doc: ZooDoc, animalId: string, at: number) => {
  const a = doc.animals.find(x => x.id === animalId);
  return !!a && !(a.lastFed && at - a.lastFed < FEED_COOLDOWN_MS);
};

export type WaterResult = 'grew' | 'wait' | 'bloom';

export function waterResult(doc: ZooDoc, objectId: string, at: number): WaterResult {
  const o = doc.objects.find(x => x.id === objectId);
  if (!o) return 'wait';
  if ((o.stage ?? 0) >= 3) return 'bloom';
  if (o.lastWatered && at - o.lastWatered < WATER_COOLDOWN_MS) return 'wait';
  return 'grew';
}

const priceOf = (id: Parameters<typeof item>[0]) => item(id).price;

export function applyOp(doc: ZooDoc | null, op: Op): ZooDoc | null {
  if (op.type === 'init') return doc ?? op.doc;
  if (!doc) return null;
  switch (op.type) {
    case 'avatar':
      return { ...doc, avatar: op.avatar };
    case 'reward': {
      const total = op.coins + dailyBonus(doc, op.day);
      return { ...doc, coins: doc.coins + total, earned: doc.earned + total, lastExerciseDay: op.day };
    }
    case 'grant':
      return { ...doc, coins: doc.coins + op.amount, earned: doc.earned + op.amount };
    case 'build': {
      const price = priceOf(op.kind);
      if (doc.coins < price) return doc;
      const obj: PlacedObject = { id: op.objectId, kind: op.kind, x: op.x, y: op.y };
      if (op.kind === 'flowerbed') obj.stage = 0;
      return { ...doc, coins: doc.coins - price, objects: [...doc.objects, obj] };
    }
    case 'addAnimal': {
      const price = priceOf(`animal-${op.species}`);
      if (doc.coins < price || !doc.objects.some(o => o.id === op.penId)) return doc;
      return { ...doc, coins: doc.coins - price, animals: [...doc.animals, { id: op.animalId, species: op.species, penId: op.penId, joy: 0 }] };
    }
    case 'removeObject': {
      const obj = doc.objects.find(o => o.id === op.objectId);
      if (!obj || doc.animals.some(a => a.penId === op.objectId)) return doc;
      const refund = Math.floor(priceOf(obj.kind) * REFUND_RATE);
      return { ...doc, coins: doc.coins + refund, objects: doc.objects.filter(o => o.id !== op.objectId) };
    }
    case 'removeAnimal': {
      const a = doc.animals.find(x => x.id === op.animalId);
      if (!a) return doc;
      const refund = Math.floor(priceOf(`animal-${a.species}`) * REFUND_RATE);
      return { ...doc, coins: doc.coins + refund, animals: doc.animals.filter(x => x.id !== op.animalId) };
    }
    case 'feed':
      if (!canFeed(doc, op.animalId, op.at)) return doc;
      return { ...doc, animals: doc.animals.map(x => (x.id === op.animalId ? { ...x, lastFed: op.at, joy: x.joy + 1 } : x)) };
    case 'water':
      if (waterResult(doc, op.objectId, op.at) !== 'grew') return doc;
      return {
        ...doc,
        objects: doc.objects.map(x => (x.id === op.objectId ? { ...x, stage: (x.stage ?? 0) + 1, lastWatered: op.at } : x)),
      };
  }
}
