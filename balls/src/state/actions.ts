import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID } from '../data/achievements';
import { FACILITY_BY_ID, POLICY_BY_ID, SPACE_BY_ID } from '../data/facilities';
import { PEOPLE, PERSON_BY_ID } from '../data/people';
import { SPORT_BY_ID, sportName } from '../data/sports';
import type {
  Booking,
  Game,
  GamePlayer,
  Link,
  Notification,
  NotificationCategory,
  NotificationType,
  Payment,
  PaymentMethod,
  RatingBreakdown,
  Registration,
  ReportTarget,
  Review,
  SkillLevel,
  SplitShare,
  SportId,
  SportLevel,
  UserLocation,
  Waitlist,
} from '../data/types';
import { bookingRef, money, moneyExact, uid } from '../lib/format';
import { addMinutes, fmtTime, fmtWhen, HOUR } from '../lib/time';
import { analytics } from '../services/analytics';
import { priceFor, unavailableReason, type MaintenanceBlock } from '../services/availability';
import { bookingFee, charge, methodLabel, refundQuote, splitAmounts, testCard } from '../services/payments';
import { canReport, checkMessage, reliability } from '../services/trust';
import { demoState } from './demo';
import { nav } from './nav';
import {
  allGames,
  availCtx,
  firstName,
  gameById,
  isMinor,
  joinedPlayers,
  ME,
  me,
  messagesOf,
  myRow,
  playersOf,
  upcoming,
  userById,
} from './selectors';
import { type Account, type AppState, emptyState, getState, type Profile, setState, type Settings } from './store';
import { ui } from './ui';

/**
 * Every user action goes through here. Each one validates, updates state,
 * records analytics and raises notifications — the same responsibilities a
 * backend mutation would have.
 */

const iso = () => new Date().toISOString();
const signedIn = () => !!getState().account;

/** Run later, only if the same account is still signed in (demo "backend" events). */
function later(ms: number, fn: () => void) {
  const acct = getState().account?.email;
  setTimeout(() => {
    if (getState().account?.email === acct) fn();
  }, ms);
}

// ---------------------------------------------------------------- notifications

const CATEGORY: Record<NotificationType, NotificationCategory | 'reminders'> = {
  'booking-confirmed': 'bookings',
  'booking-reminder': 'reminders',
  'game-reminder': 'reminders',
  'player-joined': 'games',
  'player-left': 'games',
  'game-nearly-full': 'games',
  waitlist: 'waitlist',
  'venue-alert': 'waitlist',
  invitation: 'invitations',
  message: 'messages',
  cancellation: 'bookings',
  refund: 'payments',
  tournament: 'competitions',
  payment: 'payments',
  achievement: 'achievements',
};

export function notify(n: { type: NotificationType; title: string; body: string; link?: Link }, opts: { toast?: boolean; action?: string } = {}) {
  const s = getState();
  const cat = CATEGORY[n.type];
  if (!s.notificationPrefs[cat]) return;
  const item: Notification = { ...n, id: uid('n'), at: iso(), read: false };
  setState((st) => ({ ...st, notifications: [item, ...st.notifications].slice(0, 80) }));
  if (opts.toast) {
    ui.toast(n.title, {
      icon: 'bell',
      action: n.link ? { label: opts.action ?? 'View', run: () => openNotification(item) } : undefined,
    });
  }
}

export function openNotification(n: Notification) {
  markRead(n.id);
  if (!n.link) return;
  const { route, params } = n.link;
  if (route === 'booking') nav.go('bookings', 'booking', params);
  else if (route === 'achievements') nav.go('profile', 'achievements');
  else nav.push(route, params);
}

