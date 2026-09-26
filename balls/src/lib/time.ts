/** Date/time helpers. All times are the device's local time. */

export const now = () => new Date();

export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

export function startOfDay(d: Date = now()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function addMinutes(d: Date, n: number): Date {
  return new Date(d.getTime() + n * MIN);
}

/** YYYY-MM-DD in local time. */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** A local date at a given hour (fractional hours allowed). */
export function at(day: Date, hour: number): Date {
  const x = startOfDay(day);
  x.setMinutes(Math.round(hour * 60));
  return x;
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY);
}

export const isSameDay = (a: Date, b: Date) => dateKey(a) === dateKey(b);

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WD_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const weekday = (d: Date) => WEEKDAYS[d.getDay()];
export const weekdayShort = (d: Date) => WD_SHORT[d.getDay()];
export const monthShort = (d: Date) => MONTHS[d.getMonth()];

const pad = (n: number) => String(n).padStart(2, '0');

/** 19:00 (24-hour, as used across the UK). */
export function fmtTime(d: Date | string): string {
  const x = typeof d === 'string' ? new Date(d) : d;
  return `${pad(x.getHours())}:${pad(x.getMinutes())}`;
}

/** Same as fmtTime; kept for call sites that used to drop ":00". */
export const fmtTimeShort = fmtTime;

/** 19:00–20:00 */
export function fmtRange(start: Date | string, end: Date | string): string {
  return `${fmtTime(start)}–${fmtTime(end)}`;
}

/** Tonight / Today / Tomorrow / Saturday / Sat 4 Oct */
export function fmtDay(d: Date | string, opts: { tonight?: boolean } = {}): string {
  const x = typeof d === 'string' ? new Date(d) : d;
  const diff = daysBetween(now(), x);
  if (diff === 0) return opts.tonight !== false && x.getHours() >= 17 ? 'Tonight' : 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 7) return weekday(x);
  return `${weekdayShort(x)} ${x.getDate()} ${monthShort(x)}`;
}

/** Saturday 4 October */
export function fmtLongDate(d: Date | string): string {
  const x = typeof d === 'string' ? new Date(d) : d;
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${weekday(x)} ${x.getDate()} ${months[x.getMonth()]}`;
}

/** 4 Oct */
export function fmtShortDate(d: Date | string): string {
  const x = typeof d === 'string' ? new Date(d) : d;
  return `${x.getDate()} ${monthShort(x)}`;
}

/** Tonight · 7:00 PM */
export function fmtWhen(start: Date | string): string {
  return `${fmtDay(start)} · ${fmtTime(start)}`;
}

/** 2h 14m / 3 days */
export function fmtCountdown(target: Date | string, from: Date = now()): string {
  const t = (typeof target === 'string' ? new Date(target) : target).getTime() - from.getTime();
  if (t <= 0) return 'now';
  const mins = Math.floor(t / MIN);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}${hours % 24 ? ` ${hours % 24}h` : ''}`;
}

/** 5m ago / 3h ago / 2d ago / 4 Oct */
export function timeAgo(d: Date | string): string {
  const t = now().getTime() - (typeof d === 'string' ? new Date(d) : d).getTime();
  if (t < MIN) return 'Just now';
  if (t < HOUR) return `${Math.floor(t / MIN)}m ago`;
  if (t < DAY) return `${Math.floor(t / HOUR)}h ago`;
  if (t < 7 * DAY) return `${Math.floor(t / DAY)}d ago`;
  return fmtShortDate(d);
}

export function fmtDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = mins / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)} hr${h === 1 ? '' : 's'}`;
}

/** Hour number to label: 19 → "19:00", 19.5 → "19:30" */
export function hourLabel(h: number): string {
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  return `${pad(whole % 24)}:${pad(mins)}`;
}

export function greeting(d: Date = now()): string {
  const h = d.getHours();
  if (h < 5) return 'Good evening';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
