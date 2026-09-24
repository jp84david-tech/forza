import { FACILITY_BY_ID, SPACES, SPACE_BY_ID, spacesFor } from '../data/facilities';
import type { Booking, Facility, Game, Space, Waitlist } from '../data/types';
import { rand } from '../lib/rng';
import { addDays, addMinutes, at, dateKey, now, startOfDay } from '../lib/time';

/**
 * Availability engine.
 *
 * Time is modelled in 30-minute units. A slot is bookable only if every unit
 * it covers is inside opening hours, in the future, and not taken by another
 * booking, a game, a maintenance block or (for shared sessions) full capacity.
 *
 * Other people's bookings are simulated deterministically per space/day/hour
 * so the calendar looks the same every time you open it. In production this
 * module would call GET /spaces/:id/availability?date=…
 */

export interface AvailabilityContext {
  bookings: Booking[];
  games: Game[];
  waitlists: Waitlist[];
  blocks: MaintenanceBlock[];
  priceOverrides: Record<string, { offPeak: number; peak: number }>;
}

export interface MaintenanceBlock {
  id: string;
  spaceId: string;
  date: string; // YYYY-MM-DD
  from: number; // hour
  to: number; // hour
  reason: string;
}

export type SlotState = 'available' | 'full' | 'past' | 'mine' | 'held' | 'blocked';

export interface Slot {
  start: Date;
  end: Date;
  state: SlotState;
  price: number; // pence (per booking, or per person for sessions)
  peak: boolean;
  spotsLeft?: number; // sessions only
}

const UNIT = 30;

export function hoursOn(f: Facility, day: Date): [number, number] | null {
  return f.openingHours[day.getDay()] ?? null;
}

export function isOpenNow(f: Facility, t: Date = now()): boolean {
  const h = hoursOn(f, t);
  if (!h) return false;
  const x = t.getHours() + t.getMinutes() / 60;
  return x >= h[0] && x < h[1];
}

export function isPeak(f: Facility, t: Date): boolean {
  const wd = t.getDay();
  return wd === 0 || wd === 6 || t.getHours() >= f.rules.peakFromHour;
}

export function rates(space: Space, ctx?: Pick<AvailabilityContext, 'priceOverrides'>) {
  const o = ctx?.priceOverrides?.[space.id];
  return { offPeak: o?.offPeak ?? space.offPeak, peak: o?.peak ?? space.peak };
}

/** Price for a booking. Hourly spaces are charged per half hour at the rate in force. */
export function priceFor(space: Space, start: Date, durationMins: number, people = 1, ctx?: Pick<AvailabilityContext, 'priceOverrides'>): number {
  const f = FACILITY_BY_ID[space.facilityId];
  const r = rates(space, ctx);
  if (space.unit === 'session') return (isPeak(f, start) ? r.peak : r.offPeak) * people;
  let total = 0;
  for (let m = 0; m < durationMins; m += UNIT) {
    const t = addMinutes(start, m);
    total += (isPeak(f, t) ? r.peak : r.offPeak) / 2;
  }
  return Math.round(total);
}

/** Simulated demand: evenings and weekends are busy, mornings are quiet. */
function demand(day: Date, hour: number): number {
  const weekend = day.getDay() === 0 || day.getDay() === 6;
  if (weekend) return hour < 9 ? 0.2 : hour < 17 ? 0.5 : 0.35;
  if (hour < 9) return 0.18;
  if (hour < 17) return 0.22;
  if (hour < 18) return 0.45;
  if (hour < 21) return 0.66;
  return 0.4;
}

/** Is this hour taken by someone outside the app's own state? */
function simulatedTaken(space: Space, day: Date, hour: number): boolean {
  if (space.walkUp) return false;
  const daysOut = Math.max(0, Math.round((startOfDay(day).getTime() - startOfDay().getTime()) / 86_400_000));
  // Slots further out are less booked, which is how real calendars fill up.
  const fill = demand(day, hour) * (daysOut <= 1 ? 1.15 : daysOut <= 3 ? 1 : 0.7);
  return rand(`${space.id}|${dateKey(day)}|${hour}`) < fill;
}

