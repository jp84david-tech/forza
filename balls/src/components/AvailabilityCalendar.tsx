import { Check, Clock3, Lock } from 'lucide-react';
import { useMemo } from 'react';
import { FACILITY_BY_ID } from '../data/facilities';
import type { Space } from '../data/types';
import { cx, money } from '../lib/format';
import { addDays, dateKey, fmtTime, isSameDay, startOfDay, weekdayShort } from '../lib/time';
import { type AvailabilityContext, daySlots, hoursOn, type Slot } from '../services/availability';
import { Segmented } from './ui';

/**
 * Visual availability picker. Available slots are green-edged with a price,
 * full slots are grey and say "Full" (tap to join the waitlist), and the
 * selected slot uses the brand colour with a tick — never colour alone.
 */
export function AvailabilityCalendar({
  space,
  day,
  onDayChange,
  duration,
  people = 1,
  selected,
  onSelect,
  onFull,
  ctx,
}: {
  space: Space;
  day: Date;
  onDayChange: (d: Date) => void;
  duration: number;
  people?: number;
  selected: string | null;
  onSelect: (slot: Slot) => void;
  onFull: (slot: Slot) => void;
  ctx: AvailabilityContext;
}) {
  const f = FACILITY_BY_ID[space.facilityId];
  const today = startOfDay();
  const mode: 'today' | 'tomorrow' | 'week' = isSameDay(day, today) ? 'today' : isSameDay(day, addDays(today, 1)) ? 'tomorrow' : 'week';
  const maxDays = f.rules.maxAdvanceDays;

  const days = useMemo(
    () =>
      Array.from({ length: maxDays }, (_, i) => {
        const d = addDays(today, i);
        const free = daySlots(space, d, duration, ctx, people).filter((x) => x.state === 'available' || x.state === 'held').length;
        return { d, free, closed: !hoursOn(f, d) };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [space.id, duration, ctx, people, maxDays],
  );

  const slots = useMemo(() => daySlots(space, day, duration, ctx, people), [space, day, duration, ctx, people]);
  const visible = slots.filter((s) => s.state !== 'past');
  const pastCount = slots.length - visible.length;
  const groups: Array<{ label: string; items: Slot[] }> = [
    { label: 'Morning', items: visible.filter((s) => s.start.getHours() < 12) },
    { label: 'Afternoon', items: visible.filter((s) => s.start.getHours() >= 12 && s.start.getHours() < 17) },
    { label: 'Evening', items: visible.filter((s) => s.start.getHours() >= 17) },
  ].filter((g) => g.items.length);
  const freeCount = visible.filter((s) => s.state === 'available' || s.state === 'held').length;

  return (
    <div className="avail-cal">
      <Segmented
        label="Choose day"
        value={mode}
        onChange={(v) => onDayChange(v === 'today' ? today : v === 'tomorrow' ? addDays(today, 1) : mode === 'week' ? day : addDays(today, 2))}
        options={[
          { value: 'today', label: 'Today' },
          { value: 'tomorrow', label: 'Tomorrow' },
          { value: 'week', label: 'This week' },
        ]}
      />

      {mode === 'week' && (
        <div className="daystrip" role="listbox" aria-label="Pick a date">
          {days.map(({ d, free, closed }) => {
            const on = isSameDay(d, day);
            return (
              <button key={dateKey(d)} type="button" role="option" aria-selected={on} className={cx('day', on && 'is-on', (closed || free === 0) && 'is-empty')} onClick={() => onDayChange(d)}>
                <span className="day__wd">{isSameDay(d, today) ? 'Today' : weekdayShort(d)}</span>
                <span className="day__n">{d.getDate()}</span>
                <span className="day__free">{closed ? 'Closed' : free === 0 ? 'Full' : `${free} free`}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="legend" aria-hidden="true">
        <span className="legend__item">
          <i className="legend__sw legend__sw--free" /> Available
        </span>
        <span className="legend__item">
          <i className="legend__sw legend__sw--full" /> Full
        </span>
        <span className="legend__item">
          <i className="legend__sw legend__sw--sel" /> Selected
        </span>
      </div>

      {!hoursOn(f, day) ? (
        <p className="slots-empty">Closed on this day. Try another date.</p>
      ) : !visible.length ? (
        <p className="slots-empty">No more times today. Try tomorrow.</p>
      ) : (
        <>
          <p className="slots-summary" aria-live="polite">
            {freeCount ? `${freeCount} ${freeCount === 1 ? 'time' : 'times'} available` : 'Fully booked. Tap a time to join its waitlist.'}
            {pastCount > 0 && mode === 'today' ? ' · earlier times have passed' : ''}
          </p>
          {groups.map((g) => (
            <div key={g.label} className="slot-group">
              <div className="slot-group__label">{g.label}</div>
              <div className="slots">
                {g.items.map((s) => {
                  const iso = s.start.toISOString();
                  const isSel = selected === iso;
                  const free = s.state === 'available' || s.state === 'held';
                  const label = fmtTime(s.start);
                  const detail = isSel ? 'Selected' : s.state === 'full' ? 'Full' : s.state === 'mine' ? 'Your booking' : s.state === 'blocked' ? 'Closed' : space.unit === 'session' ? `${s.spotsLeft} left` : money(s.price);
                  return (
                    <button
                      key={iso}
                      type="button"
                      className={cx('slot', `slot--${s.state}`, isSel && 'is-selected')}
                      disabled={s.state === 'blocked' || s.state === 'mine'}
                      aria-pressed={free ? isSel : undefined}
                      aria-label={`${label}, ${s.state === 'full' ? 'fully booked, join waitlist' : s.state === 'mine' ? 'your booking' : s.state === 'blocked' ? 'unavailable' : `available, ${money(s.price)}`}`}
                      onClick={() => (free ? onSelect(s) : s.state === 'full' ? onFull(s) : undefined)}
                    >
                      <span className="slot__time">{label}</span>
                      <span className="slot__detail">
                        {isSel && <Check size={12} strokeWidth={3} aria-hidden="true" />}
                        {s.state === 'held' && !isSel && <Lock size={11} aria-hidden="true" />}
                        {s.state === 'full' && <Clock3 size={11} aria-hidden="true" />}
                        {s.state === 'held' && !isSel ? 'Held for you' : detail}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
