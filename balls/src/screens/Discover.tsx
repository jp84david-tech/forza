import {
  Bell,
  BellOff,
  CalendarCheck,
  CalendarX,
  Check,
  ChevronRight,
  Clock,
  CreditCard,
  GraduationCap,
  History,
  MapPin,
  MessageCircle,
  Receipt,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Star,
  Store,
  Trophy,
  UserMinus,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Artwork, sportArt } from '../components/Artwork';
import { EventCard, FacilityCard, GameCard, SportBadge, TournamentCard, TrainingCard } from '../components/cards';
import { SportIcon } from '../components/icons';
import { needsAccount } from '../components/Join';
import { SheetBody, SheetFooter, SheetHeader } from '../components/Sheet';
import { DirectionsButton, openShare, PaymentMethodSelect } from '../components/sheets';
import { Avatar, Button, Chip, CtaBar, EmptyState, IconButton, Pill, RatingDisplay, Screen, Section, Segmented } from '../components/ui';
import { LEAGUES, TOURNAMENTS } from '../data/compete';
import { COACHES, COACH_BY_ID, EVENTS, FEED, SHOPS, TRAINING } from '../data/discover';
import { FACILITIES, FACILITY_BY_ID, spacesFor } from '../data/facilities';
import { levelLabel, sportName } from '../data/sports';
import type { Notification, NotificationType, SportId, SportsEvent } from '../data/types';
import { cx, miles, money, moneyExact, plural } from '../lib/format';
import { directionsUrl } from '../lib/geo';
import { fmtDay, fmtDuration, fmtLongDate, fmtRange, fmtTime, isSameDay, startOfDay, timeAgo } from '../lib/time';
import { addRecentSearch, clearRecentSearches, markAllRead, openNotification, register } from '../state/actions';
import { nav } from '../state/nav';
import { distanceTo, isMinor } from '../state/selectors';
import { useApp } from '../state/store';
import { ui } from '../state/ui';
import { buildIndex, RESULT_LABELS, type ResultType, search } from '../services/search';
import { findGames, rankFacilities } from '../services/discovery';
import { analytics } from '../services/analytics';
import type { ScreenComponentProps } from './routes';

// ---------------------------------------------------------------- events

const KIND_FILTERS: Array<[SportsEvent['kind'] | 'all', string]> = [
  ['all', 'All'],
  ['competition', 'Competitions'],
  ['community', 'Community'],
  ['training', 'Tasters'],
  ['camp', 'Camps'],
  ['sporting-event', 'Sporting events'],
];