export function markRead(id: string) {
  setState((s) => ({ ...s, notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
}

export function markAllRead() {
  setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
}

export function clearNotifications() {
  setState((s) => ({ ...s, notifications: [] }));
}

// ---------------------------------------------------------------- achievements

function achievementProgress(s: AppState, id: string): number {
  const a = ACHIEVEMENT_BY_ID[id];
  const p = s.profile;
  switch (a.metric) {
    case 'games':
      if (id === 'first-game') return p.gamesPlayed + upcoming(s).length > 0 ? 1 : 0;
      return p.gamesPlayed;
    case 'tournaments':
      return p.tournaments;
    case 'early':
      return p.earlyGames;
    case 'venues':
      return p.venues.length;
    case 'sports':
      return p.stats.filter((x) => Object.values(x.values).some((v) => v > 0)).length;
    case 'reliability': {
      const r = reliability(p.attendance);
      return r.score !== null && r.score >= 95 ? p.gamesPlayed : 0;
    }
    default:
      return 0;
  }
}

export function progressFor(s: AppState, id: string) {
  const a = ACHIEVEMENT_BY_ID[id];
  return { value: Math.min(a.threshold, achievementProgress(s, id)), target: a.threshold };
}

function checkAchievements() {
  const s = getState();
  const have = new Set(s.profile.achievements.map((a) => a.id));
  const fresh = ACHIEVEMENTS.filter((a) => !have.has(a.id) && achievementProgress(s, a.id) >= a.threshold);
  if (!fresh.length) return;
  setState((st) => ({ ...st, profile: { ...st.profile, achievements: [...st.profile.achievements, ...fresh.map((a) => ({ id: a.id, at: iso() }))] } }));
  fresh.forEach((a, i) =>
    setTimeout(() => {
      ui.toast(`Achievement unlocked: ${a.name}`, { icon: 'trophy', tone: 'success', action: { label: 'See', run: () => nav.go('profile', 'achievements') } });
      notify({ type: 'achievement', title: `Achievement unlocked: ${a.name}`, body: a.description, link: { route: 'achievements' } });
    }, 900 + i * 1200),
  );
}

// ---------------------------------------------------------------- auth & onboarding

/** Look around without an account. */
export function browseAsGuest() {
  setState((s) => ({ ...s, guest: true }));
  nav.reset();
  analytics.track('guest_started');
}

/**
 * A guest who signs up or logs in stays on the screen they were on, so they
 * can finish what they started. Everyone else starts from Home.
 */
function afterSignIn(wasGuest: boolean, message: string) {
  if (!wasGuest) {
    nav.reset();
    return;
  }
  ui.closeAll();
  ui.toast(message, { tone: 'success' });
}

export function signInDemo() {
  const { settings, guest } = getState();
  setState(() => demoState(settings));
  afterSignIn(guest, 'Logged in. Carry on where you left off.');
  analytics.track('signed_in', { method: 'email', fromGuest: guest });
}

export interface SignUpInput {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  ageGroup: Account['ageGroup'];
  sports: SportLevel[];
  distance: number;
  location: UserLocation;
  photo?: string;
  color: string;
}

export function signUp(input: SignUpInput, method: 'email' | 'apple' | 'google' = 'email') {
  const { settings, guest, recentSearches } = getState();
  const base = emptyState(settings);
  const minor = input.ageGroup !== 'adult';
  setState(() => ({
    ...base,
    account: {
      id: 'me',
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      username: input.username,
      color: input.color,
      photo: input.photo,
      ageGroup: input.ageGroup,
      joined: new Date().toISOString().slice(0, 10),
      demo: false,
    },
    onboarded: true,
    recentSearches,
    profile: { ...base.profile, sports: input.sports },
    prefs: { ...base.prefs, distance: input.distance },
    location: input.location,
    // Under-18s get private-by-default settings.
    privacy: minor ? { visibility: 'private', showOnLeaderboards: false, showArea: false, invitesFrom: 'played-with' } : base.privacy,
    paymentMethods: [{ id: 'pm_apple', brand: 'apple-pay', label: 'Apple Pay', token: 'tok_wallet', isDefault: true }],
    notifications: [
      {
        id: uid('n'),
        type: 'achievement',
        title: `Welcome to BALLS, ${input.firstName}`,
        body: 'Find a game tonight with Play Now, or book a venue near you.',
        at: iso(),
        read: false,
        link: { route: 'playNow' },
      },
    ],
  }));
  afterSignIn(guest, `Welcome to BALLS, ${input.firstName}. You’re all set.`);
  analytics.track('signed_up', { method, sports: input.sports.length, minor, fromGuest: guest });
}

export function signOut() {
  const settings = getState().settings;
  ui.closeAll();
  setState(() => emptyState(settings));
  nav.reset();
}

export function resetDemo() {
  const s = getState();
  if (s.account?.demo) setState(() => demoState(s.settings));
  else setState((st) => ({ ...emptyState(st.settings), account: st.account, onboarded: true, profile: { ...emptyState().profile, sports: st.profile.sports }, location: st.location, prefs: st.prefs, paymentMethods: st.paymentMethods }));
  nav.reset();
  ui.toast('Demo data reset');
}

export function requestPasswordReset(): Promise<void> {
  return new Promise((r) => setTimeout(r, 900));
}

// ---------------------------------------------------------------- profile & preferences

export function updateAccount(patch: Partial<Account>) {
  setState((s) => (s.account ? { ...s, account: { ...s.account, ...patch } } : s));
}

export function updateProfile(patch: Partial<Profile>) {
  setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
}

export function setSports(sports: SportLevel[]) {
  setState((s) => ({ ...s, profile: { ...s.profile, sports } }));
}

export function setPrefs(patch: Partial<AppState['prefs']>) {
  setState((s) => ({ ...s, prefs: { ...s.prefs, ...patch } }));
}

export function setLocation(location: UserLocation) {
  setState((s) => ({ ...s, location }));
}

export function setNotificationPrefs(patch: Partial<AppState['notificationPrefs']>) {
  setState((s) => ({ ...s, notificationPrefs: { ...s.notificationPrefs, ...patch } }));
}

export function setPrivacy(patch: Partial<AppState['privacy']>) {
  setState((s) => ({ ...s, privacy: { ...s.privacy, ...patch } }));
}

export function setSettings(patch: Partial<Settings>) {
  setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
}

// ---------------------------------------------------------------- saved venues & alerts

export function toggleSaved(facilityId: string) {
  const saved = getState().saved.some((x) => x.facilityId === facilityId);
  setState((s) => ({
    ...s,
    saved: saved ? s.saved.filter((x) => x.facilityId !== facilityId) : [{ facilityId, at: iso() }, ...s.saved],
  }));
  analytics.track(saved ? 'facility_unsaved' : 'facility_saved', { facility: facilityId });
  if (!saved) ui.toast('Saved to your venues', { icon: 'heart', action: { label: 'View', run: () => nav.go('profile', 'saved') } });
  else ui.toast('Removed from saved');
}

export function toggleAlert(facilityId: string) {
  const on = getState().alerts.includes(facilityId);
  setState((s) => ({ ...s, alerts: on ? s.alerts.filter((x) => x !== facilityId) : [...s.alerts, facilityId] }));
  if (on) {
    ui.toast('Availability alerts off');
    return;
  }
  const f = FACILITY_BY_ID[facilityId];
  ui.toast(`We’ll tell you when evening slots open at ${f.name}`, { icon: 'bell' });
  later(30_000, () => {
    if (!getState().alerts.includes(facilityId)) return;
    notify(
      { type: 'venue-alert', title: `Evening slot free at ${f.name}`, body: 'A 7 PM slot tomorrow has just opened up.', link: { route: 'facility', params: { id: facilityId } } },
      { toast: true },
    );
  });
}

// ---------------------------------------------------------------- payments

let paymentAttempt = 0;

async function takePayment(amount: number, methodId: string, description: string): Promise<{ ok: true; payment: Payment } | { ok: false; error: string }> {
  const s = getState();
  const method = s.paymentMethods.find((m) => m.id === methodId);
  if (!method) return { ok: false, error: 'Choose a payment method.' };
  paymentAttempt++;
  const res = await charge(amount, method, { fail: s.settings.simulateErrors && paymentAttempt % 2 === 1 });
  if (!res.ok) return { ok: false, error: res.error ?? 'Payment didn’t go through.' };
  const payment: Payment = { id: uid('pay'), amount, methodId, description, status: 'succeeded', refunded: 0, providerRef: res.providerRef!, createdAt: iso() };
  setState((st) => ({ ...st, payments: [payment, ...st.payments] }));
  return { ok: true, payment };
}

export function addTestCard(brand: 'visa' | 'mastercard' | 'amex'): PaymentMethod {
  const card = testCard(brand);
  setState((s) => ({ ...s, paymentMethods: [...s.paymentMethods.map((m) => ({ ...m, isDefault: false })), { ...card, isDefault: true }] }));
  ui.toast(`${methodLabel(card)} added`, { tone: 'success' });
  return card;
}

export function removeMethod(id: string) {
  setState((s) => {
    const rest = s.paymentMethods.filter((m) => m.id !== id);
    if (rest.length && !rest.some((m) => m.isDefault)) rest[0] = { ...rest[0], isDefault: true };
    return { ...s, paymentMethods: rest };
  });
}

export function setDefaultMethod(id: string) {
  setState((s) => ({ ...s, paymentMethods: s.paymentMethods.map((m) => ({ ...m, isDefault: m.id === id })) }));
}

// ---------------------------------------------------------------- bookings

export interface BookingInput {
  spaceId: string;
  start: string;
  durationMins: number;
  players: number;
  split: boolean;
  methodId: string;
}

export function quoteBooking(input: Pick<BookingInput, 'spaceId' | 'start' | 'durationMins' | 'players' | 'split'>) {
  const space = SPACE_BY_ID[input.spaceId];
  const f = FACILITY_BY_ID[space.facilityId];
  const people = space.unit === 'session' ? input.players : 1;
  const subtotal = priceFor(space, new Date(input.start), input.durationMins, people, availCtx(getState()));
  const fee = bookingFee(f);
  const total = subtotal + fee;
  const shares = input.split && input.players > 1 ? splitAmounts(total, input.players) : null;
  return { subtotal, fee, total, shares, perPlayer: shares ? shares[0] : total };
}

export async function createBooking(input: BookingInput): Promise<{ ok: true; booking: Booking } | { ok: false; error: string; taken?: boolean }> {
  const s = getState();
  const space = SPACE_BY_ID[input.spaceId];
  const f = FACILITY_BY_ID[space.facilityId];
  const start = new Date(input.start);
  // Never allow an unavailable slot, even if the screen was stale.
  const reason = unavailableReason(space, start, input.durationMins, availCtx(s), space.unit === 'session' ? input.players : 1);
  if (reason) return { ok: false, taken: true, error: reason === 'past' ? 'That time has already started. Pick a later slot.' : 'That slot was just taken. Pick another time.' };
  const q = quoteBooking(input);
  analytics.track('booking_started', { facility: f.id, space: space.id, sport: space.sport });
  const paid = await takePayment(q.total, input.methodId, `${f.name} · ${space.name}`);
  if (!paid.ok) return paid;

  const id = uid('b');
  const split: SplitShare[] | null = q.shares
    ? q.shares.map((amount, i) => ({ id: `${id}-s${i}`, name: i === 0 ? 'You' : 'Open spot', userId: i === 0 ? ME : undefined, amount, status: i === 0 ? 'paid' : 'pending', organiser: i === 0, paidAt: i === 0 ? iso() : undefined }))
    : null;
  const booking: Booking = {
    id,
    ref: bookingRef(),
    userId: ME,
    facilityId: f.id,
    spaceId: space.id,
    sport: space.sport,
    start: start.toISOString(),
    end: addMinutes(start, input.durationMins).toISOString(),
    subtotal: q.subtotal,
    fee: q.fee,
    total: q.total,
    players: input.players,
    split,
    paymentId: paid.payment.id,
    paymentStatus: 'paid',
    status: 'confirmed',
    createdAt: iso(),
  };
  setState((st) => ({
    ...st,
    bookings: [booking, ...st.bookings],
    waitlists: st.waitlists.map((w) => (w.status === 'offered' && w.spaceId === space.id && w.start === booking.start ? { ...w, status: 'claimed' } : w)),
  }));
  notify({ type: 'booking-confirmed', title: 'Booking confirmed', body: `${space.name} at ${f.name}, ${fmtWhen(booking.start)}.`, link: { route: 'booking', params: { id } } });
  analytics.track('booking_completed', { facility: f.id, sport: space.sport, total: q.total, split: !!split, players: input.players });
  checkAchievements();
  return { ok: true, booking };
}

export function cancelBooking(id: string) {
  const s = getState();
  const b = s.bookings.find((x) => x.id === id);
  if (!b || b.status === 'cancelled') return;
  const f = FACILITY_BY_ID[b.facilityId];
  const q = refundQuote(b, POLICY_BY_ID[f.cancellationPolicyId]);
  const lateGame = b.gameId && new Date(b.start).getTime() - Date.now() < 24 * HOUR;
  setState((st) => ({
    ...st,
    bookings: st.bookings.map((x) =>
      x.id === id
        ? { ...x, status: 'cancelled', paymentStatus: q.amount === 0 ? x.paymentStatus : q.amount === x.total ? 'refunded' : 'partly-refunded', cancellation: { at: iso(), refund: q.amount, refundState: q.amount > 0 ? 'processing' : 'none' } }
        : x,
    ),
    payments: st.payments.map((p) => (p.id === b.paymentId && q.amount > 0 ? { ...p, refunded: q.amount, status: q.amount === p.amount ? 'refunded' : 'partly-refunded' } : p)),
    games: st.games.map((g) => (g.id === b.gameId ? { ...g, status: 'cancelled' } : g)),
    messages: b.gameId ? [...st.messages, { id: uid('m'), gameId: b.gameId, userId: null, text: 'The organiser cancelled the game. Anyone who paid will be refunded automatically.', at: iso() }] : st.messages,
    profile: lateGame ? { ...st.profile, attendance: { ...st.profile.attendance, lateCancels: st.profile.attendance.lateCancels + 1 } } : st.profile,
  }));
  notify({ type: 'cancellation', title: 'Booking cancelled', body: `${SPACE_BY_ID[b.spaceId].name} at ${f.name} on ${fmtWhen(b.start)}.`, link: { route: 'booking', params: { id } } });
  analytics.track('booking_cancelled', { facility: f.id, refund: q.amount });
  if (q.amount > 0) {
    later(20_000, () => {
      setState((st) => ({ ...st, bookings: st.bookings.map((x) => (x.id === id && x.cancellation ? { ...x, cancellation: { ...x.cancellation, refundState: 'refunded' } } : x)) }));
      const m = getState().paymentMethods.find((pm) => pm.id === getState().payments.find((p) => p.id === b.paymentId)?.methodId);
      notify({ type: 'refund', title: 'Refund sent', body: `${moneyExact(q.amount)} is on its way to ${m ? methodLabel(m) : 'your card'}. It can take 3–5 working days to appear.`, link: { route: 'booking', params: { id } } });
    });
  }
}

/** Fill open cost-split places with invited friends. */
export function inviteToBooking(bookingId: string, userIds: string[]) {
  const b = getState().bookings.find((x) => x.id === bookingId);
  if (!b?.split) return;
  const queue = [...userIds];
  const split = b.split.map((sh) => {
    if (sh.userId || !queue.length) return sh;
    const u = queue.shift()!;
    return { ...sh, userId: u, name: PERSON_BY_ID[u]?.name ?? 'Friend' };
  });
  setState((s) => ({ ...s, bookings: s.bookings.map((x) => (x.id === bookingId ? { ...x, split } : x)) }));
  analytics.track('invite_sent', { kind: 'booking', count: userIds.length });
  ui.toast(`Payment requests sent to ${userIds.length} ${userIds.length === 1 ? 'player' : 'players'}`, { tone: 'success' });
  const first = split.find((sh) => sh.userId === userIds[0]);
  if (first) later(18_000, () => markSharePaid(bookingId, first.id));
}

export function markSharePaid(bookingId: string, shareId: string) {
  const b = getState().bookings.find((x) => x.id === bookingId);
  const share = b?.split?.find((x) => x.id === shareId);
  if (!b || !share || share.status === 'paid' || b.status === 'cancelled') return;
  setState((s) => ({
    ...s,
    bookings: s.bookings.map((x) => (x.id === bookingId ? { ...x, split: x.split!.map((sh) => (sh.id === shareId ? { ...sh, status: 'paid', paidAt: iso() } : sh)) } : x)),
    gamePlayers: s.gamePlayers.map((r) => (b.gameId && r.gameId === b.gameId && r.userId === share.userId ? { ...r, payment: 'paid' } : r)),
  }));
  notify({ type: 'payment', title: `${share.name.split(' ')[0]} paid their share`, body: `${moneyExact(share.amount)} for ${FACILITY_BY_ID[b.facilityId].name}.`, link: { route: 'booking', params: { id: bookingId } } }, { toast: true });
}

export function remindShare(name: string) {
  ui.toast(`Reminder sent to ${name.split(' ')[0]}`, { icon: 'bell' });
}

// ---------------------------------------------------------------- waitlists

export function joinWaitlist(spaceId: string, start: Date, durationMins: number) {
  const space = SPACE_BY_ID[spaceId];
  const f = FACILITY_BY_ID[space.facilityId];
  const exists = getState().waitlists.find((w) => w.spaceId === spaceId && w.start === start.toISOString() && (w.status === 'waiting' || w.status === 'offered'));
  if (exists) {
    ui.toast('You’re already on this waitlist');
    return;
  }
  const w: Waitlist = { id: uid('w'), facilityId: f.id, spaceId, start: start.toISOString(), durationMins, position: 2 + (start.getHours() % 3), status: 'waiting', createdAt: iso() };
  setState((s) => ({ ...s, waitlists: [w, ...s.waitlists] }));
  analytics.track('waitlist_joined', { facility: f.id, space: spaceId });
  ui.toast(`You’re #${w.position} on the waitlist. We’ll notify you if it opens up.`, { icon: 'bell', tone: 'success' });
  // Simulate another player cancelling.
  later(25_000, () => {
    const cur = getState().waitlists.find((x) => x.id === w.id);
    if (!cur || cur.status !== 'waiting' || start.getTime() < Date.now()) return;
    const expires = new Date(Date.now() + 15 * 60_000).toISOString();
    setState((s) => ({ ...s, waitlists: s.waitlists.map((x) => (x.id === w.id ? { ...x, status: 'offered', position: 1, offerExpiresAt: expires } : x)) }));
    notify(
      {
        type: 'waitlist',
        title: `${fmtTime(start)} at ${f.name} just opened up`,
        body: `${space.name} is held for you for 15 minutes.`,
        link: { route: 'book', params: { facilityId: f.id, spaceId, start: w.start, duration: String(durationMins) } },
      },
      { toast: true, action: 'Book it' },
    );
  });
}

export function leaveWaitlist(id: string) {
  setState((s) => ({ ...s, waitlists: s.waitlists.map((w) => (w.id === id ? { ...w, status: 'left' } : w)) }));
  ui.toast('Removed from waitlist');
}

// ---------------------------------------------------------------- games

function sysMessage(gameId: string, text: string) {
  setState((s) => ({ ...s, messages: [...s.messages, { id: uid('m'), gameId, userId: null, text, at: iso() }] }));
}

function upsertPlayer(row: GamePlayer) {
  setState((s) => ({ ...s, gamePlayers: [...s.gamePlayers.filter((r) => !(r.gameId === row.gameId && r.userId === row.userId)), row] }));
}

export async function joinGame(gameId: string, methodId?: string): Promise<{ ok: boolean; error?: string }> {
  const s = getState();
  const g = gameById(s, gameId);
  if (!g) return { ok: false, error: 'This game no longer exists.' };
  if (g.status !== 'open') return { ok: false, error: g.status === 'full' ? 'This game just filled up.' : 'This game isn’t taking players.' };
  if (isMinor(s) && g.ageRule === 'adults') return { ok: false, error: 'This game is for adults only.' };
  let payment: GamePlayer['payment'] = 'free';
  if (g.pricePerPlayer > 0) {
    if (!methodId) return { ok: false, error: 'Choose a payment method.' };
    const paid = await takePayment(g.pricePerPlayer, methodId, `${g.format ?? sportName(g.sport)} at ${FACILITY_BY_ID[g.facilityId].name}`);
    if (!paid.ok) return paid;
    payment = 'paid';
  }
  upsertPlayer({ gameId, userId: ME, role: 'player', status: 'joined', payment, at: iso() });
  sysMessage(gameId, `${firstName(me(getState()))} joined the game.`);
  analytics.track('game_joined', { game: gameId, sport: g.sport, paid: payment === 'paid' });
  checkAchievements();
  return { ok: true };
}

export function leaveGame(gameId: string) {
  const g = gameById(getState(), gameId);
  if (!g) return;
  const late = new Date(g.start).getTime() - Date.now() < 24 * HOUR;
  const row = myRow(getState(), gameId);
  setState((s) => ({
    ...s,
    gamePlayers: s.gamePlayers.filter((r) => !(r.gameId === gameId && r.userId === ME)).concat({ gameId, userId: ME, role: 'player', status: 'left', payment: row?.payment === 'paid' && !late ? 'refunded' : row?.payment ?? 'free', at: iso() }),
    profile: late ? { ...s.profile, attendance: { ...s.profile.attendance, lateCancels: s.profile.attendance.lateCancels + 1 } } : s.profile,
  }));
  sysMessage(gameId, `${firstName(me(getState()))} left the game.`);
  analytics.track('game_left', { game: gameId, late });
  ui.toast(row?.payment === 'paid' && !late ? `You left the game. ${money(g.pricePerPlayer)} will be refunded.` : 'You left the game.');
}

export interface CreateGameInput {
  sport: SportId;
  format?: string;
  facilityId: string;
  spaceId?: string;
  bookingId?: string;
  start: string;
  durationMins: number;
  level: SkillLevel;
  maxPlayers: number;
  pricePerPlayer: number;
  description: string;
  visibility: 'public' | 'private';
}

export function createGame(input: CreateGameInput): Game {
  const s = getState();
  const id = uid('g');
  const game: Game = {
    id,
    creatorId: ME,
    sport: input.sport,
    format: input.format,
    facilityId: input.facilityId,
    spaceId: input.spaceId,
    bookingId: input.bookingId,
    start: input.start,
    end: addMinutes(new Date(input.start), input.durationMins).toISOString(),
    level: input.level,
    maxPlayers: input.maxPlayers,
    pricePerPlayer: input.pricePerPlayer,
    description: input.description.trim(),
    status: 'open',
    visibility: input.visibility,
    ageRule: isMinor(s) ? 'juniors' : 'adults',
    createdAt: iso(),
  };
  setState((st) => ({
    ...st,
    games: [game, ...st.games],
    bookings: input.bookingId ? st.bookings.map((b) => (b.id === input.bookingId ? { ...b, gameId: id } : b)) : st.bookings,
    gamePlayers: [...st.gamePlayers, { gameId: id, userId: ME, role: 'organiser', status: 'joined', payment: input.pricePerPlayer ? 'paid' : 'free', at: iso() }],
    messages: [...st.messages, { id: uid('m'), gameId: id, userId: null, text: 'You created the game.', at: iso() }],
  }));
  analytics.track('game_created', { sport: input.sport, visibility: input.visibility, max: input.maxPlayers, fromBooking: !!input.bookingId });
  checkAchievements();
  if (input.visibility === 'public') {
    later(14_000, () => simulateJoin(id));
    later(45_000, () => simulateJoin(id));
  }
  return game;
}

/** A matching player joins (demo backend event). */
function simulateJoin(gameId: string) {
  const s = getState();
  const g = gameById(s, gameId);
  if (!g || g.status !== 'open') return;
  const inGame = new Set(playersOf(s, gameId).map((p) => p.userId));
  const candidate = PEOPLE.find((p) => !inGame.has(p.id) && !s.blocked.includes(p.id) && p.sports.some((x) => x.sport === g.sport)) ?? PEOPLE.find((p) => !inGame.has(p.id));
  if (!candidate) return;
  upsertPlayer({ gameId, userId: candidate.id, role: 'player', status: 'joined', payment: g.pricePerPlayer ? 'paid' : 'free', at: iso() });
  sysMessage(gameId, `${firstName(candidate)} joined the game.`);
  const count = joinedPlayers(getState(), gameId).length;
  notify({ type: 'player-joined', title: `${firstName(candidate)} joined your game`, body: `${count}/${g.maxPlayers} players · ${fmtWhen(g.start)}`, link: { route: 'game', params: { id: gameId } } }, { toast: true });
  if (g.maxPlayers - count > 0 && g.maxPlayers - count <= 2) {
    notify({ type: 'game-nearly-full', title: 'Your game is nearly full', body: `${g.maxPlayers - count} ${g.maxPlayers - count === 1 ? 'spot' : 'spots'} left for ${fmtWhen(g.start)}.`, link: { route: 'game', params: { id: gameId } } });
  }
}

export function cancelGame(gameId: string) {
  const g = gameById(getState(), gameId);
  if (!g) return;
  setState((s) => ({ ...s, games: s.games.map((x) => (x.id === gameId ? { ...x, status: 'cancelled' } : x)) }));
  sysMessage(gameId, 'The organiser cancelled the game. Anyone who paid will be refunded automatically.');
  ui.toast('Game cancelled. Players have been told.');
}

export function inviteToGame(gameId: string, userIds: string[]) {
  if (!userIds.length) return;
  userIds.forEach((u) => upsertPlayer({ gameId, userId: u, role: 'player', status: 'invited', payment: 'pending', at: iso() }));
  const names = userIds.map((u) => firstName(userById(getState(), u)));
  sysMessage(gameId, `You invited ${names.length > 2 ? `${names.slice(0, 2).join(', ')} and ${names.length - 2} more` : names.join(' and ')}.`);
  analytics.track('invite_sent', { kind: 'game', count: userIds.length });
  ui.toast(`${userIds.length === 1 ? 'Invite' : 'Invites'} sent`, { tone: 'success' });
  const first = userIds[0];
  later(12_000, () => {
    const g = gameById(getState(), gameId);
    const row = playersOf(getState(), gameId).find((r) => r.userId === first);
    if (!g || g.status !== 'open' || row?.status !== 'invited') return;
    upsertPlayer({ gameId, userId: first, role: 'player', status: 'joined', payment: g.pricePerPlayer ? 'paid' : 'free', at: iso() });
    const u = userById(getState(), first);
    sysMessage(gameId, `${firstName(u)} accepted the invite.`);
    notify({ type: 'player-joined', title: `${firstName(u)} accepted your invite`, body: `${joinedPlayers(getState(), gameId).length}/${g.maxPlayers} players`, link: { route: 'game', params: { id: gameId } } }, { toast: true });
  });
}

const REPLIES = ['See you there 👍', 'Nice one, I’m in.', 'Running 5 mins late but I’ll be there.', 'Anyone got a spare pump?', 'Bibs sorted?', 'Can’t wait. Been a long week.'];

export function sendMessage(gameId: string, raw: string): { ok: boolean; error?: string } {
  const s = getState();
  const mine = messagesOf(s, gameId).filter((m) => m.userId === ME);
  const check = checkMessage(raw, { mine, gamesPlayed: s.profile.gamesPlayed, minor: isMinor(s) });
  if (!check.ok) return { ok: false, error: check.error };
  setState((st) => ({ ...st, messages: [...st.messages, { id: uid('m'), gameId, userId: ME, text: check.text, at: iso() }] }));
  if (mine.length === 0) {
    later(4_500, () => {
      const others = joinedPlayers(getState(), gameId).filter((p) => p.userId !== ME && !getState().blocked.includes(p.userId));
      const who = others[Math.floor(Math.random() * others.length)];
      if (!who) return;
      setState((st) => ({ ...st, messages: [...st.messages, { id: uid('m'), gameId, userId: who.userId, text: REPLIES[Math.floor(Math.random() * REPLIES.length)], at: iso() }] }));
    });
  }
  return { ok: true };
}

export function toggleMute(gameId: string) {
  const muted = getState().mutedChats.includes(gameId);
  setState((s) => ({ ...s, mutedChats: muted ? s.mutedChats.filter((x) => x !== gameId) : [...s.mutedChats, gameId] }));
  ui.toast(muted ? 'Chat unmuted' : 'Chat muted. You won’t get message notifications.');
}

// ---------------------------------------------------------------- reviews

export function submitReview(input: { facilityId: string; rating: RatingBreakdown; text: string; sport?: SportId; uploads?: string[] }) {
  const review: Review = { id: uid('r'), userId: ME, at: iso(), ...input, text: input.text.trim() };
  setState((s) => ({
    ...s,
    reviews: [review, ...s.reviews],
    bookings: s.bookings.map((b) => (b.facilityId === input.facilityId && new Date(b.end).getTime() < Date.now() ? { ...b, reviewed: true } : b)),
  }));
  analytics.track('review_submitted', { facility: input.facilityId, rating: input.rating.overall });
  ui.toast('Thanks! Your review is live.', { tone: 'success' });
}

// ---------------------------------------------------------------- competitions & events

export async function register(input: { kind: Registration['kind']; targetId: string; title: string; amount: number; methodId?: string; teamName?: string; asFreeAgent?: boolean }): Promise<{ ok: boolean; error?: string }> {
  if (input.amount > 0) {
    if (!input.methodId) return { ok: false, error: 'Choose a payment method.' };
    const paid = await takePayment(input.amount, input.methodId, input.title);
    if (!paid.ok) return paid;
  }
  const reg: Registration = { id: uid('reg'), kind: input.kind, targetId: input.targetId, teamName: input.teamName, asFreeAgent: input.asFreeAgent, amount: input.amount, status: 'confirmed', createdAt: iso() };
  setState((s) => ({
    ...s,
    registrations: [reg, ...s.registrations],
    profile: input.kind === 'tournament' ? { ...s.profile, tournaments: s.profile.tournaments + 1 } : s.profile,
  }));
  if (input.kind === 'tournament' || input.kind === 'league') {
    notify({ type: 'tournament', title: `You’re in: ${input.title}`, body: input.teamName ? `Registered as ${input.teamName}.` : input.asFreeAgent ? 'We’ll match you with a team before the season starts.' : 'Registration confirmed.', link: { route: input.kind, params: { id: input.targetId } } });
  }
  analytics.track('registration_completed', { kind: input.kind, target: input.targetId, amount: input.amount });
  checkAchievements();
  return { ok: true };
}

export function cancelRegistration(id: string) {
  setState((s) => ({ ...s, registrations: s.registrations.map((r) => (r.id === id ? { ...r, status: 'cancelled' } : r)) }));
  ui.toast('Registration cancelled. Any refund follows the organiser’s policy.');
}

// ---------------------------------------------------------------- safety

export function report(targetType: ReportTarget, targetId: string, reason: string, details: string): { ok: boolean; error?: string } {
  const s = getState();
  if (!canReport(s.reports.map((r) => r.createdAt))) return { ok: false, error: 'You’ve sent a lot of reports recently. Try again in an hour.' };
  setState((st) => ({ ...st, reports: [{ id: uid('rep'), targetType, targetId, reason, details: details.trim().slice(0, 1000), status: 'received', createdAt: iso() }, ...st.reports] }));
  analytics.track('report_submitted', { target: targetType });
  return { ok: true };
}

export function block(userId: string) {
  setState((s) => ({ ...s, blocked: [...new Set([...s.blocked, userId])], following: s.following.filter((x) => x !== userId) }));
  ui.toast(`${firstName(userById(getState(), userId))} is blocked. You won’t see each other’s games or messages.`);
}

export function unblock(userId: string) {
  setState((s) => ({ ...s, blocked: s.blocked.filter((x) => x !== userId) }));
  ui.toast('Unblocked');
}

export function toggleFollow(userId: string) {
  const on = getState().following.includes(userId);
  setState((s) => ({ ...s, following: on ? s.following.filter((x) => x !== userId) : [...s.following, userId] }));
  if (!on) ui.toast(`You’re following ${firstName(userById(getState(), userId))}`);
}

// ---------------------------------------------------------------- search

export function addRecentSearch(q: string) {
  const v = q.trim();
  if (v.length < 2) return;
  setState((s) => ({ ...s, recentSearches: [v, ...s.recentSearches.filter((x) => x.toLowerCase() !== v.toLowerCase())].slice(0, 6) }));
  analytics.track('search_performed', { length: v.length });
}

export function clearRecentSearches() {
  setState((s) => ({ ...s, recentSearches: [] }));
}

// ---------------------------------------------------------------- stats

export function logResult(input: { sport: SportId; result: 'W' | 'D' | 'L'; values: Record<string, number>; facilityId: string; start: string }) {
  setState((s) => {
    const existing = s.profile.stats.find((x) => x.sport === input.sport) ?? { sport: input.sport, values: {}, form: [], weekly: [0, 0, 0, 0, 0, 0, 0, 0] };
    const values = { ...existing.values };
    for (const [k, v] of Object.entries(input.values)) values[k] = (values[k] ?? 0) + v;
    const gamesKey = SPORT_BY_ID[input.sport].stats[0].id;
    values[gamesKey] = (values[gamesKey] ?? 0) + 1;
    if (input.result === 'W') values.wins = (values.wins ?? 0) + 1;
    if ('winRate' in values || input.sport === 'tennis' || input.sport === 'padel' || input.sport === 'badminton') values.winRate = Math.round(((values.wins ?? 0) / values[gamesKey]) * 100);
    const weekly = [...existing.weekly.slice(1), (existing.weekly[existing.weekly.length - 1] ?? 0) + 1];
    const line = { ...existing, values, form: [input.result, ...existing.form].slice(0, 10), weekly };
    const early = new Date(input.start).getHours() < 9;
    return {
      ...s,
      profile: {
        ...s.profile,
        stats: [...s.profile.stats.filter((x) => x.sport !== input.sport), line],
        gamesPlayed: s.profile.gamesPlayed + 1,
        attendance: { ...s.profile.attendance, attended: s.profile.attendance.attended + 1 },
        venues: [...new Set([...s.profile.venues, input.facilityId])],
        earlyGames: s.profile.earlyGames + (early ? 1 : 0),
      },
    };
  });
  ui.toast('Result saved to your stats', { tone: 'success' });
  checkAchievements();
}

// ---------------------------------------------------------------- venue admin

export function setPriceOverride(spaceId: string, offPeak: number, peak: number) {
  setState((s) => ({ ...s, priceOverrides: { ...s.priceOverrides, [spaceId]: { offPeak, peak } } }));
  ui.toast('Prices updated. Players see them straight away.', { tone: 'success' });
}

export function addMaintenanceBlock(block: Omit<MaintenanceBlock, 'id'>) {
  setState((s) => ({ ...s, blocks: [...s.blocks, { ...block, id: uid('blk') }] }));
  ui.toast('Space blocked out. Those slots are no longer bookable.', { tone: 'success' });
}

export function removeMaintenanceBlock(id: string) {
  setState((s) => ({ ...s, blocks: s.blocks.filter((b) => b.id !== id) }));
}

export const isSignedIn = signedIn;
export { allGames };
