import { CalendarDays, Clock, Heart, MapPin, Navigation, Trophy, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { FACILITY_BY_ID, SPACE_BY_ID } from '../data/facilities';
import { levelLabel, sportName } from '../data/sports';
import type { Booking, Facility, Game, SportId, SportsEvent, Tournament, TrainingSession, User } from '../data/types';
import { COACH_BY_ID } from '../data/discover';
import { cx, miles, money, plural } from '../lib/format';
import { fmtDay, fmtRange, fmtShortDate, fmtTime, fmtWhen, weekdayShort } from '../lib/time';
import { availabilityToday, priceRange } from '../services/availability';
import { reliability } from '../services/trust';
import { toggleSaved } from '../state/actions';
import { needsAccount } from './Join';
import { nav } from '../state/nav';
import { availCtx, bookingStatus, distanceTo, facilityDistance, facilityRating, facilitySports, gameTitle, isSaved, joinedPlayers, userById } from '../state/selectors';
import { useApp } from '../state/store';
import { Artwork, sportArt } from './Artwork';
import { SportIcon } from './icons';
import { Avatar, AvatarStack, Pill, PriceDisplay, RatingDisplay } from './ui';

// ---------------------------------------------------------------- sport

export function SportCard({ sport, active, onClick, size = 'md' }: { sport: SportId; active?: boolean; onClick: () => void; size?: 'md' | 'lg' }) {
  return (
    <button type="button" className={cx('sportcard', `sportcard--${size}`, active && 'is-active')} onClick={onClick} aria-pressed={active}>
      <span className={cx('sportcard__icon', `sport-${sport}`)}>
        <SportIcon sport={sport} size={size === 'lg' ? 30 : 26} />
      </span>
      <span className="sportcard__label">{sportName(sport)}</span>
    </button>
  );
}

export function SportBadge({ sport, size = 32 }: { sport: SportId; size?: number }) {
  return (
    <span className={cx('sportbadge', `sport-${sport}`)} style={{ width: size, height: size }} aria-hidden="true">
      <SportIcon sport={sport} size={size * 0.58} />
    </span>
  );
}

// ---------------------------------------------------------------- facility

const AVAIL_TONE = { good: 'success', limited: 'warning', full: 'danger', 'walk-up': 'brand', closed: 'neutral' } as const;

export function AvailabilityTag({ facility, sport, overlay }: { facility: Facility; sport?: SportId; overlay?: boolean }) {
  const s = useApp();
  const a = availabilityToday(facility, availCtx(s), sport);
  return (
    <span className={cx('avail', `avail--${a.level}`, overlay && 'avail--overlay')}>
      <span className="avail__dot" aria-hidden="true" />
      {a.label}
      <span className="sr-only">{` (${AVAIL_TONE[a.level]})`}</span>
    </span>
  );
}

export function SaveButton({ facilityId, variant = 'glass' }: { facilityId: string; variant?: 'glass' | 'plain' }) {
  const s = useApp();
  const saved = isSaved(s, facilityId);
  return (
    <button
      type="button"
      className={cx('savebtn', `savebtn--${variant}`, saved && 'is-saved')}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from saved' : 'Save venue'}
      onClick={(e) => {
        e.stopPropagation();
        if (needsAccount('save')) return;
        toggleSaved(facilityId);
      }}
    >
      <Heart size={18} fill={saved ? 'currentColor' : 'none'} strokeWidth={2.2} />
    </button>
  );
}

export function FacilityCard({ facility: f, variant = 'row', sport, reason }: { facility: Facility; variant?: 'row' | 'wide'; sport?: SportId; reason?: string }) {
  const s = useApp();
  const d = facilityDistance(s, f.id);
  const rating = facilityRating(s, f);
  const sports = facilitySports(f);
  const range = priceRange(f, sport, s);
  const open = () => nav.push('facility', { id: f.id, sport });
  const unit = range.unit === 'session' ? '/session' : '/hr';

  if (variant === 'wide') {
    return (
      <article className="fcard fcard--wide">
        <button type="button" className="fcard__hit" onClick={open} aria-label={`${f.name}, ${miles(d)} away, rated ${rating.overall}`} />
        <div className="fcard__media">
          <Artwork art={f.images[0]} className="fcard__img" />
          <div className="fcard__overlay">
            <AvailabilityTag facility={f} sport={sport} overlay />
          </div>
          <SaveButton facilityId={f.id} />
        </div>
        <div className="fcard__body">
          <h3 className="fcard__name">{f.name}</h3>
          <div className="fcard__meta">
            <span>{sports.slice(0, 3).map(sportName).join(' · ')}</span>
          </div>
          <div className="fcard__foot">
            <span className="fcard__stats">
              <RatingDisplay value={rating.overall} count={rating.count} />
              <span className="dot-sep" aria-hidden="true" />
              <span>{miles(d)}</span>
            </span>
            <PriceDisplay pence={range.min} unit={range.min ? unit : undefined} from={range.min > 0 && range.min !== range.max} size="sm" />
          </div>
          {reason && <div className="fcard__reason">{reason}</div>}
        </div>
      </article>
    );
  }

  return (
    <article className="fcard fcard--row">
      <button type="button" className="fcard__hit" onClick={open} aria-label={`${f.name}, ${miles(d)} away`} />
      <div className="fcard__media">
        <Artwork art={f.images[0]} className="fcard__img" />
      </div>
      <div className="fcard__body">
        <div className="fcard__top">
          <h3 className="fcard__name">{f.name}</h3>
          <SaveButton facilityId={f.id} variant="plain" />
        </div>
        <div className="fcard__meta">
          <span>{f.area}</span>
          <span className="dot-sep" aria-hidden="true" />
          <span>{miles(d)}</span>
          <span className="dot-sep" aria-hidden="true" />
          <RatingDisplay value={rating.overall} count={rating.count} size={12} />
        </div>
        <div className="fcard__sports" aria-label={sports.map(sportName).join(', ')}>
          {sports.slice(0, 4).map((sp) => (
            <span key={sp} className="fcard__sport" title={sportName(sp)}>
              <SportIcon sport={sp} size={14} />
            </span>
          ))}
          <span className="fcard__sportnames">{sports.slice(0, 3).map(sportName).join(', ')}</span>
        </div>
        <div className="fcard__foot">
          <AvailabilityTag facility={f} sport={sport} />
          <PriceDisplay pence={range.min} unit={range.min ? unit : undefined} from={range.min > 0 && range.min !== range.max} size="sm" />
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------- game

export function SpotsBar({ taken, max }: { taken: number; max: number }) {
  const pct = Math.min(100, (taken / max) * 100);
  const left = max - taken;
  return (
    <span className={cx('spots', left <= 2 && left > 0 && 'spots--low', left <= 0 && 'spots--full')} role="img" aria-label={`${taken} of ${max} players`}>
      <span className="spots__track">
        <span className="spots__fill" style={{ width: `${pct}%` }} />
      </span>
    </span>
  );
}

export function GameCard({ game: g, variant = 'row', reasons }: { game: Game; variant?: 'row' | 'wide'; reasons?: string[] }) {
  const s = useApp();
  const f = FACILITY_BY_ID[g.facilityId];
  const players = joinedPlayers(s, g.id);
  const people = players.map((p) => userById(s, p.userId)).filter(Boolean) as User[];
  const d = distanceTo(s, f);
  const left = g.maxPlayers - players.length;
  const title = gameTitle(g);
  const open = () => nav.push('game', { id: g.id });
  const mine = players.some((p) => p.userId === 'me');

  return (
    <article className={cx('gcard', `gcard--${variant}`)}>
      <button type="button" className="gcard__hit" onClick={open} aria-label={`${title}, ${fmtWhen(g.start)}, ${players.length} of ${g.maxPlayers} players`} />
      <div className="gcard__head">
        <SportBadge sport={g.sport} size={variant === 'wide' ? 36 : 40} />
        <div className="gcard__titles">
          <h3 className="gcard__title">{title}</h3>
          <div className="gcard__when">{fmtWhen(g.start)}</div>
        </div>
        {mine ? <Pill tone="success">You’re in</Pill> : left > 0 && left <= 2 ? <Pill tone="warning">{left === 1 ? 'Last spot' : '2 spots left'}</Pill> : null}
      </div>
      <div className="gcard__venue">
        <MapPin size={14} aria-hidden="true" />
        <span className="truncate">{f.name}</span>
        <span className="gcard__dist">{miles(d)}</span>
      </div>
      <div className="gcard__meta">
        <Pill>{levelLabel(g.level)}</Pill>
        {g.visibility === 'private' && <Pill>Private</Pill>}
        {reasons?.filter((r) => r !== 'Last spot' && r !== '2 spots left').slice(0, 1).map((r) => (
          <Pill key={r} tone={r.startsWith('Clashes') ? 'danger' : 'brand'}>
            {r}
          </Pill>
        ))}
      </div>
      <div className="gcard__foot">
        <div className="gcard__players">
          <AvatarStack people={people} max={4} size={24} />
          <span className="gcard__count">
            <b>{players.length}</b>/{g.maxPlayers} players
          </span>
        </div>
        <span className="gcard__price">{g.pricePerPlayer ? `${money(g.pricePerPlayer)} each` : 'Free'}</span>
      </div>
      <SpotsBar taken={players.length} max={g.maxPlayers} />
    </article>
  );
}

// ---------------------------------------------------------------- events & competitions

const EVENT_KIND: Record<SportsEvent['kind'], string> = {
  tournament: 'Tournament',
  training: 'Taster session',
  competition: 'Competition',
  camp: 'Sports camp',
  community: 'Community',
  'sporting-event': 'Sporting event',
};

export function EventCard({ event: e }: { event: SportsEvent }) {
  const s = useApp();
  const f = FACILITY_BY_ID[e.facilityId];
  const left = e.capacity - e.taken;
  return (
    <article className="ecard">
      <button type="button" className="ecard__hit" onClick={() => nav.push('event', { id: e.id })} aria-label={e.title} />
      <div className="ecard__date" aria-hidden="true">
        <span>{weekdayShort(new Date(e.start))}</span>
        <b>{new Date(e.start).getDate()}</b>
      </div>
      <div className="ecard__body">
        <div className="eyebrow">{EVENT_KIND[e.kind]}</div>
        <h3 className="ecard__title">{e.title}</h3>
        <div className="ecard__meta">
          <span>
            {fmtDay(e.start)} · {fmtTime(e.start)}
          </span>
          <span className="dot-sep" aria-hidden="true" />
          <span>
            {f.area} · {miles(distanceTo(s, f))}
          </span>
        </div>
        <div className="ecard__foot">
          <PriceDisplay pence={e.price} size="sm" />
          <span className={cx('ecard__left', left <= 5 && 'is-low')}>{left > 0 ? `${left} places left` : 'Full'}</span>
        </div>
      </div>
      <SportBadge sport={e.sport} size={34} />
    </article>
  );
}

export function TournamentCard({ t, variant = 'wide' }: { t: Tournament; variant?: 'wide' | 'row' }) {
  const s = useApp();
  const f = FACILITY_BY_ID[t.facilityId];
  const registered = s.registrations.some((r) => r.targetId === t.id && r.status === 'confirmed');
  const status = registered ? (
    <Pill tone="success">Registered</Pill>
  ) : t.registration === 'closed' || t.entries >= t.maxEntries ? (
    <Pill>Full</Pill>
  ) : t.registration === 'external' ? (
    <Pill>Via organiser</Pill>
  ) : (
    <Pill tone="brand">Open</Pill>
  );
  return (
    <article className={cx('tcard', `tcard--${variant}`)}>
      <button type="button" className="tcard__hit" onClick={() => nav.push('tournament', { id: t.id })} aria-label={t.name} />
      <div className="tcard__media">
        <Artwork art={sportArt(t.sport, Number(t.id.slice(1)) * 17, 'night')} className="tcard__img" />
        <div className="tcard__badge">
          <Trophy size={14} aria-hidden="true" /> {sportName(t.sport)}
        </div>
      </div>
      <div className="tcard__body">
        <div className="tcard__top">
          <h3 className="tcard__name">{t.name}</h3>
          {status}
        </div>
        <div className="tcard__meta">
          <span>
            <CalendarDays size={14} aria-hidden="true" /> {fmtDay(t.start, { tonight: false })}, {fmtShortDate(t.start)}
          </span>
          <span>
            <MapPin size={14} aria-hidden="true" /> {f.name}
          </span>
        </div>
        <div className="tcard__foot">
          <span className="tcard__entries">
            <Users size={14} aria-hidden="true" /> {t.entries}/{t.maxEntries} {t.teamSize > 1 ? 'teams' : 'players'}
          </span>
          <span className="tcard__fee">
            {money(t.entryFee)} <small>per {t.entryUnit}</small>
          </span>
        </div>
        <div className="tcard__level">{levelLabel(t.level)}</div>
      </div>
    </article>
  );
}

export function TrainingCard({ session: t }: { session: TrainingSession }) {
  const s = useApp();
  const c = COACH_BY_ID[t.coachId];
  const f = FACILITY_BY_ID[t.facilityId];
  const left = t.capacity - t.taken;
  return (
    <article className="trcard">
      <button type="button" className="trcard__hit" onClick={() => nav.push('session', { id: t.id })} aria-label={t.title} />
      <SportBadge sport={t.sport} size={44} />
      <div className="trcard__body">
        <h3 className="trcard__title">{t.title}</h3>
        <div className="trcard__coach">
          <Avatar name={c.name} color={c.color} size={20} /> {c.name}
          <RatingDisplay value={t.rating} size={12} />
        </div>
        <div className="trcard__meta">
          <span>
            <Clock size={13} aria-hidden="true" /> {fmtDay(t.start)} · {fmtTime(t.start)}
          </span>
          <span>
            <MapPin size={13} aria-hidden="true" /> {f.area} · {miles(distanceTo(s, f))}
          </span>
        </div>
      </div>
      <div className="trcard__side">
        <PriceDisplay pence={t.price} size="sm" />
        <span className={cx('trcard__left', left <= 2 && 'is-low')}>{left > 0 ? `${left} left` : 'Full'}</span>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------- people

export function ReliabilityBadge({ user, compact }: { user: User; compact?: boolean }) {
  const r = reliability(user.attendance);
  return (
    <span className={cx('rel', `rel--${r.tier}`, compact && 'rel--compact')} title="Reliability is based on attendance confirmed by organisers and venues">
      <span className="rel__dot" aria-hidden="true" />
      {r.score !== null ? `${r.score}%` : ''} {compact && r.score !== null ? '' : r.label}
    </span>
  );
}

export function PlayerCard({ user, trailing, onClick, sub }: { user: User; trailing?: ReactNode; onClick?: () => void; sub?: ReactNode }) {
  const main = user.sports[0];
  return (
    <div className={cx('pcard', onClick && 'pcard--btn')}>
      {onClick && <button type="button" className="pcard__hit" onClick={onClick} aria-label={`View ${user.name}`} />}
      <Avatar name={user.name} color={user.color} photo={user.photo} size={44} />
      <div className="pcard__body">
        <div className="pcard__name">{user.name}</div>
        <div className="pcard__sub">
          {sub ?? (
            <>
              {main ? `${sportName(main.sport)} · ${levelLabel(main.level)}` : `@${user.username}`}
              <span className="dot-sep" aria-hidden="true" />
              <ReliabilityBadge user={user} compact />
            </>
          )}
        </div>
      </div>
      {trailing && <div className="pcard__trail">{trailing}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- bookings

export function BookingCard({ booking: b, onCancel, onDirections }: { booking: Booking; onCancel?: () => void; onDirections?: () => void }) {
  const f = FACILITY_BY_ID[b.facilityId];
  const space = SPACE_BY_ID[b.spaceId];
  const status = bookingStatus(b);
  const paidShares = b.split?.filter((x) => x.status === 'paid').length ?? 0;
  const open = () => nav.push('booking', { id: b.id });
  return (
    <article className={cx('bcard', `bcard--${status}`)}>
      <button type="button" className="bcard__hit" onClick={open} aria-label={`${space.name} at ${f.name}, ${fmtWhen(b.start)}`} />
      <div className="bcard__top">
        <div className="bcard__media">
          <Artwork art={f.images[0]} className="bcard__img" />
        </div>
        <div className="bcard__body">
          <div className="bcard__status">
            <SportIcon sport={b.sport} size={14} /> {sportName(b.sport)}
            {status === 'cancelled' && <Pill tone="danger">Cancelled</Pill>}
            {status === 'completed' && <Pill>Completed</Pill>}
            {status === 'confirmed' && <Pill tone="success">Confirmed</Pill>}
          </div>
          <h3 className="bcard__venue">{f.name}</h3>
          <div className="bcard__when">
            {fmtDay(b.start)} · {fmtRange(b.start, b.end)}
          </div>
          <div className="bcard__meta">
            <span>{space.name}</span>
            <span className="dot-sep" aria-hidden="true" />
            <span>
              <Users size={13} aria-hidden="true" /> {plural(b.players, space.unit === 'session' ? 'person' : 'player', space.unit === 'session' ? 'people' : 'players')}
            </span>
            <span className="dot-sep" aria-hidden="true" />
            <span>{money(b.total, { free: false })}</span>
          </div>
          {b.split && status === 'confirmed' && (
            <div className="bcard__split">
              {paidShares}/{b.split.length} paid their share
            </div>
          )}
        </div>
      </div>
      {status === 'confirmed' && (onCancel || onDirections) && (
        <div className="bcard__actions">
          <button type="button" className="bcard__btn" onClick={open}>
            View
          </button>
          {onDirections && (
            <button type="button" className="bcard__btn" onClick={onDirections}>
              <Navigation size={15} aria-hidden="true" /> Directions
            </button>
          )}
          {onCancel && (
            <button type="button" className="bcard__btn bcard__btn--danger" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      )}
    </article>
  );
}
