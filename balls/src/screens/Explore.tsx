import { ArrowUpDown, BadgePercent, Check, ChevronRight, List, Map as MapIcon, Navigation, Search, SlidersHorizontal, Store, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Artwork } from '../components/Artwork';
import { AvailabilityTag, FacilityCard, SaveButton } from '../components/cards';
import { FilterSheet } from '../components/FilterSheet';
import { SportIcon } from '../components/icons';
import { MapView, type MapMarkerData } from '../components/MapView';
import { SheetBody, SheetHeader } from '../components/Sheet';
import { DirectionsButton } from '../components/sheets';
import { Button, Chip, EmptyState, ErrorState, Pill, RatingDisplay, Screen, SkeletonCard } from '../components/ui';
import { FACILITIES, FACILITY_BY_ID, spacesFor } from '../data/facilities';
import { SPORT_BY_ID, sportName } from '../data/sports';
import type { Facility, SportId } from '../data/types';
import { cx, miles, money, scrollEl } from '../lib/format';
import { fmtDay, fmtTime } from '../lib/time';
import { analytics } from '../services/analytics';
import { useResource } from '../services/api';
import { nextAvailable, priceRange, rates } from '../services/availability';
import { isBookable, rankFacilities } from '../services/discovery';
import { activeFilterCount, applyFilters, EMPTY_FILTERS, type ExploreFilters } from '../services/filters';
import { nav } from '../state/nav';
import { availCtx, distanceTo, facilityRating, facilitySports, origin } from '../state/selectors';
import { useApp } from '../state/store';
import { ui } from '../state/ui';
import type { ScreenComponentProps } from './routes';

const CHIP_SPORTS: SportId[] = ['football', 'basketball', 'tennis', 'padel', 'badminton', 'volleyball', 'gym', 'swimming', 'running', 'cricket', 'rugby', 'other'];
type Sort = 'recommended' | 'distance' | 'price' | 'rating';
const SORT_LABELS: Record<Sort, string> = { recommended: 'Recommended', distance: 'Nearest', price: 'Lowest price', rating: 'Top rated' };

