import type { SkillLevel, Sport, SportId } from './types';

/**
 * Sport catalogue. Each sport declares its own formats, stats and space
 * attributes so screens never force football concepts onto tennis players.
 */
export const SPORTS: Sport[] = [
  {
    id: 'football',
    name: 'Football',
    space: 'pitch',
    formats: [
      { id: '5', label: '5-a-side', players: 10 },
      { id: '7', label: '7-a-side', players: 14 },
      { id: '11', label: '11-a-side', players: 22 },
    ],
    stats: [
      { id: 'games', label: 'Games', kind: 'count', ranked: true },
      { id: 'goals', label: 'Goals', kind: 'count', ranked: true },
      { id: 'assists', label: 'Assists', kind: 'count', ranked: true },
      { id: 'wins', label: 'Wins', kind: 'count', ranked: true },
    ],
    attributes: ['format', 'surface', 'floodlights'],
  },
  {
    id: 'basketball',
    name: 'Basketball',
    space: 'court',
    formats: [
      { id: '3x3', label: '3x3 half court', players: 6 },
      { id: '5x5', label: '5v5 full court', players: 10 },
    ],
    stats: [
      { id: 'games', label: 'Games', kind: 'count', ranked: true },
      { id: 'points', label: 'Points', kind: 'count', ranked: true },
      { id: 'assists', label: 'Assists', kind: 'count' },
      { id: 'rebounds', label: 'Rebounds', kind: 'count' },
      { id: 'wins', label: 'Wins', kind: 'count', ranked: true },
    ],
    attributes: ['court', 'surface', 'hoops'],
  },
  {
    id: 'tennis',
    name: 'Tennis',
    space: 'court',
    formats: [
      { id: 'singles', label: 'Singles', players: 2 },
      { id: 'doubles', label: 'Doubles', players: 4 },
    ],
    stats: [
      { id: 'matches', label: 'Matches', kind: 'count', ranked: true },
      { id: 'wins', label: 'Wins', kind: 'count', ranked: true },
      { id: 'winRate', label: 'Win rate', kind: 'percent' },
      { id: 'rating', label: 'Rating', kind: 'rating', ranked: true },
    ],
    attributes: ['surface', 'play'],
  },
  {
    id: 'padel',
    name: 'Padel',
    space: 'court',
    formats: [{ id: 'doubles', label: 'Doubles', players: 4 }],
    stats: [
      { id: 'matches', label: 'Matches', kind: 'count', ranked: true },
      { id: 'wins', label: 'Wins', kind: 'count', ranked: true },
      { id: 'winRate', label: 'Win rate', kind: 'percent' },
    ],
    attributes: ['court', 'walls'],
  },
  {
    id: 'badminton',
    name: 'Badminton',
    space: 'court',
    formats: [
      { id: 'singles', label: 'Singles', players: 2 },
      { id: 'doubles', label: 'Doubles', players: 4 },
    ],
    stats: [
      { id: 'matches', label: 'Matches', kind: 'count', ranked: true },
      { id: 'wins', label: 'Wins', kind: 'count', ranked: true },
      { id: 'winRate', label: 'Win rate', kind: 'percent' },
    ],
    attributes: ['courts', 'floor'],
  },
  {
    id: 'volleyball',
    name: 'Volleyball',
    space: 'court',
    formats: [
      { id: 'beach', label: 'Beach 2v2', players: 4 },
      { id: 'indoor', label: 'Indoor 6v6', players: 12 },
    ],
    stats: [
      { id: 'games', label: 'Games', kind: 'count', ranked: true },
      { id: 'wins', label: 'Wins', kind: 'count', ranked: true },
      { id: 'aces', label: 'Aces', kind: 'count', ranked: true },
    ],
    attributes: ['surface', 'net'],
  },
  {
    id: 'cricket',
    name: 'Cricket',
    space: 'net',
    formats: [
      { id: 'nets', label: 'Nets session', players: 6 },
      { id: 't20', label: 'T20', players: 22 },
    ],
    stats: [
      { id: 'matches', label: 'Matches', kind: 'count', ranked: true },
      { id: 'runs', label: 'Runs', kind: 'count', ranked: true },
      { id: 'wickets', label: 'Wickets', kind: 'count', ranked: true },
    ],
    attributes: ['type', 'bowling'],
  },
  {
    id: 'rugby',
    name: 'Rugby',
    space: 'pitch',
    formats: [
      { id: 'touch', label: 'Touch rugby', players: 12 },
      { id: '15s', label: 'Union 15s', players: 30 },
    ],
    stats: [
      { id: 'games', label: 'Games', kind: 'count', ranked: true },
      { id: 'tries', label: 'Tries', kind: 'count', ranked: true },
      { id: 'wins', label: 'Wins', kind: 'count', ranked: true },
    ],
    attributes: ['surface', 'floodlights'],
  },
  {
    id: 'running',
    name: 'Running',
    space: 'track',
    formats: [{ id: 'group', label: 'Group run', players: 20 }],
    stats: [
      { id: 'runs', label: 'Runs', kind: 'count', ranked: true },
      { id: 'distance', label: 'Distance', kind: 'km', ranked: true },
      { id: 'best5k', label: 'Best 5K (min)', kind: 'count' },
    ],
    attributes: ['surface', 'length'],
  },
  {
    id: 'gym',
    name: 'Gym',
    space: 'session',
    formats: [],
    stats: [
      { id: 'sessions', label: 'Sessions', kind: 'count', ranked: true },
      { id: 'hours', label: 'Hours', kind: 'count', ranked: true },
    ],
    attributes: ['type'],
  },
  {
    id: 'swimming',
    name: 'Swimming',
    space: 'lane',
    formats: [],
    stats: [
      { id: 'swims', label: 'Swims', kind: 'count', ranked: true },
      { id: 'distance', label: 'Distance', kind: 'km', ranked: true },
    ],
    attributes: ['pool', 'length'],
  },
  {
    id: 'other',
    name: 'Other',
    space: 'space',
    formats: [],
    stats: [{ id: 'sessions', label: 'Sessions', kind: 'count', ranked: true }],
    attributes: ['type'],
  },
];

