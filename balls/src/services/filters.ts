import { spacesFor } from '../data/facilities';
import type { Facility, FeatureId, SportId, VenueType } from '../data/types';
import { addDays, fromKey, now, startOfDay } from '../lib/time';
import type { AppState } from '../state/store';
import { availCtx, distanceTo, facilityRating } from '../state/selectors';
import { daySlots, hoursOn, rates } from './availability';

/** Explore filters. Every filter narrows the set; empty means "any". */

export type PriceBand = 'free' | 'u5' | '5-10' | '10-20' | '20+';
export type DateFilter = 'any' | 'today' | 'tomorrow' | 'week' | 'custom';
export type TimeFilter = 'any' | 'morning' | 'afternoon' | 'evening' | 'custom';

export interface ExploreFilters {
  sports: SportId[];
  distance: number | null;
  price: PriceBand[];
  date: DateFilter;
  customDate?: string;
  time: TimeFilter;
  timeFrom: number;
  timeTo: number;
  venueTypes: VenueType[];
  features: FeatureId[];
  rating: 0 | 4 | 4.5;
}

export const EMPTY_FILTERS: ExploreFilters = {
  sports: [],
  distance: null,
  price: [],
  date: 'any',
  time: 'any',
  timeFrom: 17,
  timeTo: 22,
  venueTypes: [],
  features: [],
  rating: 0,
};

export const PRICE_BANDS: Array<{ id: PriceBand; label: string; min: number; max: number }> = [
  { id: 'free', label: 'Free', min: 0, max: 0 },
  { id: 'u5', label: 'Under £5', min: 1, max: 499 },
  { id: '5-10', label: '£5–£10', min: 500, max: 1000 },
  { id: '10-20', label: '£10–£20', min: 1001, max: 2000 },
  { id: '20+', label: '£20+', min: 2001, max: Infinity },
];

export function activeFilterCount(f: ExploreFilters, ignoreSports = true): number {
  let n = 0;
  if (!ignoreSports && f.sports.length) n++;
  if (f.distance != null) n++;
  if (f.price.length) n++;
  if (f.date !== 'any') n++;
  if (f.time !== 'any') n++;
  if (f.venueTypes.length) n++;
  if (f.features.length) n++;
  if (f.rating) n++;
  return n;
}

function timeWindow(f: ExploreFilters): [number, number] {
  switch (f.time) {
    case 'morning':
      return [6, 12];
    case 'afternoon':
      return [12, 17];
    case 'evening':
      return [17, 23];
    case 'custom':
      return [f.timeFrom, f.timeTo];
    default:
      return [0, 24];
  }
}

function dates(f: ExploreFilters): Date[] {
  const today = startOfDay();
  switch (f.date) {
    case 'today':
      return [today];
    case 'tomorrow':
      return [addDays(today, 1)];
    case 'custom':
      return f.customDate ? [fromKey(f.customDate)] : [today];
    case 'week':
    case 'any':
      return Array.from({ length: 7 }, (_, i) => addDays(today, i));
  }
}

export function applyFilters(s: AppState, list: Facility[], f: ExploreFilters): Facility[] {
  const ctx = availCtx(s);
  const needAvailability = f.date !== 'any' || f.time !== 'any';
  const [from, to] = timeWindow(f);
  const days = needAvailability ? dates(f) : [];
  return list.filter((fac) => {
    const spaces = spacesFor(fac.id).filter((sp) => !f.sports.length || f.sports.includes(sp.sport));
    if (!spaces.length) return false;
    if (f.distance != null && distanceTo(s, fac) > f.distance) return false;
    if (f.rating && facilityRating(s, fac).overall < f.rating) return false;
    if (f.venueTypes.length && !spaces.some((sp) => f.venueTypes.includes(sp.venueType))) return false;
    if (f.features.length && !f.features.every((x) => fac.features.includes(x))) return false;
    if (f.price.length) {
      const bands = PRICE_BANDS.filter((b) => f.price.includes(b.id));
      const ok = spaces.some((sp) => {
        const p = sp.walkUp ? 0 : rates(sp, s).offPeak;
        return bands.some((b) => p >= b.min && p <= b.max);
      });
      if (!ok) return false;
    }
    if (needAvailability) {
      const ok = days.some((d) => {
        const hours = hoursOn(fac, d);
        if (!hours) return false;
        return spaces.some((sp) => {
          if (sp.walkUp) {
            const end = Math.min(hours[1], to);
            const start = Math.max(hours[0], from, d.getTime() === startOfDay().getTime() ? now().getHours() : 0);
            return end > start;
          }
          return daySlots(sp, d, 60, ctx).some((x) => (x.state === 'available' || x.state === 'held') && x.start.getHours() >= from && x.start.getHours() < to);
        });
      });
      if (!ok) return false;
    }
    return true;
  });
}
