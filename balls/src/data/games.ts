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
    id: 'g1', sport: 'padel', format: 'Doubles', facilityId: 'archway-padel', spaceId: 'ap-2', day: 0, hour: 20, level: 'intermediate', max: 4, price: 1100,
    creator: 'u10', players: ['u17', 'u1'],
    description: 'Need a fourth for an evening match. Two sets, we rotate partners after the first.',
  },
  {
    id: 'g2', sport: 'tennis', format: 'Singles', facilityId: 'queens-wood', spaceId: 'qw-1', day: 0, hour: 18, level: 'casual', max: 2, price: 500,
    creator: 'u18', players: [],
    description: 'Casual hit and maybe a set. Happy to just rally.',
  },
  {
    id: 'g3', sport: 'tennis', format: 'Doubles', facilityId: 'dartmouth-tennis', spaceId: 'dpt-3', day: 1, hour: 18, level: 'intermediate', max: 4, price: 550,
    creator: 'u3', players: ['u8'],
    description: 'Doubles on the clay court. Looking for a steady intermediate pair. Balls provided.',
  },
  {
    id: 'g4', sport: 'padel', format: 'Doubles', facilityId: 'clocktower-padel', spaceId: 'ctp-1', day: 1, hour: 19, level: 'beginner', max: 4, price: 950,
    creator: 'u30', players: ['u27'],
    description: 'We are both fairly new to padel. Anyone else learning is very welcome. Rackets can be hired on site.',
  },
  {
    id: 'g5', sport: 'padel', format: 'Americano', facilityId: 'camden-padel', spaceId: 'crp-1', day: 2, hour: 19, mins: 120, level: 'intermediate', max: 8, price: 1400,
    creator: 'u19', players: ['u5', 'u7', 'u11', 'u15', 'u25'],
    description: 'Americano on two courts: short games, new partner every round, scores added up at the end. Very sociable.',
  },
  {
    id: 'g6', sport: 'tennis', format: 'Doubles', facilityId: 'highgate-sc', spaceId: 'hsc-t3', day: 0, hour: 21, level: 'intermediate', max: 4, price: 400,
    creator: 'u2', players: ['u9', 'u22'],
    description: 'Late doubles under the lights. One spot left. Good rallies, no big servers please.',
  },
  {
    id: 'g7', sport: 'tennis', format: 'Singles', facilityId: 'holloway-tennis', spaceId: 'hit-2', day: 1, hour: 7, level: 'advanced', max: 2, price: 1000,
    creator: 'u28', players: [],
    description: 'Early singles before work, indoors. Looking for a strong baseliner. Two sets or first to 7.',
  },
  {
    id: 'g8', sport: 'padel', format: 'Doubles', facilityId: 'crouch-end-padel', spaceId: 'cep-2', day: 2, hour: 18, level: 'casual', max: 4, price: 850,
    creator: 'u20', players: ['u29'],
    description: 'Friendly doubles after work. We are here to have fun and learn the walls, not to win.',
  },
  {
    id: 'g9', sport: 'tennis', format: 'Doubles', facilityId: 'finsbury-hub', spaceId: 'fph-t2', day: 3, hour: 10, level: 'casual', max: 4, price: 300,
    creator: 'u6', players: ['u14', 'u16'],
    description: 'Morning doubles in the park. All levels from casual up. Coffee afterwards at the café.',
  },
  {
    id: 'g10', sport: 'padel', format: 'Doubles', facilityId: 'archway-padel', spaceId: 'ap-4', day: 3, hour: 20, level: 'advanced', max: 4, price: 1000,
    creator: 'u7', players: ['u24', 'u5'],
    description: 'Competitive match, golden point. Please only join if you play at least weekly.',
  },
  {
    id: 'g11', sport: 'tennis', format: 'Singles', facilityId: 'tufnell-courts', spaceId: 'tpt-1', day: 1, hour: 19, level: 'beginner', max: 2, price: 450,
    creator: 'u13', players: [],
    description: 'Just started lessons and want someone to practise with. Totally fine if you are also a beginner.',
  },
  {
    id: 'g12', sport: 'tennis', format: 'Doubles', facilityId: 'muswell-ltc', spaceId: 'mltc-g', day: daysUntil(6), hour: 11, mins: 90, level: 'intermediate', max: 4, price: 600,
    creator: 'u12', players: ['u26', 'u23'],
    description: 'Saturday doubles on the grass court while it lasts. Whites optional but encouraged.',
  },
  {
    id: 'g13', sport: 'padel', format: 'Americano', facilityId: 'finsbury-hub', spaceId: 'fph-pa', day: daysUntil(0), hour: 10, mins: 120, level: 'beginner', max: 8, price: 1100,
    creator: 'u21', players: ['u13', 'u27', 'u9'],
    description: 'Beginner Americano. Never played or only played once or twice? This is the one. We explain the rules as we go.',
  },
  {
    id: 'g14', sport: 'tennis', format: 'Singles', facilityId: 'waterlow-park', spaceId: 'wp-1', day: 0, hour: 18.5, level: 'casual', max: 2, price: 0,
    creator: 'u4', players: [],
    description: 'Free public court, just turn up. Bring a can of balls if you have one.',
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
  { id: 'm-g1-1', gameId: 'g1', userId: null, text: 'Leila created the game.', at: minsAgo(60 * 26) },
  { id: 'm-g1-2', gameId: 'g1', userId: 'u10', text: 'Anyone fancy a fourth? Court 2 is the one with the good glass.', at: minsAgo(60 * 22) },
  { id: 'm-g1-3', gameId: 'g1', userId: null, text: 'Luca joined the game.', at: minsAgo(60 * 20) },
  { id: 'm-g3-1', gameId: 'g3', userId: null, text: 'Priya created the game.', at: minsAgo(60 * 26) },
  { id: 'm-g3-2', gameId: 'g3', userId: 'u3', text: 'I’ll bring new balls. See you on court 3.', at: minsAgo(60 * 8) },
  { id: 'm-g5-1', gameId: 'g5', userId: null, text: 'Ryan created the game.', at: minsAgo(60 * 26) },
  { id: 'm-g5-2', gameId: 'g5', userId: 'u19', text: 'Two courts booked. We start at 19:00 sharp, so warm up before.', at: minsAgo(60 * 12) },
];
