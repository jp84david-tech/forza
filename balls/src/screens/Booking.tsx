import { AlertTriangle, BellRing, CalendarClock, CalendarPlus, Check, CheckCircle2, ChevronRight, Clock, Copy, Hourglass, Info, MapPin, MessageCircle, RefreshCw, Receipt, Share2, Star, TrendingUp, Undo2, UserPlus, Users, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Artwork } from '../components/Artwork';
import { AvailabilityCalendar } from '../components/AvailabilityCalendar';
import { BookingCard, GameCard, SportBadge } from '../components/cards';
import { SportIcon } from '../components/icons';
import { joinLayer, needsAccount } from '../components/Join';
import { SheetBody, SheetFooter, SheetHeader } from '../components/Sheet';
import { DirectionsButton, openDirections, openInvite, openLogResult, openShare, PaymentMethodSelect } from '../components/sheets';
import { Avatar, Button, Chip, CtaBar, EmptyState, IconButton, Pill, Row, Screen, Section, Segmented, Stepper, Switch } from '../components/ui';
import { FACILITY_BY_ID, POLICY_BY_ID, SPACE_BY_ID, spacesFor } from '../data/facilities';
import { sportName } from '../data/sports';
import type { Booking, SportId } from '../data/types';
import { cx, money, moneyExact, plural } from '../lib/format';
import { addDays, fmtCountdown, fmtDay, fmtDuration, fmtLongDate, fmtRange, fmtShortDate, fmtTime, startOfDay } from '../lib/time';
import { directionsUrl, openExternal } from '../lib/geo';
import { analytics } from '../services/analytics';
import { hoursOn, type Slot, unavailableReason } from '../services/availability';
import { methodLabel, refundQuote } from '../services/payments';
import { cancelBooking, createBooking, inviteToBooking, joinWaitlist, leaveWaitlist, quoteBooking, remindShare } from '../state/actions';
import { nav } from '../state/nav';
import { availCtx, bookingStatus, gameById, joinedPlayers, pastActivity, upcoming } from '../state/selectors';
import { getState, useApp } from '../state/store';
import { ui } from '../state/ui';
import type { ScreenComponentProps } from './routes';
import { SPORT_BY_ID } from '../data/sports';

// ---------------------------------------------------------------- waitlist sheet

function openWaitlist(spaceId: string, slot: Slot, duration: number) {
  const space = SPACE_BY_ID[spaceId];
  const f = FACILITY_BY_ID[space.facilityId];
  ui.open('Fully booked', (close) => (
    <>
      <SheetHeader title={`${fmtTime(slot.start)} is fully booked`} subtitle={`${space.name} · ${f.name} · ${fmtDay(slot.start)}`} onClose={close} />
      <SheetBody>
        <div className="waitlist-explain">
          <span className="waitlist-explain__icon">
            <BellRing size={22} />
          </span>
          <div>
            <b>Join the waitlist</b>
            <p>If someone cancels, we’ll notify you straight away and hold the slot for you for 15 minutes. You only pay if you book it.</p>
          </div>
        </div>
      </SheetBody>
      <SheetFooter>
        <div className="btn-pair">
          <Button variant="secondary" onClick={close}>
            Pick another time
          </Button>
          <Button
            onClick={() => {
              close();
              if (needsAccount('waitlist')) return;
              joinWaitlist(spaceId, slot.start, duration);
            }}
          >
            Join waitlist
          </Button>
        </div>
      </SheetFooter>
    </>
  ));
}

// ---------------------------------------------------------------- book: choose space, date, time

