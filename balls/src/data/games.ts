import type { AgeRule, Game, GamePlayer, Message, SkillLevel, SportId } from './types';
import { daysUntil, minsAgo, slot } from './schedule';

/**
 * Public games posted by other players. In production: GET /games?near=…
 * Player rows are a separate table (GamePlayers) so joins/leaves are cheap.
 */

type Seed = {
  id: string;
  sport: SportId;
  format?: string;
  facilityId: string;
  spaceId?: string;
  day: number;
  hour: number;
  mins?: number;
  level: SkillLevel;
  max: number;
  price: number;
  creator: string;
  players: string[];
  description: string;
  ageRule?: AgeRule;
  visibility?: 'public' | 'private';
};

const SEEDS: Seed[] = [
  {
    id: 'g1', sport: 'football', format: '5-a-side', facilityId: 'highgate-sc', spaceId: 'hsc-p1', day: 0, hour: 19, level: 'intermediate', max: 10, price: 400,
    creator: 'u1', players: ['u2', 'u9', 'u11', 'u15', 'u21', 'u25'],
    description: 'Friendly 5s at a decent pace. Mixed ability is fine, just keep it clean. Bibs and balls provided. Please arrive 10 minutes early.',
  },
  {
    id: 'g2', sport: 'football', format: '5-a-side', facilityId: 'hornsey-rise-5s', spaceId: 'hr-2', day: 0, hour: 20, level: 'casual', max: 10, price: 450,
    creator: 'u15', players: ['u13', 'u27', 'u21', 'u9', 'u5'],
    description: 'Relaxed evening kickabout. We rotate keeper every 10 minutes. First timers very welcome.',
  },
  {
    id: 'g19', sport: 'football', format: '5-a-side', facilityId: 'tufnell-pitch', spaceId: 'tpc-c1', day: 0, hour: 21, level: 'intermediate', max: 10, price: 250,
    creator: 'u11', players: ['u2', 'u5', 'u7', 'u15', 'u19', 'u21', 'u25', 'u1'],
    description: 'Late cage game. One spot left. Quick passing, no slide tackles.',
  },
  {
    id: 'g3', sport: 'football', format: '7-a-side', facilityId: 'tufnell-pitch', spaceId: 'tpc-7', day: 1, hour: 19.5, level: 'intermediate', max: 14, price: 400,
    creator: 'u7', players: ['u1', 'u2', 'u5', 'u11', 'u15', 'u19', 'u21', 'u25', 'u9', 'u27'],
    description: 'Weekly 7s. We need a couple more to make it 7 v 7. Bring a dark and a light top.',
  },
  {
    id: 'g4', sport: 'basketball', format: '3x3 half court', facilityId: 'nl-basketball', spaceId: 'nlb-a', day: 0, hour: 18, level: 'casual', max: 6, price: 0,
    creator: 'u4', players: ['u16', 'u28', 'u22'],
    description: 'Pick-up 3x3 at Whittington Park. Free, just turn up. Winners stay on.',
  },
  {
    id: 'g5', sport: 'tennis', format: 'Doubles', facilityId: 'dartmouth-tennis', spaceId: 'dpt-3', day: 1, hour: 18, level: 'intermediate', max: 4, price: 550,
    creator: 'u3', players: ['u8'],
    description: 'Doubles on the clay court. Looking for a steady intermediate pair. Balls provided.',
  },
  {
    id: 'g6', sport: 'padel', format: 'Doubles', facilityId: 'archway-padel', spaceId: 'ap-2', day: 0, hour: 20, level: 'intermediate', max: 4, price: 1100,
    creator: 'u10', players: ['u17', 'u1'],
    description: 'Need a fourth for an evening match. Two-set format, we will rotate partners.',
  },
  {
    id: 'g15', sport: 'padel', format: 'Doubles', facilityId: 'clocktower-padel', spaceId: 'ctp-1', day: 1, hour: 19, level: 'beginner', max: 4, price: 950,
    creator: 'u30', players: ['u27'],
    description: 'Both fairly new to padel. Anyone else learning is very welcome. Rackets can be hired on site.',
  },
  {
    id: 'g7', sport: 'badminton', format: 'Doubles', facilityId: 'crouch-end-hall', spaceId: 'ceh-b2', day: 2, hour: 19, level: 'intermediate', max: 4, price: 375,
    creator: 'u20', players: ['u29'],
    description: 'Doubles, feather shuttles provided. Friendly but we like long rallies.',
  },
  {
    id: 'g18', sport: 'badminton', format: 'Doubles', facilityId: 'holloway-leisure', spaceId: 'hlc-b1', day: 1, hour: 20, level: 'casual', max: 4, price: 350,
    creator: 'u6', players: ['u14', 'u29'],
    description: 'Casual doubles. One more needed.',
  },
  {
    id: 'g8', sport: 'volleyball', format: 'Beach 2v2', facilityId: 'hornsey-beach', spaceId: 'hbv-1', day: 3, hour: 19, level: 'casual', max: 8, price: 425,
    creator: 'u14', players: ['u6', 'u28', 'u16', 'u22'],
    description: 'Rotating 2v2 on sand. Shoes off, sunnies optional (it is covered).',
  },
  {
    id: 'g9', sport: 'football', format: '5-a-side', facilityId: 'camden-cages', spaceId: 'cc-2', day: 2, hour: 21, level: 'advanced', max: 10, price: 600,
    creator: 'u19', players: ['u5', 'u7', 'u1', 'u11', 'u15', 'u2', 'u25'],
    description: 'Quick, competitive 5s on the rooftop. Please only join if you play regularly.',
  },
  {
    id: 'g10', sport: 'running', format: 'Group run', facilityId: 'heath-track', spaceId: 'pht-track', day: 1, hour: 7, level: 'casual', max: 20, price: 420,
    creator: 'u12', players: ['u18', 'u24', 'u26', 'u7', 'u16', 'u8', 'u30', 'u3'],
    description: 'Easy 5K on the track, then a coffee. Everyone runs their own pace; nobody gets left behind.',
  },
  {
    id: 'g11', sport: 'football', format: '5-a-side', facilityId: 'finsbury-hub', spaceId: 'fph-5a', day: 4, hour: 18, level: 'beginner', max: 10, price: 320,
    creator: 'u21', players: ['u13', 'u27', 'u9'],
    description: 'Beginner-friendly 5s. Never played or not played in years? This is the one.',
  },
  {
    id: 'g12', sport: 'basketball', format: '5v5 full court', facilityId: 'highgate-sc', spaceId: 'hsc-hall', day: 3, hour: 20, level: 'advanced', max: 10, price: 500,
    creator: 'u28', players: ['u4', 'u16', 'u22', 'u11', 'u2', 'u19'],
    description: 'Full-court indoor run. Games to 21, winners stay. Advanced players please.',
  },
  {
    id: 'g13', sport: 'cricket', format: 'Nets session', facilityId: 'belsize-nets', spaceId: 'bcn-1', day: 5, hour: 11, level: 'intermediate', max: 6, price: 500,
    creator: 'u23', players: ['u25', 'u9'],
    description: 'Nets with the bowling machine. Bring your own bat and pads if you have them.',
  },
  {
    id: 'g14', sport: 'rugby', format: 'Touch rugby', facilityId: 'muswell-rugby', spaceId: 'mhr-train', day: 2, hour: 19.5, level: 'casual', max: 12, price: 450,
    creator: 'u24', players: ['u5', 'u12', 'u26', 'u7', 'u18'],
    description: 'Mixed touch rugby, no contact, all welcome. We explain the rules as we go.',
  },
  {
    id: 'g16', sport: 'football', format: '11-a-side', facilityId: 'finsbury-hub', spaceId: 'fph-11', day: daysUntil(6), hour: 10, mins: 90, level: 'competitive', max: 22, price: 450,
    creator: 'u7', players: ['u1', 'u2', 'u5', 'u9', 'u11', 'u13', 'u15', 'u19', 'u21', 'u25', 'u27', 'u4', 'u17', 'u23', 'u28', 'u16', 'u24'],
    description: 'Saturday morning 11-a-side on grass. Proper game, referees provided. Studs recommended.',
  },
  {
    id: 'g17', sport: 'tennis', format: 'Singles', facilityId: 'queens-wood', spaceId: 'qw-1', day: 0, hour: 18, level: 'casual', max: 2, price: 500,
    creator: 'u18', players: [],
    description: 'Casual hit and maybe a set. Happy to just rally.',
  },
  {
    id: 'g20', sport: 'football', format: '5-a-side', facilityId: 'tufnell-pitch', spaceId: 'tpc-c2', day: daysUntil(6), hour: 9, level: 'beginner', max: 10, price: 0,
    creator: 'u13', players: ['u9'],
    ageRule: 'all',
    description: 'Free Saturday kickabout run with the Tufnell Park Community Trust. All ages welcome with a parent or guardian for under-16s.',
  },
];

