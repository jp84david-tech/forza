import type { SkillLevel, SportId, User } from './types';

/**
 * Other players on BALLS. Public profiles show first name + last initial and
 * an approximate area only — never contact details or addresses.
 */

export const AVATAR_COLORS = ['#3346F5', '#E4572E', '#138A4B', '#B7791F', '#7C4DDB', '#0B7EA8', '#C2417A', '#0F8C80', '#D9661F', '#4E5670'];

type Seed = [id: string, name: string, username: string, area: string, sports: Array<[SportId, SkillLevel]>, games: number, att: [number, number, number], extra?: Partial<User>];

const SEEDS: Seed[] = [
  ['u1', 'Alex M.', 'alexm', 'Highgate', [['football', 'intermediate'], ['padel', 'casual']], 48, [47, 1, 0], { achievements: ['first-game', 'games-5', 'games-10', 'tournament'] }],
  ['u2', 'Sam O.', 'samokoye', 'Archway', [['football', 'intermediate'], ['basketball', 'casual']], 31, [30, 1, 0], { achievements: ['first-game', 'games-5', 'games-10'] }],
  ['u3', 'Priya S.', 'priyaplays', 'Tufnell Park', [['tennis', 'advanced'], ['padel', 'intermediate']], 64, [63, 1, 0], { achievements: ['first-game', 'games-5', 'games-10', 'games-50', 'tournament', 'early-bird'], verified: true }],
  ['u4', 'Jordan L.', 'jlee', 'Kentish Town', [['basketball', 'advanced'], ['football', 'casual']], 72, [70, 2, 0], { achievements: ['first-game', 'games-5', 'games-10', 'games-50', 'local-legend'] }],
  ['u5', 'Tom W.', 'tomwalsh', 'Crouch End', [['football', 'advanced'], ['rugby', 'intermediate']], 39, [36, 2, 1], { achievements: ['first-game', 'games-5', 'games-10'] }],
  ['u6', 'Aisha B.', 'aishab', 'Holloway', [['badminton', 'intermediate'], ['volleyball', 'casual']], 22, [22, 0, 0], { achievements: ['first-game', 'games-5', 'games-10'] }],
  ['u7', 'Marcus R.', 'marcusr', 'Finsbury Park', [['football', 'competitive'], ['running', 'advanced']], 88, [85, 2, 1], { achievements: ['first-game', 'games-5', 'games-10', 'games-50', 'tournament', 'local-legend'] }],
  ['u8', 'Chloe E.', 'chloee', 'Dartmouth Park', [['tennis', 'intermediate'], ['swimming', 'casual']], 17, [17, 0, 0], { achievements: ['first-game', 'games-5', 'games-10'] }],
  ['u9', 'Ben C.', 'bencarter', 'Highgate', [['football', 'casual'], ['cricket', 'intermediate']], 12, [11, 1, 0], { achievements: ['first-game', 'games-5', 'games-10'] }],
  ['u10', 'Leila H.', 'leilah', 'Camden Town', [['padel', 'advanced'], ['tennis', 'intermediate']], 41, [41, 0, 0], { achievements: ['first-game', 'games-5', 'games-10', 'tournament'] }],
  ['u11', 'Kofi M.', 'kofim', 'Archway', [['football', 'intermediate'], ['basketball', 'intermediate']], 27, [25, 1, 1], { achievements: ['first-game', 'games-5', 'games-10'] }],
  ['u12', 'Hannah K.', 'hannahk', 'Muswell Hill', [['running', 'intermediate'], ['swimming', 'intermediate']], 35, [35, 0, 0], { achievements: ['first-game', 'games-5', 'games-10', 'early-bird'] }],
  ['u13', 'Josh P.', 'joshp', 'Holloway', [['football', 'beginner'], ['gym', 'casual']], 4, [4, 0, 0], { achievements: ['first-game'] }],
  ['u14', 'Ella B.', 'ellab', 'Hornsey', [['volleyball', 'advanced'], ['badminton', 'casual']], 29, [28, 1, 0], { achievements: ['first-game', 'games-5', 'games-10', 'tournament'] }],
  ['u15', 'Dan M.', 'danmurphy', 'Tufnell Park', [['football', 'intermediate']], 53, [48, 3, 2], { achievements: ['first-game', 'games-5', 'games-10', 'games-50'] }],
  ['u16', 'Zara A.', 'zaraa', 'Kentish Town', [['basketball', 'intermediate'], ['running', 'casual']], 19, [19, 0, 0], { achievements: ['first-game', 'games-5', 'games-10'] }],
  ['u17', 'Luca R.', 'lucar', 'Crouch End', [['padel', 'intermediate'], ['football', 'intermediate']], 33, [32, 1, 0], { achievements: ['first-game', 'games-5', 'games-10'] }],
  ['u18', 'Maya G.', 'mayag', 'Gospel Oak', [['tennis', 'casual'], ['running', 'intermediate']], 14, [14, 0, 0], { achievements: ['first-game', 'games-5', 'games-10'] }],
  ['u19', 'Ryan O.', 'ryano', 'Finsbury Park', [['football', 'advanced'], ['basketball', 'casual']], 61, [57, 3, 1], { achievements: ['first-game', 'games-5', 'games-10', 'games-50'] }],
  ['u20', 'Sofia M.', 'sofiam', 'Highgate', [['badminton', 'advanced'], ['tennis', 'casual']], 44, [44, 0, 0], { achievements: ['first-game', 'games-5', 'games-10', 'tournament'] }],
  ['u21', 'Nathan C.', 'nathanc', 'Upper Holloway', [['football', 'intermediate'], ['gym', 'intermediate']], 26, [24, 2, 0], { achievements: ['first-game', 'games-5', 'games-10'] }],
  ['u22', 'Grace A.', 'gracea', 'Archway', [['basketball', 'intermediate'], ['volleyball', 'casual']], 21, [21, 0, 0], { achievements: ['first-game', 'games-5', 'games-10'] }],
  ['u23', 'Oliver H.', 'oliverh', 'Belsize Park', [['cricket', 'advanced'], ['tennis', 'intermediate']], 38, [37, 1, 0], { achievements: ['first-game', 'games-5', 'games-10'] }],
  ['u24', 'Isla F.', 'islaf', 'Muswell Hill', [['rugby', 'intermediate'], ['running', 'advanced']], 30, [30, 0, 0], { achievements: ['first-game', 'games-5', 'games-10'] }],
  ['u25', 'Tariq H.', 'tariqh', 'Holloway', [['football', 'intermediate'], ['cricket', 'intermediate']], 45, [43, 1, 1], { achievements: ['first-game', 'games-5', 'games-10'] }],
  ['u26', 'Freya N.', 'freyan', 'Hampstead', [['swimming', 'advanced'], ['running', 'intermediate']], 52, [52, 0, 0], { achievements: ['first-game', 'games-5', 'games-10', 'games-50', 'early-bird'] }],
  ['u27', 'Callum W.', 'callumw', 'Tufnell Park', [['football', 'casual'], ['padel', 'beginner']], 9, [8, 1, 0], { achievements: ['first-game', 'games-5'] }],
  ['u28', 'Nia T.', 'niat', 'Camden Town', [['basketball', 'competitive'], ['volleyball', 'intermediate']], 57, [56, 1, 0], { achievements: ['first-game', 'games-5', 'games-10', 'games-50', 'tournament'] }],
  ['u29', 'Kai C.', 'kaic', 'Crouch End', [['badminton', 'intermediate'], ['tennis', 'intermediate']], 23, [22, 1, 0], { achievements: ['first-game', 'games-5', 'games-10'] }],
  ['u30', 'Rosie B.', 'rosieb', 'Dartmouth Park', [['padel', 'casual'], ['tennis', 'beginner']], 6, [6, 0, 0], { achievements: ['first-game', 'games-5'], visibility: 'players' }],
];

export const PEOPLE: User[] = SEEDS.map(([id, name, username, area, sports, games, att, extra], i) => ({
  id,
  name,
  username,
  area,
  color: AVATAR_COLORS[i % AVATAR_COLORS.length],
  sports: sports.map(([sport, level]) => ({ sport, level })),
  gamesPlayed: games,
  attendance: { attended: att[0], lateCancels: att[1], noShows: att[2] },
  achievements: [],
  joined: `202${4 + (i % 2)}-0${1 + (i % 9)}-1${i % 9}`,
  visibility: 'everyone',
  ageGroup: 'adult',
  ...extra,
}));

export const PERSON_BY_ID: Record<string, User> = Object.fromEntries(PEOPLE.map((p) => [p.id, p]));

/** People the demo account follows / has played with. */
export const DEMO_FRIENDS = ['u1', 'u2', 'u3', 'u9', 'u11', 'u15', 'u17', 'u21', 'u27'];

export const TAKEN_USERNAMES = new Set(['david', 'balls', 'admin', ...PEOPLE.map((p) => p.username)]);
