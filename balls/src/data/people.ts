import type { SkillLevel, SportId, User } from './types';

/**
 * Other players on BALLS. Public profiles show first name + last initial and
 * an approximate area only — never contact details or addresses.
 */

export const AVATAR_COLORS = ['#3d5a4a', '#6b5a45', '#3f4a66', '#5a4660', '#4a5f3a', '#6a4a42', '#355a5f', '#5f5a3a', '#4b4f57'];

type Seed = [id: string, name: string, username: string, area: string, sports: Array<[SportId, SkillLevel]>, games: number, att: [number, number, number], extra?: Partial<User>];

const SEEDS: Seed[] = [
  ['u1', 'Alex M.', 'alexm', 'Highgate', [['padel', 'casual'], ['tennis', 'casual']], 48, [47, 1, 0], { achievements: ['first-game', 'games-5', 'games-10', 'tournament'] }],
  ['u2', 'Sam O.', 'samokoye', 'Archway', [['tennis', 'intermediate'], ['padel', 'casual']], 31, [30, 1, 0], { achievements: ['first-game', 'games-5', 'games-10'] }],
  ['u3', 'Priya S.', 'priyaplays', 'Tufnell Park', [['tennis', 'advanced'], ['padel', 'intermediate']], 64, [63, 1, 0], { achievements: ['first-game', 'games-5', 'games-10', 'games-50', 'tournament', 'early-bird'], verified: true }],
  ['u4', 'Jordan L.', 'jlee', 'Kentish Town', [['tennis', 'advanced'], ['padel', 'casual']], 72, [70, 2, 0], { achievements: ['first-game', 'games-5', 'games-10', 'games-50', 'local-legend'] }],
  ['u5', 'Tom W.', 'tomwalsh', 'Crouch End', [['padel', 'advanced'], ['tennis', 'intermediate']], 39, [36, 2, 1], { achievements: ['first-game', 'games-5', 'games-10'] }],
  ['u6', 'Aisha B.', 'aishab', 'Holloway', [['tennis', 'intermediate'], ['padel', 'casual']], 22, [22, 0, 0], { achievements: ['first-game', 'games-5', 'games-10'] }],
  ['u7', 'Marcus R.', 'marcusr', 'Finsbury Park', [['padel', 'competitive'], ['tennis', 'advanced']], 88, [85, 2, 1], { achievements: ['first-game', 'games-5', 'games-10', 'games-50', 'tournament', 'local-legend'] }],
  ['u8', 'Chloe E.', 'chloee', 'Dartmouth Park', [['tennis', 'intermediate'], ['padel', 'casual']], 17, [17, 0, 0], { achievements: ['first-game', 'games-5', 'games-10'] }],
  ['u9', 'Ben C.', 'bencarter', 'Highgate', [['padel', 'casual'], ['tennis', 'intermediate']], 12, [11, 1, 0], { achievements: ['first-game', 'games-5', 'games-10'] }],
  ['u10', 'Leila H.', 'leilah', 'Camden Town', [['padel', 'advanced'], ['tennis', 'intermediate']], 41, [41, 0, 0], { achievements: ['first-game', 'games-5', 'games-10', 'tournament'] }],
  ['u11', 'Kofi M.', 'kofim', 'Archway', [['padel', 'intermediate'], ['tennis', 'intermediate']], 27, [25, 1, 1], { achievements: ['first-game', 'games-5', 'games-10'] }],
  ['u12', 'Hannah K.', 'hannahk', 'Muswell Hill', [['tennis', 'intermediate'], ['padel', 'intermediate']], 35, [35, 0, 0], { achievements: ['first-game', 'games-5', 'games-10', 'early-bird'] }],
  ['u13', 'Josh P.', 'joshp', 'Holloway', [['padel', 'beginner'], ['tennis', 'casual']], 4, [4, 0, 0], { achievements: ['first-game'] }],
  ['u14', 'Ella B.', 'ellab', 'Hornsey', [['tennis', 'advanced'], ['padel', 'casual']], 29, [28, 1, 0], { achievements: ['first-game', 'games-5', 'games-10', 'tournament'] }],
  ['u15', 'Dan M.', 'danmurphy', 'Tufnell Park', [['padel', 'intermediate'], ['tennis', 'casual']], 53, [48, 3, 2], { achievements: ['first-game', 'games-5', 'games-10', 'games-50'] }],
  ['u16', 'Zara A.', 'zaraa', 'Kentish Town', [['tennis', 'intermediate'], ['padel', 'casual']], 19, [19, 0, 0], { achievements: ['first-game', 'games-5', 'games-10'] }],
  ['u17', 'Luca R.', 'lucar', 'Crouch End', [['padel', 'intermediate'], ['tennis', 'intermediate']], 33, [32, 1, 0], { achievements: ['first-game', 'games-5', 'games-10'] }],
  ['u18', 'Maya G.', 'mayag', 'Gospel Oak', [['tennis', 'casual'], ['padel', 'intermediate']], 14, [14, 0, 0], { achievements: ['first-game', 'games-5', 'games-10'] }],
  ['u19', 'Ryan O.', 'ryano', 'Finsbury Park', [['padel', 'advanced'], ['tennis', 'casual']], 61, [57, 3, 1], { achievements: ['first-game', 'games-5', 'games-10', 'games-50'] }],
  ['u20', 'Sofia M.', 'sofiam', 'Highgate', [['tennis', 'casual'], ['padel', 'casual']], 44, [44, 0, 0], { achievements: ['first-game', 'games-5', 'games-10', 'tournament'] }],
  ['u21', 'Nathan C.', 'nathanc', 'Upper Holloway', [['padel', 'intermediate'], ['tennis', 'intermediate']], 26, [24, 2, 0], { achievements: ['first-game', 'games-5', 'games-10'] }],
  ['u22', 'Grace A.', 'gracea', 'Archway', [['tennis', 'intermediate'], ['padel', 'casual']], 21, [21, 0, 0], { achievements: ['first-game', 'games-5', 'games-10'] }],
  ['u23', 'Oliver H.', 'oliverh', 'Belsize Park', [['tennis', 'intermediate'], ['padel', 'intermediate']], 38, [37, 1, 0], { achievements: ['first-game', 'games-5', 'games-10'] }],
  ['u24', 'Isla F.', 'islaf', 'Muswell Hill', [['tennis', 'intermediate'], ['padel', 'advanced']], 30, [30, 0, 0], { achievements: ['first-game', 'games-5', 'games-10'] }],
  ['u25', 'Tariq H.', 'tariqh', 'Holloway', [['padel', 'intermediate'], ['tennis', 'intermediate']], 45, [43, 1, 1], { achievements: ['first-game', 'games-5', 'games-10'] }],
  ['u26', 'Freya N.', 'freyan', 'Hampstead', [['tennis', 'advanced'], ['padel', 'intermediate']], 52, [52, 0, 0], { achievements: ['first-game', 'games-5', 'games-10', 'games-50', 'early-bird'] }],
  ['u27', 'Callum W.', 'callumw', 'Tufnell Park', [['padel', 'beginner'], ['tennis', 'beginner']], 9, [8, 1, 0], { achievements: ['first-game', 'games-5'] }],
  ['u28', 'Nia T.', 'niat', 'Camden Town', [['tennis', 'competitive'], ['padel', 'intermediate']], 57, [56, 1, 0], { achievements: ['first-game', 'games-5', 'games-10', 'games-50', 'tournament'] }],
  ['u29', 'Kai C.', 'kaic', 'Crouch End', [['tennis', 'intermediate'], ['padel', 'intermediate']], 23, [22, 1, 0], { achievements: ['first-game', 'games-5', 'games-10'] }],
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

/** The demo account's friends (added each other). */
export const DEMO_FRIENDS = ['u3', 'u10', 'u17', 'u2', 'u8', 'u29'];

export const TAKEN_USERNAMES = new Set(['david', 'balls', 'admin', ...PEOPLE.map((p) => p.username)]);

/** "@alexm is taken. Try alexm2." — or null if the name is free. */
export function usernameTaken(name: string): string | null {
  if (!TAKEN_USERNAMES.has(name)) return null;
  let n = 2;
  while (TAKEN_USERNAMES.has(`${name}${n}`)) n++;
  return `@${name} is already taken. Try ${name}${n}.`;
}
