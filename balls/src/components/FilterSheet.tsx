import { Accessibility, Armchair, Car, Coffee, DoorOpen, Lightbulb, Package, ShowerHead, Star, Toilet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FACILITIES, FEATURE_LABELS } from '../data/facilities';
import type { FeatureId, SportId, VenueType } from '../data/types';
import { hourLabel, dateKey, addDays, startOfDay } from '../lib/time';
import { applyFilters, EMPTY_FILTERS, type ExploreFilters, PRICE_BANDS } from '../services/filters';
import { useApp } from '../state/store';
import { SportIcon } from './icons';
import { SheetBody, SheetFooter, SheetHeader } from './Sheet';
import { Button, Chip } from './ui';
import { PLAYABLE, sportName } from '../data/sports';

const FEATURE_ICONS: Record<FeatureId, React.ReactNode> = {
  changing: <DoorOpen size={15} />,
  showers: <ShowerHead size={15} />,
  parking: <Car size={15} />,
  floodlights: <Lightbulb size={15} />,
  equipment: <Package size={15} />,
  accessible: <Accessibility size={15} />,
  toilets: <Toilet size={15} />,
  cafe: <Coffee size={15} />,
  seating: <Armchair size={15} />,
};

const FILTER_SPORTS: SportId[] = PLAYABLE;

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export function FilterSheet({ value, onApply, close }: { value: ExploreFilters; onApply: (f: ExploreFilters) => void; close: () => void }) {
  const s = useApp();
  const [f, setF] = useState<ExploreFilters>(value);
  const set = (patch: Partial<ExploreFilters>) => setF((x) => ({ ...x, ...patch }));
  const count = useMemo(() => applyFilters(s, FACILITIES, f).length, [s, f]);
  const customDistance = f.distance != null && ![1, 3, 5, 10].includes(f.distance);

  return (
    <>
      <SheetHeader title="Filters" onClose={close} />
      <SheetBody className="filters">
        <fieldset className="fgroup">
          <legend>Sport</legend>
          <div className="chip-wrap">
            {FILTER_SPORTS.map((sp) => (
              <Chip key={sp} active={f.sports.includes(sp)} icon={<SportIcon sport={sp} size={15} />} onClick={() => set({ sports: toggle(f.sports, sp) })}>
                {sportName(sp)}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset className="fgroup">
          <legend>Distance</legend>
          <div className="chip-wrap">
            {[1, 3, 5, 10].map((d) => (
              <Chip key={d} active={f.distance === d} onClick={() => set({ distance: f.distance === d ? null : d })}>
                {d} {d === 1 ? 'mile' : 'miles'}
              </Chip>
            ))}
            <Chip active={customDistance} onClick={() => set({ distance: customDistance ? null : 2 })}>
              Custom
            </Chip>
          </div>
          {customDistance && (
            <div className="range">
              <label htmlFor="f-distance">
                Within <b>{f.distance} miles</b>
              </label>
              <input id="f-distance" type="range" min={0.5} max={15} step={0.5} value={f.distance ?? 2} onChange={(e) => set({ distance: Number(e.target.value) })} />
            </div>
          )}
        </fieldset>

        <fieldset className="fgroup">
          <legend>
            Price <small>per hour or entry</small>
          </legend>
          <div className="chip-wrap">
            {PRICE_BANDS.map((b) => (
              <Chip key={b.id} active={f.price.includes(b.id)} onClick={() => set({ price: toggle(f.price, b.id) })}>
                {b.label}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset className="fgroup">
          <legend>Date</legend>
          <div className="chip-wrap">
            {(
              [
                ['today', 'Today'],
                ['tomorrow', 'Tomorrow'],
                ['week', 'This week'],
                ['custom', 'Custom'],
              ] as const
            ).map(([id, label]) => (
              <Chip key={id} active={f.date === id} onClick={() => set({ date: f.date === id ? 'any' : id, customDate: id === 'custom' ? f.customDate ?? dateKey(addDays(startOfDay(), 2)) : f.customDate })}>
                {label}
              </Chip>
            ))}
          </div>
          {f.date === 'custom' && (
            <div className="inline-field">
              <label htmlFor="f-date">Date</label>
              <input id="f-date" className="input" type="date" min={dateKey(startOfDay())} max={dateKey(addDays(startOfDay(), 13))} value={f.customDate} onChange={(e) => set({ customDate: e.target.value })} />
            </div>
          )}
        </fieldset>

        <fieldset className="fgroup">
          <legend>Time</legend>
          <div className="chip-wrap">
            {(
              [
                ['morning', 'Morning'],
                ['afternoon', 'Afternoon'],
                ['evening', 'Evening'],
                ['custom', 'Custom'],
              ] as const
            ).map(([id, label]) => (
              <Chip key={id} active={f.time === id} onClick={() => set({ time: f.time === id ? 'any' : id })}>
                {label}
              </Chip>
            ))}
          </div>
          {f.time === 'custom' && (
            <div className="inline-field inline-field--two">
              <label htmlFor="f-from">From</label>
              <select id="f-from" className="input" value={f.timeFrom} onChange={(e) => set({ timeFrom: Number(e.target.value), timeTo: Math.max(Number(e.target.value) + 1, f.timeTo) })}>
                {Array.from({ length: 17 }, (_, i) => i + 6).map((h) => (
                  <option key={h} value={h}>
                    {hourLabel(h)}
                  </option>
                ))}
              </select>
              <label htmlFor="f-to">To</label>
              <select id="f-to" className="input" value={f.timeTo} onChange={(e) => set({ timeTo: Number(e.target.value) })}>
                {Array.from({ length: 17 }, (_, i) => i + 7)
                  .filter((h) => h > f.timeFrom)
                  .map((h) => (
                    <option key={h} value={h}>
                      {hourLabel(h)}
                    </option>
                  ))}
              </select>
            </div>
          )}
          {(f.date !== 'any' || f.time !== 'any') && <p className="fine">Only venues with free slots at these times are shown.</p>}
        </fieldset>

        <fieldset className="fgroup">
          <legend>Venue type</legend>
          <div className="chip-wrap">
            {(['indoor', 'outdoor', 'covered'] as VenueType[]).map((v) => (
              <Chip key={v} active={f.venueTypes.includes(v)} onClick={() => set({ venueTypes: toggle(f.venueTypes, v) })}>
                {v[0].toUpperCase() + v.slice(1)}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset className="fgroup">
          <legend>Facilities</legend>
          <div className="chip-wrap">
            {(Object.keys(FEATURE_LABELS) as FeatureId[]).map((k) => (
              <Chip key={k} active={f.features.includes(k)} icon={FEATURE_ICONS[k]} onClick={() => set({ features: toggle(f.features, k) })}>
                {FEATURE_LABELS[k]}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset className="fgroup">
          <legend>Rating</legend>
          <div className="chip-wrap">
            {([0, 4, 4.5] as const).map((r) => (
              <Chip key={r} active={f.rating === r} icon={r ? <Star size={14} fill="currentColor" strokeWidth={0} /> : undefined} onClick={() => set({ rating: r })}>
                {r ? `${r}+` : 'Any'}
              </Chip>
            ))}
          </div>
        </fieldset>
      </SheetBody>
      <SheetFooter>
        <div className="filter-foot">
          <Button variant="ghost" onClick={() => setF({ ...EMPTY_FILTERS })}>
            Clear all
          </Button>
          <Button
            onClick={() => {
              onApply(f);
              close();
            }}
            disabled={count === 0}
          >
            {count === 0 ? 'No venues match' : `Show ${count} ${count === 1 ? 'venue' : 'venues'}`}
          </Button>
        </div>
      </SheetFooter>
    </>
  );
}
