import { FACILITY_BY_ID, SPACE_BY_ID } from '../data/facilities';
import { DEMO_FRIENDS } from '../data/people';
import { ago, minsAgo, slot } from '../data/schedule';
import type { Booking, GamePlayer, Lesson, Message, Notification, Payment, PaymentMethod, SplitShare } from '../data/types';
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
    id: 'b1', ref: 'BL-7K2Q9', spaceId: 'hsc-pa', start: tonight.start, mins: 60, status: 'confirmed', players: 4, gameId: 'g21', createdAt: ago(4, 20),
    split: [['You', 'me', true], ['Sam O.', 'u2', true], ['Ben C.', 'u9', false]],
  });
  const b2 = booking({
    id: 'b2', ref: 'BL-P4DX2', spaceId: 'ap-1', start: slot(3, 18).start, mins: 90, status: 'confirmed', players: 4, createdAt: ago(2, 13),
    split: [['You', 'me', true], ['Leila H.', 'u10', true], ['Luca R.', 'u17', false], ['Priya S.', 'u3', false]],
  });
  const b3 = booking({ id: 'b3', ref: 'BL-9HT3C', spaceId: 'dpt-3', start: ago(5, 10), mins: 60, status: 'completed', players: 2, createdAt: ago(8, 21) });
  const b4 = booking({
    id: 'b4', ref: 'BL-2MWQ8', spaceId: 'hsc-t1', start: ago(12, 19), mins: 60, status: 'completed', players: 4, reviewed: true, createdAt: ago(15, 11),
    split: [['You', 'me', true], ['Sam O.', 'u2', true], ['Chloe E.', 'u8', true], ['Kai C.', 'u29', true]],
  });
  const b5 = booking({ id: 'b5', ref: 'BL-X8R4J', spaceId: 'tpt-1', start: ago(20, 20), mins: 60, status: 'completed', players: 2, createdAt: ago(23, 9) });
  const b6src = booking({ id: 'b6', ref: 'BL-C3NV7', spaceId: 'crp-2', start: ago(7, 20), mins: 60, status: 'cancelled', players: 4, createdAt: ago(12, 18) });
  const b6 = booking({
    id: 'b6', ref: 'BL-C3NV7', spaceId: 'crp-2', start: ago(7, 20), mins: 60, status: 'cancelled', players: 4, createdAt: ago(12, 18),
    cancellation: { at: ago(10, 9), refund: b6src.booking.total, refundState: 'refunded' },
  });

  const bookings = [b1, b2, b3, b4, b5, b6];

  const g21 = {
    id: 'g21', creatorId: 'me', sport: 'padel' as const, format: 'Doubles', facilityId: 'highgate-sc', spaceId: 'hsc-pa', bookingId: 'b1',
    start: b1.booking.start, end: b1.booking.end, level: 'intermediate' as const, maxPlayers: 4, pricePerPlayer: b1.booking.split![0].amount,
    description: 'Our regular doubles. Friendly but we keep score. I’ll bring balls.',
    status: 'open' as const, visibility: 'public' as const, ageRule: 'adults' as const, createdAt: ago(4, 20),
  };

  const lessonStart = new Date(slot(2, 10).start);
  const lesson: Lesson = {
    id: 'ls1', coachId: 'c1', facilityId: 'dartmouth-tennis', sport: 'tennis', start: lessonStart.toISOString(), end: addMinutes(lessonStart, 60).toISOString(),
    players: 1, amount: 4500, paymentId: 'pay_ls1', status: 'confirmed', createdAt: ago(1, 18),
  };

  const gp = (gameId: string, userId: string, payment: GamePlayer['payment'], role: GamePlayer['role'] = 'player', status: GamePlayer['status'] = 'joined', at = ago(3, 12)): GamePlayer => ({ gameId, userId, role, status, payment, at });
  const gamePlayers: GamePlayer[] = [
    gp('g21', 'me', 'paid', 'organiser', 'joined', ago(4, 20)),
    gp('g21', 'u2', 'paid'),
    gp('g21', 'u9', 'pending', 'player', 'joined', ago(1, 18)),
    gp('g3', 'me', 'paid', 'player', 'joined', ago(1, 9)),
  ];

  const messages: Message[] = [
    { id: 'dm1', gameId: 'g21', userId: null, text: 'You created the game.', at: minsAgo(60 * 24 * 4) },
    { id: 'dm2', gameId: 'g21', userId: null, text: 'Sam joined the game.', at: minsAgo(60 * 24 * 3.8) },
    { id: 'dm4', gameId: 'g21', userId: 'u2', text: 'Is it the padel court behind the tennis courts?', at: minsAgo(60 * 24 * 3.4) },
    { id: 'dm5', gameId: 'g21', userId: 'me', text: 'Yep, Padel A. I’ll bring balls.', at: minsAgo(60 * 24 * 3.3) },
    { id: 'dm6', gameId: 'g21', userId: null, text: 'Ben joined the game.', at: minsAgo(60 * 24 * 1) },
    { id: 'dm9', gameId: 'g21', userId: 'u9', text: 'Can’t wait. Anyone got a spare racket?', at: minsAgo(55) },
  ];

  const notifications: Notification[] = [
    { id: 'n9', type: 'message', title: 'Ben in padel doubles tonight', body: 'Can’t wait. Anyone got a spare racket?', at: minsAgo(55), read: false, link: { route: 'chat', params: { id: 'g21' } } },
    { id: 'n1', type: 'booking-reminder', title: 'Your game is coming up', body: 'Padel A at Highgate Sports Centre. Ben still owes his share.', at: minsAgo(120), read: false, link: { route: 'booking', params: { id: 'b1' } } },
    { id: 'n3', type: 'invitation', title: 'Nia wants to be friends', body: 'Accept to invite each other to games.', at: minsAgo(60 * 4), read: false, link: { route: 'friends' } },
    { id: 'n10', type: 'payment', title: 'Sam paid his share', body: `${'£'}${(b1.booking.split![1].amount / 100).toFixed(2)} for padel at Highgate Sports Centre.`, at: minsAgo(60 * 5), read: true, link: { route: 'booking', params: { id: 'b1' } } },
    { id: 'n11', type: 'booking-confirmed', title: 'Lesson booked with Maya', body: 'Your 1:1 tennis lesson at Dartmouth Park Tennis Club.', at: ago(1, 18), read: true, link: { route: 'lesson', params: { id: 'ls1' } } },
    { id: 'n8', type: 'venue-alert', title: 'Evening courts free at Dartmouth Park', body: 'Courts 3 and 4 have opened up tomorrow from 18:00.', at: minsAgo(60 * 50), read: true, link: { route: 'facility', params: { id: 'dartmouth-tennis' } } },
    { id: 'n6', type: 'cancellation', title: 'Booking cancelled', body: 'Court 2 at Camden Rooftop Padel was cancelled.', at: ago(10, 9), read: true, link: { route: 'booking', params: { id: 'b6' } } },
    { id: 'n5', type: 'refund', title: 'Refund sent', body: `${'£'}${(b6src.booking.total / 100).toFixed(2)} is on its way to your Visa •••• 4242.`, at: ago(10, 9), read: true, link: { route: 'booking', params: { id: 'b6' } } },
  ];

  return {
    ...base,
    account: { id: 'me', email: 'david@example.com', firstName: 'David', lastName: 'Mensah', username: 'davidplays', color: '#3d5a4a', ageGroup: 'adult', joined: '2025-11-03', demo: true },
    onboarded: true,
    profile: {
      sports: [
        { sport: 'padel', level: 'intermediate' },
        { sport: 'tennis', level: 'casual' },
      ],
      attendance: { attended: 24, lateCancels: 1, noShows: 0 },
      gamesPlayed: 24,
      achievements: [
        { id: 'first-game', at: '2025-11-08' },
        { id: 'games-5', at: '2025-12-14' },
        { id: 'games-10', at: '2026-02-19' },
        { id: 'rock-solid', at: '2026-08-11' },
      ],
      stats: [
        { sport: 'padel', values: { matches: 16, wins: 9, winRate: 56 }, form: ['W', 'W', 'L', 'W', 'L'], weekly: [1, 2, 1, 2, 2, 1, 2, 2] },
        { sport: 'tennis', values: { matches: 8, wins: 4, winRate: 50, rating: 3.1 }, form: ['W', 'L'], weekly: [0, 0, 1, 0, 1, 0, 0, 1] },
      ],
      venues: ['highgate-sc', 'tufnell-courts', 'dartmouth-tennis', 'camden-padel', 'archway-padel'],
      earlyGames: 1,
      tournaments: 0,
      bio: 'Padel on weeknights, tennis at the weekend.',
    },
    prefs: { ...DEFAULT_PREFS, distance: 3, times: ['evening'], days: [1, 2, 3, 4, 6] },
    location: { label: 'Tufnell Park', lat: 51.5567, lng: -0.138, source: 'manual' },
    bookings: bookings.map((b) => b.booking),
    payments: [
      ...bookings.map((b) => b.payment),
      { id: 'pay_g3', amount: 550, methodId: VISA.id, description: 'Doubles at Dartmouth Park Tennis Club', status: 'succeeded', refunded: 0, providerRef: 'pi_demo_g3', createdAt: ago(1, 9) },
      { id: 'pay_ls1', amount: 4500, methodId: VISA.id, description: 'Maya Okafor · Dartmouth Park Tennis Club', status: 'succeeded', refunded: 0, providerRef: 'pi_demo_ls1', createdAt: ago(1, 18) },
    ],
    paymentMethods: [VISA, APPLE],
    games: [g21],
    gamePlayers,
    messages,
    notifications,
    lessons: [lesson],
    saved: [
      { facilityId: 'highgate-sc', at: ago(40) },
      { facilityId: 'archway-padel', at: ago(12) },
      { facilityId: 'holloway-tennis', at: ago(3) },
    ],
    friends: DEMO_FRIENDS,
    friendRequests: [
      { id: 'fr1', userId: 'u28', dir: 'in', at: minsAgo(60 * 4) },
      { id: 'fr2', userId: 'u1', dir: 'in', at: minsAgo(60 * 30) },
    ],
    recentSearches: ['padel', 'Highgate'],
  };
}
