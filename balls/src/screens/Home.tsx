import { Bell, Check, MessageCircle, Navigation, Search, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Logo } from '../components/icons';
import { InstallBanner } from '../components/Install';
import { openDirections } from '../components/sheets';
import { Avatar, Button, EmptyState, ErrorState, IconButton, Row, Section, Skeleton } from '../components/ui';
import { FACILITIES, FACILITY_BY_ID, SPACE_BY_ID, spacesFor } from '../data/facilities';
import { sportName } from '../data/sports';
import type { Booking, Game, SportId } from '../data/types';
import { cx, money, moneyExact, plural, scrollEl } from '../lib/format';
import { fmtDay, fmtShortDate, fmtTime, startOfDay, timeAgo, weekdayShort } from '../lib/time';
import { useResource } from '../services/api';
import { daySlots } from '../services/availability';
import { findGames, rankFacilities } from '../services/discovery';
import { nav } from '../state/nav';
import { availCtx, type Activity, gameById, gameTitle, joinedPlayers, myRow, playersOf, sportOrder, unreadCount, upcoming, userById } from '../state/selectors';
import { type AppState, useApp } from '../state/store';
import { openGameInvite, openJoinGame } from './Play';
import type { ScreenComponentProps } from './routes';

function useTick(ms: number) {
  const [, set] = useState(0);
  useEffect(() => {
    const i = setInterval(() => set((x) => x + 1), ms);
    return () => clearInterval(i);
  }, [ms]);
}

/** "Thu 1 Oct", or Today / Tomorrow. */
function shortDay(d: string | Date) {
  const x = new Date(d);
  const rel = fmtDay(x, { tonight: false });
  return rel === 'Today' || rel === 'Tomorrow' ? rel : `${weekdayShort(x)} ${fmtShortDate(x)}`;
}

/** Big countdown: ["5d", "2h"], ["3h", "20m"], ["45m"]. */
function countdown(start: string): string[] {
  const mins = Math.max(0, Math.floor((new Date(start).getTime() - Date.now()) / 60_000));
  if (mins < 60) return [`${mins}m`];
  const h = Math.floor(mins / 60);
  if (h < 24) return [`${h}h`, `${mins % 60}m`];
  return [`${Math.floor(h / 24)}d`, `${h % 24}h`];
}

// ---------------------------------------------------------------- your next game

