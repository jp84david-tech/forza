import { FACILITIES, FACILITY_BY_ID, spacesFor } from '../data/facilities';
import { SEED_GAMES, SEED_GAME_PLAYERS, SEED_MESSAGES } from '../data/games';
import { PERSON_BY_ID } from '../data/people';
import { SEED_REVIEWS } from '../data/reviews';
import type { Booking, Facility, Game, GamePlayer, Message, Review, SportId, User } from '../data/types';
import { type AvailabilityContext } from '../services/availability';
import { distanceMiles } from '../lib/geo';
import { now } from '../lib/time';
import type { AppState } from './store';
import { MAP_CENTER } from '../data/map';
import { PLAYABLE, SPORT_BY_ID } from '../data/sports';

const SPORT_NAMES: Record<string, string> = Object.fromEntries(Object.entries(SPORT_BY_ID).map(([k, v]) => [k, v.name]));

/**
 * Derived data. Each selector is a pure function of AppState; the expensive
 * ones are cached per state object so screens can call them freely.
 */

function memo<T>(fn: (s: AppState) => T): (s: AppState) => T {
  const cache = new WeakMap<AppState, T>();
  return (s) => {
    if (cache.has(s)) return cache.get(s)!;
    const v = fn(s);
    cache.set(s, v);
    return v;
  };
}

export const ME = 'me';

export const me = memo((s: AppState): User => {
  const a = s.account;
  return {
    id: ME,
    name: a ? `${a.firstName}${a.lastName ? ` ${a.lastName[0]}.` : ''}` : 'You',
    username: a?.username ?? 'you',
    color: a?.color ?? '#3d5a4a',
    photo: a?.photo,
    area: s.location?.label ?? 'North London',
    sports: s.profile.sports,
    gamesPlayed: s.profile.gamesPlayed,
    attendance: s.profile.attendance,
    achievements: s.profile.achievements.map((x) => x.id),
    joined: a?.joined ?? '',
    visibility: s.privacy.visibility,
    ageGroup: a?.ageGroup ?? 'adult',
  };
});

export function userById(s: AppState, id: string): User | undefined {
  return id === ME ? me(s) : PERSON_BY_ID[id];
}

export const firstName = (u: User | undefined) => (u ? u.name.split(' ')[0] : 'Someone');

/** "5-a-side football", "Padel doubles", "Basketball". */
export function gameTitle(g: Pick<Game, 'sport' | 'format'>): string {
  const sport = SPORT_NAMES[g.sport] ?? g.sport;
  if (!g.format) return sport;
  if (/^(singles|doubles|mixed)/i.test(g.format)) return `${sport} ${g.format.toLowerCase()}`;
  return `${g.format} ${sport.toLowerCase()}`;
}

export const isMinor = (s: AppState) => s.account?.ageGroup !== undefined && s.account.ageGroup !== 'adult';

// ---------------------------------------------------------------- games

export const allPlayerRows = memo((s: AppState): Map<string, GamePlayer[]> => {
  const map = new Map<string, Map<string, GamePlayer>>();
  for (const row of [...SEED_GAME_PLAYERS, ...s.gamePlayers]) {
    if (!map.has(row.gameId)) map.set(row.gameId, new Map());
    map.get(row.gameId)!.set(row.userId, row);
  }
  const out = new Map<string, GamePlayer[]>();
  for (const [g, rows] of map) out.set(g, [...rows.values()]);
  return out;
});

export function playersOf(s: AppState, gameId: string): GamePlayer[] {
  return allPlayerRows(s).get(gameId) ?? [];
}

export function joinedPlayers(s: AppState, gameId: string): GamePlayer[] {
  return playersOf(s, gameId).filter((p) => p.status === 'joined');
}

export const allGames = memo((s: AppState): Game[] => {
  const created = new Map(s.games.map((g) => [g.id, g]));
  const merged = [...SEED_GAMES.filter((g) => !created.has(g.id)), ...s.games];
  const t = now().getTime();
  return merged.map((g) => {
    if (g.status === 'cancelled') return g;
    if (new Date(g.end).getTime() < t) return { ...g, status: 'completed' as const };
    const count = joinedPlayers(s, g.id).length;
    return { ...g, status: count >= g.maxPlayers ? ('full' as const) : ('open' as const) };
  });
});

export function gameById(s: AppState, id: string): Game | undefined {
  return allGames(s).find((g) => g.id === id);
}

export function myRow(s: AppState, gameId: string): GamePlayer | undefined {
  return playersOf(s, gameId).find((p) => p.userId === ME);
}

export const isInGame = (s: AppState, gameId: string) => myRow(s, gameId)?.status === 'joined';

export function messagesOf(s: AppState, gameId: string): Message[] {
  return [...SEED_MESSAGES.filter((m) => m.gameId === gameId), ...s.messages.filter((m) => m.gameId === gameId)].sort((a, b) => a.at.localeCompare(b.at));
}

/** Games that are visible to this user: public, not blocked, age-appropriate. */
export function visibleGames(s: AppState): Game[] {
  const minor = isMinor(s);
  return allGames(s).filter((g) => {
    if (s.blocked.includes(g.creatorId)) return false;
    if (g.visibility === 'private' && !myRow(s, g.id)) return false;
    if (minor && g.ageRule === 'adults') return false;
    if (!minor && g.ageRule === 'juniors') return false;
    return true;
  });
}

// ---------------------------------------------------------------- location

