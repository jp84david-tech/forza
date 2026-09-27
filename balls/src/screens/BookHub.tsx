import { CalendarX, MapPin, Navigation } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Artwork } from '../components/Artwork';
import { SportIcon } from '../components/icons';
import { confirmDialog } from '../components/Sheet';
import { openDirections } from '../components/sheets';
import { Avatar, Button, CtaBar, EmptyState, Row, Screen, Segmented } from '../components/ui';
import { COACH_BY_ID } from '../data/discover';
import { FACILITIES, FACILITY_BY_ID, spacesFor } from '../data/facilities';
import { PLAYABLE, sportName } from '../data/sports';
import type { SportId } from '../data/types';
import { cx, money } from '../lib/format';
import { addDays, fmtDay, fmtLongDate, fmtRange, fmtTime, startOfDay, weekdayShort } from '../lib/time';
import { daySlots } from '../services/availability';
import { rankFacilities } from '../services/discovery';
import { cancelLesson } from '../state/actions';
import { nav, useNav } from '../state/nav';
import { availCtx } from '../state/selectors';
import { useApp } from '../state/store';
import { BookingsScreen } from './Booking';
import type { ScreenComponentProps } from './routes';

type When = 'any' | 'morning' | 'afternoon' | 'evening';
const WHEN: Array<{ value: When; label: string; from: number; to: number }> = [
  { value: 'any', label: 'Any time', from: 0, to: 24 },
  { value: 'morning', label: 'Morning', from: 6, to: 12 },
  { value: 'afternoon', label: 'Afternoon', from: 12, to: 17 },
  { value: 'evening', label: 'Evening', from: 17, to: 24 },
];