function sessionTaken(space: Space, day: Date, hour: number): number {
  const base = demand(day, hour) * (0.55 + rand(`${space.id}|${dateKey(day)}|${hour}|s`) * 0.6);
  // Early swims at the lido always sell out — a realistic "fully booked" case.
  if (space.id === 'gol-swim' && hour === 7) return space.capacity;
  return Math.min(space.capacity, Math.round(space.capacity * base));
}

const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && bStart < aEnd;

function bookingsOn(space: Space, ctx: AvailabilityContext) {
  return ctx.bookings.filter((b) => b.spaceId === space.id && b.status !== 'cancelled');
}

function gamesOn(space: Space, ctx: AvailabilityContext) {
  return ctx.games.filter((g) => g.spaceId === space.id && g.status !== 'cancelled' && !g.bookingId);
}

/** Why a range can't be booked, or null if it can. */
export function unavailableReason(space: Space, start: Date, durationMins: number, ctx: AvailabilityContext, people = 1): SlotState | null {
  const f = FACILITY_BY_ID[space.facilityId];
  const end = addMinutes(start, durationMins);
  const hours = hoursOn(f, start);
  const startH = start.getHours() + start.getMinutes() / 60;
  const endH = startH + durationMins / 60;
  if (!hours || startH < hours[0] || endH > hours[1]) return 'blocked';
  if (start.getTime() < now().getTime()) return 'past';

  const s = start.getTime();
  const e = end.getTime();

  // A waitlist offer holds the slot for this user.
  const held = ctx.waitlists.some(
    (w) => w.status === 'offered' && w.spaceId === space.id && new Date(w.start).getTime() === s && (!w.offerExpiresAt || new Date(w.offerExpiresAt).getTime() > now().getTime()),
  );
  if (held) return null;

  const key = dateKey(start);
  if (ctx.blocks.some((b) => b.spaceId === space.id && b.date === key && overlaps(startH, endH, b.from, b.to))) return 'blocked';

  if (space.unit === 'session') {
    const mine = bookingsOn(space, ctx).filter((b) => overlaps(s, e, new Date(b.start).getTime(), new Date(b.end).getTime())).reduce((n, b) => n + b.players, 0);
    const left = space.capacity - sessionTaken(space, start, start.getHours()) - mine;
    return left >= people ? null : 'full';
  }

  if (bookingsOn(space, ctx).some((b) => overlaps(s, e, new Date(b.start).getTime(), new Date(b.end).getTime()))) return 'full';
  if (gamesOn(space, ctx).some((g) => overlaps(s, e, new Date(g.start).getTime(), new Date(g.end).getTime()))) return 'full';
  for (let m = 0; m < durationMins; m += 60) {
    const t = addMinutes(start, m);
    if (simulatedTaken(space, t, t.getHours())) return 'full';
  }
  return null;
}

/** All start times for a space on a day, at the given duration. */
export function daySlots(space: Space, day: Date, durationMins: number, ctx: AvailabilityContext, people = 1): Slot[] {
  const f = FACILITY_BY_ID[space.facilityId];
  const hours = hoursOn(f, day);
  if (!hours) return [];
  const slots: Slot[] = [];
  const first = Math.ceil(hours[0]);
  for (let h = first; h + durationMins / 60 <= hours[1]; h++) {
    const start = at(day, h);
    const end = addMinutes(start, durationMins);
    const mine = ctx.bookings.some(
      (b) => b.spaceId === space.id && b.status === 'confirmed' && overlaps(start.getTime(), end.getTime(), new Date(b.start).getTime(), new Date(b.end).getTime()),
    );
    const reason = unavailableReason(space, start, durationMins, ctx, people);
    const heldOffer = ctx.waitlists.some((w) => w.status === 'offered' && w.spaceId === space.id && new Date(w.start).getTime() === start.getTime());
    let spotsLeft: number | undefined;
    if (space.unit === 'session') {
      const booked = bookingsOn(space, ctx).filter((b) => new Date(b.start).getTime() === start.getTime()).reduce((n, b) => n + b.players, 0);
      spotsLeft = Math.max(0, space.capacity - sessionTaken(space, start, h) - booked);
    }
    slots.push({
      start,
      end,
      state: mine && space.unit !== 'session' ? 'mine' : heldOffer && !reason ? 'held' : reason ?? 'available',
      price: priceFor(space, start, durationMins, 1, ctx),
      peak: isPeak(f, start),
      spotsLeft,
    });
  }
  return slots;
}