function NextGame({ item }: { item: Activity }) {
  useTick(30_000);
  const s = useApp();
  const booking: Booking | undefined = item.kind === 'booking' ? item.booking : undefined;
  const game: Game | undefined = item.kind === 'game' ? item.game : booking?.gameId ? gameById(s, booking.gameId) : undefined;
  const f = FACILITY_BY_ID[booking?.facilityId ?? game!.facilityId];
  const space = SPACE_BY_ID[booking?.spaceId ?? game?.spaceId ?? ''];
  const started = new Date(item.start).getTime() <= Date.now();
  const open = () => (booking ? nav.go('bookings', 'booking', { id: booking.id }) : nav.push('game', { id: game!.id }));

  const name = game ? (game.format ?? sportName(game.sport)) : space ? space.name : sportName(booking!.sport);
  const meta = [shortDay(item.start), fmtTime(item.start), space?.name].filter(Boolean).join(' · ');

  // Who's in and who's paid.
  const joined = game ? joinedPlayers(s, game.id) : [];
  const rows = game ? playersOf(s, game.id).filter((r) => r.status === 'joined') : [];
  const mine = game ? myRow(s, game.id) : undefined;
  const total = game ? game.maxPlayers : booking?.split?.length ?? 0;
  const filled = game ? joined.length : booking?.split?.filter((x) => x.status === 'paid').length ?? 0;
  const organiser = game ? userById(s, game.creatorId) : undefined;
  const latest = rows.filter((r) => r.userId !== 'me' && r.role !== 'organiser').sort((a, b) => b.at.localeCompare(a.at))[0];
  const latestUser = latest ? userById(s, latest.userId) : undefined;
  const people = rows.map((r) => userById(s, r.userId)).filter((u): u is NonNullable<typeof u> => !!u).slice(0, 3);
  const extra = Math.max(0, rows.length - people.length);
  const spots = game ? game.maxPlayers - joined.length : 0;

  let paid: string;
  if (booking) {
    const myShare = booking.split?.find((x) => x.userId === 'me' || x.organiser);
    paid = booking.split ? `You’ve paid ${moneyExact(myShare?.amount ?? booking.total)}` : `Paid ${moneyExact(booking.total)}`;
  } else if (game?.creatorId === 'me') paid = 'You’re organising';
  else if (!game?.pricePerPlayer) paid = 'Free to play';
  else paid = mine?.payment === 'paid' ? `You’ve paid ${moneyExact(game.pricePerPlayer)}` : `${moneyExact(game.pricePerPlayer)} to pay`;

  const cd = countdown(item.start);
  return (
    <section className="nextgame" aria-label={game ? 'Your next game' : 'Your next booking'}>
      <div className="nextgame__head">
        <button type="button" className="nextgame__title" onClick={open}>
          <span className="eyebrow">{game ? 'Your next game' : 'Your next booking'}</span>
          <h2>
            {name} at {f.name}
          </h2>
          <span className="nextgame__meta">{meta}</span>
        </button>
        <div className="nextgame__count" aria-label={started ? 'On now' : `Starts in ${cd.join(' ')}`}>
          {started ? <b>Now</b> : cd.map((x) => <b key={x}>{x}</b>)}
          <span>{started ? 'in progress' : game ? 'to kick-off' : 'to go'}</span>
        </div>
      </div>

      <div className="nextgame__status">
        <p>
          <Check size={17} className="nextgame__tick" /> {paid}
        </p>
        {total > 0 && (
          <>
            <p>
              <Users size={17} /> {game ? `${filled} of ${total} players confirmed` : `${filled} of ${total} paid their share`}
            </p>
            <div className="segbar" role="img" aria-label={`${filled} of ${total}`}>
              {Array.from({ length: Math.min(total, 22) }, (_, i) => (
                <span key={i} className={cx(i < filled && 'is-on')} />
              ))}
            </div>
          </>
        )}
        {game && people.length > 0 && (
          <div className="nextgame__people">
            <span className="nextgame__faces">
              {people.map((u) => (
                <Avatar key={u.id} name={u.name} color={u.color} photo={u.photo} size={30} />
              ))}
              {extra > 0 && <span className="nextgame__more">+{extra}</span>}
            </span>
            <span className="nextgame__who">
              <span>{organiser?.id === 'me' ? 'Organised by you' : `Organised by ${organiser?.name.split(' ')[0] ?? 'the venue'}`}</span>
              {latestUser && (
                <span>
                  {latestUser.name.split(' ')[0]} joined {timeAgo(latest!.at).toLowerCase()}
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      <div className="nextgame__actions">
        {game && spots > 0 && !started ? (
          <Button block onClick={() => openGameInvite(game)}>
            Invite {spots} more {spots === 1 ? 'player' : 'players'}
          </Button>
        ) : (
          <Button block icon={<Navigation size={17} />} onClick={() => openDirections(f)}>
            Directions
          </Button>
        )}
        {game && (
          <IconButton label="Group chat" className="nextgame__chat" onClick={() => nav.push('chat', { id: game.id })}>
            <MessageCircle size={20} />
          </IconButton>
        )}
      </div>
    </section>
  );
}

function NothingBooked() {
  return (
    <section className="nextgame nextgame--empty" aria-label="Nothing booked">
      <span className="eyebrow">Nothing booked yet</span>
      <h2>Find a game or book a pitch</h2>
      <p className="nextgame__meta">Join a game that needs players, or book a free slot at a venue nearby.</p>
      <div className="nextgame__actions nextgame__actions--two">
        <Button block onClick={() => nav.push('playNow')}>
          Find a game
        </Button>
        <Button block variant="secondary" onClick={() => nav.go('explore', undefined, { view: 'list' })}>
          Book a pitch
        </Button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- lists

function OpenGames({ s }: { s: AppState }) {
  const games = useMemo(() => findGames(s, { when: 'week' }).filter((x) => x.distance <= Math.max(s.prefs.distance, 3) * 1.6).slice(0, 5), [s]);
  return (
    <Section title="Open games near you" action={games.length ? 'See all' : undefined} onAction={() => nav.push('games')}>
      {games.length ? (
        <ul className="olist">
          {games.map(({ g, distance }) => {
            const f = FACILITY_BY_ID[g.facilityId];
            const left = g.maxPlayers - joinedPlayers(s, g.id).length;
            return (
              <li key={g.id} className="orow">
                <button type="button" className="orow__main" onClick={() => nav.push('game', { id: g.id })}>
                  <span className="orow__when">
                    {shortDay(g.start)} · {fmtTime(g.start)}
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
        <EmptyState compact icon={<Users size={22} />} title="No open games nearby this week" body="Start one and players nearby will see it." action={{ label: 'Create a game', onClick: () => nav.push('createGame') }} />
      )}
    </Section>
  );
}

/** The first free evening hour at nearby venues, for the sports this person plays. */
function FreeToBook({ s }: { s: AppState }) {
  const late = new Date().getHours() >= 21;
  const dayKey = (late ? new Date(startOfDay().getTime() + 86_400_000) : startOfDay()).getTime();
  const rows = useMemo(() => {
    const sports = sportOrder(s).slice(0, 3) as SportId[];
    const day = new Date(dayKey);
    const ctx = availCtx(s);
    return rankFacilities(s, FACILITIES.filter((f) => spacesFor(f.id).some((x) => sports.includes(x.sport) && !x.walkUp)))
      .slice(0, 10)
      .map(({ f, distance }) => {
        const slot = spacesFor(f.id)
          .filter((x) => sports.includes(x.sport) && !x.walkUp)
          .flatMap((sp) => daySlots(sp, day, 60, ctx).filter((x) => x.state === 'available' && x.start.getHours() >= 17).map((x) => ({ ...x, space: sp })))
          .sort((a, b) => a.start.getTime() - b.start.getTime() || a.price - b.price)[0];
        return slot ? { f, distance, slot } : null;
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
      .slice(0, 4);
  }, [s, dayKey]);
  if (!rows.length) return null;
  return (
    <Section title={late ? 'Free to book tomorrow evening' : 'Free to book tonight'} action="See all" onAction={() => nav.go('explore', undefined, { view: 'list' })}>
      <ul className="olist">
        {rows.map(({ f, distance, slot }) => (
          <li key={f.id} className="orow">
            <button type="button" className="orow__main" onClick={() => nav.push('facility', { id: f.id, sport: slot.space.sport })}>
              <span className="orow__when">
                {shortDay(slot.start)} · {fmtTime(slot.start)}
              </span>
              <b className="orow__title">{f.name}</b>
              <span className="orow__meta">
                {slot.space.name} · {distance.toFixed(1)} mi · {money(slot.price)}
              </span>
            </button>
            <Button size="sm" variant="accent" onClick={() => nav.push('book', { facilityId: f.id, spaceId: slot.space.id, start: slot.start.toISOString(), duration: '60' })} aria-label={`Book ${f.name} at ${fmtTime(slot.start)}`}>
              Book
            </Button>
          </li>
        ))}
      </ul>
    </Section>
  );
}

// ---------------------------------------------------------------- screen

export function HomeScreen({ retap }: ScreenComponentProps) {
  const s = useApp();
  const { status, retry } = useResource('home');
  const next = upcoming(s)[0];
  const unread = unreadCount(s);
  const [scrollBox, setScrollBox] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (retap) scrollEl(scrollBox, { top: 0 }, true);
  }, [retap, scrollBox]);

  return (
    <div className="screen-inner hdr-home">
      <header className="homebar">
        <Logo size={30} />
        <div className="homebar__actions">
          <IconButton label="Search" className="iconbtn--ring" onClick={() => nav.push('search')}>
            <Search size={20} />
          </IconButton>
          <IconButton label="Notifications" className="iconbtn--ring" onClick={() => nav.push('notifications')} badge={unread}>
            <Bell size={20} />
          </IconButton>
        </div>
      </header>
      <div className="scroll home" ref={setScrollBox}>
        {next ? <NextGame item={next} /> : <NothingBooked />}

        <InstallBanner />

        {status === 'error' ? (
          <ErrorState onRetry={retry} />
        ) : status === 'loading' ? (
          <Section title="Open games near you">
            <div className="olist">
              {[0, 1, 2].map((i) => (
                <div key={i} className="orow">
                  <div className="orow__main">
                    <Skeleton w={110} h={12} />
                    <Skeleton w={160} h={18} />
                    <Skeleton w={220} h={12} />
                  </div>
                </div>
              ))}
            </div>
          </Section>
        ) : (
          <>
            <OpenGames s={s} />
            <FreeToBook s={s} />
            <Section title="More">
              <div className="list-card">
                <Row title="Play now" subtitle="Pick a sport and level, see what’s starting soon" onClick={() => nav.push('playNow')} />
                <Row title="Create a game" subtitle="Post a game and let players nearby join" onClick={() => nav.push('createGame')} />
                <Row title="Leagues and tournaments" onClick={() => nav.switchTab('compete')} />
                <Row title="Training and coaches" onClick={() => nav.push('training')} />
                <Row title="Events" onClick={() => nav.push('events')} />
                <Row title="What’s new nearby" onClick={() => nav.push('feed')} />
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