const createdAt = minsAgo(60 * 26);

export const SEED_GAMES: Game[] = SEEDS.map((s) => {
  const { start, end } = slot(s.day, s.hour, s.mins ?? 60);
  const full = s.players.length + 1 >= s.max;
  return {
    id: s.id,
    creatorId: s.creator,
    sport: s.sport,
    format: s.format,
    facilityId: s.facilityId,
    spaceId: s.spaceId,
    start,
    end,
    level: s.level,
    maxPlayers: s.max,
    pricePerPlayer: s.price,
    description: s.description,
    status: full ? 'full' : 'open',
    visibility: s.visibility ?? 'public',
    ageRule: s.ageRule ?? 'adults',
    createdAt,
  };
});

export const SEED_GAME_PLAYERS: GamePlayer[] = SEEDS.flatMap((s, i) => [
  { gameId: s.id, userId: s.creator, role: 'organiser' as const, status: 'joined' as const, payment: s.price ? ('paid' as const) : ('free' as const), at: minsAgo(60 * 26) },
  ...s.players.map((u, j) => ({
    gameId: s.id,
    userId: u,
    role: 'player' as const,
    status: 'joined' as const,
    // A realistic mix: most players have paid, the last couple are still pending.
    payment: !s.price ? ('free' as const) : j >= s.players.length - ((i % 3) === 0 ? 2 : 1) ? ('pending' as const) : ('paid' as const),
    at: minsAgo(60 * 25 - j * 47),
  })),
]);

