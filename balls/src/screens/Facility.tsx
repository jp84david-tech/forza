import { Bell, BellRing, Camera, Check, Clock, Flag, ImagePlus, MapPin, MoreHorizontal, Share2, ShieldCheck, Star, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Artwork } from '../components/Artwork';
import { GameCard, SaveButton, SportBadge } from '../components/cards';
import { SportIcon } from '../components/icons';
import { MapView } from '../components/MapView';
import { SheetBody, SheetHeader } from '../components/Sheet';
import { DirectionsButton, openReport, openShare } from '../components/sheets';
import { Avatar, Button, Chip, CtaBar, EmptyState, ErrorState, IconButton, Pill, RatingDisplay, Row, Screen, Section, Skeleton } from '../components/ui';
import { ATTRIBUTE_LABELS, sportName } from '../data/sports';
import { FACILITY_BY_ID, FEATURE_LABELS, KIND_LABELS, POLICY_BY_ID, spacesFor } from '../data/facilities';
import type { ArtSpec, Facility, RatingBreakdown, Review, SportId } from '../data/types';
import { cx, miles, money, plural } from '../lib/format';
import { fmtShortDate, fmtTime, hourLabel, now, timeAgo, weekday } from '../lib/time';
import { analytics } from '../services/analytics';
import { useResource } from '../services/api';
import { daySlots, hoursOn, isOpenNow, priceRange, rates } from '../services/availability';
import { isBookable } from '../services/discovery';
import { submitReview, toggleAlert } from '../state/actions';
import { nav } from '../state/nav';
import { availCtx, distanceTo, facilityRating, facilityReviews, facilitySports, origin, userById, visibleGames } from '../state/selectors';
import { useApp } from '../state/store';
import { ui } from '../state/ui';
import type { ScreenComponentProps } from './routes';
import { PhotoPicker } from './shared';
import { useEffect } from 'react';

// ---------------------------------------------------------------- gallery