export function EventsScreen() {
  const s = useApp();
  const [kind, setKind] = useState<SportsEvent['kind'] | 'all'>('all');
  const [sport, setSport] = useState<SportId | null>(null);
  const [date, setDate] = useState<'any' | 'weekend' | 'week' | 'month'>('any');
  const [price, setPrice] = useState<'any' | 'free' | 'u10'>('any');
  const [distance, setDistance] = useState<number | null>(null);
  const minor = isMinor(s);
  const sports = [...new Set(EVENTS.map((e) => e.sport))];
  const list = EVENTS.filter((e) => (minor ? e.ageRule !== 'adults' : e.ageRule !== 'juniors' || true))
    .filter((e) => kind === 'all' || e.kind === kind)
    .filter((e) => !sport || e.sport === sport)
    .filter((e) => {
      const d = (new Date(e.start).getTime() - Date.now()) / 86_400_000;
      if (date === 'week') return d <= 7;
      if (date === 'month') return d <= 31;
      if (date === 'weekend') {
        const wd = new Date(e.start).getDay();
        return d <= 7 && (wd === 0 || wd === 6);
      }
      return true;
    })
    .filter((e) => (price === 'free' ? e.price === 0 : price === 'u10' ? e.price <= 1000 : true))
    .filter((e) => distance == null || distanceTo(s, FACILITY_BY_ID[e.facilityId]) <= distance)
    .sort((a, b) => a.start.localeCompare(b.start));
  return (
    <Screen title="Events">
      <div className="pad stack-12">
        <div className="hscroll hscroll--chips hscroll--flush">
          {KIND_FILTERS.map(([k, label]) => (
            <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
              {label}
            </Chip>
          ))}
        </div>
        <div className="hscroll hscroll--chips hscroll--flush">
          <Chip active={!sport} onClick={() => setSport(null)}>
            All sports
          </Chip>
          {sports.map((sp) => (
            <Chip key={sp} active={sport === sp} icon={<SportIcon sport={sp} size={15} />} onClick={() => setSport(sp)}>
              {sport === sp || sp !== 'other' ? sportName(sp) : 'Multi-sport'}
            </Chip>
          ))}
        </div>
        <div className="hscroll hscroll--chips hscroll--flush">
          {(
            [
              ['weekend', 'This weekend'],
              ['week', 'This week'],
              ['month', 'This month'],
            ] as const
          ).map(([k, label]) => (
            <Chip key={k} active={date === k} onClick={() => setDate(date === k ? 'any' : k)}>
              {label}
            </Chip>
          ))}
          <Chip active={price === 'free'} onClick={() => setPrice(price === 'free' ? 'any' : 'free')}>
            Free
          </Chip>
          <Chip active={price === 'u10'} onClick={() => setPrice(price === 'u10' ? 'any' : 'u10')}>
            £10 or less
          </Chip>
          <Chip active={distance != null} onClick={() => setDistance(distance == null ? 1 : distance === 1 ? 3 : distance === 3 ? 5 : null)}>
            {distance == null ? 'Any distance' : `Within ${distance} mi`}
          </Chip>
        </div>
        {list.length ? (
          <div className="cards">
            {list.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        ) : (
          <EmptyState icon={<CalendarX size={24} />} title="No events match." body="Try a different date or a wider distance." action={{ label: 'Clear filters', onClick: () => { setKind('all'); setSport(null); setDate('any'); setPrice('any'); setDistance(null); } }} />
        )}
      </div>
    </Screen>
  );
}

function BookPlaceSheet({ kind, id, title, price, close }: { kind: 'event' | 'training'; id: string; title: string; price: number; close: () => void }) {
  const s = useApp();
  const [method, setMethod] = useState<string | undefined>(s.paymentMethods.find((m) => m.isDefault)?.id ?? s.paymentMethods[0]?.id);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <>
      <SheetHeader title={price ? 'Book your place' : 'Save your place'} subtitle={title} onClose={close} />
      <SheetBody>
        {price > 0 ? (
          <div className="field">
            <span className="field__label">Pay {moneyExact(price)} with</span>
            <PaymentMethodSelect value={method} onChange={setMethod} />
          </div>
        ) : (
          <p className="notice notice--ok">
            <Check size={15} /> This one’s free. We’ll save you a place and send a reminder.
          </p>
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
          onClick={async () => {
            setBusy(true);
            const res = await register({ kind, targetId: id, title, amount: price, methodId: method });
            setBusy(false);
            if (!res.ok) {
              setErr(res.error ?? 'Couldn’t book.');
              return;
            }
            close();
            ui.toast(`Booked: ${title}`, { tone: 'success' });
          }}
        >
          {price ? `Pay ${moneyExact(price)}` : 'Save my place'}
        </Button>
      </SheetFooter>
    </>
  );
}

export function EventScreen({ params }: ScreenComponentProps) {
  const s = useApp();
  const e = EVENTS.find((x) => x.id === params.id)!;
  const f = FACILITY_BY_ID[e.facilityId];
  const reg = s.registrations.find((r) => r.targetId === e.id && r.status === 'confirmed');
  const left = e.capacity - e.taken - (reg ? 1 : 0);
  const minorBlocked = isMinor(s) && e.ageRule === 'adults';
  return (
    <Screen
      header="overlay"
      overlayThreshold={170}
      title={e.title}
      actions={
        <IconButton label="Share" variant="glass" onClick={() => openShare({ title: 'Share event', text: `${e.title}, ${fmtDay(e.start)} at ${f.name}.`, path: `e/${e.id}` })}>
          <Share2 size={19} />
        </IconButton>
      }
      footer={
        reg ? (
          <CtaBar label={<span className="inlabel"><Check size={16} strokeWidth={3} /> You’re going</span>} sub={fmtDay(e.start)}>
            <DirectionsButton f={f} variant="secondary" />
          </CtaBar>
        ) : (
          <CtaBar label={<span className="cta-price">{e.price ? money(e.price) : 'Free'}</span>} sub={left > 0 ? `${plural(left, 'place')} left` : 'Fully booked'}>
            <Button size="lg" disabled={left <= 0 || minorBlocked} onClick={() => !needsAccount('register') && ui.open('Book', (close) => <BookPlaceSheet kind="event" id={e.id} title={e.title} price={e.price} close={close} />)}>
              {minorBlocked ? 'Adults only' : left > 0 ? 'Book a place' : 'Full'}
            </Button>
          </CtaBar>
        )
      }
    >
      <div className="ghero">
        <Artwork art={sportArt(e.sport, Number(e.id.slice(1)) * 7, 'day')} />
      </div>
      <div className="gamehead">
        <div className="gamehead__sport">
          <SportIcon sport={e.sport} size={16} /> {e.sport === 'other' ? 'Multi-sport' : sportName(e.sport)}
        </div>
        <h1 className="gamehead__title">{e.title}</h1>
        <div className="chip-row">
          {e.level && <Pill tone="brand">{levelLabel(e.level)}</Pill>}
          <Pill>{e.ageRule === 'adults' ? '18+' : e.ageRule === 'juniors' ? 'Juniors' : 'All ages'}</Pill>
        </div>
      </div>
      <div className="pad stack-20">
        <div className="gfacts">
          <div className="gfact">
            <Clock size={18} />
            <span>
              <b>{fmtLongDate(e.start)}</b>
              <small>{fmtRange(e.start, e.end)}</small>
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
                {e.capacity - left}/{e.capacity} going
              </b>
              <span className="spots">
                <span className="spots__track">
                  <span className="spots__fill" style={{ width: `${((e.capacity - left) / e.capacity) * 100}%` }} />
                </span>
              </span>
            </span>
          </div>
        </div>
        <Section title="About">
          <p className="prose">{e.description}</p>
          <p className="fine">Organised by {e.organiser}</p>
        </Section>
        {e.ageRule !== 'adults' && (
          <p className="notice notice--safe">
            <ShieldCheck size={16} /> Junior activities are run by DBS-checked staff. Under-16s must be accompanied.
          </p>
        )}
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------- training

export function TrainingScreen() {
  const s = useApp();
  const [tab, setTab] = useState<'sessions' | 'coaches'>('sessions');
  const [sport, setSport] = useState<SportId | null>(null);
  const [level, setLevel] = useState<'any' | 'beginner'>('any');
  const minor = isMinor(s);
  const sports = [...new Set(TRAINING.map((t) => t.sport))];
  const sessions = TRAINING.filter((t) => (minor ? t.ageRule !== 'adults' : t.ageRule !== 'juniors'))
    .filter((t) => !sport || t.sport === sport)
    .filter((t) => level === 'any' || t.level === 'beginner')
    .sort((a, b) => a.start.localeCompare(b.start));
  const coaches = COACHES.filter((c) => !sport || c.sports.includes(sport));
  return (
    <Screen title="Training">
      <div className="pad stack-12">
        <Segmented label="Training" value={tab} onChange={setTab} options={[{ value: 'sessions', label: 'Sessions & classes' }, { value: 'coaches', label: 'Coaches' }]} />
        <div className="hscroll hscroll--chips hscroll--flush">
          <Chip active={!sport} onClick={() => setSport(null)}>
            All sports
          </Chip>
          {sports.map((sp) => (
            <Chip key={sp} active={sport === sp} icon={<SportIcon sport={sp} size={15} />} onClick={() => setSport(sp)}>
              {sportName(sp)}
            </Chip>
          ))}
          {tab === 'sessions' && (
            <Chip active={level === 'beginner'} onClick={() => setLevel(level === 'beginner' ? 'any' : 'beginner')}>
              Beginner-friendly
            </Chip>
          )}
        </div>
        {tab === 'sessions' ? (
          sessions.length ? (
            <div className="cards">
              {sessions.map((t) => (
                <TrainingCard key={t.id} session={t} />
              ))}
            </div>
          ) : (
            <EmptyState icon={<GraduationCap size={24} />} title="No sessions for this yet." body="Try another sport, or browse coaches." action={{ label: 'Browse coaches', onClick: () => setTab('coaches') }} />
          )
        ) : (
          <div className="list-card list-card--rows">
            {coaches.map((c) => (
              <button key={c.id} type="button" className="coachrow" onClick={() => nav.push('coach', { id: c.id })}>
                <Avatar name={c.name} color={c.color} size={48} />
                <span className="coachrow__body">
                  <b>{c.name}</b>
                  <small>
                    {c.sports.map(sportName).join(' & ')} · {c.area}
                  </small>
                  <span className="coachrow__meta">
                    <RatingDisplay value={c.rating} count={c.reviewCount} size={12} />
                    {c.safeguarding && (
                      <span className="dbs">
                        <ShieldCheck size={12} /> DBS checked
                      </span>
                    )}
                  </span>
                </span>
                <span className="coachrow__price">
                  <small>from</small>
                  <b>{money(c.from)}</b>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Screen>
  );
}

export function SessionScreen({ params }: ScreenComponentProps) {
  const s = useApp();
  const t = TRAINING.find((x) => x.id === params.id)!;
  const c = COACH_BY_ID[t.coachId];
  const f = FACILITY_BY_ID[t.facilityId];
  const reg = s.registrations.find((r) => r.targetId === t.id && r.status === 'confirmed');
  const left = t.capacity - t.taken - (reg ? 1 : 0);
  return (
    <Screen
      title={t.title}
      footer={
        reg ? (
          <CtaBar label={<span className="inlabel"><Check size={16} strokeWidth={3} /> Booked</span>} sub={`${fmtDay(t.start)} · ${fmtTime(t.start)}`}>
            <DirectionsButton f={f} variant="secondary" />
          </CtaBar>
        ) : (
          <CtaBar label={<span className="cta-price">{money(t.price)}</span>} sub={left > 0 ? `${plural(left, 'place')} left` : 'Fully booked'}>
            <Button size="lg" disabled={left <= 0} onClick={() => !needsAccount('register') && ui.open('Book', (close) => <BookPlaceSheet kind="training" id={t.id} title={t.title} price={t.price} close={close} />)}>
              {left > 0 ? 'Book session' : 'Full'}
            </Button>
          </CtaBar>
        )
      }
    >
      <div className="pad stack-20">
        <div className="sess-head">
          <SportBadge sport={t.sport} size={52} />
          <div>
            <div className="eyebrow">
              {t.kind === 'one-to-one' ? '1:1 lesson' : t.kind === 'class' ? 'Class' : t.kind === 'camp' ? 'Camp' : 'Group session'} · {sportName(t.sport)}
            </div>
            <h1 className="sess-head__title">{t.title}</h1>
            <RatingDisplay value={t.rating} size={13} />
          </div>
        </div>
        <div className="gfacts">
          <div className="gfact">
            <Clock size={18} />
            <span>
              <b>
                {fmtDay(t.start)} · {fmtTime(t.start)}
              </b>
              <small>{fmtDuration(t.durationMins)}</small>
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
            <span>
              <b>
                {t.capacity === 1 ? 'Just you and the coach' : `${t.capacity - left}/${t.capacity} booked`}
              </b>
              <small>{levelLabel(t.level)} level</small>
            </span>
          </div>
        </div>
        <p className="prose">{t.description}</p>
        <button type="button" className="coachcard" onClick={() => nav.push('coach', { id: c.id })}>
          <Avatar name={c.name} color={c.color} size={48} />
          <span>
            <small>Your coach</small>
            <b>{c.name}</b>
            <span className="dbs">
              <ShieldCheck size={12} /> DBS checked · {c.qualifications[0]}
            </span>
          </span>
          <ChevronRight size={18} />
        </button>
      </div>
    </Screen>
  );
}

export function CoachScreen({ params }: ScreenComponentProps) {
  const c = COACH_BY_ID[params.id!];
  const sessions = TRAINING.filter((t) => t.coachId === c.id);
  const [requested, setRequested] = useState(false);
  return (
    <Screen
      title={c.name}
      footer={
        <CtaBar label={`From ${money(c.from)}`} sub="per session">
          <Button
            size="lg"
            disabled={requested}
            onClick={() =>
              !needsAccount('request') &&
              ui.open('Request a session', (close) => (
                <>
                  <SheetHeader title={`Request a session with ${c.name.split(' ')[0]}`} onClose={close} />
                  <SheetBody>
                    <p className="prose">Pick the times that usually suit you. {c.name.split(' ')[0]} will reply with available slots, and you only pay once you confirm.</p>
                    <RequestTimes />
                  </SheetBody>
                  <SheetFooter>
                    <Button
                      block
                      size="lg"
                      onClick={() => {
                        setRequested(true);
                        close();
                        ui.toast(`Request sent. ${c.name.split(' ')[0]} usually replies within a day.`, { tone: 'success' });
                      }}
                    >
                      Send request
                    </Button>
                  </SheetFooter>
                </>
              ))
            }
          >
            {requested ? 'Request sent' : 'Request a session'}
          </Button>
        </CtaBar>
      }
    >
      <div className="pad stack-20">
        <div className="coach-head">
          <Avatar name={c.name} color={c.color} size={84} />
          <h1>{c.name}</h1>
          <p>
            {c.sports.map(sportName).join(' & ')} coach · {c.area}
          </p>
          <RatingDisplay value={c.rating} count={c.reviewCount} size={15} />
        </div>
        <p className="prose">{c.bio}</p>
        <Section title="Qualifications">
          <ul className="features">
            {c.qualifications.map((q) => (
              <li key={q}>
                <ShieldCheck size={16} /> {q}
              </li>
            ))}
          </ul>
        </Section>
        {sessions.length > 0 && (
          <Section title="Upcoming sessions">
            <div className="cards">
              {sessions.map((t) => (
                <TrainingCard key={t.id} session={t} />
              ))}
            </div>
          </Section>
        )}
      </div>
    </Screen>
  );
}

function RequestTimes() {
  const [picked, setPicked] = useState<string[]>(['Weekday evenings']);
  const opts = ['Weekday mornings', 'Weekday lunchtimes', 'Weekday evenings', 'Weekend mornings', 'Weekend afternoons'];
  return (
    <div className="chip-wrap">
      {opts.map((o) => (
        <Chip key={o} active={picked.includes(o)} onClick={() => setPicked((x) => (x.includes(o) ? x.filter((y) => y !== o) : [...x, o]))}>
          {o}
        </Chip>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- shops & services

const SHOP_KIND: Record<string, string> = { shop: 'Sports shop', repairs: 'Repairs', physio: 'Physio', stringing: 'Racket stringing' };

export function ServicesScreen({ params }: ScreenComponentProps) {
  const s = useApp();
  const [kind, setKind] = useState<string>('all');
  const list = SHOPS.filter((x) => kind === 'all' || x.kind === kind)
    .map((x) => ({ x, d: distanceTo(s, x) }))
    .sort((a, b) => (params.id === a.x.id ? -1 : params.id === b.x.id ? 1 : a.d - b.d));
  return (
    <Screen title="Shops & services">
      <div className="pad stack-12">
        <div className="chip-row">
          {['all', 'shop', 'stringing', 'physio'].map((k) => (
            <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
              {k === 'all' ? 'All' : SHOP_KIND[k]}
            </Chip>
          ))}
        </div>
        <div className="cards">
          {list.map(({ x, d }) => (
            <article key={x.id} className={cx('shop', params.id === x.id && 'is-highlight')}>
              <div className="shop__icon">
                <Store size={20} />
              </div>
              <div className="shop__body">
                <div className="eyebrow">{SHOP_KIND[x.kind]}</div>
                <h3>{x.name}</h3>
                <p>{x.description}</p>
                <div className="shop__meta">
                  <RatingDisplay value={x.rating} size={12} />
                  <span>
                    {x.area} · {miles(d)}
                  </span>
                  <span>{x.hours}</span>
                </div>
              </div>
              <a className="btn btn--secondary btn--sm" href={directionsUrl(s.prefs.mapsApp === 'ask' ? 'google' : s.prefs.mapsApp, x, x.name)} target="_blank" rel="noopener noreferrer" aria-label={`Directions to ${x.name}`}>
                <MapPin size={15} />
                <span className="btn__label">Go</span>
              </a>
            </article>
          ))}
        </div>
        <p className="fine">Local businesses listed for convenience. BALLS isn’t paid for these listings.</p>
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------- feed

export function FeedScreen() {
  const s = useApp();
  const mine = new Set(s.profile.sports.map((x) => x.sport));
  const items = [...FEED].sort((a, b) => Number(mine.has(b.sport!)) - Number(mine.has(a.sport!)) || b.at.localeCompare(a.at));
  return (
    <Screen title="Around you">
      <div className="pad">
        <p className="fine">Local news from venues, organisers and coaches near {s.location?.label ?? 'you'}.</p>
        <div className="feed">
          {items.map((item) => (
            <button key={item.id} type="button" className="feeditem feeditem--big" onClick={() => nav.push(item.link.route, item.link.params)}>
              {item.art && (
                <span className="feeditem__art">
                  <Artwork art={item.art} />
                </span>
              )}
              <span className="feeditem__body">
                <span className="feeditem__kind">
                  {item.sport && <SportIcon sport={item.sport} size={13} />} {timeAgo(item.at)}
                </span>
                <b>{item.title}</b>
                <span>{item.body}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------- sport hub

export function SportHubScreen({ params }: ScreenComponentProps) {
  const s = useApp();
  const sport = params.id as SportId;
  const games = useMemo(() => findGames(s, { sport, when: 'week' }).slice(0, 6), [s, sport]);
  const venues = useMemo(() => rankFacilities(s, FACILITIES.filter((f) => spacesFor(f.id).some((x) => x.sport === sport)), sport), [s, sport]);
  const tournaments = TOURNAMENTS.filter((t) => t.sport === sport);
  const leagues = LEAGUES.filter((l) => l.sport === sport);
  const training = TRAINING.filter((t) => t.sport === sport);
  const events = EVENTS.filter((e) => e.sport === sport);
  const lvl = s.profile.sports.find((x) => x.sport === sport);
  return (
    <Screen title={sportName(sport)}>
      <div className="hub-head">
        <SportBadge sport={sport} size={56} />
        <div>
          <h1>{sportName(sport)}</h1>
          <p>{lvl ? `You play at ${levelLabel(lvl.level).toLowerCase()} level` : `Near ${s.location?.label ?? 'you'}`}</p>
        </div>
      </div>
      <div className="pad">
        <button type="button" className="playnow playnow--compact" onClick={() => nav.push('playNow')}>
          <span className="playnow__radar" aria-hidden="true">
            <i />
            <i />
            <Zap size={20} fill="currentColor" />
          </span>
          <span className="playnow__text">
            <span className="playnow__title">Play {sportName(sport).toLowerCase()} now</span>
            <span className="playnow__sub">{games.length ? `${plural(games.length, 'game')} ${games.length === 1 ? 'needs' : 'need'} players this week` : 'Find or start a game'}</span>
          </span>
        </button>
      </div>
      <Section title="Games needing players" action={games.length ? 'See all' : undefined} onAction={() => nav.push('games', { sport })} className="pad-x">
        {games.length ? (
          <div className="hscroll hscroll--cards">
            {games.map((x) => (
              <GameCard key={x.g.id} game={x.g} variant="wide" reasons={x.reasons} />
            ))}
          </div>
        ) : (
          <EmptyState compact icon={<Users size={22} />} title="No games nearby yet." body="Start one and we’ll tell nearby players." action={{ label: 'Start your own game', onClick: () => nav.push('createGame', { sport }) }} />
        )}
      </Section>
      <Section title="Where to play" action="Compare prices" onAction={() => nav.push('compare', { sport })} className="pad">
        <div className="cards">
          {venues.slice(0, 4).map((x) => (
            <FacilityCard key={x.f.id} facility={x.f} sport={sport} />
          ))}
        </div>
        {venues.length > 4 && (
          <Button variant="secondary" block onClick={() => nav.go('explore', undefined, { sport, view: 'list' })}>
            See all {venues.length} venues
          </Button>
        )}
      </Section>
      {(tournaments.length > 0 || leagues.length > 0) && (
        <Section title="Compete" className="pad-x">
          <div className="hscroll hscroll--cards">
            {tournaments.map((t) => (
              <TournamentCard key={t.id} t={t} />
            ))}
            {leagues.map((l) => (
              <button key={l.id} type="button" className="leaguetile" onClick={() => nav.push('league', { id: l.id })}>
                <Trophy size={20} />
                <b>{l.name}</b>
                <small>
                  {l.night} · {l.teams.length}/{l.maxTeams} teams
                </small>
                <span>League · {money(l.entryFee)}/team</span>
              </button>
            ))}
          </div>
        </Section>
      )}
      {(training.length > 0 || events.length > 0) && (
        <Section title="Learn & join in" className="pad">
          <div className="cards">
            {training.map((t) => (
              <TrainingCard key={t.id} session={t} />
            ))}
            {events.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </Section>
      )}
    </Screen>
  );
}

// ---------------------------------------------------------------- search

const POPULAR = ['Padel', 'Tennis courts', 'Indoor tennis', 'Highgate', 'Crouch End', 'Coaches'];

export function SearchScreen() {
  const s = useApp();
  const [q, setQ] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const index = useMemo(() => buildIndex(s), [s]);
  const results = useMemo(() => search(index, q), [index, q]);
  const groups = useMemo(() => {
    const m = new Map<ResultType, typeof results>();
    results.forEach((r) => {
      if (!m.has(r.type)) m.set(r.type, []);
      m.get(r.type)!.push(r);
    });
    return [...m.entries()].sort((a, b) => b[1][0].score - a[1][0].score);
  }, [results]);

  useEffect(() => {
    const t = setTimeout(() => input.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  const go = (r: (typeof results)[number]) => {
    addRecentSearch(q);
    if (r.type === 'sport') analytics.track('sport_selected', { sport: r.id, from: 'search' });
    nav.replace(r.link.route, r.link.params);
  };

  return (
    <div className="screen-inner search">
      <header className="searchhead">
        <div className="searchbar searchbar--active">
          <Search size={18} aria-hidden="true" />
          <input
            ref={input}
            type="search"
            enterKeyHint="search"
            placeholder="Venues, games, sports, coaches…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results[0]) go(results[0]);
            }}
            aria-label="Search BALLS"
            id="global-search"
          />
          {q && (
            <button type="button" className="searchbar__clear" onClick={() => setQ('')} aria-label="Clear search">
              <X size={16} />
            </button>
          )}
        </div>
        <button type="button" className="link" onClick={() => nav.pop()}>
          Cancel
        </button>
      </header>
      <div className="scroll">
        {!q ? (
          <div className="pad stack-20">
            {s.recentSearches.length > 0 && (
              <Section title="Recent" action="Clear" onAction={clearRecentSearches}>
                <div className="list-card">
                  {s.recentSearches.map((r) => (
                    <button key={r} type="button" className="row row--btn" onClick={() => setQ(r)}>
                      <span className="row__icon">
                        <History size={17} />
                      </span>
                      <span className="row__body">
                        <span className="row__title">{r}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </Section>
            )}
            <Section title="Popular near you">
              <div className="chip-wrap">
                {POPULAR.map((p) => (
                  <Chip key={p} onClick={() => setQ(p)}>
                    {p}
                  </Chip>
                ))}
              </div>
            </Section>
          </div>
        ) : results.length ? (
          <div className="pad stack-16" aria-live="polite">
            <p className="fine">
              {plural(results.length, 'result')} for “{q}”
            </p>
            {groups.map(([type, items]) => (
              <Section key={type} title={RESULT_LABELS[type]}>
                <div className="list-card">
                  {items.slice(0, type === 'facility' || type === 'game' ? 6 : 4).map((r) => (
                    <button key={`${r.type}-${r.id}`} type="button" className="row row--btn" onClick={() => go(r)}>
                      <span className="row__icon">{r.sport ? <SportIcon sport={r.sport} size={18} /> : <Search size={17} />}</span>
                      <span className="row__body">
                        <span className="row__title">{r.title}</span>
                        <span className="row__sub">{r.subtitle}</span>
                      </span>
                      <ChevronRight size={16} className="row__chev" />
                    </button>
                  ))}
                </div>
              </Section>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Search size={24} />} title={`Nothing for “${q}”`} body="Check the spelling, or try a sport, venue or area name." />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- notifications

const NOTI_ICON: Record<NotificationType, React.ReactNode> = {
  'booking-confirmed': <CalendarCheck size={18} />,
  'booking-reminder': <Clock size={18} />,
  'game-reminder': <Clock size={18} />,
  'player-joined': <UserPlus size={18} />,
  'player-left': <UserMinus size={18} />,
  'game-nearly-full': <Users size={18} />,
  waitlist: <Bell size={18} />,
  'venue-alert': <Bell size={18} />,
  invitation: <UserPlus size={18} />,
  message: <MessageCircle size={18} />,
  cancellation: <CalendarX size={18} />,
  refund: <Receipt size={18} />,
  tournament: <Trophy size={18} />,
  payment: <CreditCard size={18} />,
  achievement: <Star size={18} />,
};

export function NotificationItem({ n }: { n: Notification }) {
  return (
    <button type="button" className={cx('noti', !n.read && 'is-unread')} onClick={() => openNotification(n)}>
      <span className={cx('noti__icon', `noti__icon--${n.type}`)}>{NOTI_ICON[n.type]}</span>
      <span className="noti__body">
        <b>{n.title}</b>
        <span>{n.body}</span>
        <small>{timeAgo(n.at)}</small>
      </span>
      {!n.read && <span className="noti__dot" aria-label="Unread" />}
    </button>
  );
}

export function NotificationsScreen() {
  const s = useApp();
  const today = s.notifications.filter((n) => isSameDay(new Date(n.at), startOfDay()));
  const earlier = s.notifications.filter((n) => !isSameDay(new Date(n.at), startOfDay()));
  const unread = s.notifications.some((n) => !n.read);
  return (
    <Screen
      title="Notifications"
      actions={
        <>
          {unread && (
            <button type="button" className="link" onClick={markAllRead}>
              Mark all read
            </button>
          )}
          <IconButton label="Notification settings" onClick={() => nav.push('settingsNotifications')}>
            <Settings size={20} />
          </IconButton>
        </>
      }
    >
      {s.notifications.length ? (
        <div className="pad stack-16">
          {today.length > 0 && (
            <Section title="Today">
              <div className="notis">
                {today.map((n) => (
                  <NotificationItem key={n.id} n={n} />
                ))}
              </div>
            </Section>
          )}
          {earlier.length > 0 && (
            <Section title="Earlier">
              <div className="notis">
                {earlier.map((n) => (
                  <NotificationItem key={n.id} n={n} />
                ))}
              </div>
            </Section>
          )}
        </div>
      ) : (
        <EmptyState icon={<BellOff size={26} />} title="You’re all caught up." body="Booking updates, invites and game news will show up here." action={{ label: 'Find something to play', onClick: () => nav.push('playNow') }} />
      )}
    </Screen>
  );
}

