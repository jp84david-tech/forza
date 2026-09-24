import { rng } from '../lib/rng';
import { addDays, dateKey, now, startOfDay } from '../lib/time';
import { daysUntil, slot } from './schedule';
import type { Fixture, League, StatLine, Team, Tournament } from './types';
import { PEOPLE } from './people';
import { SPORT_BY_ID } from './sports';
import type { SportId } from './types';

/** Tournaments, leagues and leaderboards. In production: /competitions/* */

const sat = daysUntil(6);

export const TOURNAMENTS: Tournament[] = [
  {
    id: 't1',
    name: 'Highgate 5s Cup',
    sport: 'football',
    facilityId: 'highgate-sc',
    ...slot(sat + 7, 10, 7 * 60),
    format: '5-a-side · groups then knockout',
    teamSize: 8,
    maxEntries: 16,
    entries: 12,
    entryFee: 6000,
    entryUnit: 'team',
    level: 'intermediate',
    prize: 'Trophies, medals and a month of free pitch hire',
    registration: 'open',
    closesAt: slot(sat + 5, 23.5).start,
    organiser: 'Highgate Sports Centre',
    description: 'Sixteen teams, one day, one trophy. Four groups of four, then quarter-finals. Every team is guaranteed at least three games.',
    schedule: [
      { time: '9:30 AM', label: 'Check-in and warm-up' },
      { time: '10:00 AM', label: 'Group stage' },
      { time: '1:30 PM', label: 'Quarter-finals' },
      { time: '3:00 PM', label: 'Semi-finals' },
      { time: '4:15 PM', label: 'Final and presentation' },
    ],
    rules: ['Squads of 5 plus up to 3 rolling subs', '12-minute games, 20 in the final', 'No slide tackles; shin pads required', 'Fair-play award voted by referees'],
  },
  {
    id: 't2',
    name: 'North London Padel Open',
    sport: 'padel',
    facilityId: 'archway-padel',
    ...slot(9, 9, 9 * 60),
    format: 'Doubles · round robin then knockout',
    teamSize: 2,
    maxEntries: 24,
    entries: 16,
    entryFee: 4000,
    entryUnit: 'team',
    level: 'advanced',
    prize: 'Pro rackets for the winners',
    registration: 'open',
    closesAt: slot(7, 20).start,
    organiser: 'Archway Padel Club',
    description: 'The club’s flagship open for strong pairs. Pools of four, top two go through to the knockout draw.',
    schedule: [
      { time: '8:45 AM', label: 'Check-in' },
      { time: '9:00 AM', label: 'Pool matches' },
      { time: '2:00 PM', label: 'Knockouts' },
      { time: '5:30 PM', label: 'Final' },
    ],
    rules: ['Golden point at deuce', 'Pool games are one set to 6', 'Bring your own racket (hire available)'],
  },
  {
    id: 't3',
    name: 'Whittington 3x3 Slam',
    sport: 'basketball',
    facilityId: 'nl-basketball',
    ...slot(5, 12, 5 * 60),
    format: '3x3 · single elimination',
    teamSize: 4,
    maxEntries: 16,
    entries: 10,
    entryFee: 2000,
    entryUnit: 'team',
    level: 'casual',
    prize: 'Trophy and bragging rights',
    registration: 'open',
    closesAt: slot(4, 18).start,
    organiser: 'North London Hoops Collective',
    description: 'Outdoor 3x3 on the Whittington Park courts. First to 21 or 10 minutes. DJ, food truck and a three-point contest between rounds.',
    schedule: [
      { time: '11:30 AM', label: 'Registration' },
      { time: '12:00 PM', label: 'Round of 16' },
      { time: '2:30 PM', label: 'Three-point contest' },
      { time: '4:00 PM', label: 'Final' },
    ],
    rules: ['Teams of 3 plus 1 sub', 'Standard FIBA 3x3 scoring', 'Self-refereed until the semis'],
  },
  {
    id: 't4',
    name: 'Dartmouth Park Club Championships',
    sport: 'tennis',
    facilityId: 'dartmouth-tennis',
    ...slot(14, 9, 10 * 60),
    format: 'Singles · knockout',
    teamSize: 1,
    maxEntries: 32,
    entries: 28,
    entryFee: 1500,
    entryUnit: 'player',
    level: 'intermediate',
    registration: 'external',
    externalUrl: 'https://www.lta.org.uk/competitions/',
    closesAt: slot(11, 20).start,
    organiser: 'Dartmouth Park Tennis Club',
    description: 'The club’s open singles championships. Entries are handled by the club through the LTA competition system.',
    schedule: [
      { time: '9:00 AM', label: 'First round' },
      { time: '3:00 PM', label: 'Semi-finals' },
      { time: '5:00 PM', label: 'Finals' },
    ],
    rules: ['Best of three tie-break sets', 'Match tie-break instead of a third set', 'LTA rating required'],
  },
  {
    id: 't5',
    name: 'Heath Relay Challenge',
    sport: 'running',
    facilityId: 'heath-track',
    ...slot(11, 9.5, 3 * 60),
    format: '4 × 1,600m relay',
    teamSize: 4,
    maxEntries: 30,
    entries: 18,
    entryFee: 3200,
    entryUnit: 'team',
    level: 'casual',
    prize: 'Medals for every finisher',
    registration: 'open',
    closesAt: slot(9, 20).start,
    organiser: 'Parliament Hill Track',
    description: 'Grab three friends and run four laps each. Mixed teams encouraged, with a category for every ability.',
    schedule: [
      { time: '9:00 AM', label: 'Team check-in' },
      { time: '9:30 AM', label: 'Heats' },
      { time: '11:30 AM', label: 'Finals and medals' },
    ],
    rules: ['Four runners, four laps each', 'Baton provided', 'Spikes allowed on the track'],
  },
  {
    id: 't6',
    name: 'Hornsey King of the Court',
    sport: 'volleyball',
    facilityId: 'hornsey-beach',
    ...slot(6, 18, 4 * 60),
    format: 'Beach 2v2 · king of the court',
    teamSize: 2,
    maxEntries: 16,
    entries: 11,
    entryFee: 2400,
    entryUnit: 'team',
    level: 'intermediate',
    prize: 'Crowns (really) and free court hire',
    registration: 'open',
    closesAt: slot(5, 20).start,
    organiser: 'Hornsey Beach Volleyball',
    description: 'Fast rotating format: win the rally to move to the king side, score only from the king side.',
    schedule: [
      { time: '5:45 PM', label: 'Check-in' },
      { time: '6:00 PM', label: 'Rounds' },
      { time: '9:30 PM', label: 'Crowning' },
    ],
    rules: ['Pairs only', '15-minute rounds', 'Covered courts, so no weather delays'],
  },
  {
    id: 't7',
    name: 'Crouch End Badminton Doubles',
    sport: 'badminton',
    facilityId: 'crouch-end-hall',
    ...slot(20, 10, 6 * 60),
    format: 'Doubles · groups then knockout',
    teamSize: 2,
    maxEntries: 20,
    entries: 20,
    entryFee: 2000,
    entryUnit: 'team',
    level: 'intermediate',
    registration: 'closed',
    closesAt: slot(2, 12).start,
    organiser: 'Crouch End Sports Hall',
    description: 'Twenty pairs, feather shuttles, and the best rallies in N8. This year’s draw is full.',
    schedule: [
      { time: '10:00 AM', label: 'Group stage' },
      { time: '2:00 PM', label: 'Knockouts' },
    ],
    rules: ['Rally scoring to 21', 'Feather shuttles provided'],
  },
];