function GalleryViewer({ images, start, name, close }: { images: ArtSpec[]; start: number; name: string; close: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(start);
  useEffect(() => {
    ref.current?.scrollTo({ left: start * (ref.current?.clientWidth ?? 0) });
  }, [start]);
  return (
    <div className="gviewer">
      <div className="gviewer__top">
        <span>
          {i + 1} / {images.length}
        </span>
        <IconButton label="Close photos" variant="glass" onClick={close}>
          <X size={20} />
        </IconButton>
      </div>
      <div className="gviewer__track" ref={ref} onScroll={(e) => setI(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
        {images.map((img, k) => (
          <figure key={k} className="gviewer__slide">
            <Artwork art={img} label={`${name}: ${img.caption}`} />
            <figcaption>{img.caption}</figcaption>
          </figure>
        ))}
      </div>
      <div className="gviewer__thumbs">
        {images.map((img, k) => (
          <button
            key={k}
            type="button"
            className={cx('gviewer__thumb', k === i && 'is-on')}
            aria-label={`Photo ${k + 1}: ${img.caption}`}
            onClick={() => ref.current?.scrollTo({ left: k * ref.current.clientWidth, behavior: 'smooth' })}
          >
            <Artwork art={img} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function openGallery(images: ArtSpec[], start: number, name: string) {
  ui.open(`${name} photos`, (close) => <GalleryViewer images={images} start={start} name={name} close={close} />, 'viewer');
}

function HeroGallery({ f }: { f: Facility }) {
  const [i, setI] = useState(0);
  return (
    <div className="hero">
      <div className="hero__track" onScroll={(e) => setI(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
        {f.images.map((img, k) => (
          <button key={k} type="button" className="hero__slide" onClick={() => openGallery(f.images, k, f.name)} aria-label={`Open photo ${k + 1} of ${f.images.length}: ${img.caption}`}>
            <Artwork art={img} />
          </button>
        ))}
      </div>
      <div className="hero__caption">
        <Camera size={13} aria-hidden="true" /> {f.images[i]?.caption} · {i + 1}/{f.images.length}
      </div>
      <div className="hero__dots" aria-hidden="true">
        {f.images.map((_, k) => (
          <span key={k} className={cx(k === i && 'is-on')} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- reviews

const SUB_LABELS: Array<[keyof RatingBreakdown, string]> = [
  ['surface', 'Surface & court quality'],
  ['cleanliness', 'Cleanliness'],
  ['facilities', 'Facilities'],
  ['value', 'Value'],
  ['overall', 'Overall experience'],
];

export function RatingSummary({ rating, count }: { rating: RatingBreakdown; count: number }) {
  return (
    <div className="rsum">
      <div className="rsum__big">
        <b>{rating.overall.toFixed(1)}</b>
        <RatingDisplay value={rating.overall} variant="stars" size={15} />
        <span>{plural(count, 'review')}</span>
      </div>
      <div className="rsum__bars">
        {SUB_LABELS.slice(0, 4).map(([k, label]) => (
          <div key={k} className="rsum__row">
            <span>{label}</span>
            <span className="rsum__track" aria-hidden="true">
              <span style={{ width: `${(rating[k] / 5) * 100}%` }} />
            </span>
            <b>{rating[k].toFixed(1)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReviewItem({ r }: { r: Review }) {
  const s = useApp();
  const u = userById(s, r.userId);
  const [expanded, setExpanded] = useState(false);
  if (!u) return null;
  const long = r.text.length > 180;
  return (
    <article className="review">
      <header className="review__head">
        <button type="button" className="review__who" onClick={() => r.userId !== 'me' && nav.push('player', { id: r.userId })}>
          <Avatar name={u.name} color={u.color} photo={u.photo} size={36} />
          <span>
            <b>{r.userId === 'me' ? 'You' : u.name}</b>
            <small>
              {timeAgo(r.at)}
              {r.sport ? ` · ${sportName(r.sport)}` : ''}
            </small>
          </span>
        </button>
        <RatingDisplay value={r.rating.overall} variant="stars" size={13} />
      </header>
      <p className={cx('review__text', long && !expanded && 'is-clamped')}>{r.text}</p>
      {long && (
        <button type="button" className="link link--sm" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
      {(r.photos?.length || r.uploads?.length) && (
        <div className="review__photos">
          {r.photos?.map((p, i) => (
            <button key={i} type="button" className="review__photo" onClick={() => openGallery(r.photos!, i, 'Review')} aria-label="Open review photo">
              <Artwork art={p} />
            </button>
          ))}
          {r.uploads?.map((src, i) => (
            <span key={`u${i}`} className="review__photo">
              <img src={src} alt="Photo from the reviewer" />
            </span>
          ))}
        </div>
      )}
      {r.userId !== 'me' && (
        <button type="button" className="review__report" onClick={() => openReport('review', r.id, `${u.name}’s review`)}>
          <Flag size={12} /> Report
        </button>
      )}
    </article>
  );
}

function canReview(s: ReturnType<typeof useApp>, facilityId: string) {
  const t = Date.now();
  return s.bookings.some((b) => b.facilityId === facilityId && b.status !== 'cancelled' && new Date(b.end).getTime() < t) || s.profile.venues.includes(facilityId);
}

// ---------------------------------------------------------------- facility

export function FacilityScreen({ params }: ScreenComponentProps) {
  const s = useApp();
  const f = FACILITY_BY_ID[params.id!];
  const { status, retry } = useResource(`facility-${params.id}`, 300);
  const sports = facilitySports(f);
  const [sport, setSport] = useState<SportId>((params.sport as SportId) && sports.includes(params.sport as SportId) ? (params.sport as SportId) : sports[0]);
  const rating = facilityRating(s, f);
  const reviews = facilityReviews(s, f.id);
  const d = distanceTo(s, f);
  const hours = hoursOn(f, now());
  const open = isOpenNow(f);
  const spaces = spacesFor(f.id).filter((x) => x.sport === sport);
  const bookable = isBookable(f);
  const range = priceRange(f, undefined, s);
  const policy = POLICY_BY_ID[f.cancellationPolicyId];
  const ctx = availCtx(s);
  const games = visibleGames(s).filter((g) => g.facilityId === f.id && (g.status === 'open' || g.status === 'full') && new Date(g.start).getTime() > Date.now());
  const alertOn = s.alerts.includes(f.id);
  const reviewed = s.reviews.some((r) => r.facilityId === f.id);

  useEffect(() => {
    analytics.track('facility_viewed', { facility: f.id });
  }, [f.id]);

  const todaySlots = useMemo(() => {
    const base = new Date();
    const day = base.getHours() >= (hours?.[1] ?? 22) - 1 ? new Date(base.getTime() + 86_400_000) : base;
    const all = spaces
      .filter((x) => !x.walkUp)
      .flatMap((sp) => daySlots(sp, day, 60, ctx).filter((x) => x.state === 'available').map((x) => ({ ...x, space: sp })));
    const byTime = new Map<number, (typeof all)[number]>();
    all.forEach((x) => {
      const k = x.start.getTime();
      if (!byTime.has(k)) byTime.set(k, x);
    });
    return { day, slots: [...byTime.values()].sort((a, b) => a.start.getTime() - b.start.getTime()).slice(0, 8) };
  }, [spaces, ctx, hours]);

  const share = () => openShare({ title: 'Share venue', text: `${f.name} on BALLS: ${sports.map(sportName).join(', ')} in ${f.area}.`, path: `v/${f.id}` });
  const more = () =>
    ui.open('More', (close) => (
      <>
        <SheetHeader title={f.name} onClose={close} />
        <SheetBody>
          <div className="list-card">
            <Row icon={alertOn ? <BellRing size={18} /> : <Bell size={18} />} title={alertOn ? 'Turn off availability alerts' : 'Alert me when evenings free up'} onClick={() => { toggleAlert(f.id); close(); }} />
            <Row icon={<Share2 size={18} />} title="Share venue" onClick={() => { close(); share(); }} />
            <Row icon={<Flag size={18} />} title="Report a problem with this venue" onClick={() => { close(); openReport('facility', f.id, f.name); }} danger />
          </div>
        </SheetBody>
      </>
    ));

  const footer = bookable ? (
    <CtaBar label={<span className="cta-price">from {money(range.min)}<small>{range.unit === 'session' ? ' per person' : ' per hour'}</small></span>} sub={`Free cancellation up to ${policy.fullRefundHours}h before`}>
      <Button size="lg" onClick={() => nav.push('book', { facilityId: f.id, sport: spaces.some((x) => !x.walkUp) ? sport : undefined })}>
        Book now
      </Button>
    </CtaBar>
  ) : (
    <CtaBar label={<span className="cta-price">Free</span>} sub="Walk-up · no booking needed">
      <DirectionsButton f={f} variant="primary" size="lg" label="Get directions" />
    </CtaBar>
  );

  return (
    <Screen
      header="overlay"
      overlayThreshold={220}
      title={f.name}
      footer={footer}
      actions={
        <>
          <IconButton label="Share" variant="glass" onClick={share}>
            <Share2 size={19} />
          </IconButton>
          <SaveButton facilityId={f.id} />
          <IconButton label="More options" variant="glass" onClick={more}>
            <MoreHorizontal size={20} />
          </IconButton>
        </>
      }
    >
      <HeroGallery f={f} />
      <div className="fac-head">
        <div className="eyebrow">
          {KIND_LABELS[f.kind]} · {f.area}
          {f.partner && (
            <span className="partner">
              <ShieldCheck size={12} /> BALLS partner
            </span>
          )}
        </div>
        <h1 className="fac-head__name">{f.name}</h1>
        <button type="button" className="fac-head__rating" onClick={() => nav.push('reviews', { id: f.id })}>
          <RatingDisplay value={rating.overall} variant="stars" size={16} />
          <b>{rating.overall.toFixed(1)}</b>
          <span>{plural(rating.count, 'review')}</span>
        </button>
        <div className="fac-head__meta">
          <span>
            <MapPin size={14} aria-hidden="true" /> {miles(d, true)}
          </span>
          <span className={cx('openstate', open ? 'is-open' : 'is-closed')}>
            <Clock size={14} aria-hidden="true" /> {open ? `Open until ${hourLabel(hours![1])}` : hours ? `Closed · opens ${hourLabel(hours[0])}` : 'Closed today'}
          </span>
        </div>
        <div className="fac-head__sports">
          {sports.map((sp) => (
            <span key={sp} className="mini-sport">
              <SportIcon sport={sp} size={14} /> {sportName(sp)}
            </span>
          ))}
        </div>
        <div className="fac-actions">
          <DirectionsButton f={f} variant="secondary" />
          <Button variant="secondary" icon={alertOn ? <BellRing size={17} /> : <Bell size={17} />} onClick={() => toggleAlert(f.id)} aria-pressed={alertOn}>
            {alertOn ? 'Alerts on' : 'Alert me'}
          </Button>
        </div>
      </div>

      {status === 'error' ? (
        <ErrorState onRetry={retry} />
      ) : status === 'loading' ? (
        <div className="pad stack-16">
          <Skeleton h={22} w="50%" />
          <Skeleton h={120} r={16} w="100%" />
          <Skeleton h={22} w="40%" />
          <Skeleton h={80} r={16} w="100%" />
        </div>
      ) : (
        <>
          <Section title={bookable ? 'Book a space' : 'Spaces'} className="pad">
            {sports.length > 1 && (
              <div className="hscroll hscroll--chips hscroll--flush">
                {sports.map((sp) => (
                  <Chip key={sp} active={sport === sp} icon={<SportIcon sport={sp} size={15} />} onClick={() => setSport(sp)}>
                    {sportName(sp)}
                  </Chip>
                ))}
              </div>
            )}
            <div className="spaces">
              {spaces.map((sp) => {
                const r = rates(sp, s);
                return (
                  <button
                    key={sp.id}
                    type="button"
                    className="space"
                    disabled={sp.walkUp}
                    onClick={() => nav.push('book', { facilityId: f.id, sport, spaceId: sp.id })}
                    aria-label={`${sp.name}${sp.walkUp ? ', walk-up only' : `, from ${money(r.offPeak)}`}`}
                  >
                    <SportBadge sport={sp.sport} size={40} />
                    <span className="space__body">
                      <b>{sp.name}</b>
                      <span className="space__attrs">
                        {Object.entries(sp.attrs).map(([k, v]) => (
                          <span key={k}>
                            <small>{ATTRIBUTE_LABELS[k] ?? k}</small> {v}
                          </span>
                        ))}
                        <span>
                          <small>Type</small> {sp.venueType[0].toUpperCase() + sp.venueType.slice(1)}
                        </span>
                      </span>
                    </span>
                    <span className="space__price">
                      {sp.walkUp ? (
                        <Pill tone="brand">Walk-up</Pill>
                      ) : (
                        <>
                          <b>{money(r.offPeak)}</b>
                          <small>{sp.unit === 'session' ? 'per person' : 'per hour'}</small>
                        </>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            {spaces.some((x) => !x.walkUp) && (
              <div className="avail-peek">
                <div className="avail-peek__head">
                  <b>Free {todaySlots.day.getDate() === new Date().getDate() ? 'today' : 'tomorrow'}</b>
                  <button type="button" className="link" onClick={() => nav.push('book', { facilityId: f.id, sport })}>
                    View availability
                  </button>
                </div>
                {todaySlots.slots.length ? (
                  <div className="avail-peek__slots">
                    {todaySlots.slots.map((x) => (
                      <button key={x.start.toISOString()} type="button" className="slot-chip" onClick={() => nav.push('book', { facilityId: f.id, sport, spaceId: x.space.id, start: x.start.toISOString() })}>
                        {fmtTime(x.start)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="fine">Fully booked. Check another day or join a waitlist from the calendar.</p>
                )}
              </div>
            )}
          </Section>

          <Section title="Prices" className="pad">
            <table className="prices">
              <thead>
                <tr>
                  <th scope="col">Space</th>
                  <th scope="col">Off-peak</th>
                  <th scope="col">Peak</th>
                </tr>
              </thead>
              <tbody>
                {spacesFor(f.id).map((sp) => {
                  const r = rates(sp, s);
                  return (
                    <tr key={sp.id}>
                      <th scope="row">
                        {sp.name}
                        <small>{sportName(sp.sport)}</small>
                      </th>
                      <td>{sp.walkUp ? 'Free' : money(r.offPeak)}</td>
                      <td>{sp.walkUp ? 'Free' : money(r.peak)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="fine">
              Per {range.unit === 'session' ? 'person' : 'hour'}. Peak is weekdays from {hourLabel(f.rules.peakFromHour)} and all weekend.
              {f.partner ? ' No booking fee at partner venues.' : ' A 75p booking fee applies.'}
            </p>
          </Section>

          <Section title="About" className="pad">
            <p className="prose">{f.description}</p>
            {f.highlights && (
              <div className="chip-row">
                {f.highlights.map((h) => (
                  <Pill key={h} tone="brand">
                    {h}
                  </Pill>
                ))}
              </div>
            )}
          </Section>

          <Section title="Facilities" className="pad">
            <ul className="features">
              {f.features.map((x) => (
                <li key={x}>
                  <Check size={16} strokeWidth={2.6} aria-hidden="true" /> {FEATURE_LABELS[x]}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Opening hours" className="pad">
            <ul className="hours">
              {[1, 2, 3, 4, 5, 6, 0].map((wd) => {
                const h = f.openingHours[wd];
                const today = new Date().getDay() === wd;
                const dd = new Date();
                dd.setDate(dd.getDate() + ((wd - dd.getDay() + 7) % 7));
                return (
                  <li key={wd} className={cx(today && 'is-today')}>
                    <span>
                      {weekday(dd)}
                      {today && <small> · Today</small>}
                    </span>
                    <span>{h ? `${hourLabel(h[0])} – ${hourLabel(h[1])}` : 'Closed'}</span>
                  </li>
                );
              })}
            </ul>
          </Section>

          <Section title="Location" className="pad">
            <div className="minimap">
              <MapView markers={[{ id: f.id, lat: f.lat, lng: f.lng, sport: sports[0], label: f.name.split(' ')[0], title: f.name }]} selectedId={f.id} interactive={false} center={f} initialZoom={0.28} user={origin(s)} controls={false} />
            </div>
            <div className="address">
              <div>
                <b>{f.address}</b>
                <span>
                  {f.area}, London {f.postcode}
                </span>
              </div>
              <DirectionsButton f={f} variant="primary" size="sm" label="Directions" />
            </div>
          </Section>

          <Section title="Reviews" action={`See all ${rating.count}`} onAction={() => nav.push('reviews', { id: f.id })} className="pad">
            <RatingSummary rating={rating} count={rating.count} />
            <div className="reviews">
              {reviews.slice(0, 2).map((r) => (
                <ReviewItem key={r.id} r={r} />
              ))}
            </div>
            {!reviewed && canReview(s, f.id) ? (
              <Button variant="secondary" block icon={<Star size={17} />} onClick={() => nav.push('writeReview', { id: f.id })}>
                Write a review
              </Button>
            ) : !reviewed ? (
              <p className="fine">Only players who’ve booked or played here can leave a review. It keeps ratings honest.</p>
            ) : (
              <p className="fine">
                <Check size={13} /> You’ve reviewed this venue.
              </p>
            )}
          </Section>

          {games.length > 0 && (
            <Section title="Games here" className="pad">
              <div className="cards">
                {games.slice(0, 3).map((g) => (
                  <GameCard key={g.id} game={g} />
                ))}
              </div>
            </Section>
          )}

          <Section title="Booking rules" className="pad">
            <ul className="rules">
              <li>
                <b>{policy.name} cancellation.</b> {policy.summary}
              </li>
              <li>Book up to {f.rules.maxAdvanceDays} days ahead.</li>
              {bookable && <li>Sessions of {f.rules.durations.map((m) => (m % 60 ? `${m / 60}`.replace('.5', '½') : `${m / 60}`)).join(', ')} hours.</li>}
              <li>Arrive 10 minutes early. Show your booking code at reception.</li>
            </ul>
          </Section>
          <div className="pad">
            <button type="button" className="report-link" onClick={() => openReport('facility', f.id, f.name)}>
              <Flag size={14} /> Report incorrect information
            </button>
          </div>
        </>
      )}
    </Screen>
  );
}

// ---------------------------------------------------------------- reviews list

export function ReviewsScreen({ params }: ScreenComponentProps) {
  const s = useApp();
  const f = FACILITY_BY_ID[params.id!];
  const rating = facilityRating(s, f);
  const all = facilityReviews(s, f.id);
  const [filter, setFilter] = useState<'all' | '5' | '4' | 'low' | 'photos'>('all');
  const [limit, setLimit] = useState(8);
  const list = all.filter((r) => (filter === 'all' ? true : filter === '5' ? r.rating.overall === 5 : filter === '4' ? r.rating.overall === 4 : filter === 'low' ? r.rating.overall <= 3 : !!(r.photos?.length || r.uploads?.length)));
  const reviewed = s.reviews.some((r) => r.facilityId === f.id);
  return (
    <Screen
      title="Reviews"
      subtitle={f.name}
      footer={
        !reviewed && canReview(s, f.id) ? (
          <CtaBar>
            <Button block size="lg" icon={<Star size={17} />} onClick={() => nav.push('writeReview', { id: f.id })}>
              Write a review
            </Button>
          </CtaBar>
        ) : undefined
      }
    >
      <div className="pad">
        <RatingSummary rating={rating} count={rating.count} />
        <div className="hscroll hscroll--chips hscroll--flush">
          {(
            [
              ['all', 'All'],
              ['5', '5 stars'],
              ['4', '4 stars'],
              ['low', '3 and below'],
              ['photos', 'With photos'],
            ] as const
          ).map(([k, label]) => (
            <Chip key={k} active={filter === k} onClick={() => { setFilter(k); setLimit(8); }}>
              {label}
            </Chip>
          ))}
        </div>
        {list.length ? (
          <div className="reviews">
            {list.slice(0, limit).map((r) => (
              <ReviewItem key={r.id} r={r} />
            ))}
          </div>
        ) : (
          <EmptyState compact icon={<Star size={22} />} title="No reviews like that yet." />
        )}
        {list.length > limit && (
          <Button variant="secondary" block onClick={() => setLimit((l) => l + 10)}>
            Show more reviews
          </Button>
        )}
        {list.length > 0 && list.length <= limit && all.length < rating.count && filter === 'all' && <p className="fine center">Showing the {all.length} most recent reviews.</p>}
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------- write a review

function StarInput({ value, onChange, label, size = 30 }: { value: number; onChange: (v: number) => void; label: string; size?: number }) {
  return (
    <div className="starinput" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={`${i} star${i > 1 ? 's' : ''}`} className={cx('starinput__star', i <= value && 'is-on')} onClick={() => onChange(i)}>
          <Star size={size} fill="currentColor" strokeWidth={0} />
        </button>
      ))}
    </div>
  );
}

const WORDS = ['', 'Poor', 'Not great', 'OK', 'Good', 'Excellent'];

export function WriteReviewScreen({ params }: ScreenComponentProps) {
  const s = useApp();
  const f = FACILITY_BY_ID[params.id!];
  const [overall, setOverall] = useState(0);
  const [sub, setSub] = useState<Record<string, number>>({ surface: 0, cleanliness: 0, facilities: 0, value: 0 });
  const [text, setText] = useState('');
  const [uploads, setUploads] = useState<string[]>([]);
  const [tried, setTried] = useState(false);
  const eligible = canReview(s, f.id);
  const lastVisit = s.bookings.filter((b) => b.facilityId === f.id && new Date(b.end).getTime() < Date.now()).sort((a, b) => b.start.localeCompare(a.start))[0];
  const valid = overall > 0 && text.trim().length >= 20;

  if (!eligible) {
    return (
      <Screen title="Write a review">
        <EmptyState icon={<Star size={24} />} title="Play here first" body="Reviews come from people who’ve booked or played at a venue, so ratings stay honest." action={{ label: 'Book a slot', onClick: () => nav.replace('book', { facilityId: f.id }) }} />
      </Screen>
    );
  }

  return (
    <Screen
      title="Write a review"
      subtitle={f.name}
      footer={
        <CtaBar>
          <Button
            block
            size="lg"
            onClick={() => {
              setTried(true);
              if (!valid) return;
              const rating = {
                overall,
                surface: sub.surface || overall,
                cleanliness: sub.cleanliness || overall,
                facilities: sub.facilities || overall,
                value: sub.value || overall,
              };
              submitReview({ facilityId: f.id, rating, text, sport: lastVisit?.sport, uploads });
              nav.pop();
            }}
          >
            Post review
          </Button>
        </CtaBar>
      }
    >
      <div className="pad stack-20">
        {lastVisit && (
          <div className="visit">
            <SportBadge sport={lastVisit.sport} size={36} />
            <span>
              <b>Your visit</b>
              <small>
                {fmtShortDate(lastVisit.start)} · {sportName(lastVisit.sport)}
              </small>
            </span>
          </div>
        )}
        <div className={cx('review-overall', tried && !overall && 'has-error')}>
          <h2>How was it overall?</h2>
          <StarInput value={overall} onChange={setOverall} label="Overall rating" size={38} />
          <span className="review-overall__word">{overall ? WORDS[overall] : 'Tap to rate'}</span>
        </div>
        <div className="subratings">
          {SUB_LABELS.slice(0, 4).map(([k, label]) => (
            <div key={k} className="subrating">
              <span>{label}</span>
              <StarInput value={sub[k]} onChange={(v) => setSub((x) => ({ ...x, [k]: v }))} label={label} size={22} />
            </div>
          ))}
        </div>
        <div className={cx('field', tried && text.trim().length < 20 && 'has-error')}>
          <label className="field__label" htmlFor="review-text">
            Your review
          </label>
          <textarea id="review-text" className="input textarea" rows={5} maxLength={1200} placeholder="What was the surface like? Changing rooms? Would you book again?" value={text} onChange={(e) => setText(e.target.value)} />
          <p className={tried && text.trim().length < 20 ? 'field__error' : 'field__hint'}>{text.trim().length < 20 ? `At least 20 characters (${text.trim().length}/20)` : `${text.length}/1200`}</p>
        </div>
        <div className="field">
          <span className="field__label">
            Photos <span className="field__opt">· optional</span>
          </span>
          <PhotoPicker photos={uploads} onChange={setUploads} max={4} icon={<ImagePlus size={20} />} />
        </div>
        <p className="fine">Reviews are public and show your first name and last initial. Please keep it about the venue, not other players.</p>
      </div>
    </Screen>
  );
}

