import { FACILITIES, spacesFor } from '../data/facilities';
import { levelIndex } from '../data/sports';
import type { Facility, Game, SkillLevel, SportId } from '../data/types';
import { addDays, now, startOfDay } from '../lib/time';
import type { AppState } from '../state/store';
import { availCtx, clashes, distanceTo, facilityRating, facilitySports, joinedPlayers, myRow, visibleGames } from '../state/selectors';
import { availabilityToday, priceRange } from './availability';

/**
 * Discovery and recommendations.
 *
 * Nothing here ranks purely by popularity. Venues and games are scored on how
 * well they fit this person: distance, the sports they play, their level,
 * when they like to play, whether there's actually space, price and rating.
 * Each result carries human-readable reasons so the UI can explain itself.
 */

export type When = 'now' | 'tonight' | 'tomorrow' | 'weekend' | 'week';

export const WHEN_LABELS: Record<When, string> = {
  now: 'Next 3 hours',
  tonight: 'Tonight',
  tomorrow: 'Tomorrow',
  weekend: 'This weekend',
  week: 'This week',
};

export function inWindow(startIso: string, when: When): boolean {
  const t = new Date(startIso);
  const n = now();
  if (t.getTime() < n.getTime()) return false;
  const today = startOfDay();
  switch (when) {
    case 'now':
      return t.getTime() - n.getTime() <= 3 * 3600_000;
    case 'tonight':
      return t < addDays(today, 1) && t.getHours() >= 17;
    case 'tomorrow':
      return t >= addDays(today, 1) && t < addDays(today, 2);
    case 'weekend': {
      const d = n.getDay();
      const sat = d === 6 ? today : d === 0 ? addDays(today, -1) : addDays(today, 6 - d);
      return t >= sat && t < addDays(sat, 2);
    }
    case 'week':
      return t < addDays(today, 7);
  }
}

// ---------------------------------------------------------------- venues

export interface ScoredFacility {
  f: Facility;
  score: number;
  distance: number;
  reasons: string[];
}

export function scoreFacility(s: AppState, f: Facility, sport?: SportId): ScoredFacility {
  const distance = distanceTo(s, f);
  const maxD = Math.max(s.prefs.distance, 1) * 1.5;
  const sports = facilitySports(f);
  const mine = s.profile.sports.map((x) => x.sport);
  const booked = s.bookings.filter((b) => sports.includes(b.sport)).length;
  const rating = facilityRating(s, f).overall;
  const avail = availabilityToday(f, availCtx(s), sport);
  const range = priceRange(f, sport, s);

  const dScore = Math.max(0, 1 - distance / maxD);
  const sportScore = sport ? 1 : sports.some((x) => mine.includes(x)) ? 0.7 + Math.min(0.3, booked * 0.1) : 0.15;
  const availScore = avail.level === 'good' || avail.level === 'walk-up' ? 1 : avail.level === 'limited' ? 0.6 : 0.1;
  const ratingScore = Math.max(0, (rating - 3.5) / 1.5);
  const priceScore = range.max === 0 ? 1 : Math.max(0, 1 - range.min / 6000);
  const score = dScore * 0.3 + sportScore * 0.25 + availScore * 0.2 + ratingScore * 0.15 + priceScore * 0.1;

  const reasons: string[] = [];
  if (booked >= 2) reasons.push('You play here often');
  else if (!sport && sports.some((x) => mine.includes(x))) reasons.push('Matches your sports');
  if (distance < 1) reasons.push('Close by');
  if (rating >= 4.7) reasons.push('Top rated');
  if (range.max === 0) reasons.push('Free');
  return { f, score, distance, reasons };
}

export function rankFacilities(s: AppState, list: Facility[] = FACILITIES, sport?: SportId): ScoredFacility[] {
  return list.map((f) => scoreFacility(s, f, sport)).sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------- games

export interface ScoredGame {
  g: Game;
  score: number;
  distance: number;
  spotsLeft: number;
  reasons: string[];
  clash: boolean;
}

export function scoreGame(s: AppState, g: Game, level?: SkillLevel): ScoredGame {
  const distance = distanceTo(s, FACILITIES.find((f) => f.id === g.facilityId)!);
  const spotsLeft = g.maxPlayers - joinedPlayers(s, g.id).length;
  const myLevel = level ?? s.profile.sports.find((x) => x.sport === g.sport)?.level;
  const plays = s.profile.sports.some((x) => x.sport === g.sport);
  const levelGap = myLevel ? Math.abs(levelIndex(myLevel) - levelIndex(g.level)) : 1;
  const start = new Date(g.start);
  const hour = start.getHours();
  const tod = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const timeFit = (s.prefs.times.includes(tod) ? 0.6 : 0.2) + (s.prefs.days.includes(start.getDay()) ? 0.4 : 0);
  const clash = !!clashes(s, g.start, g.end, g.id);

  const sportScore = plays ? 1 : 0.2;
  const levelScore = levelGap === 0 ? 1 : levelGap === 1 ? 0.6 : 0.1;
  const dScore = Math.max(0, 1 - distance / (Math.max(s.prefs.distance, 1) * 1.5));
  const spaceScore = spotsLeft <= 0 ? 0 : spotsLeft <= 2 ? 1 : 0.8;
  let score = sportScore * 0.3 + levelScore * 0.25 + dScore * 0.2 + timeFit * 0.15 + spaceScore * 0.1;
  if (clash) score *= 0.3;

  const reasons: string[] = [];
  if (levelGap === 0 && myLevel) reasons.push('Your level');
  if (distance < 1.5) reasons.push('Nearby');
  if (spotsLeft > 0 && spotsLeft <= 2) reasons.push(spotsLeft === 1 ? 'Last spot' : '2 spots left');
  if (clash) reasons.push('Clashes with your plans');
  return { g, score, distance, spotsLeft, reasons, clash };
}

export interface GameQuery {
  sport?: SportId;
  level?: SkillLevel;
  when?: When;
  maxDistance?: number;
  includeFull?: boolean;
  /** Allow levels one step either side of the chosen level. */
  levelTolerance?: number;
}

export function findGames(s: AppState, q: GameQuery = {}): ScoredGame[] {
  return visibleGames(s)
    .filter((g) => g.status === 'open' || (q.includeFull && g.status === 'full'))
    .filter((g) => myRow(s, g.id)?.status !== 'joined' && g.creatorId !== 'me')
    .filter((g) => !q.sport || g.sport === q.sport)
    .filter((g) => !q.when || inWindow(g.start, q.when))
    .filter((g) => !q.level || Math.abs(levelIndex(g.level) - levelIndex(q.level)) <= (q.levelTolerance ?? 1))
    .map((g) => scoreGame(s, g, q.level))
    .filter((x) => q.maxDistance == null || x.distance <= q.maxDistance)
    .sort((a, b) => b.score - a.score || a.g.start.localeCompare(b.g.start));
}

/** Whether a facility has at least one bookable (non walk-up) space. */
export const isBookable = (f: Facility) => spacesFor(f.id).some((s) => !s.walkUp);
