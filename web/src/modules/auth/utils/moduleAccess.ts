import { modules } from '../../registry';
import type { ModuleAccessResponse, ScheduleRequest, ScheduleResponse } from '../../../../../common/src/api/generated/model';

export type Permission = 'ACCESS' | 'MANAGE';

export const PERMISSIONS: { value: Permission; label: string }[] = [
  { value: 'ACCESS', label: 'Access' },
  { value: 'MANAGE', label: 'Manage' },
];

/** ISO day numbers as the backend stores them: 1 = Monday ... 7 = Sunday. */
export const DAYS: { value: number; short: string }[] = [
  { value: 1, short: 'Mon' },
  { value: 2, short: 'Tue' },
  { value: 3, short: 'Wed' },
  { value: 4, short: 'Thu' },
  { value: 5, short: 'Fri' },
  { value: 6, short: 'Sat' },
  { value: 7, short: 'Sun' },
];

/** Modules an admin can grant: every registered web module except the family module itself. */
export function grantableModules() {
  return modules.filter((m) => m.id !== 'family');
}

export function moduleLabel(moduleName: string | undefined): string {
  return modules.find((m) => m.id === moduleName)?.name ?? moduleName ?? '';
}

export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function isValidTimeZone(tz: string): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** A weekly window as edited in the form: the same start/end time on a set of days. */
export interface ScheduleWindow {
  days: number[];
  start: string; // HH:mm
  end: string; // HH:mm
}

/** Groups per-day backend schedules into windows that share start, end and timezone. */
export function groupSchedules(schedules: ScheduleResponse[] = []): (ScheduleWindow & { timezone: string })[] {
  const groups = new Map<string, ScheduleWindow & { timezone: string }>();
  for (const s of schedules) {
    const start = (s.startTime ?? '').slice(0, 5);
    const end = (s.endTime ?? '').slice(0, 5);
    const timezone = s.timezone ?? 'UTC';
    const key = `${start}|${end}|${timezone}`;
    const group = groups.get(key) ?? { days: [], start, end, timezone };
    if (s.dayOfWeek != null && !group.days.includes(s.dayOfWeek)) group.days.push(s.dayOfWeek);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((g) => ({ ...g, days: [...g.days].sort((a, b) => a - b) }))
    .sort((a, b) => a.days[0] - b.days[0] || a.start.localeCompare(b.start));
}

/** Expands form windows into the one-row-per-day schedules the backend expects. */
export function toScheduleRequests(windows: ScheduleWindow[], timezone: string): ScheduleRequest[] {
  return windows.flatMap((w) =>
    [...w.days]
      .sort((a, b) => a - b)
      .map((day) => ({ dayOfWeek: day, startTime: w.start, endTime: w.end, timezone })),
  );
}

/** "Mon–Fri", "Mon, Wed, Fri", "Sat, Sun", "Every day". */
export function formatDays(days: number[]): string {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (sorted.length === 7) return 'Every day';
  const runs: number[][] = [];
  for (const d of sorted) {
    const last = runs[runs.length - 1];
    if (last && last[last.length - 1] === d - 1) last.push(d);
    else runs.push([d]);
  }
  const name = (d: number) => DAYS[d - 1]?.short ?? String(d);
  return runs
    .map((run) =>
      run.length >= 3 ? `${name(run[0])}–${name(run[run.length - 1])}` : run.map(name).join(', '),
    )
    .join(', ');
}

/** One line per window, e.g. "Mon–Fri 15:00–18:00 Europe/Prague". */
export function formatSchedules(schedules: ScheduleResponse[] = []): string[] {
  return groupSchedules(schedules).map((g) => `${formatDays(g.days)} ${g.start}–${g.end} ${g.timezone}`);
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatValidity(grant: Pick<ModuleAccessResponse, 'validFrom' | 'validUntil'>): string {
  const { validFrom, validUntil } = grant;
  if (validFrom && validUntil) return `${formatDateTime(validFrom)} – ${formatDateTime(validUntil)}`;
  if (validFrom) return `From ${formatDateTime(validFrom)}`;
  if (validUntil) return `Until ${formatDateTime(validUntil)}`;
  return 'No time limit';
}

/** ISO instant -> value for an <input type="datetime-local"> in the browser's timezone. */
export function toLocalInput(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** <input type="datetime-local"> value (browser's timezone) -> ISO instant, or undefined when empty. */
export function fromLocalInput(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

/** Turns an error thrown by customFetch ({ status, message?, error? }) into something readable. */
export function describeError(err: unknown, fallback: string): string {
  const e = (err ?? {}) as { status?: number; message?: string };
  if (e.status === 403) return 'Only family admins can manage module access.';
  if (e.status === 401) return 'Your session has expired. Please sign in again.';
  if (e.status && e.status >= 500) return `${fallback} (server error ${e.status}).`;
  if (e.message) return e.message;
  return e.status ? `${fallback} (HTTP ${e.status}).` : `${fallback}.`;
}
