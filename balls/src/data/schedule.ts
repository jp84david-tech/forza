import { addDays, addMinutes, at, now, startOfDay } from '../lib/time';

/**
 * Mock data is scheduled relative to "now" so the prototype always shows
 * realistic upcoming activity. A slot that has already started today rolls
 * forward to the same time tomorrow.
 */
export function slot(dayOffset: number, hour: number, durationMins = 60, opts: { allowPast?: boolean } = {}) {
  let start = at(addDays(startOfDay(), dayOffset), hour);
  if (!opts.allowPast && start.getTime() < now().getTime() + 20 * 60_000) start = addDays(start, 1);
  const end = addMinutes(start, durationMins);
  return { start: start.toISOString(), end: end.toISOString() };
}

/** Days until the next given weekday (0 = Sunday). Never 0. */
export function daysUntil(weekday: number): number {
  const d = (weekday - now().getDay() + 7) % 7;
  return d === 0 ? 7 : d;
}

export const ago = (days: number, hour = 12) => at(addDays(startOfDay(), -days), hour).toISOString();
export const minsAgo = (mins: number) => new Date(now().getTime() - mins * 60_000).toISOString();
