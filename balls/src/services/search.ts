import { COACHES, EVENTS, SHOPS, TRAINING } from '../data/discover';
import { LEAGUES, TOURNAMENTS } from '../data/compete';
import { FACILITIES, FACILITY_BY_ID, KIND_LABELS, spacesFor } from '../data/facilities';
import { PLAYABLE, SPORTS, SPORT_BY_ID, sportName, levelLabel } from '../data/sports';
import type { Link, SportId } from '../data/types';
import { fmtWhen } from '../lib/time';
import type { AppState } from '../state/store';
import { facilitySports, visibleGames } from '../state/selectors';

/**
 * Universal search. Builds a small in-memory index and matches every query
 * word against it by prefix, substring or a one-letter typo, so "footbal",
 * "5 a side" and "highg" all find what you'd expect.
 */

export type ResultType = 'sport' | 'facility' | 'game' | 'event' | 'tournament' | 'league' | 'training' | 'coach' | 'shop';

export interface SearchResult {
  type: ResultType;
  id: string;
  title: string;
  subtitle: string;
  sport?: SportId;
  link: Link;
  score: number;
}

interface Doc extends Omit<SearchResult, 'score'> {
  titleTokens: string[];
  tokens: string[];
  text: string;
}

const SYNONYMS: Record<SportId, string> = {
  football: 'soccer footy fives 5-a-side 5 a side sevens 7-a-side 11-a-side pitch cage',
  basketball: 'hoops bball ball court pickup 3x3',
  tennis: 'court racket singles doubles clay',
  padel: 'paddle padle racket court doubles',
  badminton: 'shuttle shuttlecock badders court',
  volleyball: 'beach volley sand court',
  cricket: 'nets bat bowling',
  rugby: 'touch union league tag',
  running: 'run track jog 5k 10k athletics',
  gym: 'fitness weights strength workout lifting',
  swimming: 'swim pool lido lanes',
  other: 'climbing bouldering',
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const tokenize = (s: string) => norm(s).split(' ').filter(Boolean);

function doc(d: Omit<Doc, 'titleTokens' | 'tokens' | 'text'>, keywords: string): Doc {
  const text = norm(`${d.title} ${d.subtitle} ${keywords}`);
  return { ...d, titleTokens: tokenize(d.title), tokens: text.split(' '), text };
}

function withinOne(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function tokenScore(q: string, d: Doc): number {
  let best = 0;
  if (d.titleTokens.some((t) => t.startsWith(q))) best = 6;
  else if (d.tokens.some((t) => t.startsWith(q))) best = 4;
  else if (q.length >= 3 && d.text.includes(q)) best = 2;
  else if (q.length >= 4 && d.tokens.some((t) => withinOne(q, t.slice(0, q.length + 1)) || withinOne(q, t))) best = 1;
  return best;
}

export function buildIndex(s: AppState): Doc[] {
  const docs: Doc[] = [];
  for (const sp of SPORTS.filter((x) => PLAYABLE.includes(x.id))) {
    docs.push(doc({ type: 'sport', id: sp.id, title: sp.name, subtitle: 'Venues, games and events', sport: sp.id, link: { route: 'sport', params: { id: sp.id } } }, SYNONYMS[sp.id]));
  }
  for (const f of FACILITIES) {
    const sports = facilitySports(f);
    const attrs = spacesFor(f.id).flatMap((x) => Object.values(x.attrs)).join(' ');
    docs.push(
      doc(
        { type: 'facility', id: f.id, title: f.name, subtitle: `${sports.map(sportName).join(' · ')} · ${f.area}`, sport: sports[0], link: { route: 'facility', params: { id: f.id } } },
        `${f.area} ${f.postcode} ${KIND_LABELS[f.kind]} ${sports.map((x) => `${sportName(x)} ${SYNONYMS[x]}`).join(' ')} ${attrs}`,
      ),
    );
  }
  for (const g of visibleGames(s)) {
    if (g.status === 'completed' || g.status === 'cancelled') continue;
    const f = FACILITY_BY_ID[g.facilityId];
    docs.push(
      doc(
        { type: 'game', id: g.id, title: `${g.format ?? ''} ${sportName(g.sport)}`.trim(), subtitle: `${fmtWhen(g.start)} · ${f.name}`, sport: g.sport, link: { route: 'game', params: { id: g.id } } },
        `${f.area} ${f.name} ${levelLabel(g.level)} ${SYNONYMS[g.sport]} game`,
      ),
    );
  }
  for (const t of TOURNAMENTS) {
    const f = FACILITY_BY_ID[t.facilityId];
    docs.push(doc({ type: 'tournament', id: t.id, title: t.name, subtitle: `${sportName(t.sport)} tournament · ${f.area}`, sport: t.sport, link: { route: 'tournament', params: { id: t.id } } }, `${f.name} ${f.area} ${SYNONYMS[t.sport]} tournament cup competition`));
  }
  for (const l of LEAGUES) {
    const f = FACILITY_BY_ID[l.facilityId];
    docs.push(doc({ type: 'league', id: l.id, title: l.name, subtitle: `${sportName(l.sport)} league · ${f.area}`, sport: l.sport, link: { route: 'league', params: { id: l.id } } }, `${f.name} ${l.area} ${SYNONYMS[l.sport]} league season`));
  }
  for (const e of EVENTS) {
    const f = FACILITY_BY_ID[e.facilityId];
    docs.push(doc({ type: 'event', id: e.id, title: e.title, subtitle: `${fmtWhen(e.start)} · ${f.area}`, sport: e.sport, link: { route: 'event', params: { id: e.id } } }, `${f.name} ${f.area} ${e.organiser} ${SYNONYMS[e.sport]} event`));
  }
  for (const t of TRAINING) {
    const c = COACHES.find((x) => x.id === t.coachId)!;
    const f = FACILITY_BY_ID[t.facilityId];
    docs.push(doc({ type: 'training', id: t.id, title: t.title, subtitle: `${c.name} · ${f.area}`, sport: t.sport, link: { route: 'session', params: { id: t.id } } }, `${c.name} ${f.name} ${f.area} ${SYNONYMS[t.sport]} training coaching lesson class`));
  }
  for (const c of COACHES) {
    docs.push(doc({ type: 'coach', id: c.id, title: c.name, subtitle: `${c.sports.map(sportName).join(' & ')} coach · ${c.area}`, sport: c.sports[0], link: { route: 'coach', params: { id: c.id } } }, `${c.area} coach trainer ${c.sports.map((x) => SYNONYMS[x]).join(' ')}`));
  }
  for (const sh of SHOPS) {
    docs.push(doc({ type: 'shop', id: sh.id, title: sh.name, subtitle: `${sh.area} · ${sh.description}`, sport: sh.sports[0], link: { route: 'services', params: { id: sh.id } } }, `${sh.kind} shop ${sh.sports.map((x) => SPORT_BY_ID[x].name).join(' ')}`));
  }
  return docs;
}

export function search(index: Doc[], query: string): SearchResult[] {
  const q = tokenize(query);
  if (!q.length) return [];
  const out: SearchResult[] = [];
  for (const d of index) {
    let total = 0;
    let ok = true;
    for (const t of q) {
      const sc = tokenScore(t, d);
      if (!sc) {
        ok = false;
        break;
      }
      total += sc;
    }
    if (!ok) continue;
    const typeBoost = d.type === 'sport' ? 3 : d.type === 'facility' ? 2 : 0;
    const { titleTokens: _a, tokens: _b, text: _c, ...rest } = d;
    out.push({ ...rest, score: total + typeBoost });
  }
  return out.sort((a, b) => b.score - a.score);
}

export const RESULT_LABELS: Record<ResultType, string> = {
  sport: 'Sports',
  facility: 'Venues',
  game: 'Games',
  event: 'Events',
  tournament: 'Tournaments',
  league: 'Leagues',
  training: 'Training',
  coach: 'Coaches',
  shop: 'Shops & services',
};
