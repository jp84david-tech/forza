/** Money is stored in pence. £40 → "£40", £4.50 → "£4.50". */
export function money(pence: number, opts: { exact?: boolean; free?: boolean } = {}): string {
  if (pence === 0 && opts.free !== false) return 'Free';
  const pounds = pence / 100;
  const whole = Number.isInteger(pounds);
  const s = whole && !opts.exact ? pounds.toLocaleString('en-GB') : pounds.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${pence < 0 ? '-' : ''}£${s.replace('-', '')}`;
}

export const moneyExact = (pence: number) => money(pence, { exact: true, free: false });

export function miles(mi: number, long = false): string {
  const v = mi < 10 ? mi.toFixed(1) : Math.round(mi).toString();
  if (!long) return `${v} mi`;
  return `${v} ${v === '1.0' ? 'mile' : 'miles'} away`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function initials(name: string): string {
  return name
    .replace(/[^\p{L}\s]/gu, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;
}

/** Short human booking reference, e.g. BL-7K2Q9 */
export function bookingRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `BL-${s}`;
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

/** Scroll an element, falling back for browsers without Element.scrollTo. */
export function scrollEl(el: HTMLElement | null | undefined, pos: { top?: number; left?: number }, smooth = false) {
  if (!el) return;
  if (typeof el.scrollTo === 'function') {
    try {
      el.scrollTo({ ...pos, behavior: smooth ? 'smooth' : 'auto' });
      return;
    } catch {
      /* fall through */
    }
  }
  if (pos.top != null) el.scrollTop = pos.top;
  if (pos.left != null) el.scrollLeft = pos.left;
}