function Preview({ f, sport, onClose }: { f: Facility; sport?: SportId; onClose: () => void }) {
  const s = useApp();
  const rating = facilityRating(s, f);
  const range = priceRange(f, sport, s);
  const next = nextAvailable(f, availCtx(s), sport);
  const bookable = isBookable(f);
  const drag = useRef({ y: 0, dy: 0, on: false });
  const el = useRef<HTMLDivElement>(null);
  return (
    <div
      className="preview"
      ref={el}
      role="dialog"
      aria-label={f.name}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('button,a')) return;
        drag.current = { y: e.clientY, dy: 0, on: true };
      }}
      onPointerMove={(e) => {
        if (!drag.current.on || !el.current) return;
        drag.current.dy = Math.max(0, e.clientY - drag.current.y);
        el.current.style.transform = `translateY(${drag.current.dy}px)`;
      }}
      onPointerUp={() => {
        if (!el.current) return;
        drag.current.on = false;
        if (drag.current.dy > 70) onClose();
        else el.current.style.transform = '';
      }}
    >
      <div className="preview__handle" aria-hidden="true" />
      <div className="preview__main">
        <button type="button" className="preview__media" onClick={() => nav.push('facility', { id: f.id, sport })} aria-label={`Open ${f.name}`}>
          <Artwork art={f.images[0]} />
        </button>
        <div className="preview__info">
          <div className="preview__titlerow">
            <h3 className="preview__name">{f.name}</h3>
            <SaveButton facilityId={f.id} variant="plain" />
          </div>
          <div className="preview__meta">
            <RatingDisplay value={rating.overall} count={rating.count} size={13} />
            <span className="dot-sep" aria-hidden="true" />
            <span>{miles(distanceTo(s, f))}</span>
          </div>
          <div className="preview__sports">
            {facilitySports(f).map((sp) => (
              <span key={sp} className={cx('mini-sport', sp === sport && 'is-on')}>
                <SportIcon sport={sp} size={13} /> {sportName(sp)}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="preview__facts">
        <div>
          <span className="preview__label">Price</span>
          <b>{range.max === 0 ? 'Free' : `from ${money(range.min)}`}</b>
          {range.max > 0 && <small>{range.unit === 'session' ? 'per person' : 'per hour'}</small>}
        </div>
        <div>
          <span className="preview__label">{bookable ? 'Next free' : 'Access'}</span>
          <b>{bookable ? (next ? `${fmtDay(next.start)} ${fmtTime(next.start)}` : 'Fully booked') : 'Walk-up'}</b>
          <small>{bookable ? (next ? next.space.name : 'Join a waitlist') : 'No booking needed'}</small>
        </div>
        <div>
          <span className="preview__label">Today</span>
          <AvailabilityTag facility={f} sport={sport} />
        </div>
      </div>
      <div className="preview__actions">
        <Button variant="secondary" onClick={() => nav.push('facility', { id: f.id, sport })}>
          View venue
        </Button>
        {bookable ? (
          <Button
            onClick={() => {
              analytics.track('booking_started', { facility: f.id, from: 'map' });
              nav.push('book', { facilityId: f.id, sport, ...(next ? { spaceId: next.space.id, start: next.start.toISOString() } : {}) });
            }}
          >
            {next ? `Book ${fmtTime(next.start)}` : 'Check availability'}
          </Button>
        ) : (
          <DirectionsButton f={f} variant="primary" label="Get directions" />
        )}
      </div>
      <button type="button" className="preview__close" onClick={onClose} aria-label="Close preview">
        <X size={16} />
      </button>
    </div>
  );
}

export function ExploreScreen({ params, retap }: ScreenComponentProps) {
  const s = useApp();
  const [filters, setFilters] = useState<ExploreFilters>(EMPTY_FILTERS);
  const [view, setView] = useState<'map' | 'list'>((params.view as 'map' | 'list') ?? 'map');
  const [sort, setSort] = useState<Sort>('recommended');
  const [selected, setSelected] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ lat: number; lng: number; key: string; zoom?: number } | null>(null);
  const { status, retry } = useResource('explore', 350);
  const listRef = useRef<HTMLDivElement>(null);

  // Other screens can open Explore with a sport or view pre-selected.
  useEffect(() => {
    if (params.sport) setFilters((f) => ({ ...f, sports: [params.sport as SportId] }));
    else if (params._t && params.clear) setFilters(EMPTY_FILTERS);
    if (params.view) setView(params.view as 'map' | 'list');
    if (params.focus) {
      const f = FACILITY_BY_ID[params.focus];
      if (f) {
        setSelected(f.id);
        setFocus({ lat: f.lat, lng: f.lng, key: `${f.id}-${params._t}`, zoom: 0.2 });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params._t]);

  useEffect(() => {
    if (retap) scrollEl(listRef.current, { top: 0 }, true);
  }, [retap]);

  const sport = filters.sports.length === 1 ? filters.sports[0] : undefined;
  const results = useMemo(() => applyFilters(s, FACILITIES, filters), [s, filters]);
  const sorted = useMemo(() => {
    const ranked = rankFacilities(s, results, sport);
    switch (sort) {
      case 'distance':
        return [...ranked].sort((a, b) => a.distance - b.distance);
      case 'price':
        return [...ranked].sort((a, b) => priceRange(a.f, sport, s).min - priceRange(b.f, sport, s).min);
      case 'rating':
        return [...ranked].sort((a, b) => facilityRating(s, b.f).overall - facilityRating(s, a.f).overall);
      default:
        return ranked;
    }
  }, [s, results, sort, sport]);

  const markers: MapMarkerData[] = useMemo(
    () =>
      results.map((f) => {
        const sp = sport ?? facilitySports(f).find((x) => s.profile.sports.some((p) => p.sport === x)) ?? facilitySports(f)[0];
        const r = priceRange(f, sport, s);
        return { id: f.id, lat: f.lat, lng: f.lng, sport: sp, label: r.max === 0 ? 'Free' : money(r.min), title: f.name };
      }),
    [results, sport, s],
  );

  const toggleSport = (sp: SportId | null) => {
    setSelected(null);
    setFilters((f) => ({ ...f, sports: sp == null ? [] : f.sports.length === 1 && f.sports[0] === sp ? [] : [sp] }));
    if (sp) analytics.track('sport_selected', { sport: sp, from: 'explore' });
  };

  const count = activeFilterCount(filters);
  const openFilters = () =>
    ui.open('Filters', (close) => (
      <FilterSheet
        value={filters}
        close={close}
        onApply={(f) => {
          setFilters(f);
          setSelected(null);
          analytics.track('filter_applied', { count: activeFilterCount(f, false) });
        }}
      />
    ));
  const openSort = () =>
    ui.open('Sort', (close) => (
      <>
        <SheetHeader title="Sort by" onClose={close} />
        <SheetBody>
          <div className="list-card">
            {(Object.keys(SORT_LABELS) as Sort[]).map((k) => (
              <button
                key={k}
                type="button"
                className={cx('row row--btn', sort === k && 'is-selected')}
                onClick={() => {
                  setSort(k);
                  close();
                }}
              >
                <span className="row__body">
                  <span className="row__title">{SORT_LABELS[k]}</span>
                  {k === 'recommended' && <span className="row__sub">Distance, your sports, free slots, price and rating</span>}
                </span>
                {sort === k && <Check size={18} className="row__check" />}
              </button>
            ))}
          </div>
        </SheetBody>
      </>
    ));

  const selectedF = selected ? FACILITY_BY_ID[selected] : null;
  const me = origin(s);

  const header = (
    <div className={cx('explore__top', view === 'list' && 'is-solid')}>
      <div className="searchrow">
        <button type="button" className="searchbar" onClick={() => nav.push('search')}>
          <Search size={18} aria-hidden="true" />
          <span>Search venues, sports, areas</span>
        </button>
        <button type="button" className={cx('filterbtn', count > 0 && 'is-on')} onClick={openFilters} aria-label={`Filters${count ? `, ${count} active` : ''}`}>
          <SlidersHorizontal size={19} />
          {count > 0 && <span className="filterbtn__n">{count}</span>}
        </button>
      </div>
      <div className="hscroll hscroll--chips" role="toolbar" aria-label="Filter by sport">
        <Chip active={filters.sports.length === 0} onClick={() => toggleSport(null)}>
          All
        </Chip>
        {CHIP_SPORTS.map((sp) => (
          <Chip key={sp} active={filters.sports.includes(sp)} icon={<SportIcon sport={sp} size={15} />} onClick={() => toggleSport(sp)}>
            {sportName(sp)}
          </Chip>
        ))}
      </div>
    </div>
  );

  return (
    <div className={cx('screen-inner explore', `explore--${view}`)}>
      {header}
      {view === 'map' ? (
        <div className="explore__map">
          <MapView markers={markers} selectedId={selected} onSelect={setSelected} user={me} cameraKey="explore" bottomInset={selectedF ? 300 : 70} focus={focus} controls={!selectedF} />
          {!results.length && (
            <div className="map-empty">
              <b>No venues match.</b>
              <button type="button" className="link" onClick={() => setFilters(EMPTY_FILTERS)}>
                Clear filters
              </button>
            </div>
          )}
          {selectedF && <Preview key={selectedF.id} f={selectedF} sport={sport} onClose={() => setSelected(null)} />}
        </div>
      ) : (
        <div className="scroll explore__list" ref={listRef}>
          {status === 'error' ? (
            <ErrorState onRetry={retry} />
          ) : status === 'loading' ? (
            <div className="list-pad">
              {[0, 1, 2, 3].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <div className="list-pad">
              <div className="list-toolbar">
                <span className="list-toolbar__count" aria-live="polite">
                  {results.length} {results.length === 1 ? 'venue' : 'venues'}
                  {sport ? ` for ${sportName(sport).toLowerCase()}` : ''}
                </span>
                <button type="button" className="sortbtn" onClick={openSort}>
                  <ArrowUpDown size={15} /> {SORT_LABELS[sort]}
                </button>
              </div>
              {sport && results.filter((f) => isBookable(f)).length > 1 && (
                <button type="button" className="compare-banner" onClick={() => nav.push('compare', { sport })}>
                  <span className="compare-banner__icon">
                    <BadgePercent size={20} />
                  </span>
                  <span>
                    <b>Compare {sportName(sport).toLowerCase()} prices</b>
                    <small>Best price, closest and best rated, side by side</small>
                  </span>
                  <ChevronRight size={18} />
                </button>
              )}
              {sorted.length ? (
                <div className="cards">
                  {sorted.map((x) => (
                    <FacilityCard key={x.f.id} facility={x.f} sport={sport} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Search size={24} />}
                  title="No venues match these filters."
                  body="Try a wider distance or fewer filters."
                  action={{ label: 'Clear filters', onClick: () => setFilters(EMPTY_FILTERS) }}
                  secondary={filters.distance != null ? { label: 'Expand distance', onClick: () => setFilters((f) => ({ ...f, distance: null })) } : undefined}
                />
              )}
              <button type="button" className="services-link" onClick={() => nav.push('services')}>
                <Store size={18} /> <span>Sports shops, stringing and physio nearby</span>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
      {!(view === 'map' && selectedF) && (
        <button
          type="button"
          className="viewtoggle"
          onClick={() => {
            setView(view === 'map' ? 'list' : 'map');
            setSelected(null);
          }}
        >
          {view === 'map' ? (
            <>
              <List size={17} /> List · {results.length}
            </>
          ) : (
            <>
              <MapIcon size={17} /> Map
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- price comparison

export function CompareScreen({ params }: ScreenComponentProps) {
  const s = useApp();
  const [sport, setSport] = useState<SportId>((params.sport as SportId) ?? 'football');
  const def = SPORT_BY_ID[sport];
  const hasFormats = sport === 'football';
  const [format, setFormat] = useState<string>('5-a-side');
  const ctx = availCtx(s);

  const rows = useMemo(() => {
    return FACILITIES.flatMap((f) => {
      const spaces = spacesFor(f.id).filter((x) => x.sport === sport && !x.walkUp && (!hasFormats || x.attrs.format === format));
      if (!spaces.length) return [];
      const cheapest = spaces.reduce((a, b) => (rates(a, s).offPeak <= rates(b, s).offPeak ? a : b));
      const r = rates(cheapest, s);
      return [{ f, space: cheapest, offPeak: r.offPeak, peak: r.peak, distance: distanceTo(s, f), rating: facilityRating(s, f).overall, next: nextAvailable(f, ctx, sport) }];
    }).sort((a, b) => a.offPeak - b.offPeak);
  }, [s, sport, format, hasFormats, ctx]);

  const best = {
    price: rows.length ? Math.min(...rows.map((r) => r.offPeak)) : 0,
    close: rows.length ? Math.min(...rows.map((r) => r.distance)) : 0,
    rated: rows.length ? Math.max(...rows.map((r) => r.rating)) : 0,
  };
  const playerCount = hasFormats ? def.formats.find((x) => x.label === format)?.players : def.formats[def.formats.length - 1]?.players;
  const sports = (['football', 'tennis', 'padel', 'badminton', 'basketball', 'volleyball', 'swimming', 'gym', 'cricket'] as SportId[]).filter((x) => FACILITIES.some((f) => spacesFor(f.id).some((sp) => sp.sport === x && !sp.walkUp)));

  return (
    <Screen title="Compare prices">
      <div className="pad">
        <div className="hscroll hscroll--chips hscroll--flush" role="toolbar" aria-label="Sport">
          {sports.map((sp) => (
            <Chip key={sp} active={sport === sp} icon={<SportIcon sport={sp} size={15} />} onClick={() => setSport(sp)}>
              {sportName(sp)}
            </Chip>
          ))}
        </div>
        {hasFormats && (
          <div className="chip-row">
            {def.formats.map((fm) => (
              <Chip key={fm.id} active={format === fm.label} onClick={() => setFormat(fm.label)}>
                {fm.label}
              </Chip>
            ))}
          </div>
        )}
        <h2 className="compare-title">{hasFormats ? format : def.name}</h2>
        <p className="fine">Off-peak prices shown first. Peak applies weekday evenings and weekends.</p>
        {rows.length ? (
          <ol className="compare">
            {rows.map((r) => {
              const tags = [r.offPeak === best.price && 'Best price', r.distance === best.close && 'Closest', r.rating === best.rated && 'Best rated'].filter(Boolean) as string[];
              const unit = r.space.unit === 'session' ? '/person' : '/hr';
              return (
                <li key={r.f.id} className={cx('cmp', tags.length > 0 && 'cmp--hl')}>
                  <button type="button" className="cmp__hit" onClick={() => nav.push('facility', { id: r.f.id, sport })} aria-label={`${r.f.name}, ${money(r.offPeak)} ${unit}`} />
                  <div className="cmp__main">
                    <div className="cmp__tags">
                      {tags.map((t) => (
                        <Pill key={t} tone={t === 'Best price' ? 'success' : t === 'Closest' ? 'brand' : 'warning'}>
                          {t}
                        </Pill>
                      ))}
                    </div>
                    <h3 className="cmp__name">{r.f.name}</h3>
                    <div className="cmp__meta">
                      <span>{miles(r.distance)}</span>
                      <span className="dot-sep" aria-hidden="true" />
                      <RatingDisplay value={r.rating} size={12} />
                      <span className="dot-sep" aria-hidden="true" />
                      <span>{r.space.attrs.surface ?? r.space.name}</span>
                    </div>
                    <div className="cmp__next">{r.next ? `Next free: ${fmtDay(r.next.start)} ${fmtTime(r.next.start)}` : 'Fully booked for 3 days'}</div>
                  </div>
                  <div className="cmp__price">
                    <b>{money(r.offPeak)}</b>
                    <small>{unit}</small>
                    {r.peak !== r.offPeak && <span className="cmp__peak">{money(r.peak)} peak</span>}
                    {playerCount && r.space.unit === 'hour' && <span className="cmp__each">≈ {money(Math.ceil(r.offPeak / playerCount))} each</span>}
                  </div>
                  <Button size="sm" className="cmp__book" onClick={() => nav.push('book', { facilityId: r.f.id, sport, spaceId: r.space.id })}>
                    Book
                  </Button>
                </li>
              );
            })}
          </ol>
        ) : (
          <EmptyState compact icon={<Navigation size={22} />} title="No bookable venues for this yet." body="Try another sport or format." />
        )}
      </div>
    </Screen>
  );
}
