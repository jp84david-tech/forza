import { Bell, CalendarPlus, ChevronDown, Compass, GraduationCap, MapPin, MessageCircle, PartyPopper, Plus, Search, Ticket, Users, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Artwork } from '../components/Artwork';
import { FacilityCard, GameCard, SportCard } from '../components/cards';
import { SportIcon } from '../components/icons';
import { InstallBanner } from '../components/Install';
import { DirectionsButton, openLocation } from '../components/sheets';
import { Button, EmptyState, ErrorState, IconButton, Section, SkeletonCard } from '../components/ui';
import { FACILITIES, FACILITY_BY_ID, SPACE_BY_ID, spacesFor } from '../data/facilities';
import { FEED } from '../data/discover';
import { sportName } from '../data/sports';
import type { SportId } from '../data/types';
import { cx, money, plural, scrollEl } from '../lib/format';
import { fmtCountdown, fmtDay, fmtTime, greeting, startOfDay, timeAgo } from '../lib/time';
import { useResource } from '../services/api';
import { daySlots } from '../services/availability';
import { findGames, rankFacilities } from '../services/discovery';
import { nav } from '../state/nav';
import { availCtx, type Activity, sportOrder, unreadCount, upcoming } from '../state/selectors';
import { type AppState, useApp } from '../state/store';
import type { ScreenComponentProps } from './routes';
import { analytics } from '../services/analytics';

function useTick(ms: number) {
  const [, set] = useState(0);
  useEffect(() => {
    const i = setInterval(() => set((x) => x + 1), ms);
    return () => clearInterval(i);
  }, [ms]);
}

