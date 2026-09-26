import { FACILITY_BY_ID, SPACE_BY_ID } from '../data/facilities';
import { DEMO_FRIENDS } from '../data/people';
import { ago, minsAgo, slot } from '../data/schedule';
import type { Booking, GamePlayer, Message, Notification, Payment, PaymentMethod, SplitShare } from '../data/types';
import { bookingFee, splitAmounts } from '../services/payments';
import { priceFor } from '../services/availability';
import { addMinutes } from '../lib/time';
import { type AppState, DEFAULT_PREFS, emptyState, type Settings } from './store';

/**
 * The sample account used by "Log in". It has a history — past games, an
 * upcoming booking with a cost split in progress, saved venues and stats — so
 * every part of the app can be explored with realistic data.
 */

const VISA: PaymentMethod = { id: 'pm_visa', brand: 'visa', label: 'Visa', last4: '4242', expiry: '08/29', token: 'tok_demo_visa', isDefault: true };
const APPLE: PaymentMethod = { id: 'pm_apple', brand: 'apple-pay', label: 'Apple Pay', token: 'tok_demo_apple', isDefault: false };

function booking(p: {
  id: string;
  ref: string;
  spaceId: string;
  start: string;
  mins: number;
  status: Booking['status'];
  players: number;
  split?: Array<[name: string, userId: string | undefined, paid: boolean]>;
  gameId?: string;
  reviewed?: boolean;
  createdAt: string;
  cancellation?: Booking['cancellation'];
}): { booking: Booking; payment: Payment } {
  const space = SPACE_BY_ID[p.spaceId];
  const f = FACILITY_BY_ID[space.facilityId];
  const start = new Date(p.start);
  const subtotal = priceFor(space, start, p.mins);
  const fee = bookingFee(f);
  const total = subtotal + fee;
  let split: SplitShare[] | null = null;
  if (p.split) {
    const amounts = splitAmounts(total, p.players);
    split = amounts.map((amount, i) => {
      const who = p.split![i];
      return {
        id: `${p.id}-s${i}`,
        name: who ? who[0] : 'Open spot',
        userId: who?.[1],
        amount,
        status: i === 0 || who?.[2] ? 'paid' : 'pending',
        organiser: i === 0,
        paidAt: i === 0 || who?.[2] ? p.createdAt : undefined,
      };
    });
  }
  const refunded = p.cancellation?.refund ?? 0;
  const payment: Payment = {
    id: `pay_${p.id}`,
    amount: total,
    methodId: VISA.id,
    description: `${f.name} · ${space.name}`,
    status: refunded ? (refunded === total ? 'refunded' : 'partly-refunded') : 'succeeded',
    refunded,
    providerRef: `pi_demo_${p.id}`,
    createdAt: p.createdAt,
  };
  return {
    booking: {
      id: p.id,
      ref: p.ref,
      userId: 'me',
      facilityId: f.id,
      spaceId: space.id,
      sport: space.sport,
      start: start.toISOString(),
      end: addMinutes(start, p.mins).toISOString(),
      subtotal,
      fee,
      total,
      players: p.players,
      split,
      paymentId: payment.id,
      paymentStatus: refunded ? (refunded === total ? 'refunded' : 'partly-refunded') : 'paid',
      status: p.status,
      cancellation: p.cancellation,
      gameId: p.gameId,
      reviewed: p.reviewed,
      createdAt: p.createdAt,
    },
    payment,
  };
}

