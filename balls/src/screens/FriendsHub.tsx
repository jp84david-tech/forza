import { AtSign, Plus, Search, ShieldCheck, UserCheck, Users, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FriendButton } from '../components/FriendButton';
import { SportIcon } from '../components/icons';
import { needsAccount } from '../components/Join';
import { SheetBody, SheetFooter, SheetHeader } from '../components/Sheet';
import { PaymentMethodSelect } from '../components/sheets';
import { Avatar, Button, CtaBar, EmptyState, IconButton, RatingDisplay, Screen, Section, Segmented } from '../components/ui';
import { COACHES, COACH_BY_ID } from '../data/discover';
import { FACILITY_BY_ID } from '../data/facilities';
import { PEOPLE } from '../data/people';
import { levelLabel, PLAYABLE, sportName } from '../data/sports';
import type { Coach, SportId } from '../data/types';
import { cx, money, plural } from '../lib/format';
import { rng } from '../lib/rng';
import { addDays, at, dateKey, fmtDay, fmtShortDate, fmtTime, startOfDay, weekdayShort } from '../lib/time';
import { findGames } from '../services/discovery';
import { acceptFriendRequest, bookLesson, declineFriendRequest } from '../state/actions';
import { nav, useNav } from '../state/nav';
import { gameTitle, joinedPlayers, upcoming, userById } from '../state/selectors';
import { getState, useApp } from '../state/store';
import { ui } from '../state/ui';
import { openJoinGame } from './Play';
import type { ScreenComponentProps } from './routes';

type SportFilter = 'all' | SportId;
const SPORT_OPTS: Array<{ value: SportFilter; label: string }> = [{ value: 'all', label: 'All' }, ...PLAYABLE.map((x) => ({ value: x as SportFilter, label: sportName(x) }))];

function SportChips({ value, onChange }: { value: SportFilter; onChange: (v: SportFilter) => void }) {
  return (
    <div className="chip-row" role="group" aria-label="Sport">
      {SPORT_OPTS.map((o) => (
        <button key={o.value} type="button" className={cx('chip', value === o.value && 'chip--active')} aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.value !== 'all' && <SportIcon sport={o.value} size={15} />} {o.label}
        </button>
      ))}
    </div>
  );
}

const shortDay = (d: string | Date) => {
  const x = new Date(d);
  const rel = fmtDay(x, { tonight: false });
  return rel === 'Today' || rel === 'Tomorrow' ? rel : `${weekdayShort(x)} ${fmtShortDate(x)}`;
};

// ---------------------------------------------------------------- play

type PlayWhen = 'week' | 'tonight' | 'tomorrow' | 'weekend';