/** A little existing chatter so game chats don't open empty. */
export const SEED_MESSAGES: Message[] = [
  { id: 'm-g1-1', gameId: 'g1', userId: null, text: 'Alex created the game.', at: minsAgo(60 * 26) },
  { id: 'm-g1-2', gameId: 'g1', userId: 'u1', text: 'Usual rules: rush goalie, first to 10 or full hour.', at: minsAgo(60 * 25) },
  { id: 'm-g1-3', gameId: 'g1', userId: null, text: 'Sam joined the game.', at: minsAgo(60 * 24) },
  { id: 'm-g1-4', gameId: 'g1', userId: 'u2', text: 'In. Can someone bring a pump? Last week’s ball was flat.', at: minsAgo(60 * 20) },
  { id: 'm-g1-5', gameId: 'g1', userId: 'u15', text: 'Got one 👍', at: minsAgo(60 * 19) },
  { id: 'm-g1-6', gameId: 'g1', userId: null, text: 'Dan confirmed their place.', at: minsAgo(60 * 3) },
  { id: 'm-g6-1', gameId: 'g6', userId: null, text: 'Leila created the game.', at: minsAgo(60 * 26) },
  { id: 'm-g6-2', gameId: 'g6', userId: 'u10', text: 'Anyone fancy a 4th? Court 2 is the one with the good glass.', at: minsAgo(60 * 22) },
  { id: 'm-g5-1', gameId: 'g5', userId: null, text: 'Priya created the game.', at: minsAgo(60 * 26) },
  { id: 'm-g5-2', gameId: 'g5', userId: 'u3', text: 'I’ll bring new balls. See you on court 3!', at: minsAgo(60 * 8) },
];