export function demoState(settings?: Settings): AppState {
  const base = emptyState(settings);
  const tonight = slot(0, 19.5, 60);

  const b1 = booking({
    id: 'b1', ref: 'BL-7K2Q9', spaceId: 'hsc-p2', start: tonight.start, mins: 60, status: 'confirmed', players: 8, gameId: 'g21', createdAt: ago(4, 20),
    split: [['You', 'me', true], ['Sam O.', 'u2', true], ['Ben C.', 'u9', true], ['Kofi M.', 'u11', false], ['Callum W.', 'u27', false]],
  });
  const b2 = booking({
    id: 'b2', ref: 'BL-P4DX2', spaceId: 'ap-1', start: slot(3, 18).start, mins: 90, status: 'confirmed', players: 4, createdAt: ago(2, 13),
    split: [['You', 'me', true], ['Leila H.', 'u10', true], ['Luca R.', 'u17', false], ['Alex M.', 'u1', false]],
  });
  const b3 = booking({ id: 'b3', ref: 'BL-9HT3C', spaceId: 'dpt-3', start: ago(5, 10), mins: 60, status: 'completed', players: 2, createdAt: ago(8, 21) });
  const b4 = booking({
    id: 'b4', ref: 'BL-2MWQ8', spaceId: 'hsc-p1', start: ago(12, 19), mins: 60, status: 'completed', players: 10, reviewed: true, createdAt: ago(15, 11),
    split: [['You', 'me', true], ['Sam O.', 'u2', true], ['Ben C.', 'u9', true], ['Kofi M.', 'u11', true], ['Callum W.', 'u27', true], ['Dan M.', 'u15', true], ['Nathan C.', 'u21', true], ['Tariq H.', 'u25', true], ['Alex M.', 'u1', true], ['Tom W.', 'u5', true]],
  });
  const b5 = booking({ id: 'b5', ref: 'BL-X8R4J', spaceId: 'tpc-c1', start: ago(20, 20), mins: 60, status: 'completed', players: 10, createdAt: ago(23, 9) });
  const b6src = booking({ id: 'b6', ref: 'BL-C3NV7', spaceId: 'cc-2', start: ago(7, 20), mins: 60, status: 'cancelled', players: 10, createdAt: ago(12, 18) });
  const b6 = booking({
    id: 'b6', ref: 'BL-C3NV7', spaceId: 'cc-2', start: ago(7, 20), mins: 60, status: 'cancelled', players: 10, createdAt: ago(12, 18),
    cancellation: { at: ago(10, 9), refund: b6src.booking.total, refundState: 'refunded' },
  });

  const bookings = [b1, b2, b3, b4, b5, b6];

  const g21Start = new Date(b1.booking.start);
  const g21 = {
    id: 'g21', creatorId: 'me', sport: 'football' as const, format: '5-a-side', facilityId: 'highgate-sc', spaceId: 'hsc-p2', bookingId: 'b1',
    start: b1.booking.start, end: b1.booking.end, level: 'intermediate' as const, maxPlayers: 8, pricePerPlayer: b1.booking.split![0].amount,
    description: 'Our regular 5s. Friendly but we keep score. Bibs are on me. Pitch 2 is the one nearest the car park.',
    status: 'open' as const, visibility: 'public' as const, ageRule: 'adults' as const, createdAt: ago(4, 20),
  };

  const gp = (gameId: string, userId: string, payment: GamePlayer['payment'], role: GamePlayer['role'] = 'player', status: GamePlayer['status'] = 'joined', at = ago(3, 12)): GamePlayer => ({ gameId, userId, role, status, payment, at });
  const gamePlayers: GamePlayer[] = [
    gp('g21', 'me', 'paid', 'organiser', 'joined', ago(4, 20)),
    gp('g21', 'u2', 'paid'),
    gp('g21', 'u9', 'paid'),
    gp('g21', 'u11', 'pending'),
    gp('g21', 'u27', 'pending'),
    gp('g21', 'u15', 'pending', 'player', 'invited'),
    gp('g5', 'me', 'paid', 'player', 'joined', ago(1, 9)),
  ];

  const messages: Message[] = [
    { id: 'dm1', gameId: 'g21', userId: null, text: 'You created the game.', at: minsAgo(60 * 24 * 4) },
    { id: 'dm2', gameId: 'g21', userId: null, text: 'Sam joined the game.', at: minsAgo(60 * 24 * 3.8) },
    { id: 'dm3', gameId: 'g21', userId: null, text: 'Ben joined the game.', at: minsAgo(60 * 24 * 3.5) },
    { id: 'dm4', gameId: 'g21', userId: 'u9', text: 'Is it the pitch nearest the car park?', at: minsAgo(60 * 24 * 3.4) },
    { id: 'dm5', gameId: 'g21', userId: 'me', text: 'Yep, Pitch 2. Bibs are on me.', at: minsAgo(60 * 24 * 3.3) },
    { id: 'dm6', gameId: 'g21', userId: null, text: 'Kofi joined the game.', at: minsAgo(60 * 24 * 2) },
    { id: 'dm7', gameId: 'g21', userId: null, text: 'Callum joined the game.', at: minsAgo(60 * 24 * 1.2) },
    { id: 'dm8', gameId: 'g21', userId: null, text: 'Sam confirmed their place.', at: minsAgo(60 * 5) },
    { id: 'dm9', gameId: 'g21', userId: 'u2', text: 'Who’s bringing the pump?', at: minsAgo(55) },
  ];

  const notifications: Notification[] = [
    { id: 'n9', type: 'message', title: 'Sam in 5-a-side tonight', body: 'Who’s bringing the pump?', at: minsAgo(55), read: false, link: { route: 'chat', params: { id: 'g21' } } },
    { id: 'n1', type: 'booking-reminder', title: 'Your game is coming up', body: 'Pitch 2 at Highgate Sports Centre. 2 players still owe their share.', at: minsAgo(120), read: false, link: { route: 'booking', params: { id: 'b1' } } },
    { id: 'n3', type: 'invitation', title: 'Leila invited you to padel', body: 'Doubles at Archway Padel Club. One spot left.', at: minsAgo(60 * 4), read: false, link: { route: 'game', params: { id: 'g6' } } },
    { id: 'n10', type: 'payment', title: 'Sam paid their share', body: '£5.00 for 5-a-side at Highgate Sports Centre.', at: minsAgo(60 * 5), read: true, link: { route: 'booking', params: { id: 'b1' } } },
    { id: 'n4', type: 'tournament', title: 'Highgate 5s Cup: 4 places left', body: 'Registration closes on Friday.', at: minsAgo(60 * 26), read: true, link: { route: 'tournament', params: { id: 't1' } } },
    { id: 'n8', type: 'venue-alert', title: 'Evening courts free at Dartmouth Park', body: 'Courts 3 and 4 have opened up tomorrow from 18:00.', at: minsAgo(60 * 50), read: true, link: { route: 'facility', params: { id: 'dartmouth-tennis' } } },
    { id: 'n6', type: 'cancellation', title: 'Booking cancelled', body: 'Cage 2 at Camden Cages was cancelled.', at: ago(10, 9), read: true, link: { route: 'booking', params: { id: 'b6' } } },
    { id: 'n5', type: 'refund', title: 'Refund sent', body: `${'£'}${(b6src.booking.total / 100).toFixed(2)} is on its way to your Visa •••• 4242.`, at: ago(10, 9), read: true, link: { route: 'booking', params: { id: 'b6' } } },
    { id: 'n7', type: 'achievement', title: 'Achievement unlocked: 10 Games', body: 'Double figures. Nice.', at: ago(30, 21), read: true, link: { route: 'achievements' } },
  ];

  return {
    ...base,
    account: { id: 'me', email: 'david@example.com', firstName: 'David', lastName: 'Mensah', username: 'davidplays', color: '#3d5a4a', ageGroup: 'adult', joined: '2025-11-03', demo: true },
    onboarded: true,
    profile: {
      sports: [
        { sport: 'football', level: 'intermediate' },
        { sport: 'padel', level: 'casual' },
        { sport: 'tennis', level: 'casual' },
      ],
      attendance: { attended: 24, lateCancels: 1, noShows: 0 },
      gamesPlayed: 24,
      achievements: [
        { id: 'first-game', at: '2025-11-08' },
        { id: 'games-5', at: '2025-12-14' },
        { id: 'games-10', at: '2026-02-19' },
        { id: 'all-rounder', at: '2026-05-02' },
        { id: 'rock-solid', at: '2026-08-11' },
      ],
      stats: [
        { sport: 'football', values: { games: 18, goals: 14, assists: 9, wins: 10 }, form: ['W', 'W', 'L', 'D', 'W'], weekly: [1, 2, 1, 2, 2, 1, 2, 2] },
        { sport: 'padel', values: { matches: 4, wins: 2, winRate: 50 }, form: ['W', 'L', 'W', 'L'], weekly: [0, 0, 1, 0, 1, 0, 1, 1] },
        { sport: 'tennis', values: { matches: 2, wins: 1, winRate: 50, rating: 3.1 }, form: ['W', 'L'], weekly: [0, 0, 0, 0, 1, 0, 0, 1] },
      ],
      venues: ['highgate-sc', 'tufnell-pitch', 'dartmouth-tennis', 'camden-cages', 'archway-padel', 'finsbury-hub'],
      earlyGames: 1,
      tournaments: 0,
      bio: 'Midfielder. Will play anywhere if you need a keeper.',
    },
    prefs: { ...DEFAULT_PREFS, distance: 3, times: ['evening'], days: [1, 2, 3, 4, 6] },
    location: { label: 'Tufnell Park', lat: 51.5567, lng: -0.138, source: 'manual' },
    bookings: bookings.map((b) => b.booking),
    payments: [
      ...bookings.map((b) => b.payment),
      { id: 'pay_g5', amount: 550, methodId: VISA.id, description: 'Doubles at Dartmouth Park Tennis Club', status: 'succeeded', refunded: 0, providerRef: 'pi_demo_g5', createdAt: ago(1, 9) },
    ],
    paymentMethods: [VISA, APPLE],
    games: [g21].map((g) => ({ ...g, start: g21Start.toISOString() })),
    gamePlayers,
    messages,
    notifications,
    saved: [
      { facilityId: 'highgate-sc', at: ago(40) },
      { facilityId: 'archway-padel', at: ago(12) },
      { facilityId: 'gospel-oak-lido', at: ago(3) },
    ],
    following: DEMO_FRIENDS,
    recentSearches: ['padel', 'Highgate'],
  };
}
