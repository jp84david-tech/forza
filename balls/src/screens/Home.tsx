import { ArrowRight, Bell, GraduationCap, UserRound, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Artwork } from '../components/Artwork';
import { Logo } from '../components/icons';
import { InstallBanner } from '../components/Install';
import { joinLayer } from '../components/Join';
import { Avatar, IconButton } from '../components/ui';
import { FACILITIES, FACILITY_BY_ID, SPACE_BY_ID } from '../data/facilities';
import type { ArtSpec } from '../data/types';
import { fmtShortDate, fmtTime, greeting, weekdayShort, fmtDay } from '../lib/time';
import { nav } from '../state/nav';
import { type Activity, gameById, gameTitle, me, unreadCount, upcoming } from '../state/selectors';
import { useApp } from '../state/store';
import type { ScreenComponentProps } from './routes';

/** Court pictures that slowly crossfade on the "Book a court" card. */
const SLIDES: ArtSpec[] = [
  { kind: 'padel', caption: '', time: 'dusk', seed: 31 },
  { kind: 'tennis', caption: '', variant: 'clay', time: 'day', seed: 61 },
  { kind: 'padel', caption: '', variant: 'green', time: 'night', seed: 92 },
  { kind: 'tennis', caption: '', variant: 'hard', time: 'night', seed: 2 },
];

function useSlide(count: number, ms: number) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const t = setInterval(() => setI((x) => (x + 1) % count), ms);
    return () => clearInterval(t);
  }, [count, ms]);
  return i;
}

function countdown(start: string): string {
  const mins = Math.max(0, Math.floor((new Date(start).getTime() - Date.now()) / 60_000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ${mins % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

function NextUp({ item }: { item: Activity }) {
  const s = useApp();
  const booking = item.kind === 'booking' ? item.booking : undefined;
  const game = item.kind === 'game' ? item.game : booking?.gameId ? gameById(s, booking.gameId) : undefined;
  const f = FACILITY_BY_ID[booking?.facilityId ?? game!.facilityId];
  const space = SPACE_BY_ID[booking?.spaceId ?? game?.spaceId ?? ''];
  const title = game ? gameTitle(game) : `${space?.name ?? 'Court'}`;
  const d = new Date(item.start);
  const rel = fmtDay(d, { tonight: false });
  const day = rel === 'Today' || rel === 'Tomorrow' ? rel : `${weekdayShort(d)} ${fmtShortDate(d)}`;
  const open = () => (booking ? nav.go('book', 'booking', { id: booking.id }) : nav.push('game', { id: game!.id }));
  return (
    <button type="button" className="nextup2 rise" style={{ ['--d' as string]: 2 }} onClick={open}>
      <span className="nextup2__art" aria-hidden="true">
        <Artwork art={f.images[0]} />
      </span>
      <span className="nextup2__body">
        <span className="nextup2__label">Up next · {day} {fmtTime(item.start)}</span>
        <b>
          {title} at {f.name}
        </b>
      </span>
      <span className="nextup2__count">{countdown(item.start)}</span>
    </button>
  );
}

export function HomeScreen(_: ScreenComponentProps) {
  const s = useApp();
  const u = me(s);
  const next = upcoming(s)[0];
  const unread = unreadCount(s);
  const slide = useSlide(SLIDES.length, 4200);
  const venues = FACILITIES.length;

  return (
    <div className="screen-inner welcomehome">
      <header className="homebar">
        <Logo size={30} />
        <div className="homebar__actions">
          {s.account ? (
            <>
              <IconButton label="Notifications" className="iconbtn--ring" onClick={() => nav.push('notifications')} badge={unread}>
                <Bell size={20} />
              </IconButton>
              <button type="button" className="homebar__me" onClick={() => nav.push('profile')} aria-label="Your profile">
                <Avatar name={s.account.firstName} color={u.color} photo={u.photo} size={40} />
              </button>
            </>
          ) : (
            <>
              <button type="button" className="homebar__login" onClick={() => joinLayer.open('login')}>
                Log in
              </button>
              <IconButton label="Profile and settings" className="iconbtn--ring" onClick={() => nav.push('profile')}>
                <UserRound size={20} />
              </IconButton>
            </>
          )}
        </div>
      </header>

      <div className="scroll wh">
        <div className="wh__hello rise" style={{ ['--d' as string]: 0 }}>
          <span className="wh__greet">{greeting()}</span>
          <h1>{s.account ? s.account.firstName : 'Tennis and padel near you'}</h1>
          <p>
            {s.location?.label ?? 'North London'} · {venues} venues nearby
          </p>
        </div>

        {next && <NextUp item={next} />}

        <button type="button" className="wh__hero rise" style={{ ['--d' as string]: 3 }} onClick={() => nav.openSub('book', 'book')}>
          <span className="wh__slides" aria-hidden="true">
            {SLIDES.map((art, i) => (
              <span key={i} className={i === slide ? 'is-on' : undefined}>
                <Artwork art={art} />
              </span>
            ))}
          </span>
          <span className="wh__shade" aria-hidden="true" />
          <span className="wh__herotext">
            <b>Book a court</b>
            <span>Free padel and tennis courts near you</span>
          </span>
          <span className="wh__go" aria-hidden="true">
            <ArrowRight size={20} />
          </span>
          <span className="wh__dots" aria-hidden="true">
            {SLIDES.map((_, i) => (
              <i key={i} className={i === slide ? 'is-on' : undefined} />
            ))}
          </span>
        </button>

        <div className="wh__pair">
          <button type="button" className="wh__tile rise" style={{ ['--d' as string]: 4 }} onClick={() => nav.openSub('friends', 'play')}>
            <Users size={22} />
            <b>Play</b>
            <span>Join a game that needs players</span>
          </button>
          <button type="button" className="wh__tile rise" style={{ ['--d' as string]: 5 }} onClick={() => nav.openSub('friends', 'coaches')}>
            <GraduationCap size={22} />
            <b>Coaches</b>
            <span>Book and pay for a lesson</span>
          </button>
        </div>

        <InstallBanner />
      </div>
    </div>
  );
}
