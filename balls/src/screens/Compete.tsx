import { Award, CalendarDays, Check, ChevronRight, Clock, ExternalLink, Flag, GraduationCap, Info, MapPin, Medal, Share2, ShieldCheck, Ticket, Trophy, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Artwork, sportArt } from '../components/Artwork';
import { SportBadge, TournamentCard } from '../components/cards';
import { SportIcon } from '../components/icons';
import { SheetBody, SheetFooter, SheetHeader } from '../components/Sheet';
import { DirectionsButton, openReport, openShare, PaymentMethodSelect } from '../components/sheets';
import { Avatar, Button, Chip, CtaBar, EmptyState, Field, IconButton, Pill, Screen, Section, Segmented } from '../components/ui';
import { ACHIEVEMENTS } from '../data/achievements';
import { LEAGUES, statsFor, TOURNAMENTS } from '../data/compete';
import { FACILITY_BY_ID } from '../data/facilities';
import { AREA_LABELS } from '../data/map';
import { PEOPLE } from '../data/people';
import { levelLabel, SPORT_BY_ID, sportName } from '../data/sports';
import type { League, SportId, Tournament } from '../data/types';
import { cx, miles, money, moneyExact } from '../lib/format';
import { distanceMiles } from '../lib/geo';
import { fmtCountdown, fmtDay, fmtLongDate, fmtRange, fmtShortDate, fmtTime } from '../lib/time';
import { progressFor, register } from '../state/actions';
import { nav } from '../state/nav';
import { distanceTo, me, origin } from '../state/selectors';
import { type AppState, useApp } from '../state/store';
import { ui } from '../state/ui';
import { AchievementBadge } from './Profile';
import type { ScreenComponentProps } from './routes';

const COMPETE_SPORTS: SportId[] = ['football', 'padel', 'basketball', 'tennis', 'volleyball', 'running', 'badminton'];

// ---------------------------------------------------------------- leaderboards

export type Scope = 'local' | 'friends' | 'global';

const AREA_AT = Object.fromEntries(AREA_LABELS.map((a) => [a.name, { lat: a.at[0], lng: a.at[1] }]));

export function leaderboard(s: AppState, sport: SportId, stat: string, scope: Scope) {
  const rows: Array<{ userId: string; name: string; color: string; photo?: string; area: string; value: number }> = [];
  for (const p of PEOPLE) {
    if (s.blocked.includes(p.id) || p.visibility === 'private') continue;
    const line = statsFor(p.id, sport);
    if (!line || line.values[stat] == null) continue;
    if (scope === 'friends' && !s.following.includes(p.id)) continue;
    if (scope === 'local') {
      const at = AREA_AT[p.area];
      if (!at || distanceMiles(at, origin(s)) > 2.5) continue;
    }
    rows.push({ userId: p.id, name: p.name, color: p.color, area: p.area, value: line.values[stat] });
  }
  const mine = s.profile.stats.find((x) => x.sport === sport);
  if (s.privacy.showOnLeaderboards && mine && mine.values[stat] != null) {
    const u = me(s);
    rows.push({ userId: 'me', name: 'You', color: u.color, photo: u.photo, area: u.area, value: mine.values[stat] });
  }
  return rows.sort((a, b) => b.value - a.value).map((r, i) => ({ ...r, rank: i + 1 }));
}

function fmtStat(v: number, kind: string) {
  if (kind === 'percent') return `${v}%`;
  if (kind === 'km') return `${v} km`;
  if (kind === 'rating') return v.toFixed(1);
  return String(v);
}

