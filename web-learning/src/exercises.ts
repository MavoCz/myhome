import type { ExerciseEvent, RoundExerciseId } from './state/types';

export type ExerciseId = 'scitani' | RoundExerciseId;

const ROUND_EXERCISES: readonly string[] = ['vyjmenovana', 'souhlasky', 'parove', 'bje', 'koncovky', 'uu', 'predpony', 'nasobilka'];

export interface ExerciseInfo {
  id: ExerciseId;
  title: string;
  subject: string;
  desc: string;
  src: string;
}

export const EXERCISES: ExerciseInfo[] = [
  { id: 'scitani', title: 'Sčítání pod sebou', subject: 'Matematika', desc: 'Čísla do 100, s přechodem přes desítku', src: 'exercises/scitani/index.html' },
  { id: 'vyjmenovana', title: 'Vyjmenovaná slova', subject: 'Čeština', desc: 'i nebo y po B, L, M, P, S, V, Z', src: 'exercises/vyjmenovana/index.html' },
  { id: 'souhlasky', title: 'Měkké a tvrdé i/y', subject: 'Čeština', desc: 'i nebo y po h, ch, k, r, ž, š, č, ř, c, j, d, t, n', src: 'exercises/souhlasky/index.html' },
  { id: 'parove', title: 'Párové souhlásky', subject: 'Čeština', desc: 'b–p, d–t, ď–ť, v–f, h–ch, z–s, ž–š', src: 'exercises/parove/index.html' },
  { id: 'bje', title: 'bě, bje, vě, vje, mě, mně', subject: 'Čeština', desc: 'Slabiky se ě a je', src: 'exercises/bje/index.html' },
  { id: 'koncovky', title: 'i/y v koncovkách', subject: 'Čeština', desc: 'Podstatná jména, přídavná jména, slovesa', src: 'exercises/koncovky/index.html' },
  { id: 'uu', title: 'Ú nebo Ů', subject: 'Čeština', desc: 'ú na začátku, ů uprostřed slova', src: 'exercises/uu/index.html' },
  { id: 'predpony', title: 's, z, vz v předponách', subject: 'Čeština', desc: 'sbalit, zmenšit, vzlétnout', src: 'exercises/predpony/index.html' },
  { id: 'nasobilka', title: 'Násobilka', subject: 'Matematika', desc: 'Násobení a dělení do 100', src: 'exercises/nasobilka/index.html' },
];

/** The message an exercise page posts to the app when a piece of work is finished. */
export const MESSAGE_SOURCE = 'skolni-zoo-exercise';

const count = (v: unknown, max: number) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max ? v : null);

/** Accepts only well-formed events, so a broken page cannot hand out arbitrary coins. */
export function parseExerciseMessage(data: unknown): ExerciseEvent | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (d.source !== MESSAGE_SOURCE || d.type !== 'reward') return null;
  const e = d.event as Record<string, unknown> | undefined;
  if (!e) return null;
  if (d.exercise === 'scitani' && e.kind === 'problem') {
    const mistakes = count(e.mistakes, 1000);
    if (mistakes === null) return null;
    return { exercise: 'scitani', kind: 'problem', mistakes, carry: e.carry === true };
  }
  if (typeof d.exercise === 'string' && ROUND_EXERCISES.includes(d.exercise) && e.kind === 'round') {
    const total = count(e.total, 50), correct = count(e.correct, 50);
    if (total === null || correct === null || correct > total || total === 0) return null;
    return { exercise: d.exercise as RoundExerciseId, kind: 'round', correct, total, retry: e.retry === true };
  }
  return null;
}