function NextUp({ item }: { item: Activity }) {
  useTick(30_000);
  const isBooking = item.kind === 'booking';
  const f = FACILITY_BY_ID[isBooking ? item.booking.facilityId : item.game.facilityId];
  const sport = isBooking ? item.booking.sport : item.game.sport;
  const gameId = isBooking ? item.booking.gameId : item.game.id;
  const space = isBooking ? SPACE_BY_ID[item.booking.spaceId] : undefined;
  const started = new Date(item.start).getTime() <= Date.now();
  const open = () => (isBooking ? nav.go('bookings', 'booking', { id: item.id }) : nav.push('game', { id: item.id }));
  return (
    <section className="nextup" aria-label="Your next game">
      <button type="button" className="nextup__hit" onClick={open} aria-label="Open your next game" />
      <div className="nextup__art" aria-hidden="true">
        <Artwork art={{ ...f.images[0], time: new Date(item.start).getHours() >= 18 ? 'night' : f.images[0].time }} />
      </div>
      <div className="nextup__body">
        <div className="nextup__top">
          <span className="eyebrow eyebrow--light">Your next game</span>
          <span className="nextup__count">{started ? 'On now' : `Starts in ${fmtCountdown(item.start)}`}</span>
        </div>
        <h2 className="nextup__when">
          {fmtDay(item.start)} · {fmtTime(item.start)}
        </h2>
        <div className="nextup__where">
          <SportIcon sport={sport} size={15} />
          <span>
            {f.name}
            {space ? ` · ${space.name}` : ''}
          </span>
        </div>
        <div className="nextup__actions">
          <DirectionsButton f={f} variant="primary" size="sm" />
          {gameId && (
            <Button size="sm" variant="night" icon={<MessageCircle size={16} />} onClick={() => nav.push('chat', { id: gameId })}>
              Chat
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

/** "Tennis free tonight": slots at nearby venues for the sport this user plays most. */
function FreeTonight({ s, sport }: { s: AppState; sport: SportId }) {
  const ctx = availCtx(s);
  const now = new Date();
  const day = now.getHours() >= 21 ? new Date(startOfDay().getTime() + 86_400_000) : startOfDay();
  const rows = useMemo(
    () =>
      rankFacilities(
        s,
        FACILITIES.filter((f) => spacesFor(f.id).some((x) => x.sport === sport && !x.walkUp)),
        sport,
      )
        .slice(0, 6)
        .map(({ f, distance }) => {
          const slots = spacesFor(f.id)
            .filter((x) => x.sport === sport && !x.walkUp)
            .flatMap((sp) => daySlots(sp, day, 60, ctx).filter((x) => x.state === 'available' && x.start.getHours() >= 17).map((x) => ({ ...x, space: sp })));
          const unique = new Map<number, (typeof slots)[number]>();
          slots.forEach((x) => {
            const k = x.start.getTime();
            if (!unique.has(k) || unique.get(k)!.price > x.price) unique.set(k, x);
          });
          return { f, distance, slots: [...unique.values()].sort((a, b) => a.start.getTime() - b.start.getTime()).slice(0, 4) };
        })
        .filter((r) => r.slots.length)
        .slice(0, 3),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s, sport],
  );
  if (!rows.length) return null;
  const tonight = day.getTime() === startOfDay().getTime();
  return (
    <Section title={`${sportName(sport)} free ${tonight ? 'tonight' : 'tomorrow evening'}`} action="See all" onAction={() => nav.go('explore', undefined, { sport, view: 'list' })}>
      <div className="freetonight">
        {rows.map(({ f, distance, slots }) => (
          <div key={f.id} className="ft-row">
            <button type="button" className="ft-row__head" onClick={() => nav.push('facility', { id: f.id, sport })}>
              <b>{f.name}</b>
              <span>
                {distance.toFixed(1)} mi · from {money(Math.min(...slots.map((x) => x.price)))}
              </span>
            </button>
            <div className="ft-row__slots">
              {slots.map((x) => (
                <button
                  key={x.start.toISOString()}
                  type="button"
                  className="slot-chip"
                  onClick={() => nav.push('book', { facilityId: f.id, spaceId: x.space.id, start: x.start.toISOString(), duration: '60' })}
                  aria-label={`Book ${x.space.name} at ${fmtTime(x.start)} for ${money(x.price)}`}
                >
                  {fmtTime(x.start).replace(':00', '')}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

const QUICK = [
  { id: 'find', label: 'Find a game', icon: Users, go: () => nav.push('games') },
  { id: 'book', label: 'Book a venue', icon: CalendarPlus, go: () => nav.go('explore', undefined, { view: 'list' }) },
  { id: 'create', label: 'Create a game', icon: Plus, go: () => nav.push('createGame') },
  { id: 'explore', label: 'Explore nearby', icon: Compass, go: () => nav.go('explore', undefined, { view: 'map' }) },
  { id: 'training', label: 'Find training', icon: GraduationCap, go: () => nav.push('training') },
  { id: 'events', label: 'Events', icon: Ticket, go: () => nav.push('events') },
];

export function HomeScreen({ retap }: ScreenComponentProps) {
  const s = useApp();
  const { status, retry } = useResource('home');
  const name = s.account?.firstName ?? '';
  const next = upcoming(s)[0];
  const soon = next && new Date(next.start).getTime() - Date.now() < 7 * 86_400_000;
  const order = sportOrder(s);
  const games = useMemo(() => findGames(s, { when: 'week' }).filter((x) => x.distance <= Math.max(s.prefs.distance, 3) * 1.6).slice(0, 8), [s]);
  const tonightCount = useMemo(() => findGames(s, { when: new Date().getHours() >= 21 ? 'tomorrow' : 'tonight' }).length, [s]);
  const popular = useMemo(() => rankFacilities(s).slice(0, 8), [s]);
  const bookedSports = s.bookings.map((b) => b.sport);
  const topSport = (bookedSports.sort((a, b) => bookedSports.filter((x) => x === b).length - bookedSports.filter((x) => x === a).length)[0] ?? order[0]) as SportId | undefined;
  const unread = unreadCount(s);
  const [scrollBox, setScrollBox] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (retap) scrollEl(scrollBox, { top: 0 }, true);
  }, [retap, scrollBox]);

  return (
    <div className="screen-inner hdr-home">
      <header className="homebar">
        <button type="button" className="locbtn" onClick={openLocation} aria-label={`Location: ${s.location?.label ?? 'not set'}. Change location`}>
          <MapPin size={16} strokeWidth={2.4} />
          <span>{s.location?.label ?? 'Set location'}</span>
          <ChevronDown size={16} />
        </button>
        <div className="homebar__actions">
          <IconButton label="Search" onClick={() => nav.push('search')}>
            <Search size={22} />
          </IconButton>
          <IconButton label="Notifications" onClick={() => nav.push('notifications')} badge={unread}>
            <Bell size={22} />
          </IconButton>
        </div>
      </header>
      <div className="scroll" ref={setScrollBox}>
        <div className="greet">
          <h1 className="greet__title">
            {greeting()}
            {name && (
              <>
                , <span>{name}</span>
              </>
            )}
          </h1>
          <p className="greet__sub">What are you playing today?</p>
        </div>

        {soon && next && <NextUp item={next} />}

        <div className="hscroll hscroll--sports" role="list" aria-label="Sports">
          {order.map((sp) => (
            <div role="listitem" key={sp}>
              <SportCard
                sport={sp}
                onClick={() => {
                  analytics.track('sport_selected', { sport: sp, from: 'home' });
                  nav.push('sport', { id: sp });
                }}
              />
            </div>
          ))}
          <div role="listitem">
            <button type="button" className="sportcard sportcard--edit" onClick={() => nav.push('editSports')}>
              <span className="sportcard__icon">
                <Plus size={22} />
              </span>
              <span className="sportcard__label">Edit</span>
            </button>
          </div>
        </div>

        <button type="button" className="playnow" onClick={() => nav.push('playNow')}>
          <span className="playnow__radar" aria-hidden="true">
            <i />
            <i />
            <i />
            <Zap size={26} fill="currentColor" />
          </span>
          <span className="playnow__text">
            <span className="playnow__title">Play Now</span>
            <span className="playnow__sub">{tonightCount ? `${plural(tonightCount, 'game')} ${new Date().getHours() >= 21 ? 'tomorrow' : 'tonight'} ${tonightCount === 1 ? 'needs' : 'need'} players near you` : 'Find a game that needs players in seconds'}</span>
          </span>
          <span className="playnow__go" aria-hidden="true">
            Go
          </span>
        </button>

        <div className="quick" role="list" aria-label="Quick actions">
          {QUICK.map((q) => (
            <button key={q.id} type="button" role="listitem" className="quick__item" onClick={q.go}>
              <span className="quick__icon">
                <q.icon size={20} strokeWidth={2} />
              </span>
              <span className="quick__label">{q.label}</span>
            </button>
          ))}
        </div>

        <InstallBanner />

        {status === 'error' ? (
          <ErrorState onRetry={retry} />
        ) : status === 'loading' ? (
          <>
            <Section title="Nearby today">
              <div className="hscroll">
                <SkeletonCard variant="tile" />
                <SkeletonCard variant="tile" />
              </div>
            </Section>
            <Section title="Popular near you">
              <div className="hscroll">
                <SkeletonCard variant="wide" />
                <SkeletonCard variant="wide" />
              </div>
            </Section>
          </>
        ) : (
          <>
            <Section title={games.some((x) => new Date(x.g.start).toDateString() === new Date().toDateString()) ? 'Nearby today' : 'Coming up nearby'} action={games.length ? 'See all' : undefined} onAction={() => nav.push('games')}>
              {games.length ? (
                <div className="hscroll hscroll--cards">
                  {games.map((x) => (
                    <GameCard key={x.g.id} game={x.g} variant="wide" reasons={x.reasons} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  compact
                  icon={<Users size={24} />}
                  title="No games nearby yet."
                  body="Try expanding your distance."
                  action={{ label: 'Start your own game', onClick: () => nav.push('createGame') }}
                  secondary={{ label: 'Change distance', onClick: () => nav.push('settingsPlay') }}
                />
              )}
            </Section>

            {topSport && <FreeTonight s={s} sport={topSport} />}

            <Section title="Popular near you" action="Map" onAction={() => nav.go('explore', undefined, { view: 'map' })}>
              <div className="hscroll hscroll--cards">
                {popular.map((x) => (
                  <FacilityCard key={x.f.id} facility={x.f} variant="wide" reason={x.reasons[0]} />
                ))}
              </div>
            </Section>

            {!soon && (
              <Section title="Upcoming">
                {next ? (
                  <NextUp item={next} />
                ) : (
                  <EmptyState compact icon={<CalendarPlus size={24} />} title="Nothing planned yet." body="Find something to play." action={{ label: 'Play Now', onClick: () => nav.push('playNow') }} secondary={{ label: 'Book a venue', onClick: () => nav.go('explore', undefined, { view: 'list' }) }} />
                )}
              </Section>
            )}

            <Section title="Around you" action="See all" onAction={() => nav.push('feed')}>
              <div className="feed">
                {FEED.slice(0, 3).map((item) => (
                  <button key={item.id} type="button" className="feeditem" onClick={() => nav.push(item.link.route, item.link.params)}>
                    {item.art && (
                      <span className="feeditem__art">
                        <Artwork art={item.art} />
                      </span>
                    )}
                    <span className="feeditem__body">
                      <span className="feeditem__kind">{item.kind === 'new-venue' ? 'New venue' : item.kind === 'popular-game' ? 'Popular game' : item.kind[0].toUpperCase() + item.kind.slice(1)} · {timeAgo(item.at)}</span>
                      <b>{item.title}</b>
                      <span>{item.body}</span>
                    </span>
                  </button>
                ))}
              </div>
            </Section>
            <p className={cx('home-foot')}>
              <PartyPopper size={15} aria-hidden="true" /> That’s everything near {s.location?.label ?? 'you'} for now.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