export function origin(s: AppState) {
  return s.location ?? { label: 'North London', lat: MAP_CENTER.lat, lng: MAP_CENTER.lng, source: 'manual' as const };
}

export function distanceTo(s: AppState, p: { lat: number; lng: number }): number {
  return distanceMiles(origin(s), p);
}

export const facilityDistance = (s: AppState, id: string) => distanceTo(s, FACILITY_BY_ID[id]);

// ---------------------------------------------------------------- facilities

export const facilitySports = (f: Facility): SportId[] => [...new Set(spacesFor(f.id).map((x) => x.sport))];

export const isSaved = (s: AppState, id: string) => s.saved.some((x) => x.facilityId === id);

export function facilityReviews(s: AppState, id: string): Review[] {
  return [...s.reviews.filter((r) => r.facilityId === id), ...SEED_REVIEWS.filter((r) => r.facilityId === id && !s.blocked.includes(r.userId))].sort((a, b) =>
    b.at.localeCompare(a.at),
  );
}

/** Aggregate rating including the signed-in user's own reviews. */
export function facilityRating(s: AppState, f: Facility) {
  const mine = s.reviews.filter((r) => r.facilityId === f.id);
  if (!mine.length) return { ...f.rating, count: f.reviewCount };
  const n = f.reviewCount + mine.length;
  const avg = (k: keyof Facility['rating']) => Math.round(((f.rating[k] * f.reviewCount + mine.reduce((t, r) => t + r.rating[k], 0)) / n) * 10) / 10;
  return { overall: avg('overall'), surface: avg('surface'), cleanliness: avg('cleanliness'), facilities: avg('facilities'), value: avg('value'), count: n };
}

export const availCtx = memo(
  (s: AppState): AvailabilityContext => ({
    bookings: s.bookings,
    games: allGames(s),
    waitlists: s.waitlists,
    blocks: s.blocks,
    priceOverrides: s.priceOverrides,
  }),
);

export const facilitiesByDistance = memo((s: AppState) =>
  FACILITIES.map((f) => ({ f, d: distanceTo(s, f) })).sort((a, b) => a.d - b.d),
);

// ---------------------------------------------------------------- bookings & activity

export type Activity =
  | { kind: 'booking'; id: string; start: string; end: string; booking: Booking }
  | { kind: 'game'; id: string; start: string; end: string; game: Game };

/** Upcoming bookings and joined games, soonest first. Games tied to a booking show once. */
export const upcoming = memo((s: AppState): Activity[] => {
  const t = now().getTime();
  const items: Activity[] = [];
  for (const b of s.bookings) {
    if (b.status === 'confirmed' && new Date(b.end).getTime() > t) items.push({ kind: 'booking', id: b.id, start: b.start, end: b.end, booking: b });
  }
  for (const g of allGames(s)) {
    if (g.bookingId && s.bookings.some((b) => b.id === g.bookingId)) continue;
    if (g.status === 'cancelled' || new Date(g.end).getTime() <= t) continue;
    if (isInGame(s, g.id)) items.push({ kind: 'game', id: g.id, start: g.start, end: g.end, game: g });
  }
  return items.sort((a, b) => a.start.localeCompare(b.start));
});

export const pastActivity = memo((s: AppState): Activity[] => {
  const t = now().getTime();
  const items: Activity[] = [];
  for (const b of s.bookings) {
    if (b.status !== 'cancelled' && new Date(b.end).getTime() <= t) items.push({ kind: 'booking', id: b.id, start: b.start, end: b.end, booking: b });
  }
  for (const g of allGames(s)) {
    if (g.bookingId && s.bookings.some((b) => b.id === g.bookingId)) continue;
    if (g.status !== 'cancelled' && new Date(g.end).getTime() <= t && isInGame(s, g.id)) items.push({ kind: 'game', id: g.id, start: g.start, end: g.end, game: g });
  }
  return items.sort((a, b) => b.start.localeCompare(a.start));
});

export function bookingStatus(b: Booking): 'confirmed' | 'completed' | 'cancelled' {
  if (b.status === 'cancelled') return 'cancelled';
  return new Date(b.end).getTime() <= now().getTime() ? 'completed' : 'confirmed';
}

export const unreadCount = (s: AppState) => s.notifications.filter((n) => !n.read).length;

/** Sports ordered by what this user plays, then the rest of the catalogue. */
export function sportOrder(s: AppState): SportId[] {
  const mine = s.profile.sports.map((x) => x.sport).filter((x) => PLAYABLE.includes(x));
  const booked = s.bookings.map((b) => b.sport);
  const freq = new Map<SportId, number>();
  booked.forEach((sp) => freq.set(sp, (freq.get(sp) ?? 0) + 1));
  const all: SportId[] = PLAYABLE;
  const rest = all.filter((x) => !mine.includes(x)).sort((a, b) => (freq.get(b) ?? 0) - (freq.get(a) ?? 0));
  return [...mine, ...rest];
}

export function levelFor(s: AppState, sport: SportId) {
  return s.profile.sports.find((x) => x.sport === sport)?.level ?? 'casual';
}

/** Does anything the user has booked or joined overlap this time? */
export function clashes(s: AppState, start: string, end: string, ignoreGame?: string): Activity | undefined {
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  return upcoming(s).find((x) => x.id !== ignoreGame && !(x.kind === 'booking' && x.booking.gameId === ignoreGame) && new Date(x.start).getTime() < b && a < new Date(x.end).getTime());
}