export function LeaderboardScreen({ params }: ScreenComponentProps) {
  const s = useApp();
  const [sport, setSport] = useState<SportId>((params.sport as SportId) || s.profile.sports[0]?.sport || 'football');
  const def = SPORT_BY_ID[sport];
  const ranked = def.stats.filter((x) => x.ranked);
  const [stat, setStat] = useState(ranked[0].id);
  const [scope, setScope] = useState<Scope>('local');
  const statId = ranked.some((x) => x.id === stat) ? stat : ranked[0].id;
  const kind = def.stats.find((x) => x.id === statId)!.kind;
  const rows = useMemo(() => leaderboard(s, sport, statId, scope), [s, sport, statId, scope]);
  const mine = rows.find((r) => r.userId === 'me');
  return (
    <Screen title="Leaderboard">
      <div className="pad stack-16">
        <div className="hscroll hscroll--chips hscroll--flush">
          {(['football', 'basketball', 'tennis', 'padel', 'badminton', 'volleyball', 'running', 'swimming', 'cricket', 'rugby', 'gym'] as SportId[]).map((sp) => (
            <Chip key={sp} active={sport === sp} icon={<SportIcon sport={sp} size={15} />} onClick={() => { setSport(sp); setStat(SPORT_BY_ID[sp].stats.filter((x) => x.ranked)[0].id); }}>
              {sportName(sp)}
            </Chip>
          ))}
        </div>
        <Segmented label="Scope" value={scope} onChange={setScope} options={[{ value: 'local', label: 'Local' }, { value: 'friends', label: 'Friends' }, { value: 'global', label: 'Global' }]} />
        <div className="chip-row">
          {ranked.map((x) => (
            <Chip key={x.id} active={statId === x.id} onClick={() => setStat(x.id)}>
              {x.label}
            </Chip>
          ))}
        </div>
        {rows.length >= 3 ? (
          <>
            <div className="podium">
              {[1, 0, 2].map((i) => {
                const r = rows[i];
                return (
                  <div key={r.userId} className={cx('podium__col', `podium__col--${i + 1}`)}>
                    <Avatar name={r.name} color={r.color} photo={r.photo} size={i === 0 ? 60 : 48} ring />
                    <b>{r.name}</b>
                    <span className="podium__val">{fmtStat(r.value, kind)}</span>
                    <span className="podium__block">
                      <Medal size={16} /> {i + 1}
                    </span>
                  </div>
                );
              })}
            </div>
            <ol className="lb">
              {rows.slice(3, 20).map((r) => (
                <li key={r.userId} className={cx('lb__row', r.userId === 'me' && 'is-me')}>
                  <button type="button" onClick={() => r.userId !== 'me' && nav.push('player', { id: r.userId })} disabled={r.userId === 'me'}>
                    <span className="lb__rank">{r.rank}</span>
                    <Avatar name={r.name} color={r.color} photo={r.photo} size={34} />
                    <span className="lb__name">
                      <b>{r.name}</b>
                      <small>{r.area}</small>
                    </span>
                    <span className="lb__val">{fmtStat(r.value, kind)}</span>
                  </button>
                </li>
              ))}
            </ol>
            {mine && mine.rank > 20 && (
              <div className="lb__row is-me lb__row--pinned">
                <span className="lb__rank">{mine.rank}</span>
                <Avatar name="You" color={mine.color} size={34} />
                <span className="lb__name">
                  <b>You</b>
                </span>
                <span className="lb__val">{fmtStat(mine.value, kind)}</span>
              </div>
            )}
            {!mine && <p className="fine">You’re not on this board yet. Log a {sportName(sport).toLowerCase()} result to appear.</p>}
          </>
        ) : (
          <EmptyState
            compact
            icon={<Trophy size={24} />}
            title={scope === 'friends' ? 'Not enough friends play this yet.' : 'Not enough players here yet.'}
            body={scope === 'global' ? 'Rankings appear once enough players log this sport.' : 'Try another scope or sport.'}
            action={scope !== 'global' ? { label: 'Show everyone', onClick: () => setScope('global') } : undefined}
          />
        )}
        <p className="fine">
          <Info size={13} /> Stats are logged by players after each game. {scope === 'local' ? 'Local means within 2.5 miles of your area.' : ''} You can hide yourself from leaderboards in Privacy settings.
        </p>
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------- compete tab

function LeagueRow({ l }: { l: League }) {
  const s = useApp();
  const f = FACILITY_BY_ID[l.facilityId];
  const joined = s.registrations.some((r) => r.targetId === l.id && r.status === 'confirmed');
  return (
    <button type="button" className="lrow" onClick={() => nav.push('league', { id: l.id })}>
      <SportBadge sport={l.sport} size={44} />
      <span className="lrow__body">
        <b>{l.name}</b>
        <small>
          {f.area} · {l.night.split(',')[0]} · {miles(distanceTo(s, f))}
        </small>
        <span className="lrow__meta">
          <span>
            {l.teams.length}/{l.maxTeams} teams
          </span>
          <span>{money(l.entryFee)}/team</span>
          <span>{levelLabel(l.level)}</span>
        </span>
      </span>
      {joined ? <Pill tone="success">Joined</Pill> : <ChevronRight size={18} className="lrow__chev" />}
    </button>
  );
}

export function CompeteScreen({ retap }: ScreenComponentProps) {
  const s = useApp();
  const [sport, setSport] = useState<SportId | null>(null);
  const top = s.profile.stats.slice().sort((a, b) => (Object.values(b.values)[0] ?? 0) - (Object.values(a.values)[0] ?? 0))[0];
  const tournaments = TOURNAMENTS.filter((t) => !sport || t.sport === sport).sort((a, b) => a.start.localeCompare(b.start));
  const leagues = LEAGUES.filter((l) => !sport || l.sport === sport);
  const lbSport = sport ?? top?.sport ?? 'football';
  const lbStat = SPORT_BY_ID[lbSport].stats.filter((x) => x.ranked)[0];
  const lb = useMemo(() => leaderboard(s, lbSport, lbStat.id, 'local'), [s, lbSport, lbStat.id]);
  const mine = lb.find((r) => r.userId === 'me');
  const unlocked = new Set(s.profile.achievements.map((a) => a.id));
  const nextAch = ACHIEVEMENTS.filter((a) => !unlocked.has(a.id))
    .map((a) => ({ a, p: progressFor(s, a.id) }))
    .sort((x, y) => y.p.value / y.p.target - x.p.value / x.p.target)[0];
  const def = top ? SPORT_BY_ID[top.sport] : null;

  return (
    <Screen title="Compete" header="large" back={false} retap={retap}>
      <div className="pad">
        <div className="hscroll hscroll--chips hscroll--flush">
          <Chip active={!sport} onClick={() => setSport(null)}>
            All
          </Chip>
          {COMPETE_SPORTS.map((sp) => (
            <Chip key={sp} active={sport === sp} icon={<SportIcon sport={sp} size={15} />} onClick={() => setSport(sp)}>
              {sportName(sp)}
            </Chip>
          ))}
        </div>
      </div>

      {top && def && !sport && (
        <div className="pad">
          <button type="button" className="season" onClick={() => nav.push('stats', { sport: top.sport })}>
            <div className="season__head">
              <span className="eyebrow eyebrow--light">Your season · {def.name}</span>
              <ChevronRight size={18} />
            </div>
            <div className="season__stats">
              {def.stats.slice(0, 4).map((st) => (
                <div key={st.id}>
                  <b>{fmtStat(top.values[st.id] ?? 0, st.kind)}</b>
                  <span>{st.label}</span>
                </div>
              ))}
            </div>
            {top.form.length > 0 && (
              <div className="season__form" aria-label={`Recent form: ${top.form.join(', ')}`}>
                <span>Form</span>
                {top.form.slice(0, 5).map((r, i) => (
                  <i key={i} className={`formchip formchip--${r}`}>
                    {r}
                  </i>
                ))}
              </div>
            )}
          </button>
        </div>
      )}

      <Section title="Tournaments near you" action="See all" onAction={() => nav.push('tournaments', { sport: sport ?? undefined })} className="pad-x">
        {tournaments.length ? (
          <div className="hscroll hscroll--cards">
            {tournaments.map((t) => (
              <TournamentCard key={t.id} t={t} />
            ))}
          </div>
        ) : (
          <EmptyState compact icon={<Trophy size={22} />} title="No tournaments for this sport yet." />
        )}
      </Section>

      <Section title="Local leagues" action="See all" onAction={() => nav.push('leagues', { sport: sport ?? undefined })} className="pad">
        {leagues.length ? (
          <div className="list-card list-card--rows">
            {leagues.slice(0, 3).map((l) => (
              <LeagueRow key={l.id} l={l} />
            ))}
          </div>
        ) : (
          <EmptyState compact icon={<Users size={22} />} title="No leagues for this sport yet." />
        )}
      </Section>

      <Section title={`${sportName(lbSport)} leaderboard`} action="Full board" onAction={() => nav.push('leaderboard', { sport: lbSport })} className="pad">
        <div className="lbmini">
          <div className="lbmini__head">
            <span>Local · {lbStat.label}</span>
            {mine && <Pill tone="brand">You’re #{mine.rank}</Pill>}
          </div>
          {lb.slice(0, 3).map((r) => (
            <div key={r.userId} className={cx('lbmini__row', r.userId === 'me' && 'is-me')}>
              <span className={cx('lbmini__rank', `r${r.rank}`)}>{r.rank}</span>
              <Avatar name={r.name} color={r.color} photo={r.photo} size={30} />
              <b>{r.name}</b>
              <span>{r.value}</span>
            </div>
          ))}
          {mine && mine.rank > 3 && (
            <div className="lbmini__row is-me">
              <span className="lbmini__rank">{mine.rank}</span>
              <Avatar name="You" color={mine.color} photo={mine.photo} size={30} />
              <b>You</b>
              <span>{mine.value}</span>
            </div>
          )}
        </div>
      </Section>

      <Section title="Achievements" action="See all" onAction={() => nav.push('achievements')} className="pad">
        <div className="ach-strip">
          {ACHIEVEMENTS.filter((a) => unlocked.has(a.id))
            .slice(-3)
            .map((a) => (
              <AchievementBadge key={a.id} id={a.id} unlocked size="sm" />
            ))}
          {nextAch && (
            <div className="ach-next">
              <AchievementBadge id={nextAch.a.id} unlocked={false} size="sm" />
              <div>
                <small>Next up</small>
                <b>{nextAch.a.name}</b>
                <span className="ach-next__bar">
                  <i style={{ width: `${(nextAch.p.value / nextAch.p.target) * 100}%` }} />
                </span>
                <small>
                  {nextAch.p.value}/{nextAch.p.target}
                </small>
              </div>
            </div>
          )}
        </div>
      </Section>

      <Section title="More ways to play" className="pad">
        <div className="tiles">
          <button type="button" className="tile" onClick={() => nav.push('events')}>
            <Ticket size={22} />
            <b>Events</b>
            <small>Competitions, camps and community games</small>
          </button>
          <button type="button" className="tile" onClick={() => nav.push('training')}>
            <GraduationCap size={22} />
            <b>Training</b>
            <small>Coaches, classes and clinics</small>
          </button>
        </div>
      </Section>
    </Screen>
  );
}

// ---------------------------------------------------------------- lists

export function TournamentsScreen({ params }: ScreenComponentProps) {
  const s = useApp();
  const [sport, setSport] = useState<SportId | null>((params.sport as SportId) ?? null);
  const [when, setWhen] = useState<'any' | 'month' | 'week'>('any');
  const [open, setOpen] = useState(false);
  const [cheap, setCheap] = useState(false);
  const list = TOURNAMENTS.filter((t) => !sport || t.sport === sport)
    .filter((t) => when === 'any' || new Date(t.start).getTime() - Date.now() < (when === 'week' ? 7 : 31) * 86_400_000)
    .filter((t) => !open || (t.registration === 'open' && t.entries < t.maxEntries))
    .filter((t) => !cheap || t.entryFee <= 3000)
    .sort((a, b) => a.start.localeCompare(b.start));
  return (
    <Screen title="Tournaments">
      <div className="pad stack-12">
        <div className="hscroll hscroll--chips hscroll--flush">
          <Chip active={!sport} onClick={() => setSport(null)}>
            All sports
          </Chip>
          {COMPETE_SPORTS.map((sp) => (
            <Chip key={sp} active={sport === sp} icon={<SportIcon sport={sp} size={15} />} onClick={() => setSport(sp)}>
              {sportName(sp)}
            </Chip>
          ))}
        </div>
        <div className="chip-row">
          <Chip active={when === 'week'} onClick={() => setWhen(when === 'week' ? 'any' : 'week')}>
            This week
          </Chip>
          <Chip active={when === 'month'} onClick={() => setWhen(when === 'month' ? 'any' : 'month')}>
            This month
          </Chip>
          <Chip active={open} onClick={() => setOpen(!open)}>
            Open to enter
          </Chip>
          <Chip active={cheap} onClick={() => setCheap(!cheap)}>
            £30 or less
          </Chip>
        </div>
        {list.length ? (
          <div className="cards">
            {list.map((t) => (
              <TournamentCard key={t.id} t={t} variant="row" />
            ))}
          </div>
        ) : (
          <EmptyState icon={<Trophy size={24} />} title="No tournaments match." body={`Nothing ${sport ? `for ${sportName(sport).toLowerCase()} ` : ''}with these filters near ${s.location?.label ?? 'you'}.`} action={{ label: 'Clear filters', onClick: () => { setSport(null); setWhen('any'); setOpen(false); setCheap(false); } }} />
        )}
      </div>
    </Screen>
  );
}

export function LeaguesScreen({ params }: ScreenComponentProps) {
  const [sport, setSport] = useState<SportId | null>((params.sport as SportId) ?? null);
  const list = LEAGUES.filter((l) => !sport || l.sport === sport);
  return (
    <Screen title="Leagues">
      <div className="pad stack-12">
        <div className="hscroll hscroll--chips hscroll--flush">
          <Chip active={!sport} onClick={() => setSport(null)}>
            All sports
          </Chip>
          {[...new Set(LEAGUES.map((l) => l.sport))].map((sp) => (
            <Chip key={sp} active={sport === sp} icon={<SportIcon sport={sp} size={15} />} onClick={() => setSport(sp)}>
              {sportName(sp)}
            </Chip>
          ))}
        </div>
        {list.length ? (
          <div className="list-card list-card--rows">
            {list.map((l) => (
              <LeagueRow key={l.id} l={l} />
            ))}
          </div>
        ) : (
          <EmptyState icon={<Users size={24} />} title="No leagues for this sport yet." />
        )}
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------- registration

function RegisterSheet({ kind, id, title, fee, unit, teamSize, allowFreeAgent, close }: { kind: 'tournament' | 'league'; id: string; title: string; fee: number; unit: 'team' | 'player'; teamSize: number; allowFreeAgent: boolean; close: () => void }) {
  const s = useApp();
  const [mode, setMode] = useState<'team' | 'free'>(unit === 'player' || teamSize === 1 ? 'team' : 'team');
  const [team, setTeam] = useState('');
  const [method, setMethod] = useState<string | undefined>(s.paymentMethods.find((m) => m.isDefault)?.id ?? s.paymentMethods[0]?.id);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const needsTeam = teamSize > 1 && mode === 'team';
  const amount = mode === 'free' ? 0 : fee;
  return (
    <>
      <SheetHeader title={`Register for ${title}`} onClose={close} />
      <SheetBody>
        {teamSize > 1 && allowFreeAgent && (
          <Segmented
            label="Registration type"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'team', label: 'Enter a team' },
              { value: 'free', label: 'Join as free agent' },
            ]}
          />
        )}
        {needsTeam && (
          <Field label="Team name" htmlFor="reg-team" hint={`Up to ${teamSize} players. You can invite them after registering.`}>
            <input id="reg-team" className="input" maxLength={40} value={team} onChange={(e) => setTeam(e.target.value)} placeholder="e.g. Archway Athletic" />
          </Field>
        )}
        {mode === 'free' && <p className="notice notice--ok">Free agents don’t pay now. The organiser places you in a team and your share is added then.</p>}
        {amount > 0 && (
          <>
            <div className="breakdown">
              <div>
                <span>Entry fee (per {unit})</span>
                <span>{moneyExact(fee)}</span>
              </div>
              {teamSize > 1 && unit === 'team' && (
                <div>
                  <span>
                    <small>Split {teamSize} ways ≈ {moneyExact(Math.ceil(fee / teamSize))} each</small>
                  </span>
                  <span />
                </div>
              )}
              <div className="breakdown__total">
                <span>Total</span>
                <span>{moneyExact(amount)}</span>
              </div>
            </div>
            <div className="field">
              <span className="field__label">Pay with</span>
              <PaymentMethodSelect value={method} onChange={setMethod} />
            </div>
          </>
        )}
        {err && (
          <p className="form-error" role="alert">
            {err}
          </p>
        )}
      </SheetBody>
      <SheetFooter>
        <Button
          block
          size="lg"
          loading={busy}
          disabled={needsTeam && team.trim().length < 2}
          onClick={async () => {
            setBusy(true);
            setErr(null);
            const res = await register({ kind, targetId: id, title, amount, methodId: method, teamName: needsTeam ? team.trim() : undefined, asFreeAgent: mode === 'free' });
            setBusy(false);
            if (!res.ok) {
              setErr(res.error ?? 'Couldn’t register.');
              return;
            }
            close();
            ui.toast(`You’re in: ${title}`, { tone: 'success' });
          }}
        >
          {amount > 0 ? `Pay ${moneyExact(amount)} & register` : 'Register'}
        </Button>
      </SheetFooter>
    </>
  );
}

// ---------------------------------------------------------------- tournament

export function TournamentScreen({ params }: ScreenComponentProps) {
  const s = useApp();
  const t = TOURNAMENTS.find((x) => x.id === params.id) as Tournament;
  const f = FACILITY_BY_ID[t.facilityId];
  const reg = s.registrations.find((r) => r.targetId === t.id && r.status === 'confirmed');
  const full = t.entries >= t.maxEntries || t.registration === 'closed';
  const closesIn = new Date(t.closesAt).getTime() - Date.now();
  const entries = t.entries + (reg ? 1 : 0);
  const share = () => openShare({ title: 'Share tournament', text: `${t.name}: ${sportName(t.sport)} at ${f.name}, ${fmtDay(t.start, { tonight: false })} ${fmtShortDate(t.start)}. Enter on BALLS:`, path: `t/${t.id}` });

  let footer: React.ReactNode;
  if (reg) footer = <CtaBar label={<span className="inlabel"><Check size={16} strokeWidth={3} /> Registered</span>} sub={reg.teamName ? `Team: ${reg.teamName}` : 'Free agent'}><Button variant="secondary" onClick={share}>Share</Button></CtaBar>;
  else if (t.registration === 'external')
    footer = (
      <CtaBar label={`${money(t.entryFee)} per ${t.entryUnit}`} sub="Entries handled by the organiser">
        <a className="btn btn--primary btn--lg" href={t.externalUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={17} />
          <span className="btn__label">Enter on organiser site</span>
        </a>
      </CtaBar>
    );
  else if (full) footer = <CtaBar label="Registration closed" sub="This year’s draw is full"><Button variant="secondary" onClick={() => ui.toast('We’ll let you know when next year’s entries open', { icon: 'bell' })}>Notify me</Button></CtaBar>;
  else
    footer = (
      <CtaBar label={<span className="cta-price">{money(t.entryFee)}<small> per {t.entryUnit}</small></span>} sub={closesIn > 0 ? `Closes in ${fmtCountdown(t.closesAt)}` : 'Closing soon'}>
        <Button size="lg" onClick={() => ui.open('Register', (close) => <RegisterSheet kind="tournament" id={t.id} title={t.name} fee={t.entryFee} unit={t.entryUnit} teamSize={t.teamSize} allowFreeAgent={t.teamSize > 1} close={close} />)}>
          Register
        </Button>
      </CtaBar>
    );

  return (
    <Screen
      header="overlay"
      overlayThreshold={170}
      title={t.name}
      footer={footer}
      actions={
        <>
          <IconButton label="Share" variant="glass" onClick={share}>
            <Share2 size={19} />
          </IconButton>
          <IconButton label="Report" variant="glass" onClick={() => openReport('game', t.id, t.name)}>
            <Flag size={18} />
          </IconButton>
        </>
      }
    >
      <div className="ghero">
        <Artwork art={sportArt(t.sport, Number(t.id.slice(1)) * 17, 'night')} />
      </div>
      <div className="gamehead">
        <div className="gamehead__sport">
          <Trophy size={16} /> {sportName(t.sport)} tournament
        </div>
        <h1 className="gamehead__title">{t.name}</h1>
        <div className="chip-row">
          <Pill tone="brand">{levelLabel(t.level)}</Pill>
          {reg ? <Pill tone="success">You’re registered</Pill> : full ? <Pill>Full</Pill> : t.registration === 'external' ? <Pill>Via organiser</Pill> : <Pill tone="success">Open for entries</Pill>}
        </div>
      </div>
      <div className="pad stack-20">
        <div className="gfacts">
          <div className="gfact">
            <CalendarDays size={18} />
            <span>
              <b>{fmtLongDate(t.start)}</b>
              <small>{fmtRange(t.start, t.end)}</small>
            </span>
          </div>
          <button type="button" className="gfact" onClick={() => nav.push('facility', { id: f.id })}>
            <MapPin size={18} />
            <span>
              <b>{f.name}</b>
              <small>
                {f.area} · {miles(distanceTo(s, f))}
              </small>
            </span>
            <ChevronRight size={16} />
          </button>
          <div className="gfact">
            <Users size={18} />
            <span className="gfact__grow">
              <b>
                {entries}/{t.maxEntries} {t.teamSize > 1 ? 'teams' : 'players'} entered
              </b>
              <span className="spots">
                <span className="spots__track">
                  <span className="spots__fill" style={{ width: `${(entries / t.maxEntries) * 100}%` }} />
                </span>
              </span>
            </span>
          </div>
          <div className="gfact">
            <Ticket size={18} />
            <span>
              <b>
                {money(t.entryFee)} per {t.entryUnit}
              </b>
              <small>{t.format}</small>
            </span>
          </div>
          {t.prize && (
            <div className="gfact">
              <Award size={18} />
              <span>
                <b>Prizes</b>
                <small>{t.prize}</small>
              </span>
            </div>
          )}
          {!full && t.registration === 'open' && (
            <div className="gfact">
              <Clock size={18} />
              <span>
                <b>Entries close {fmtDay(t.closesAt, { tonight: false })}</b>
                <small>{fmtTime(t.closesAt)}</small>
              </span>
            </div>
          )}
        </div>
        <Section title="About">
          <p className="prose">{t.description}</p>
          <p className="fine">Organised by {t.organiser}</p>
        </Section>
        <Section title="Schedule">
          <ol className="sched">
            {t.schedule.map((x) => (
              <li key={x.time}>
                <b>{x.time}</b>
                <span>{x.label}</span>
              </li>
            ))}
          </ol>
        </Section>
        <Section title="Rules">
          <ul className="rules">
            {t.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Section>
        <div className="address">
          <div>
            <b>{f.name}</b>
            <span>
              {f.address}, {f.postcode}
            </span>
          </div>
          <DirectionsButton f={f} variant="secondary" size="sm" />
        </div>
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------- league

export function LeagueScreen({ params }: ScreenComponentProps) {
  const s = useApp();
  const l = LEAGUES.find((x) => x.id === params.id) as League;
  const f = FACILITY_BY_ID[l.facilityId];
  const [tab, setTab] = useState<'table' | 'fixtures' | 'about'>('table');
  const reg = s.registrations.find((r) => r.targetId === l.id && r.status === 'confirmed');
  const draws = ['football', 'rugby', 'cricket'].includes(l.sport);
  const past = l.fixtures.filter((x) => x.score);
  const next = l.fixtures.filter((x) => !x.score);
  const team = (id: string) => l.teams.find((t) => t.id === id)!;
  const points = (t: League['teams'][number]) => (draws ? t.won * 3 + t.drawn : t.won * 2);
  const unitsFor = l.sport === 'basketball' ? 'PD' : l.sport === 'volleyball' || l.sport === 'padel' ? 'SD' : 'GD';

  return (
    <Screen
      title={l.name}
      footer={
        reg ? (
          <CtaBar label={<span className="inlabel"><Check size={16} strokeWidth={3} /> You’re in</span>} sub={reg.teamName ? `Team: ${reg.teamName}` : 'Free agent: we’ll place you in a team'}>
            <Button variant="secondary" onClick={() => openShare({ title: 'Share league', text: `${l.name} on BALLS`, path: `l/${l.id}` })}>
              Share
            </Button>
          </CtaBar>
        ) : (
          <CtaBar label={<span className="cta-price">{money(l.entryFee)}<small> per team</small></span>} sub={`Next season starts ${fmtShortDate(l.startDate)}`}>
            <Button size="lg" onClick={() => ui.open('Join league', (close) => <RegisterSheet kind="league" id={l.id} title={l.name} fee={l.entryFee} unit="team" teamSize={SPORT_BY_ID[l.sport].formats[0]?.players ? Math.ceil(SPORT_BY_ID[l.sport].formats[0].players / 2) : 5} allowFreeAgent={l.freeAgents} close={close} />)}>
              Join league
            </Button>
          </CtaBar>
        )
      }
    >
      <div className="pad stack-16">
        <div className="league-head">
          <SportBadge sport={l.sport} size={52} />
          <div>
            <div className="eyebrow">
              {sportName(l.sport)} · {l.season}
            </div>
            <p>
              {f.name} · {l.night}
            </p>
          </div>
        </div>
        <div className="kv">
          <div>
            <span>Teams</span>
            <b>
              {l.teams.length}/{l.maxTeams}
            </b>
          </div>
          <div>
            <span>Level</span>
            <b>{levelLabel(l.level)}</b>
          </div>
          <div>
            <span>Entry</span>
            <b>{money(l.entryFee)}</b>
          </div>
        </div>
        <Segmented label="League" value={tab} onChange={setTab} options={[{ value: 'table', label: 'Table' }, { value: 'fixtures', label: 'Fixtures' }, { value: 'about', label: 'About' }]} />
        {tab === 'table' && (
          <div className="table-wrap">
            <table className="standings">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col" className="left">
                    Team
                  </th>
                  <th scope="col">P</th>
                  <th scope="col">W</th>
                  {draws && <th scope="col">D</th>}
                  <th scope="col">L</th>
                  <th scope="col">{unitsFor}</th>
                  <th scope="col">Pts</th>
                </tr>
              </thead>
              <tbody>
                {l.teams.map((t, i) => (
                  <tr key={t.id}>
                    <td>{i + 1}</td>
                    <th scope="row" className="left">
                      <span className="teamdot" style={{ background: t.color }} aria-hidden="true" />
                      {t.name}
                    </th>
                    <td>{t.played}</td>
                    <td>{t.won}</td>
                    {draws && <td>{t.drawn}</td>}
                    <td>{t.lost}</td>
                    <td>{t.for - t.against > 0 ? `+${t.for - t.against}` : t.for - t.against}</td>
                    <td>
                      <b>{points(t)}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === 'fixtures' && (
          <div className="stack-16">
            <Section title={`This week · ${fmtDay(next[0]?.at ?? l.startDate, { tonight: false })}`}>
              <ul className="fixtures">
                {next.map((x) => (
                  <li key={x.id}>
                    <span>{team(x.home).name}</span>
                    <b>{fmtTime(x.at)}</b>
                    <span>{team(x.away).name}</span>
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="Last week’s results">
              <ul className="fixtures">
                {past.map((x) => (
                  <li key={x.id}>
                    <span>{team(x.home).name}</span>
                    <b>
                      {x.score![0]}–{x.score![1]}
                    </b>
                    <span>{team(x.away).name}</span>
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        )}
        {tab === 'about' && (
          <div className="stack-16">
            <p className="prose">{l.description}</p>
            <ul className="rules">
              <li>{l.format}</li>
              <li>Games on {l.night}</li>
              <li>Next season starts {fmtLongDate(l.startDate)}</li>
              <li>{l.freeAgents ? 'Free agents welcome: join solo and we’ll place you in a team.' : 'Team entries only.'}</li>
            </ul>
            <p className="fine">
              <ShieldCheck size={13} /> Leagues are run by the venue. BALLS holds entry fees until the season starts.
            </p>
          </div>
        )}
      </div>
    </Screen>
  );
}