export function BookScreen({ params }: ScreenComponentProps) {
  const s = useApp();
  const f = FACILITY_BY_ID[params.facilityId!];
  const all = spacesFor(f.id).filter((x) => !x.walkUp);
  const sports = [...new Set(all.map((x) => x.sport))];
  const initialSpace = params.spaceId ? SPACE_BY_ID[params.spaceId] : undefined;
  const [sport, setSport] = useState<SportId>(initialSpace?.sport ?? ((params.sport as SportId) && sports.includes(params.sport as SportId) ? (params.sport as SportId) : sports[0]));
  const [spaceId, setSpaceId] = useState<string>(initialSpace?.id ?? all.find((x) => x.sport === sport)!.id);
  const space = SPACE_BY_ID[spaceId];
  const durations = space.unit === 'session' ? [60] : f.rules.durations;
  const [duration, setDuration] = useState<number>(Number(params.duration) || (durations.includes(s.prefs.defaultDuration) ? s.prefs.defaultDuration : durations[0]));
  const [people, setPeople] = useState(1);
  const startParam = params.start ? new Date(params.start) : null;
  const firstDay = () => {
    if (startParam) return startOfDay(startParam);
    const h = hoursOn(f, new Date());
    return !h || new Date().getHours() >= h[1] - 1 ? addDays(startOfDay(), 1) : startOfDay();
  };
  const [day, setDay] = useState<Date>(firstDay);
  const [selected, setSelected] = useState<string | null>(params.start ?? null);
  const [notice, setNotice] = useState<string | null>(null);
  const ctx = availCtx(s);

  useEffect(() => {
    analytics.track('booking_started', { facility: f.id, step: 'choose' });
  }, [f.id]);

  // If a change makes the chosen time unbookable, clear it and say why.
  useEffect(() => {
    if (!selected) return;
    const reason = unavailableReason(space, new Date(selected), duration, ctx, people);
    if (reason) {
      setSelected(null);
      setNotice(`${fmtTime(selected)} isn’t free for ${fmtDuration(duration)}. Pick another time.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId, duration, people, ctx]);

  const sel = selected ? new Date(selected) : null;
  const q = sel ? quoteBooking({ spaceId, start: selected!, durationMins: duration, players: people, split: false }) : null;
  const sportSpaces = all.filter((x) => x.sport === sport);

  return (
    <Screen
      title="Book"
      subtitle={f.name}
      footer={
        <CtaBar
          label={sel ? `${space.name} · ${fmtDay(sel)} ${fmtRange(sel, new Date(sel.getTime() + duration * 60_000))}` : 'Pick a time'}
          sub={q ? `${moneyExact(q.subtotal)}${space.unit === 'session' ? ` for ${plural(people, 'person', 'people')}` : ` for ${fmtDuration(duration)}`}` : 'Green slots are free to book'}
        >
          <Button size="lg" disabled={!sel} onClick={() => !needsAccount('book') && nav.push('checkout', { spaceId, start: selected!, duration: String(duration), people: String(people) })}>
            Continue
          </Button>
        </CtaBar>
      }
    >
      <div className="pad stack-24">
        {sports.length > 1 && (
          <div className="bstep">
            <h2 className="bstep__title">Sport</h2>
            <div className="chip-row">
              {sports.map((sp) => (
                <Chip
                  key={sp}
                  active={sport === sp}
                  icon={<SportIcon sport={sp} size={15} />}
                  onClick={() => {
                    setSport(sp);
                    setSpaceId(all.find((x) => x.sport === sp)!.id);
                    setSelected(null);
                  }}
                >
                  {sportName(sp)}
                </Chip>
              ))}
            </div>
          </div>
        )}

        <div className="bstep">
          <h2 className="bstep__title">{SPORT_BY_ID[sport].space === 'session' || space.unit === 'session' ? 'Session' : `Choose a ${SPORT_BY_ID[sport].space}`}</h2>
          <div className="space-pick" role="radiogroup" aria-label="Space">
            {sportSpaces.map((sp) => (
              <button key={sp.id} type="button" role="radio" aria-checked={sp.id === spaceId} className={cx('space-opt', sp.id === spaceId && 'is-on')} onClick={() => setSpaceId(sp.id)}>
                <b>{sp.name}</b>
                <small>{Object.values(sp.attrs).slice(0, 2).join(' · ')}</small>
                {sp.id === spaceId && <Check size={16} className="space-opt__tick" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>

        {space.unit === 'session' ? (
          <div className="bstep bstep--row">
            <div>
              <h2 className="bstep__title">People</h2>
              <p className="fine">Each person needs a place in the session.</p>
            </div>
            <Stepper value={people} min={1} max={6} onChange={setPeople} label="People" />
          </div>
        ) : (
          durations.length > 1 && (
            <div className="bstep">
              <h2 className="bstep__title">Duration</h2>
              <Segmented
                label="Duration"
                value={String(duration)}
                onChange={(v) => {
                  setNotice(null);
                  setDuration(Number(v));
                }}
                options={durations.map((d) => ({ value: String(d), label: fmtDuration(d) }))}
              />
            </div>
          )
        )}

        <div className="bstep">
          <h2 className="bstep__title">Date & time</h2>
          {notice && (
            <p className="notice" role="status">
              <Info size={15} /> {notice}
            </p>
          )}
          <AvailabilityCalendar
            space={space}
            day={day}
            onDayChange={(d) => {
              setDay(d);
              setSelected(null);
              setNotice(null);
            }}
            duration={duration}
            people={people}
            selected={selected}
            onSelect={(x) => {
              setNotice(null);
              setSelected(x.start.toISOString());
            }}
            onFull={(x) => openWaitlist(spaceId, x, duration)}
            ctx={ctx}
          />
        </div>
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------- checkout: review & pay

export function CheckoutScreen({ params }: ScreenComponentProps) {
  const s = useApp();
  const space = SPACE_BY_ID[params.spaceId!];
  const f = FACILITY_BY_ID[space.facilityId];
  const start = new Date(params.start!);
  const duration = Number(params.duration);
  const people = Number(params.people ?? 1);
  const isSession = space.unit === 'session';
  const canSplit = !isSession || people > 1;
  const [split, setSplit] = useState(canSplit && s.prefs.splitByDefault && !isSession);
  const [players, setPlayers] = useState(isSession ? people : Math.min(space.capacity, SPORT_BY_ID[space.sport].formats.find((x) => x.label === space.attrs.format)?.players ?? space.capacity));
  const [method, setMethod] = useState<string | undefined>(s.paymentMethods.find((m) => m.isDefault)?.id ?? s.paymentMethods[0]?.id);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<{ msg: string; taken?: boolean } | null>(null);
  const policy = POLICY_BY_ID[f.cancellationPolicyId];
  const q = quoteBooking({ spaceId: space.id, start: start.toISOString(), durationMins: duration, players: isSession ? people : players, split });
  const end = new Date(start.getTime() + duration * 60_000);
  const refund = refundQuote({ start: start.toISOString(), total: q.total }, policy);
  const m = s.paymentMethods.find((x) => x.id === method);

  const pay = async () => {
    if (!method) {
      setError({ msg: 'Add a payment method to continue.' });
      return;
    }
    setError(null);
    setPaying(true);
    const res = await createBooking({ spaceId: space.id, start: start.toISOString(), durationMins: duration, players: isSession ? people : split ? players : 1, split, methodId: method });
    setPaying(false);
    if (!res.ok) {
      setError({ msg: res.error, taken: res.taken });
      return;
    }
    nav.finishFlow(['book', 'checkout'], { name: 'bookingConfirmed', params: { id: res.booking.id } });
  };

  return (
    <Screen
      title="Review and pay"
      footer={
        <CtaBar label={<span className="cta-price">{moneyExact(q.total)}</span>} sub={split && q.shares ? `${moneyExact(q.shares[0])} each when split ${players} ways` : 'Total to pay now'}>
          <Button size="lg" loading={paying} onClick={pay} disabled={!method}>
            {paying ? 'Securing slot…' : `Book for ${money(q.total, { free: false })}`}
          </Button>
        </CtaBar>
      }
    >
      <div className="pad stack-20">
        <div className="summary">
          <div className="summary__art">
            <Artwork art={f.images[0]} />
          </div>
          <div className="summary__body">
            <div className="eyebrow">
              <SportIcon sport={space.sport} size={13} /> {sportName(space.sport)}
            </div>
            <h2>{space.name}</h2>
            <p>{f.name}</p>
          </div>
        </div>
        <div className="kv">
          <div>
            <span>Date</span>
            <b>{fmtLongDate(start)}</b>
          </div>
          <div>
            <span>Time</span>
            <b>{fmtRange(start, end)}</b>
          </div>
          <div>
            <span>{isSession ? 'People' : 'Duration'}</span>
            <b>{isSession ? plural(people, 'person', 'people') : fmtDuration(duration)}</b>
          </div>
        </div>

        {canSplit && (
          <section className="splitbox" aria-labelledby="split-title">
            <div className="splitbox__head">
              <div>
                <h2 id="split-title">Split the cost</h2>
                <p>Everyone pays their share through BALLS. We track who’s paid.</p>
              </div>
              <Switch checked={split} onChange={setSplit} label="Split the cost" />
            </div>
            {split && (
              <>
                {!isSession && (
                  <div className="splitbox__players">
                    <span>Players</span>
                    <Stepper value={players} min={2} max={space.capacity} onChange={setPlayers} label="Players" />
                  </div>
                )}
                <div className="split-tiles" aria-live="polite">
                  <div>
                    <span>Total</span>
                    <b>{moneyExact(q.total)}</b>
                  </div>
                  <div className="split-tiles__op" aria-hidden="true">
                    ÷
                  </div>
                  <div>
                    <span>Players</span>
                    <b>{isSession ? people : players}</b>
                  </div>
                  <div className="split-tiles__op" aria-hidden="true">
                    =
                  </div>
                  <div className="split-tiles__hl">
                    <span>Per person</span>
                    <b>{moneyExact(q.shares?.[0] ?? q.total)}</b>
                  </div>
                </div>
                <p className="fine">
                  You pay {moneyExact(q.total)} now to secure the slot. When the other {(isSession ? people : players) - 1} pay their share, you get {moneyExact(q.total - (q.shares?.[0] ?? 0))} back.
                  {q.shares && q.shares[0] !== q.shares[q.shares.length - 1] ? ' Some shares are 1p higher so it adds up exactly.' : ''}
                </p>
              </>
            )}
          </section>
        )}

        <section className="breakdown" aria-label="Price breakdown">
          <div>
            <span>
              {isSession ? `${space.name} × ${people}` : `${space.name} · ${fmtDuration(duration)}`}
            </span>
            <span>{moneyExact(q.subtotal)}</span>
          </div>
          <div>
            <span>
              Booking fee
              {q.fee === 0 && <small> · none at partner venues</small>}
            </span>
            <span>{q.fee ? moneyExact(q.fee) : '£0.00'}</span>
          </div>
          <div className="breakdown__total">
            <span>Total</span>
            <span>{moneyExact(q.total)}</span>
          </div>
        </section>

        <div className="field">
          <span className="field__label">Pay with</span>
          <PaymentMethodSelect value={method} onChange={setMethod} />
        </div>

        <div className="policy">
          <CalendarClock size={18} aria-hidden="true" />
          <div>
            <b>{policy.summary}</b>
            <p>{refund.deadline ? `Cancel before ${fmtDay(refund.deadline, { tonight: false })} ${fmtTime(refund.deadline)} for a full refund.` : refund.message}</p>
          </div>
        </div>

        {error && (
          <div className="alert alert--danger" role="alert">
            <AlertTriangle size={18} />
            <div>
              <b>{error.taken ? 'That slot has gone' : 'Payment didn’t go through'}</b>
              <p>{error.msg}</p>
              {error.taken ? (
                <Button size="sm" variant="secondary" onClick={() => nav.pop()}>
                  Pick another time
                </Button>
              ) : (
                <Button size="sm" variant="secondary" icon={<RefreshCw size={15} />} onClick={pay}>
                  Try again
                </Button>
              )}
            </div>
          </div>
        )}
        <p className="fine center">
          By booking you agree to {f.name}’s booking rules. {m ? `Charged to ${methodLabel(m)}.` : ''}
        </p>
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------- confirmation

export function BookingConfirmedScreen({ params }: ScreenComponentProps) {
  const s = useApp();
  const b = s.bookings.find((x) => x.id === params.id);
  if (!b) return <Screen title="Booking">{null}</Screen>;
  const f = FACILITY_BY_ID[b.facilityId];
  const space = SPACE_BY_ID[b.spaceId];
  const open = b.split?.filter((x) => !x.userId).length ?? 0;
  return (
    <Screen header="none">
      <div className="confirm">
        <div className="confirm__burst" aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => (
            <i key={i} style={{ ['--a' as string]: `${i * 30}deg` }} />
          ))}
          <span className="confirm__check">
            <Check size={44} strokeWidth={3} />
          </span>
        </div>
        <div className="eyebrow">Booking confirmed</div>
        <h1 className="confirm__title">You’re booked in.</h1>
        <ul className="confirm__list">
          <li>
            <Check size={16} strokeWidth={3} /> {f.name}
          </li>
          <li>
            <Check size={16} strokeWidth={3} /> {fmtDay(b.start)} {fmtRange(b.start, b.end)}
          </li>
          <li>
            <Check size={16} strokeWidth={3} /> {space.name}
          </li>
          <li>
            <Check size={16} strokeWidth={3} /> {moneyExact(b.total)} paid
            {b.split ? ` · ${moneyExact(b.split[0].amount)} each` : ''}
          </li>
        </ul>
        <div className="confirm__ref">
          Booking code <b>{b.ref}</b>
        </div>
        <div className="confirm__actions">
          <Button size="lg" block onClick={() => nav.go('bookings', 'booking', { id: b.id })}>
            View booking
          </Button>
          <DirectionsButton f={f} variant="secondary" size="lg" block label="Get directions" />
        </div>
        {b.split && open > 0 && (
          <div className="confirm__next">
            <b>Next: collect everyone’s share</b>
            <p>
              Send a payment request to {open} {open === 1 ? 'player' : 'players'}, or make it a public game so people nearby can join.
            </p>
            <div className="btn-pair">
              <Button
                variant="secondary"
                icon={<UserPlus size={16} />}
                onClick={() =>
                  openInvite({
                    title: 'Invite players to pay',
                    subtitle: `${moneyExact(b.split![1].amount)} each`,
                    sport: b.sport,
                    onSend: (ids) => inviteToBooking(b.id, ids),
                    share: { text: `I’ve booked ${space.name} at ${f.name}, ${fmtDay(b.start)} ${fmtTime(b.start)}. Your share is ${moneyExact(b.split![1].amount)}. Pay on BALLS:`, path: `b/${b.ref}` },
                  })
                }
              >
                Invite players
              </Button>
              <Button variant="secondary" icon={<Users size={16} />} onClick={() => nav.push('createGame', { bookingId: b.id })}>
                Find players
              </Button>
            </div>
          </div>
        )}
        <button type="button" className="link" onClick={() => nav.pop()}>
          Done
        </button>
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------- cancel

function CancelSheet({ b, close }: { b: Booking; close: () => void }) {
  const s = useApp();
  const f = FACILITY_BY_ID[b.facilityId];
  const policy = POLICY_BY_ID[f.cancellationPolicyId];
  const q = refundQuote(b, policy);
  const pay = s.payments.find((p) => p.id === b.paymentId);
  const m = s.paymentMethods.find((x) => x.id === pay?.methodId);
  const game = b.gameId ? gameById(s, b.gameId) : undefined;
  const others = game ? joinedPlayers(s, game.id).filter((p) => p.userId !== 'me').length : 0;
  const paidOthers = b.split?.filter((x) => !x.organiser && x.status === 'paid').length ?? 0;
  const late = new Date(b.start).getTime() - Date.now() < 24 * 3600_000;
  return (
    <>
      <SheetHeader title="Cancel booking?" subtitle={`${SPACE_BY_ID[b.spaceId].name} · ${fmtDay(b.start)} ${fmtTime(b.start)}`} onClose={close} />
      <SheetBody>
        <div className="policy">
          <CalendarClock size={18} aria-hidden="true" />
          <div>
            <b>{policy.name} cancellation policy</b>
            <p>{policy.summary}</p>
          </div>
        </div>
        <div className={cx('refund', q.amount > 0 ? 'refund--yes' : 'refund--no')}>
          <span className="refund__label">{q.amount > 0 ? 'Your refund' : 'No refund'}</span>
          <b className="refund__amount">{moneyExact(q.amount)}</b>
          <p>{q.amount > 0 ? `${q.message} It goes back to ${m ? methodLabel(m) : 'your card'} within 3–5 working days.` : q.message}</p>
        </div>
        {game && others > 0 && (
          <p className="notice">
            <Users size={16} /> Your game has {plural(others, 'other player')}. We’ll cancel it and tell them.{paidOthers ? ` ${plural(paidOthers, 'player')} who paid their share will be refunded automatically.` : ''}
          </p>
        )}
        {game && late && (
          <p className="notice notice--warn">
            <TrendingUp size={16} /> Cancelling a game less than 24 hours before counts as a late cancellation on your reliability.
          </p>
        )}
      </SheetBody>
      <SheetFooter>
        <div className="btn-pair">
          <Button variant="secondary" onClick={close}>
            Keep booking
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              cancelBooking(b.id);
              close();
              ui.toast(q.amount > 0 ? `Booking cancelled. ${moneyExact(q.amount)} refund on its way.` : 'Booking cancelled.', { tone: 'success' });
            }}
          >
            Cancel booking
          </Button>
        </div>
      </SheetFooter>
    </>
  );
}

export function openCancel(b: Booking) {
  ui.open('Cancel booking', (close) => <CancelSheet b={b} close={close} />);
}

// ---------------------------------------------------------------- booking detail

export function BookingDetailScreen({ params }: ScreenComponentProps) {
  const s = useApp();
  const b = s.bookings.find((x) => x.id === params.id);
  if (!b) {
    return (
      <Screen title="Booking">
        <EmptyState icon={<CalendarPlus size={24} />} title="Booking not found" body="It may have been removed." action={{ label: 'Back to bookings', onClick: () => nav.pop() }} />
      </Screen>
    );
  }
  const f = FACILITY_BY_ID[b.facilityId];
  const space = SPACE_BY_ID[b.spaceId];
  const status = bookingStatus(b);
  const pay = s.payments.find((p) => p.id === b.paymentId);
  const m = s.paymentMethods.find((x) => x.id === pay?.methodId);
  const policy = POLICY_BY_ID[f.cancellationPolicyId];
  const q = refundQuote(b, policy);
  const game = b.gameId ? gameById(s, b.gameId) : undefined;
  const collected = b.split?.filter((x) => x.status === 'paid').reduce((t, x) => t + x.amount, 0) ?? b.total;
  const reviewed = s.reviews.some((r) => r.facilityId === f.id);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(b.ref);
      ui.toast('Booking code copied', { tone: 'success' });
    } catch {
      ui.toast(`Your booking code is ${b.ref}`);
    }
  };

  return (
    <Screen
      title="Booking"
      actions={
        status === 'confirmed' ? (
          <IconButton label="Share booking" onClick={() => openShare({ title: 'Share booking', text: `${space.name} at ${f.name}, ${fmtDay(b.start)} ${fmtRange(b.start, b.end)}.`, path: `b/${b.ref}` })}>
            <Share2 size={20} />
          </IconButton>
        ) : undefined
      }
    >
      <div className="pad stack-20">
        <div className="bhero">
          <div className="bhero__art">
            <Artwork art={f.images[0]} />
          </div>
          <div className="bhero__body">
            {status === 'confirmed' && <Pill tone="success" icon={<CheckCircle2 size={13} />}>Confirmed</Pill>}
            {status === 'completed' && <Pill icon={<Check size={13} />}>Completed</Pill>}
            {status === 'cancelled' && <Pill tone="danger" icon={<X size={13} />}>Cancelled</Pill>}
            <h1>{space.name}</h1>
            <button type="button" className="bhero__venue" onClick={() => nav.push('facility', { id: f.id })}>
              {f.name} <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {status === 'confirmed' && (
          <div className="countdown">
            <Clock size={16} /> {new Date(b.start).getTime() <= Date.now() ? 'Happening now' : `Starts in ${fmtCountdown(b.start)}`}
          </div>
        )}

        <div className="kv kv--stack">
          <div>
            <span>Date</span>
            <b>{fmtLongDate(b.start)}</b>
          </div>
          <div>
            <span>Time</span>
            <b>{fmtRange(b.start, b.end)}</b>
          </div>
          <div>
            <span>Sport</span>
            <b>
              {sportName(b.sport)}
              {space.attrs.format ? ` · ${space.attrs.format}` : ''}
            </b>
          </div>
          <div>
            <span>Where</span>
            <b>
              {f.address}, {f.postcode}
            </b>
          </div>
        </div>

        {status !== 'cancelled' && (
          <button type="button" className="checkin" onClick={copy}>
            <span>
              <small>Check-in code</small>
              <b>{b.ref}</b>
            </span>
            <span className="checkin__hint">
              <Copy size={15} /> Show at reception
            </span>
          </button>
        )}

        {b.split && (
          <Section title="Players & payments">
            <div className="collect">
              <div className="collect__head">
                <b>
                  {moneyExact(collected)} of {moneyExact(b.total)} collected
                </b>
                <span>
                  {b.split.filter((x) => x.status === 'paid').length}/{b.split.length} paid
                </span>
              </div>
              <div className="collect__bar">
                <span style={{ width: `${(collected / b.total) * 100}%` }} />
              </div>
            </div>
            <ul className="shares">
              {b.split.map((sh) => {
                const u = sh.userId ? (sh.userId === 'me' ? { name: 'You', color: s.account?.color ?? '#3d5a4a', photo: s.account?.photo } : { name: sh.name, color: '#4E5670' }) : null;
                return (
                  <li key={sh.id} className="share">
                    {u ? <Avatar name={u.name} color={u.color} photo={'photo' in u ? u.photo : undefined} size={36} /> : <span className="share__open" aria-hidden="true"><UserPlus size={16} /></span>}
                    <span className="share__who">
                      <b>{sh.organiser ? 'You (organiser)' : sh.userId ? sh.name : 'Open spot'}</b>
                      <small>{moneyExact(sh.amount)}</small>
                    </span>
                    {sh.status === 'paid' ? (
                      <Pill tone="success" icon={<Check size={12} strokeWidth={3} />}>
                        Paid
                      </Pill>
                    ) : sh.userId ? (
                      <span className="share__pending">
                        <Pill tone="warning" icon={<Hourglass size={12} />}>
                          Pending
                        </Pill>
                        {status === 'confirmed' && (
                          <button type="button" className="link link--sm" onClick={() => remindShare(sh.name)}>
                            Remind
                          </button>
                        )}
                      </span>
                    ) : status === 'confirmed' ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          openInvite({
                            title: 'Invite players to pay',
                            subtitle: `${moneyExact(sh.amount)} each`,
                            sport: b.sport,
                            exclude: b.split!.map((x) => x.userId ?? ''),
                            onSend: (ids) => inviteToBooking(b.id, ids),
                            share: { text: `Join me at ${f.name}, ${fmtDay(b.start)} ${fmtTime(b.start)}. Your share is ${moneyExact(sh.amount)}:`, path: `b/${b.ref}` },
                          })
                        }
                      >
                        Invite
                      </Button>
                    ) : (
                      <Pill>Unfilled</Pill>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="fine">A share only shows as paid once the payment has cleared.</p>
          </Section>
        )}

        {status === 'confirmed' &&
          (game ? (
            <Row icon={<MessageCircle size={18} />} title="Game page & chat" subtitle={`${joinedPlayers(s, game.id).length}/${game.maxPlayers} players · ${game.visibility === 'public' ? 'Public' : 'Private'} game`} onClick={() => nav.push('game', { id: game.id })} className="card-row" />
          ) : (
            <Row icon={<Users size={18} />} title="Need more players?" subtitle="Turn this booking into a game people nearby can join" onClick={() => nav.push('createGame', { bookingId: b.id })} className="card-row" />
          ))}

        <Section title="Payment">
          <div className="payline">
            <Receipt size={18} aria-hidden="true" />
            <div>
              <b>
                {moneyExact(b.total)} paid{m ? ` with ${methodLabel(m)}` : ''}
              </b>
              <small>
                {fmtShortDate(b.createdAt)} · {moneyExact(b.subtotal)} {space.unit === 'session' ? 'entry' : 'hire'}
                {b.fee ? ` + ${moneyExact(b.fee)} booking fee` : ''}
              </small>
            </div>
          </div>
          {b.cancellation && (
            <ol className="timeline">
              <li className="is-done">
                <b>Cancelled</b>
                <small>{fmtShortDate(b.cancellation.at)}</small>
              </li>
              {b.cancellation.refund > 0 ? (
                <>
                  <li className="is-done">
                    <b>Refund of {moneyExact(b.cancellation.refund)} started</b>
                    <small>Back to {m ? methodLabel(m) : 'your card'}</small>
                  </li>
                  <li className={cx(b.cancellation.refundState === 'refunded' && 'is-done')}>
                    <b>{b.cancellation.refundState === 'refunded' ? 'Refund sent' : 'Refund processing'}</b>
                    <small>{b.cancellation.refundState === 'refunded' ? 'Can take 3–5 working days to show' : 'Usually within a few minutes'}</small>
                  </li>
                </>
              ) : (
                <li className="is-done">
                  <b>No refund due</b>
                  <small>Cancelled inside the venue’s cut-off</small>
                </li>
              )}
            </ol>
          )}
        </Section>

        {status === 'confirmed' && (
          <div className="policy">
            <CalendarClock size={18} aria-hidden="true" />
            <div>
              <b>{q.percent === 100 ? 'Free cancellation available' : q.percent > 0 ? `${q.percent}% refund if you cancel now` : 'No longer refundable'}</b>
              <p>{q.deadline && q.percent === 100 ? `Until ${fmtDay(q.deadline, { tonight: false })} ${fmtTime(q.deadline)}. ${policy.summary}` : policy.summary}</p>
            </div>
          </div>
        )}

        {status === 'confirmed' && (
          <div className="btn-stack">
            <DirectionsButton f={f} variant="primary" size="lg" block label="Get directions" />
            <Button variant="outline" size="lg" block className="btn--danger-outline" onClick={() => openCancel(b)}>
              Cancel booking
            </Button>
          </div>
        )}
        {status === 'completed' && (
          <div className="btn-stack">
            {!reviewed && (
              <Button size="lg" block icon={<Star size={17} />} onClick={() => nav.push('writeReview', { id: f.id })}>
                Review {f.name}
              </Button>
            )}
            <Button variant="secondary" size="lg" block icon={<TrendingUp size={17} />} onClick={() => openLogResult(b.sport, f.id, b.start)}>
              Add your stats
            </Button>
            <Button variant="secondary" size="lg" block icon={<Undo2 size={17} />} onClick={() => nav.push('book', { facilityId: f.id, spaceId: b.spaceId })}>
              Book again
            </Button>
          </div>
        )}
        {status === 'cancelled' && (
          <Button variant="secondary" size="lg" block onClick={() => nav.push('book', { facilityId: f.id, spaceId: b.spaceId })}>
            Book another time
          </Button>
        )}
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------- bookings tab

export function BookingsScreen(props: ScreenComponentProps) {
  const s = useApp();
  if (!s.account) {
    return (
      <Screen title="Bookings" header="large" back={false} retap={props.retap}>
        <div className="pad">
          <EmptyState
            icon={<CalendarClock size={26} />}
            title="Your bookings will live here"
            body="Book a pitch or court, or join a game, and it shows up here with your check-in code, reminders and who’s paid their share."
            action={{ label: 'Create free account', onClick: () => joinLayer.open('signup') }}
            secondary={{ label: 'Find somewhere to play', onClick: () => nav.go('explore', undefined, { view: 'list' }) }}
          />
          <p className="guest-login">
            Already have an account?{' '}
            <button type="button" className="link" onClick={() => joinLayer.open('login')}>
              Log in
            </button>
          </p>
        </div>
      </Screen>
    );
  }
  return <MemberBookings {...props} />;
}

function MemberBookings({ retap }: ScreenComponentProps) {
  const s = useApp();
  const [tab, setTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const up = upcoming(s);
  const past = pastActivity(s);
  const cancelled = s.bookings.filter((b) => b.status === 'cancelled').sort((a, b) => b.start.localeCompare(a.start));
  const waitlists = s.waitlists.filter((w) => (w.status === 'waiting' || w.status === 'offered') && new Date(w.start).getTime() > Date.now());
  const regs = s.registrations.filter((r) => r.status === 'confirmed');

  const [, tick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => tick((x) => x + 1), 30_000);
    return () => clearInterval(i);
  }, []);

  const list = useMemo(() => ({ upcoming: up, past, cancelled }), [up, past, cancelled]);

  return (
    <Screen title="Bookings" header="large" back={false} retap={retap}>
      <div className="pad">
        <Segmented
          label="Bookings"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'upcoming', label: 'Upcoming', count: list.upcoming.length },
            { value: 'past', label: 'Past' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />
      </div>

      {tab === 'upcoming' && (
        <div className="pad stack-16">
          {waitlists.length > 0 && (
            <Section title="On the waitlist">
              <div className="cards">
                {waitlists.map((w) => {
                  const f = FACILITY_BY_ID[w.facilityId];
                  const sp = SPACE_BY_ID[w.spaceId];
                  const offered = w.status === 'offered' && w.offerExpiresAt && new Date(w.offerExpiresAt).getTime() > Date.now();
                  return (
                    <div key={w.id} className={cx('wl', offered && 'wl--offered')}>
                      <SportBadge sport={sp.sport} size={40} />
                      <div className="wl__body">
                        <b>
                          {sp.name} · {fmtDay(w.start)} {fmtTime(w.start)}
                        </b>
                        <small>{f.name}</small>
                        <span className={cx('wl__state')}>{offered ? `Slot free! Held for ${fmtCountdown(w.offerExpiresAt!)}` : `You’re #${w.position} in line`}</span>
                      </div>
                      {offered ? (
                        <Button size="sm" onClick={() => nav.push('book', { facilityId: f.id, spaceId: sp.id, start: w.start, duration: String(w.durationMins) })}>
                          Book it
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => leaveWaitlist(w.id)}>
                          Leave
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}
          {up.length ? (
            <div className="cards">
              {up.map((a) =>
                a.kind === 'booking' ? (
                  <BookingCard key={a.id} booking={a.booking} onDirections={() => openDirectionsFor(a.booking.facilityId)} onCancel={() => openCancel(a.booking)} />
                ) : (
                  <GameCard key={a.id} game={a.game} />
                ),
              )}
            </div>
          ) : (
            !waitlists.length && (
              <EmptyState
                icon={<CalendarPlus size={26} />}
                title="Nothing booked yet."
                body="Find somewhere to play."
                action={{ label: 'Explore venues', onClick: () => nav.go('explore', undefined, { view: 'list' }) }}
                secondary={{ label: 'Play Now', onClick: () => nav.push('playNow') }}
              />
            )
          )}
          {regs.length > 0 && (
            <Section title="Registered">
              <div className="list-card">
                {regs.map((r) => (
                  <Row
                    key={r.id}
                    icon={<Star size={18} />}
                    title={r.kind === 'tournament' ? 'Tournament entry' : r.kind === 'league' ? 'League registration' : r.kind === 'training' ? 'Training session' : 'Event'}
                    subtitle={r.teamName ? `Team: ${r.teamName}` : r.asFreeAgent ? 'Free agent' : `Confirmed ${fmtShortDate(r.createdAt)}`}
                    onClick={() => nav.push(r.kind === 'training' ? 'session' : r.kind, { id: r.targetId })}
                  />
                ))}
              </div>
            </Section>
          )}
        </div>
      )}

      {tab === 'past' && (
        <div className="pad">
          {past.length ? (
            <div className="cards">
              {past.map((a) =>
                a.kind === 'booking' ? (
                  <div key={a.id} className="pastwrap">
                    <BookingCard booking={a.booking} />
                    <div className="pastwrap__actions">
                      {!s.reviews.some((r) => r.facilityId === a.booking.facilityId) && !a.booking.reviewed && (
                        <button type="button" className="chip chip--sm" onClick={() => nav.push('writeReview', { id: a.booking.facilityId })}>
                          <Star size={14} /> Review venue
                        </button>
                      )}
                      <button type="button" className="chip chip--sm" onClick={() => openLogResult(a.booking.sport, a.booking.facilityId, a.booking.start)}>
                        <TrendingUp size={14} /> Add stats
                      </button>
                      <button type="button" className="chip chip--sm" onClick={() => nav.push('book', { facilityId: a.booking.facilityId, spaceId: a.booking.spaceId })}>
                        <Undo2 size={14} /> Book again
                      </button>
                    </div>
                  </div>
                ) : (
                  <GameCard key={a.id} game={a.game} />
                ),
              )}
            </div>
          ) : (
            <EmptyState icon={<Clock size={26} />} title="No past games yet." body="Your history shows up here after you play." action={{ label: 'Find a game', onClick: () => nav.push('games') }} />
          )}
        </div>
      )}

      {tab === 'cancelled' && (
        <div className="pad">
          {cancelled.length ? (
            <div className="cards">
              {cancelled.map((b) => (
                <div key={b.id} className="pastwrap">
                  <BookingCard booking={b} />
                  <div className="refund-line">
                    {b.cancellation && b.cancellation.refund > 0 ? (
                      <>
                        <Check size={14} /> {moneyExact(b.cancellation.refund)} {b.cancellation.refundState === 'refunded' ? 'refunded' : 'refund processing'}
                      </>
                    ) : (
                      <>
                        <Info size={14} /> No refund due
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<MapPin size={26} />} title="No cancellations." body="Anything you cancel shows up here with its refund status." />
          )}
        </div>
      )}
    </Screen>
  );
}

function openDirectionsFor(facilityId: string) {
  const f = FACILITY_BY_ID[facilityId];
  const app = getState().prefs.mapsApp;
  if (app === 'ask') openDirections(f);
  else openExternal(directionsUrl(app, f, f.name));
}
