import type { ExerciseEvent } from './types';

// All the numbers that decide how fast the zoo grows live here.

export const START_COINS = 40;
export const DAILY_BONUS = 5;
/** an animal can be fed again after this long */
export const FEED_COOLDOWN_MS = 30 * 60 * 1000;
/** a flower grows one stage per watering, at most this often */
export const WATER_COOLDOWN_MS = 20 * 60 * 1000;
export const REFUND_RATE = 0.5;

export interface Reward {
  coins: number;
  label: string;
}

/** Coins for one finished piece of work. Effort counts, speed does not. */
export function rewardFor(e: ExerciseEvent): Reward {
  if (e.kind === 'problem') {
    let coins = 1;
    if (e.mistakes === 0) coins += 1;
    if (e.carry) coins += 1;
    return { coins, label: e.mistakes === 0 ? 'Příklad bez chyby' : 'Příklad vyřešen' };
  }
  let coins = e.correct;
  if (e.correct === e.total) coins += 5;
  if (e.retry) coins += 3;
  return { coins, label: e.retry ? 'Opravené chyby' : `Kolo: ${e.correct} z ${e.total}` };
}

export function today(now = Date.now()): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Czech plural for the currency: 1 bodík, 2–4 bodíky, 5+ bodíků */
export function coinsWord(n: number): string {
  const a = Math.abs(n);
  if (a === 1) return 'bodík';
  if (a >= 2 && a <= 4) return 'bodíky';
  return 'bodíků';
}