// ---------------------------------------------------------------- Leagues

const FOOTBALL_TEAMS = ['Archway Athletic', 'Tufnell Tornados', 'Real Holloway', 'Dynamo Kentish', 'Sporting Highgate', 'Inter Crouch End', 'FC Whittington', 'Hornsey Hotspurs', 'Junction Road Rovers', 'Parkland Walkers'];
const SEVENS_TEAMS = ['Highgate Hill FC', 'Waterlow Wanderers', 'Archway Road Rangers', 'Pond Square Albion', 'Swains Lane Utd', 'Heathside 7s', 'Cholmeley Park'];
const PADEL_TEAMS = ['Vibora Two', 'Bandeja Brothers', 'Glass Act', 'Golden Point', 'Net Profit', 'Lob City', 'Por Tres', 'Chiquita Banana'];
const VOLLEY_TEAMS = ['Sandy Cheeks', 'Dig It', 'Block Party', 'Spike Lee', 'Set Happens', 'Net Gains'];
const HOOPS_TEAMS = ['Holloway Heat', 'Camden Kings', 'Archway Arches', 'Kentish Kraken', 'Tufnell Titans', 'N19 Hoopers', 'Finsbury Flyers', 'Crouch End Cavs'];
const TEAM_COLORS = ['#3346F5', '#E4572E', '#138A4B', '#B7791F', '#7C4DDB', '#0B7EA8', '#C2417A', '#0F8C80', '#D9661F', '#4E5670'];