function PlayView({ retap }: { retap: number }) {
  const s = useApp();
  const [sport, setSport] = useState<SportFilter>('all');
  const [when, setWhen] = useState<PlayWhen>('week');
  const games = useMemo(() => findGames(s, { when, sport: sport === 'all' ? undefined : sport }).sort((a, b) => a.g.start.localeCompare(b.g.start)), [s, when, sport]);
  const mine = upcoming(s).filter((a) => a.kind === 'game' || (a.kind === 'booking' && a.booking.gameId));
  return (
    <Screen
      title="Play"
      header="large"
      back={false}
      retap={retap}
      actions={
        <IconButton label="Create a game" className="iconbtn--ring" onClick={() => nav.push('createGame')}>
          <Plus size={20} />
        </IconButton>
      }
    >
      <div className="pad stack-20">
        <p className="lede">Games near you that need players. No partner? Join one and meet people.</p>
        <SportChips value={sport} onChange={setSport} />
        <div className="chip-row" role="group" aria-label="When">
          {(['week', 'tonight', 'tomorrow', 'weekend'] as PlayWhen[]).map((w) => (
            <button key={w} type="button" className={cx('chip', 'chip--quiet', when === w && 'chip--active')} aria-pressed={when === w} onClick={() => setWhen(w)}>
              {w === 'week' ? 'This week' : w === 'weekend' ? 'Weekend' : w[0].toUpperCase() + w.slice(1)}
            </button>
          ))}
        </div>

        {mine.length > 0 && (
          <Section title="You’re playing">
            <ul className="olist">
              {mine.map((a) => {
                const g = a.kind === 'game' ? a.game : s.games.find((x) => x.id === (a.kind === 'booking' ? a.booking.gameId : ''))!;
                if (!g) return null;
                const f = FACILITY_BY_ID[g.facilityId];
                return (
                  <li key={a.id} className="orow">
                    <button type="button" className="orow__main" onClick={() => nav.push('game', { id: g.id })}>
                      <span className="orow__when">
                        {shortDay(g.start)} · {fmtTime(g.start)}
                      </span>
                      <b className="orow__title">{gameTitle(g)}</b>
                      <span className="orow__meta">
                        {f.name} · {joinedPlayers(s, g.id).length}/{g.maxPlayers} players
                      </span>
                    </button>
                    <Button size="sm" variant="secondary" onClick={() => nav.push('chat', { id: g.id })}>
                      Chat
                    </Button>
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        <Section title="Open games">
          {games.length ? (
            <ul className="olist">
              {games.map(({ g, distance }, n) => {
                const f = FACILITY_BY_ID[g.facilityId];
                const left = g.maxPlayers - joinedPlayers(s, g.id).length;
                return (
                  <li key={g.id} className="orow orow--in" style={{ ['--n' as string]: Math.min(n, 8) }}>
                    <button type="button" className="orow__main" onClick={() => nav.push('game', { id: g.id })}>
                      <span className="orow__when">
                        {shortDay(g.start)} · {fmtTime(g.start)} · {levelLabel(g.level)}
                      </span>
                      <b className="orow__title">{gameTitle(g)}</b>
                      <span className="orow__meta">
                        {f.name} · {distance.toFixed(1)} mi · {g.pricePerPlayer ? money(g.pricePerPlayer) : 'Free'} · <span className={cx(left <= 1 && 'orow__hot')}>{plural(left, 'spot')} left</span>
                      </span>
                    </button>
                    <Button size="sm" variant="accent" onClick={() => openJoinGame(g)} aria-label={`Join ${gameTitle(g)}, ${shortDay(g.start)} ${fmtTime(g.start)}`}>
                      Join
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState compact icon={<Users size={22} />} title="No open games for that" body="Try another day, or start one and players nearby will see it." action={{ label: 'Create a game', onClick: () => nav.push('createGame') }} />
          )}
        </Section>
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------- coaches

function CoachesView({ retap }: { retap: number }) {
  const [sport, setSport] = useState<SportFilter>('all');
  const list = COACHES.filter((c) => sport === 'all' || c.sports.includes(sport));
  return (
    <Screen title="Coaches" header="large" back={false} retap={retap}>
      <div className="pad stack-20">
        <p className="lede">Book and pay for a lesson with a local coach. Every coach is DBS checked.</p>
        <SportChips value={sport} onChange={setSport} />
        <div className="coachlist">
          {list.map((c, n) => {
            const f = FACILITY_BY_ID[c.venueId ?? ''];
            return (
              <article key={c.id} className="coachrow" style={{ ['--n' as string]: Math.min(n, 8) }}>
                <button type="button" className="coachrow__main" onClick={() => nav.push('coach', { id: c.id })}>
                  <Avatar name={c.name} color={c.color} size={56} />
                  <span className="coachrow__body">
                    <b>{c.name}</b>
                    <span>{c.headline}</span>
                    <small>
                      ★ {c.rating.toFixed(1)} · {c.sports.map(sportName).join(' & ')} · {f?.area ?? c.area}
                    </small>
                  </span>
                </button>
                <div className="coachrow__side">
                  <span className="coachrow__price">
                    <b>{money(c.from)}</b>/hr
                  </span>
                  <Button size="sm" variant="accent" onClick={() => openCoachBooking(c)}>
                    Book
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </Screen>
  );
}

/** Times a coach is free on a given day (demo data, stable per coach and day). */
function coachSlots(c: Coach, day: Date, mins: number): Date[] {
  const r = rng(`${c.id}-${dateKey(day)}`);
  const hours = [8, 9, 10, 11, 12, 16, 17, 18, 19, 20];
  const taken = getState().lessons.filter((l) => l.coachId === c.id && l.status === 'confirmed').map((l) => new Date(l.start).getTime());
  const soon = Date.now() + 60 * 60_000;
  return hours
    .filter(() => r() > 0.42)
    .map((h) => at(day, h))
    .filter((d) => d.getTime() > soon && !taken.includes(d.getTime()) && d.getHours() + mins / 60 <= 21);
}

function lessonPrice(c: Coach, mins: number, players: 1 | 2) {
  return Math.round((c.from * (mins / 60) * (players === 2 ? 1.3 : 1)) / 50) * 50;
}

function CoachBookSheet({ coach: c, close }: { coach: Coach; close: () => void }) {
  const s = useApp();
  const [mins, setMins] = useState<'60' | '90'>('60');
  const [players, setPlayers] = useState<'1' | '2'>('1');
  const days = useMemo(() => Array.from({ length: 10 }, (_, i) => addDays(startOfDay(), i)), []);
  const [dayIdx, setDayIdx] = useState(() => days.findIndex((d) => coachSlots(c, d, 60).length > 0));
  const [time, setTime] = useState<number | null>(null);
  const [method, setMethod] = useState<string | undefined>(s.paymentMethods.find((m) => m.isDefault)?.id ?? s.paymentMethods[0]?.id);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const day = days[Math.max(0, dayIdx)];
  const slots = coachSlots(c, day, Number(mins));
  const price = lessonPrice(c, Number(mins), Number(players) as 1 | 2);
  const f = FACILITY_BY_ID[c.venueId ?? ''];
  const first = c.name.split(' ')[0];

  const pay = async () => {
    if (time == null) return;
    setBusy(true);
    setErr(null);
    const res = await bookLesson({ coachId: c.id, start: new Date(time).toISOString(), mins: Number(mins), players: Number(players) as 1 | 2, amount: price, methodId: method });
    setBusy(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    close();
    ui.toast(`Booked. ${first} will see you ${fmtDay(res.lesson.start).toLowerCase()} at ${fmtTime(res.lesson.start)}.`, { tone: 'success' });
    nav.push('lesson', { id: res.lesson.id });
  };

  return (
    <>
      <SheetHeader title={`Book a lesson with ${first}`} subtitle={f ? `${f.name} · ${f.area}` : c.area} onClose={close} />
      <SheetBody className="stack-16">
        <div className="twoseg">
          <Segmented label="Length" value={mins} onChange={(v) => { setMins(v); setTime(null); }} options={[{ value: '60', label: '1 hour' }, { value: '90', label: '1.5 hours' }]} />
          <Segmented label="Players" value={players} onChange={setPlayers} options={[{ value: '1', label: 'Just me' }, { value: '2', label: 'Me + 1' }]} />
        </div>
        <div className="daystrip daystrip--sheet" role="listbox" aria-label="Day">
          {days.map((d, i) => {
            const any = coachSlots(c, d, Number(mins)).length > 0;
            return (
              <button key={i} type="button" role="option" aria-selected={i === dayIdx} disabled={!any} className={cx('daystrip__day', i === dayIdx && 'is-on')} onClick={() => { setDayIdx(i); setTime(null); }}>
                <span>{i === 0 ? 'Today' : i === 1 ? 'Tmrw' : weekdayShort(d)}</span>
                <b>{d.getDate()}</b>
              </button>
            );
          })}
        </div>
        {slots.length ? (
          <div className="timegrid" role="listbox" aria-label="Time">
            {slots.map((d) => (
              <button key={d.getTime()} type="button" role="option" aria-selected={time === d.getTime()} className={cx('timechip', time === d.getTime() && 'is-on')} onClick={() => setTime(d.getTime())}>
                <b>{fmtTime(d)}</b>
              </button>
            ))}
          </div>
        ) : (
          <p className="fine">{first} is fully booked that day. Try another.</p>
        )}
        <PaymentMethodSelect value={method} onChange={setMethod} />
        {err && <p className="field__error">{err}</p>}
        <p className="fine">Free cancellation up to 24 hours before.</p>
      </SheetBody>
      <SheetFooter>
        <Button block size="lg" disabled={time == null} loading={busy} onClick={pay}>
          {time == null ? 'Pick a time' : `Pay ${money(price)}`}
        </Button>
      </SheetFooter>
    </>
  );
}

export function openCoachBooking(c: Coach) {
  if (needsAccount('request')) return;
  ui.open(`Book ${c.name}`, (close) => <CoachBookSheet coach={c} close={close} />);
}

export function CoachScreen({ params }: ScreenComponentProps) {
  const c = COACH_BY_ID[params.id!];
  if (!c) return <Screen title="Coach">{null}</Screen>;
  const f = FACILITY_BY_ID[c.venueId ?? ''];
  return (
    <Screen
      title={c.name}
      footer={
        <CtaBar label={<span className="cta-price">{money(c.from)}<small> per hour</small></span>} sub="1:1 lesson">
          <Button size="lg" onClick={() => openCoachBooking(c)}>
            Book a lesson
          </Button>
        </CtaBar>
      }
    >
      <div className="pad stack-20">
        <div className="coach-head">
          <Avatar name={c.name} color={c.color} size={84} />
          <h1>{c.name}</h1>
          <p>{c.headline}</p>
          <RatingDisplay value={c.rating} count={c.reviewCount} size={15} />
        </div>
        <p className="prose">{c.bio}</p>
        {f && (
          <button type="button" className="placerow" onClick={() => nav.push('facility', { id: f.id })}>
            <span className="eyebrow">Coaches at</span>
            <b>{f.name}</b>
            <small>
              {f.address}, {f.postcode}
            </small>
          </button>
        )}
        <Section title="Qualifications">
          <ul className="features">
            {c.qualifications.map((q) => (
              <li key={q}>
                <ShieldCheck size={16} /> {q}
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------- friends

function FriendsView({ retap }: { retap: number }) {
  const s = useApp();
  const [q, setQ] = useState('');
  const query = q.trim().replace(/^@/, '').toLowerCase();
  const myName = s.account?.username?.toLowerCase();
  const results = useMemo(() => {
    if (!query) return [];
    return PEOPLE.filter((p) => !s.blocked.includes(p.id) && (p.username.toLowerCase().includes(query) || p.name.toLowerCase().includes(query)))
      .sort((a, b) => Number(b.username.toLowerCase().startsWith(query)) - Number(a.username.toLowerCase().startsWith(query)))
      .slice(0, 20);
  }, [query, s.blocked]);
  const incoming = s.friendRequests.filter((r) => r.dir === 'in');
  const waiting = s.friendRequests.filter((r) => r.dir === 'out').length;
  const friends = s.friends.map((id) => userById(s, id)).filter((u): u is NonNullable<typeof u> => !!u);

  return (
    <Screen title="Friends" header="large" back={false} retap={retap}>
      <div className="pad stack-20">
        <label className="bigsearch">
          <Search size={19} aria-hidden="true" />
          <input
            type="search"
            inputMode="search"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Search usernames"
            aria-label="Search by username"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button type="button" className="bigsearch__clear" aria-label="Clear" onClick={() => setQ('')}>
              <X size={16} />
            </button>
          )}
        </label>

        {query ? (
          <div className="peoplelist" aria-live="polite">
            {myName && myName.includes(query) && (
              <div className="personrow">
                <Avatar name={s.account!.firstName} color={s.account!.color} photo={s.account!.photo} size={44} />
                <span className="personrow__body">
                  <b>{s.account!.firstName} (you)</b>
                  <small>@{s.account!.username}</small>
                </span>
              </div>
            )}
            {results.map((p) => (
              <div key={p.id} className="personrow">
                <button type="button" className="personrow__main" onClick={() => nav.push('player', { id: p.id })}>
                  <Avatar name={p.name} color={p.color} photo={p.photo} size={44} />
                  <span className="personrow__body">
                    <b>{p.name}</b>
                    <small>@{p.username}</small>
                  </span>
                </button>
                <FriendButton userId={p.id} />
              </div>
            ))}
            {!results.length && !(myName && myName.includes(query)) && <p className="peoplelist__none">No one with the username @{query}.</p>}
          </div>
        ) : (
          <>
            {incoming.length > 0 && (
              <Section title="Friend requests">
                <div className="peoplelist">
                  {incoming.map((r) => {
                    const u = userById(s, r.userId);
                    if (!u) return null;
                    return (
                      <div key={r.id} className="personrow">
                        <button type="button" className="personrow__main" onClick={() => nav.push('player', { id: u.id })}>
                          <Avatar name={u.name} color={u.color} size={44} />
                          <span className="personrow__body">
                            <b>{u.name}</b>
                            <small>@{u.username}</small>
                          </span>
                        </button>
                        <div className="personrow__actions">
                          <Button size="sm" variant="secondary" onClick={() => declineFriendRequest(u.id)}>
                            Decline
                          </Button>
                          <Button size="sm" onClick={() => acceptFriendRequest(u.id)}>
                            Accept
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {friends.length ? (
              <Section title={`Friends · ${friends.length}`}>
                <div className="peoplelist">
                  {friends.map((u) => (
                    <button key={u.id} type="button" className="personrow personrow--link" onClick={() => nav.push('player', { id: u.id })}>
                      <Avatar name={u.name} color={u.color} photo={u.photo} size={44} />
                      <span className="personrow__body">
                        <b>{u.name}</b>
                        <small>
                          @{u.username} · {u.sports.map((x) => sportName(x.sport)).join(', ')}
                        </small>
                      </span>
                      <UserCheck size={18} className="personrow__tick" aria-label="Friends" />
                    </button>
                  ))}
                </div>
              </Section>
            ) : (
              <div className="friends-empty">
                <span className="friends-empty__icon" aria-hidden="true">
                  <AtSign size={26} />
                </span>
                <p>Search for someone’s username to add them. When you’ve both added each other, they’ll show up here.</p>
              </div>
            )}
            {waiting > 0 && <p className="fine center">Waiting for {plural(waiting, 'person', 'people')} to accept.</p>}
          </>
        )}
      </div>
    </Screen>
  );
}

/** Friends tab root: Play, Coaches or Friends, switched from the bar above the tab bar. */
export function FriendsHubScreen({ retap }: ScreenComponentProps) {
  const n = useNav();
  const sub = n.sub.friends;
  return (
    <div className="hub" key={sub}>
      {sub === 'play' ? <PlayView retap={retap} /> : sub === 'coaches' ? <CoachesView retap={retap} /> : <FriendsView retap={retap} />}
    </div>
  );
}