/** Find a free court: sport, day, time of day, then tap a time. */
function BookFinder({ retap }: { retap: number }) {
  const s = useApp();
  const mine = s.profile.sports.map((x) => x.sport).find((x) => PLAYABLE.includes(x));
  const [sport, setSport] = useState<SportId>(mine ?? 'padel');
  const [dayIdx, setDayIdx] = useState(0);
  const [when, setWhen] = useState<When>(new Date().getHours() >= 17 ? 'evening' : 'any');
  const [mins, setMins] = useState<'60' | '90'>('60');

  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(startOfDay(), i)), []);
  const day = days[dayIdx];
  const win = WHEN.find((w) => w.value === when)!;

  const results = useMemo(() => {
    const ctx = availCtx(s);
    const soon = Date.now() + 15 * 60_000;
    const venues = FACILITIES.filter((f) => spacesFor(f.id).some((x) => x.sport === sport && !x.walkUp));
    return rankFacilities(s, venues, sport)
      .map(({ f, distance }) => {
        const byTime = new Map<number, { start: Date; price: number; spaceId: string }>();
        for (const sp of spacesFor(f.id).filter((x) => x.sport === sport && !x.walkUp)) {
          for (const sl of daySlots(sp, day, Number(mins), ctx)) {
            const h = sl.start.getHours();
            if (sl.state !== 'available' || sl.start.getTime() < soon || h < win.from || h >= win.to) continue;
            const k = sl.start.getTime();
            const cur = byTime.get(k);
            if (!cur || sl.price < cur.price) byTime.set(k, { start: sl.start, price: sl.price, spaceId: sp.id });
          }
        }
        const slots = [...byTime.values()].sort((a, b) => a.start.getTime() - b.start.getTime());
        return { f, distance, slots };
      })
      .filter((r) => r.slots.length)
      .sort((a, b) => a.distance - b.distance);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, sport, dayIdx, when, mins]);

  return (
    <Screen title="Book a court" header="large" back={false} retap={retap} className="bookfinder">
      <div className="pad stack-20">
        <Segmented
          label="Sport"
          className="seg--big"
          value={sport}
          onChange={(v) => setSport(v)}
          options={PLAYABLE.map((x) => ({
            value: x,
            label: (
              <>
                <SportIcon sport={x} size={17} /> {sportName(x)}
              </>
            ),
          }))}
        />

        <div className="daystrip" role="listbox" aria-label="Day">
          {days.map((d, i) => (
            <button key={i} type="button" role="option" aria-selected={i === dayIdx} className={cx('daystrip__day', i === dayIdx && 'is-on')} onClick={() => setDayIdx(i)}>
              <span>{i === 0 ? 'Today' : i === 1 ? 'Tmrw' : weekdayShort(d)}</span>
              <b>{d.getDate()}</b>
            </button>
          ))}
        </div>

        <div className="bookfinder__row">
          <div className="chip-row" role="group" aria-label="Time of day">
            {WHEN.map((w) => (
              <button key={w.value} type="button" className={cx('chip', when === w.value && 'chip--active')} aria-pressed={when === w.value} onClick={() => setWhen(w.value)}>
                {w.label}
              </button>
            ))}
          </div>
          <Segmented label="Length" className="seg--mini" value={mins} onChange={setMins} options={[{ value: '60', label: '1 hr' }, { value: '90', label: '1.5 hrs' }]} />
        </div>

        <p className="bookfinder__count">
          {results.length ? `${results.length} ${results.length === 1 ? 'venue has' : 'venues have'} free ${sport} courts ${fmtDay(day, { tonight: false }).toLowerCase() === 'today' ? 'today' : `on ${fmtLongDate(day)}`}` : ''}
        </p>

        {results.length ? (
          <div className="venuelist">
            {results.map(({ f, distance, slots }, n) => (
              <article key={f.id} className="venue" style={{ ['--n' as string]: Math.min(n, 6) }}>
                <button type="button" className="venue__media" onClick={() => nav.push('facility', { id: f.id, sport })} aria-label={`${f.name}, details`}>
                  <Artwork art={f.images.find((im) => im.kind === sport) ?? f.images[0]} />
                </button>
                <div className="venue__body">
                  <div className="venue__head">
                    <h3>{f.name}</h3>
                    <span className="venue__rating">★ {f.rating.overall.toFixed(1)}</span>
                  </div>
                  <p className="venue__meta">
                    {f.area} · {distance.toFixed(1)} mi · from <b>{money(Math.min(...slots.map((x) => x.price)))}</b>
                  </p>
                  <div className="venue__slots" role="list" aria-label={`Free times at ${f.name}`}>
                    {slots.slice(0, 8).map((sl) => (
                      <button
                        key={sl.start.getTime()}
                        type="button"
                        role="listitem"
                        className="timechip"
                        onClick={() => nav.push('book', { facilityId: f.id, spaceId: sl.spaceId, start: sl.start.toISOString(), duration: mins })}
                        aria-label={`Book ${fmtTime(sl.start)} for ${money(sl.price)}`}
                      >
                        <b>{fmtTime(sl.start)}</b>
                        <span>{money(sl.price)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState icon={<CalendarX size={24} />} title="No free courts for that time" body="Try another day or time of day." action={{ label: 'Any time', onClick: () => setWhen('any') }} />
        )}
      </div>
    </Screen>
  );
}

/** Book tab root: "Book" or "My bookings", switched from the bar above the tab bar. */
export function BookHubScreen(props: ScreenComponentProps) {
  const n = useNav();
  return (
    <div className="hub" key={n.sub.book}>
      {n.sub.book === 'book' ? <BookFinder retap={props.retap} /> : <BookingsScreen {...props} />}
    </div>
  );
}

// ---------------------------------------------------------------- lesson detail

export function LessonScreen({ params }: ScreenComponentProps) {
  const s = useApp();
  const l = s.lessons.find((x) => x.id === params.id);
  if (!l) {
    return (
      <Screen title="Lesson">
        <EmptyState icon={<CalendarX size={24} />} title="Lesson not found" />
      </Screen>
    );
  }
  const c = COACH_BY_ID[l.coachId];
  const f = FACILITY_BY_ID[l.facilityId];
  const upcoming = l.status === 'confirmed' && new Date(l.start).getTime() > Date.now();
  const refundable = new Date(l.start).getTime() - Date.now() >= 24 * 3_600_000;
  const cancel = async () => {
    const ok = await confirmDialog({
      title: 'Cancel this lesson?',
      body: refundable ? `You’ll get ${money(l.amount)} back.` : 'It’s less than 24 hours away, so there’s no refund.',
      confirm: 'Cancel lesson',
      danger: true,
    });
    if (ok) cancelLesson(l.id);
  };
  return (
    <Screen
      title="Lesson"
      footer={
        upcoming ? (
          <CtaBar>
            <Button variant="secondary" onClick={cancel}>
              Cancel
            </Button>
            <Button icon={<Navigation size={17} />} onClick={() => openDirections(f)}>
              Directions
            </Button>
          </CtaBar>
        ) : undefined
      }
    >
      <div className="pad stack-20">
        <button type="button" className="coachhead" onClick={() => nav.push('coach', { id: c.id })}>
          <Avatar name={c.name} color={c.color} size={64} />
          <span>
            <span className="eyebrow">{l.status === 'cancelled' ? 'Cancelled' : `${sportName(l.sport)} lesson`}</span>
            <b>{c.name}</b>
            <small>{c.headline}</small>
          </span>
        </button>
        <div className="list-card">
          <Row title={fmtLongDate(l.start)} subtitle={fmtRange(l.start, l.end)} />
          <Row icon={<MapPin size={18} />} title={f.name} subtitle={`${f.address}, ${f.postcode}`} onClick={() => nav.push('facility', { id: f.id })} />
          <Row title={l.players === 2 ? 'You and one friend' : 'Just you (1:1)'} subtitle={`${money(l.amount)} paid`} />
        </div>
        {upcoming && <p className="fine">Free cancellation up to 24 hours before. After that the coach keeps the fee.</p>}
      </div>
    </Screen>
  );
}