function makeTeams(prefix: string, names: string[], played: number, drawsAllowed: boolean, scoreScale: number): Team[] {
  const r = rng(prefix);
  return names
    .map((name, i) => {
      const strength = r();
      const won = Math.round(played * (0.15 + strength * 0.7));
      const drawn = drawsAllowed ? Math.min(played - won, Math.round(r() * 2)) : 0;
      const lost = played - won - drawn;
      const gf = Math.round((won * 1.8 + drawn + lost * 0.6) * scoreScale + r() * scoreScale);
      const ga = Math.round((lost * 1.7 + drawn + won * 0.5) * scoreScale + r() * scoreScale);
      const form = Array.from({ length: Math.min(5, played) }, () => {
        const x = r();
        return (x < strength * 0.8 ? 'W' : drawsAllowed && x < strength * 0.8 + 0.15 ? 'D' : 'L') as 'W' | 'D' | 'L';
      });
      return { id: `${prefix}-${i}`, name, color: TEAM_COLORS[i % TEAM_COLORS.length], played, won, drawn, lost, for: gf, against: ga, form };
    })
    .sort((a, b) => b.won * 3 + b.drawn - (a.won * 3 + a.drawn) || b.for - b.against - (a.for - a.against));
}

function makeFixtures(prefix: string, teams: Team[], weekday: number, hour: number): Fixture[] {
  const r = rng(`${prefix}-fx`);
  const next = addDays(startOfDay(), daysUntil(weekday));
  const last = addDays(next, -7);
  const fixtures: Fixture[] = [];
  const shuffled = [...teams].sort(() => r() - 0.5);
  for (let i = 0; i + 1 < shuffled.length; i += 2) {
    const d = new Date(last);
    d.setHours(hour, 0, 0, 0);
    fixtures.push({ id: `${prefix}-r${i}`, home: shuffled[i].id, away: shuffled[i + 1].id, at: d.toISOString(), score: [Math.floor(r() * 7), Math.floor(r() * 7)] });
  }
  const again = [...teams].sort(() => r() - 0.5);
  for (let i = 0; i + 1 < again.length; i += 2) {
    const d = new Date(next);
    d.setHours(hour + (i % 4 === 0 ? 0 : 1), 0, 0, 0);
    fixtures.push({ id: `${prefix}-n${i}`, home: again[i].id, away: again[i + 1].id, at: d.toISOString() });
  }
  return fixtures;
}

function league(l: Omit<League, 'fixtures'> & { weekday: number; hour: number }): League {
  const { weekday, hour, ...rest } = l;
  return { ...rest, fixtures: makeFixtures(l.id, l.teams, weekday, hour) };
}

export const LEAGUES: League[] = [
  league({
    id: 'l1',
    name: 'Tuesday Night 5s',
    sport: 'football',
    facilityId: 'hornsey-rise-5s',
    area: 'Upper Holloway',
    teams: makeTeams('l1', FOOTBALL_TEAMS, 5, true, 3),
    maxTeams: 12,
    season: 'Autumn 2026',
    startDate: dateKey(addDays(now(), 7 * 7 + daysUntil(2))),
    night: 'Tuesdays, 7–10 PM',
    entryFee: 35000,
    level: 'intermediate',
    format: '5-a-side · 10-week season',
    description: 'North London’s busiest midweek 5s. Referee, bibs and a match report every week. Winter season registration is open now.',
    freeAgents: true,
    weekday: 2,
    hour: 19,
  }),
  league({
    id: 'l2',
    name: 'Highgate Sunday 7s',
    sport: 'football',
    facilityId: 'highgate-sc',
    area: 'Highgate',
    teams: makeTeams('l2', SEVENS_TEAMS, 4, true, 2.4),
    maxTeams: 8,
    season: 'Autumn 2026',
    startDate: dateKey(addDays(now(), 6 * 7 + daysUntil(0))),
    night: 'Sundays, 10 AM–1 PM',
    entryFee: 42000,
    level: 'casual',
    format: '7-a-side · 8-week season',
    description: 'A relaxed Sunday morning league. Mixed teams welcome, with a fair-play table that counts as much as the real one.',
    freeAgents: true,
    weekday: 0,
    hour: 10,
  }),
  league({
    id: 'l3',
    name: 'Archway Padel League',
    sport: 'padel',
    facilityId: 'archway-padel',
    area: 'Archway',
    teams: makeTeams('l3', PADEL_TEAMS, 6, false, 5),
    maxTeams: 12,
    season: 'Autumn 2026',
    startDate: dateKey(addDays(now(), 5 * 7 + daysUntil(3))),
    night: 'Wednesdays, 7–10 PM',
    entryFee: 16000,
    level: 'intermediate',
    format: 'Doubles · 8-week season',
    description: 'Pairs play one match a week, best of three sets. Divisions are reshuffled each season so matches stay close.',
    freeAgents: true,
    weekday: 3,
    hour: 19,
  }),
  league({
    id: 'l4',
    name: 'Thursday Beach Social',
    sport: 'volleyball',
    facilityId: 'hornsey-beach',
    area: 'Hornsey',
    teams: makeTeams('l4', VOLLEY_TEAMS, 3, false, 18),
    maxTeams: 8,
    season: 'Autumn 2026',
    startDate: dateKey(addDays(now(), 4 * 7 + daysUntil(4))),
    night: 'Thursdays, 7–9 PM',
    entryFee: 18000,
    level: 'casual',
    format: 'Beach 2v2 · 6-week season',
    description: 'The most sociable night on sand. Two matches a night, then the bar.',
    freeAgents: false,
    weekday: 4,
    hour: 19,
  }),
  league({
    id: 'l5',
    name: 'North London Hoops League',
    sport: 'basketball',
    facilityId: 'holloway-leisure',
    area: 'Holloway',
    teams: makeTeams('l5', HOOPS_TEAMS, 5, false, 55),
    maxTeams: 10,
    season: 'Autumn 2026',
    startDate: dateKey(addDays(now(), 7 * 7 + daysUntil(1))),
    night: 'Mondays, 7–10 PM',
    entryFee: 45000,
    level: 'advanced',
    format: '5v5 · 10-week season',
    description: 'Competitive 5v5 with qualified referees and a stat sheet for every game.',
    freeAgents: true,
    weekday: 1,
    hour: 19,
  }),
];