/** Number of bookable start times remaining for a facility on a day. */
export function freeSlotCount(f: Facility, day: Date, ctx: AvailabilityContext, sport?: string, fromHour = 0, toHour = 24): number {
  let n = 0;
  for (const s of spacesFor(f.id)) {
    if (s.walkUp || (sport && s.sport !== sport)) continue;
    n += daySlots(s, day, 60, ctx).filter((x) => x.state === 'available' && x.start.getHours() >= fromHour && x.start.getHours() < toHour).length;
  }
  return n;
}

/** First bookable hour at a facility within the next few days. */
export function nextAvailable(f: Facility, ctx: AvailabilityContext, sport?: string, days = 3): { start: Date; space: Space } | null {
  for (let d = 0; d < days; d++) {
    const day = addDays(startOfDay(), d);
    let best: { start: Date; space: Space } | null = null;
    for (const s of spacesFor(f.id)) {
      if (s.walkUp || (sport && s.sport !== sport)) continue;
      const slot = daySlots(s, day, 60, ctx).find((x) => x.state === 'available');
      if (slot && (!best || slot.start < best.start)) best = { start: slot.start, space: s };
    }
    if (best) return best;
  }
  return null;
}

export type AvailabilityLevel = 'walk-up' | 'good' | 'limited' | 'full' | 'closed';

/** Headline availability for cards: how easy is it to play here today? */
export function availabilityToday(f: Facility, ctx: AvailabilityContext, sport?: string): { level: AvailabilityLevel; label: string } {
  const spaces = spacesFor(f.id).filter((s) => !sport || s.sport === sport);
  if (spaces.length && spaces.every((s) => s.walkUp)) return { level: 'walk-up', label: 'Walk-up · no booking' };
  const today = startOfDay();
  const hours = hoursOn(f, today);
  const nowH = now().getHours();
  if (!hours || nowH >= hours[1] - 1) {
    const tomorrow = freeSlotCount(f, addDays(today, 1), ctx, sport);
    return tomorrow > 0 ? { level: 'good', label: 'Free tomorrow' } : { level: 'closed', label: 'Closed today' };
  }
  const n = freeSlotCount(f, today, ctx, sport);
  if (n === 0) return { level: 'full', label: 'Fully booked today' };
  const evening = freeSlotCount(f, today, ctx, sport, 17, 23);
  if (n <= 3) return { level: 'limited', label: n === 1 ? '1 slot left today' : `${n} slots left today` };
  if (nowH >= 12 && evening > 0) return { level: 'good', label: 'Available tonight' };
  return { level: 'good', label: 'Available today' };
}

/** Lowest and highest prices across a facility's bookable spaces. */
export function priceRange(f: Facility, sport?: string, ctx?: Pick<AvailabilityContext, 'priceOverrides'>) {
  const spaces = spacesFor(f.id).filter((s) => !sport || s.sport === sport);
  if (!spaces.length) return { min: 0, max: 0, unit: 'hour' as const };
  const prices = spaces.flatMap((s) => {
    const r = rates(s, ctx);
    return [r.offPeak, r.peak];
  });
  // "From" is the cheapest way in, labelled with that space's own unit.
  const cheapest = spaces.reduce((a, b) => (rates(a, ctx).offPeak <= rates(b, ctx).offPeak ? a : b));
  return { min: Math.min(...prices), max: Math.max(...prices), unit: cheapest.unit };
}

export const spaceById = (id: string) => SPACE_BY_ID[id];
export const allSpaces = () => SPACES;
