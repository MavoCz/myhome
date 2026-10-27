import type { PlacedObject, Profile } from '../state/types';
import { item } from './catalog';

export const TILE = 64;
export const COLS = 26;
export const ROWS = 18;

/** entrance gate across the bottom edge; the middle tile is the way in */
export const GATE = { x: 11, y: ROWS - 1, w: 3 };
export const SPAWN = { x: 12, y: ROWS - 3 };

export interface Tile {
  x: number;
  y: number;
}

export const inWorld = (x: number, y: number) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
export const tileCenter = (t: Tile) => ({ x: t.x * TILE + TILE / 2, y: t.y * TILE + TILE / 2 });
export const tileAt = (wx: number, wy: number): Tile => ({ x: Math.floor(wx / TILE), y: Math.floor(wy / TILE) });

const isGate = (x: number, y: number) => y === GATE.y && x >= GATE.x && x < GATE.x + GATE.w;
const isReserved = (x: number, y: number) => isGate(x, y) || (x === SPAWN.x && y === SPAWN.y);

/** What stands on each tile, rebuilt from the profile whenever it changes. */
export class ZooGrid {
  readonly objectAt: (PlacedObject | null)[] = new Array(COLS * ROWS).fill(null);
  readonly path: boolean[] = new Array(COLS * ROWS).fill(false);

  constructor(profile: Profile) {
    for (const o of profile.objects) {
      if (o.kind === 'path') {
        if (inWorld(o.x, o.y)) this.path[o.y * COLS + o.x] = true;
        continue;
      }
      const it = item(o.kind);
      for (let dy = 0; dy < it.h; dy++) {
        for (let dx = 0; dx < it.w; dx++) {
          const x = o.x + dx, y = o.y + dy;
          if (inWorld(x, y)) this.objectAt[y * COLS + x] = o;
        }
      }
    }
  }

  object(x: number, y: number): PlacedObject | null {
    return inWorld(x, y) ? this.objectAt[y * COLS + x] : null;
  }

  isPath(x: number, y: number): boolean {
    return inWorld(x, y) && this.path[y * COLS + x];
  }

  walkable(x: number, y: number): boolean {
    if (isGate(x, y)) return x === GATE.x + 1;
    if (!inWorld(x, y)) return false;
    const o = this.objectAt[y * COLS + x];
    return !o || !item(o.kind).blocks;
  }

  /** Why the footprint cannot be built here, or null when it can. */
  blockedReason(kind: PlacedObject['kind'], x: number, y: number, avatar?: Tile): string | null {
    const it = item(kind);
    for (let dy = 0; dy < it.h; dy++) {
      for (let dx = 0; dx < it.w; dx++) {
        const tx = x + dx, ty = y + dy;
        if (!inWorld(tx, ty)) return 'Tohle už je mimo zoo.';
        if (isReserved(tx, ty)) return 'U vchodu musí zůstat volno.';
        if (this.objectAt[ty * COLS + tx]) return 'Tady už něco stojí.';
        if (this.path[ty * COLS + tx]) {
          return kind === 'path' ? 'Tady už cestička je.' : 'Na cestičku se nedá stavět.';
        }
        if (avatar && kind !== 'path' && avatar.x === tx && avatar.y === ty) return 'Tady zrovna stojíš.';
      }
    }
    return null;
  }
}

/** Footprint top-left so that the tapped tile sits in its middle. */
export function footprintAt(kind: PlacedObject['kind'], t: Tile): Tile {
  const it = item(kind);
  return { x: t.x - Math.floor((it.w - 1) / 2), y: t.y - Math.floor((it.h - 1) / 2) };
}