// ---------------------------------------------------------------- Leaderboards & stats

/**
 * Sport-specific stat lines for other players. Values are generated but
 * stable, and scale with how many games each player has logged.
 */
export function statsFor(userId: string, sport: SportId): StatLine | null {
  const p = PEOPLE.find((x) => x.id === userId);
  if (!p) return null;
  const sl = p.sports.find((s) => s.sport === sport);
  if (!sl) return null;
  const r = rng(`${userId}-${sport}`);
  const primary = p.sports[0].sport === sport;
  const g = Math.round(p.gamesPlayed * (primary ? 0.75 : 0.25));
  const skill = ['beginner', 'casual', 'intermediate', 'advanced', 'competitive'].indexOf(sl.level) / 4;
  const wins = Math.round(g * (0.3 + skill * 0.4 + r() * 0.1));
  const values: Record<string, number> = {};
  for (const stat of SPORT_BY_ID[sport].stats) {
    switch (stat.id) {
      case 'games':
      case 'matches':
      case 'sessions':
      case 'swims':
      case 'runs':
        values[stat.id] = g;
        break;
      case 'wins':
        values[stat.id] = wins;
        break;
      case 'winRate':
        values[stat.id] = g ? Math.round((wins / g) * 100) : 0;
        break;
      case 'goals':
        values[stat.id] = Math.round(g * (0.3 + skill * 0.9) * (0.6 + r()));
        break;
      case 'assists':
        values[stat.id] = Math.round(g * (0.3 + skill * 0.6) * (0.6 + r()));
        break;
      case 'points':
        values[stat.id] = Math.round(g * (4 + skill * 12) * (0.7 + r() * 0.6));
        break;
      case 'rebounds':
        values[stat.id] = Math.round(g * (2 + skill * 4) * (0.7 + r() * 0.6));
        break;
      case 'rating':
        values[stat.id] = Math.round((2 + skill * 6 + r()) * 10) / 10;
        break;
      case 'distance':
        values[stat.id] = Math.round(g * (sport === 'swimming' ? 1.6 : 6) * (0.8 + r() * 0.5));
        break;
      case 'hours':
        values[stat.id] = Math.round(g * 1.1);
        break;
      case 'tries':
        values[stat.id] = Math.round(g * (0.2 + skill * 0.5) * (0.7 + r() * 0.6));
        break;
      case 'aces':
        values[stat.id] = Math.round(g * (0.4 + skill) * (0.7 + r() * 0.6));
        break;
      case 'runs_scored':
        break;
      case 'wickets':
        values[stat.id] = Math.round(g * (0.4 + skill * 0.8));
        break;
      case 'best5k':
        values[stat.id] = Math.round(30 - skill * 10 + r() * 3);
        break;
      default:
        values[stat.id] = Math.round(g * r());
    }
  }
  if (sport === 'cricket') values.runs = Math.round(g * (8 + skill * 20) * (0.7 + r() * 0.6));
  return { sport, values, form: [], weekly: [] };
}