/** BALLS launches with tennis and padel only. */
export const PLAYABLE: SportId[] = ['padel', 'tennis'];

export const SPORT_BY_ID = Object.fromEntries(SPORTS.map((s) => [s.id, s])) as Record<SportId, Sport>;

export const sportName = (id: SportId) => SPORT_BY_ID[id]?.name ?? 'Sport';

/** Human label for a space attribute key. */
export const ATTRIBUTE_LABELS: Record<string, string> = {
  format: 'Format',
  surface: 'Surface',
  floodlights: 'Floodlights',
  court: 'Court',
  hoops: 'Hoops',
  play: 'Suits',
  walls: 'Walls',
  courts: 'Courts',
  floor: 'Floor',
  net: 'Net',
  type: 'Type',
  bowling: 'Bowling',
  length: 'Length',
  pool: 'Pool',
};

export const SKILL_LEVELS: Array<{ id: SkillLevel; label: string; hint: string }> = [
  { id: 'beginner', label: 'Beginner', hint: 'New to it, or getting back into it' },
  { id: 'casual', label: 'Casual', hint: 'Play for fun, now and then' },
  { id: 'intermediate', label: 'Intermediate', hint: 'Play regularly, know the game' },
  { id: 'advanced', label: 'Advanced', hint: 'Strong, consistent, competitive edge' },
  { id: 'competitive', label: 'Competitive', hint: 'Club, league or tournament standard' },
];

export const levelLabel = (l: SkillLevel) => SKILL_LEVELS.find((s) => s.id === l)?.label ?? l;
export const levelIndex = (l: SkillLevel) => SKILL_LEVELS.findIndex((s) => s.id === l);

/** Default game size for a sport/format when creating a game. */
export function defaultPlayers(sport: SportId, formatId?: string): number {
  const s = SPORT_BY_ID[sport];
  const f = s.formats.find((x) => x.id === formatId) ?? s.formats[0];
  return f?.players ?? 8;
}
