/**
 * BALLS domain model.
 *
 * These entities mirror the tables a real backend would expose. Entities refer
 * to each other by id (facilityId, userId, gameId…) instead of embedding copies,
 * so mock data can be swapped for API responses without reshaping the UI.
 *
 * Money is always stored as integer pence. Times are ISO strings in local time.
 */

export type ID = string;

// ---------------------------------------------------------------- Sports

export type SportId =
  | 'football'
  | 'basketball'
  | 'tennis'
  | 'padel'
  | 'badminton'
  | 'volleyball'
  | 'cricket'
  | 'rugby'
  | 'running'
  | 'gym'
  | 'swimming'
  | 'other';

export type SkillLevel = 'beginner' | 'casual' | 'intermediate' | 'advanced' | 'competitive';

export interface SportFormat {
  id: string;
  label: string; // "5-a-side"
  players: number; // total players on the court/pitch
}

export interface StatDef {
  id: string;
  label: string;
  /** How the value is displayed. */
  kind: 'count' | 'percent' | 'rating' | 'km';
  /** Whether this stat can be ranked on a leaderboard. */
  ranked?: boolean;
}

export interface Sport {
  id: SportId;
  name: string;
  /** What a bookable space is called for this sport: pitch, court, lane… */
  space: string;
  formats: SportFormat[];
  stats: StatDef[];
  /** Sport-specific attributes shown on a space, in display order. */
  attributes: string[];
}

// ---------------------------------------------------------------- Facilities

export type VenueType = 'indoor' | 'outdoor' | 'covered';

export type FeatureId =
  | 'changing'
  | 'showers'
  | 'parking'
  | 'floodlights'
  | 'equipment'
  | 'accessible'
  | 'toilets'
  | 'cafe'
  | 'seating';

export type FacilityKind = 'sports-centre' | 'club' | 'park' | 'gym' | 'pool' | 'court' | 'pitch';

export type ArtKind =
  | 'football'
  | 'basketball'
  | 'tennis'
  | 'padel'
  | 'badminton'
  | 'volleyball'
  | 'cricket'
  | 'rugby'
  | 'running'
  | 'gym'
  | 'swimming'
  | 'climbing'
  | 'changing'
  | 'entrance'
  | 'cafe'
  | 'seating'
  | 'equipment';

/** A generated venue image. Real photos would replace this with a URL. */
export interface ArtSpec {
  kind: ArtKind;
  caption: string;
  time?: 'day' | 'dusk' | 'night';
  /** Surface/colour variant, e.g. 'clay' for tennis, 'hardwood' for basketball. */
  variant?: string;
  seed?: number;
}

/** Opening hours by weekday (0 = Sunday). [open, close] in hours, null = closed. */
export type OpeningHours = Array<[number, number] | null>;

export interface CancellationPolicy {
  id: string;
  name: string;
  /** Full refund if cancelled at least this many hours before start. */
  fullRefundHours: number;
  /** Optional partial refund window. */
  partialRefundHours?: number;
  partialRefundPercent?: number;
  summary: string;
}

export interface BookingRules {
  durations: number[]; // minutes
  maxAdvanceDays: number;
  /** Peak pricing applies from this hour on weekdays, and all day at weekends. */
  peakFromHour: number;
}

/** A bookable space at a facility: Pitch 2, Court 4, Lane 3… (FacilitySports). */
export interface Space {
  id: ID;
  facilityId: ID;
  sport: SportId;
  name: string;
  venueType: VenueType;
  /** Sport-specific attributes, keyed by Sport.attributes. */
  attrs: Record<string, string>;
  capacity: number;
  /** Pence per hour (or per session when unit is 'session'). */
  offPeak: number;
  peak: number;
  unit: 'hour' | 'session';
  /** Walk-up spaces (public park courts) can't be booked; turn up and play. */
  walkUp?: boolean;
}

export interface RatingBreakdown {
  overall: number;
  surface: number;
  cleanliness: number;
  facilities: number;
  value: number;
}

export interface Facility {
  id: ID;
  name: string;
  kind: FacilityKind;
  area: string;
  address: string;
  postcode: string;
  lat: number;
  lng: number;
  description: string;
  images: ArtSpec[];
  openingHours: OpeningHours;
  features: FeatureId[];
  rating: RatingBreakdown;
  reviewCount: number;
  cancellationPolicyId: string;
  rules: BookingRules;
  /** Partner venues pay BALLS a commission, so players pay no booking fee. */
  partner: boolean;
  /** Date the venue joined BALLS (for "New" badges). */
  listedAt: string;
  highlights?: string[];
}

// ---------------------------------------------------------------- People

export interface SportLevel {
  sport: SportId;
  level: SkillLevel;
}

export type AgeGroup = 'u16' | 'u18' | 'adult';
export type ProfileVisibility = 'everyone' | 'players' | 'private';

/** Attendance record used to compute reliability. Written by the system only. */
export interface AttendanceRecord {
  attended: number;
  lateCancels: number;
  noShows: number;
}

export interface User {
  id: ID;
  name: string; // first name + last initial for public display
  username: string;
  color: string; // avatar colour
  photo?: string; // data URL for the signed-in user
  area: string; // approximate neighbourhood only — never an address
  sports: SportLevel[];
  gamesPlayed: number;
  attendance: AttendanceRecord;
  achievements: string[];
  joined: string;
  visibility: ProfileVisibility;
  ageGroup: AgeGroup;
  verified?: boolean;
  bio?: string;
}

// ---------------------------------------------------------------- Games

export type GameStatus = 'open' | 'full' | 'cancelled' | 'completed';
export type AgeRule = 'adults' | 'juniors' | 'all';

export interface Game {
  id: ID;
  creatorId: ID;
  sport: SportId;
  format?: string;
  facilityId: ID;
  spaceId?: ID;
  bookingId?: ID;
  start: string;
  end: string;
  level: SkillLevel;
  maxPlayers: number;
  pricePerPlayer: number; // pence
  description: string;
  status: GameStatus;
  visibility: 'public' | 'private';
  ageRule: AgeRule;
  createdAt: string;
}

export type PaymentState = 'paid' | 'pending' | 'free' | 'refunded';

export interface GamePlayer {
  gameId: ID;
  userId: ID;
  role: 'organiser' | 'player';
  status: 'joined' | 'invited' | 'left';
  payment: PaymentState;
  at: string;
}

export interface Message {
  id: ID;
  gameId: ID;
  userId: ID | null; // null = system message
  text: string;
  at: string;
}

// ---------------------------------------------------------------- Bookings & payments

export interface SplitShare {
  id: ID;
  userId?: ID;
  name: string;
  amount: number;
  status: 'paid' | 'pending';
  organiser?: boolean;
  paidAt?: string;
}

export interface Booking {
  id: ID;
  ref: string;
  userId: ID;
  facilityId: ID;
  spaceId: ID;
  sport: SportId;
  start: string;
  end: string;
  subtotal: number;
  fee: number;
  total: number;
  players: number;
  split: SplitShare[] | null;
  paymentId: ID;
  paymentStatus: 'paid' | 'refunded' | 'partly-refunded';
  status: 'confirmed' | 'completed' | 'cancelled';
  cancellation?: {
    at: string;
    refund: number;
    refundState: 'processing' | 'refunded' | 'none';
  };
  gameId?: ID;
  reviewed?: boolean;
  createdAt: string;
}

export type PaymentMethodBrand = 'visa' | 'mastercard' | 'amex' | 'apple-pay' | 'google-pay';

/**
 * A tokenised payment method. Card numbers never reach the app: the payment
 * provider returns an opaque token plus display details (brand, last 4).
 */
export interface PaymentMethod {
  id: ID;
  brand: PaymentMethodBrand;
  label: string;
  last4?: string;
  expiry?: string;
  token: string;
  isDefault: boolean;
}

export interface Payment {
  id: ID;
  amount: number;
  methodId: ID;
  description: string;
  status: 'succeeded' | 'refunded' | 'partly-refunded';
  refunded: number;
  providerRef: string;
  createdAt: string;
}

export interface Waitlist {
  id: ID;
  facilityId: ID;
  spaceId: ID;
  start: string;
  durationMins: number;
  position: number;
  status: 'waiting' | 'offered' | 'claimed' | 'expired' | 'left';
  offerExpiresAt?: string;
  createdAt: string;
}

// ---------------------------------------------------------------- Reviews

export interface Review {
  id: ID;
  facilityId: ID;
  userId: ID;
  rating: RatingBreakdown;
  text: string;
  photos?: ArtSpec[];
  /** Photos uploaded by the reviewer (data URLs in this prototype). */
  uploads?: string[];
  sport?: SportId;
  at: string;
}

// ---------------------------------------------------------------- Compete

export interface Team {
  id: ID;
  name: string;
  color: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  for: number;
  against: number;
  form: Array<'W' | 'D' | 'L'>;
}

export interface Fixture {
  id: ID;
  home: ID;
  away: ID;
  at: string;
  score?: [number, number];
}

export interface League {
  id: ID;
  name: string;
  sport: SportId;
  facilityId: ID;
  area: string;
  teams: Team[];
  maxTeams: number;
  season: string;
  startDate: string;
  night: string;
  entryFee: number; // per team per season
  level: SkillLevel;
  format: string;
  fixtures: Fixture[];
  description: string;
  freeAgents: boolean;
}

export interface Tournament {
  id: ID;
  name: string;
  sport: SportId;
  facilityId: ID;
  start: string;
  end: string;
  format: string;
  teamSize: number; // 1 for singles/individual events
  maxEntries: number;
  entries: number;
  entryFee: number;
  entryUnit: 'team' | 'player';
  level: SkillLevel;
  prize?: string;
  registration: 'open' | 'external' | 'closed';
  externalUrl?: string;
  closesAt: string;
  organiser: string;
  description: string;
  schedule: Array<{ time: string; label: string }>;
  rules: string[];
}

export type EventKind = 'tournament' | 'training' | 'competition' | 'camp' | 'community' | 'sporting-event';

export interface SportsEvent {
  id: ID;
  kind: EventKind;
  title: string;
  sport: SportId;
  facilityId: ID;
  start: string;
  end: string;
  price: number;
  capacity: number;
  taken: number;
  level?: SkillLevel;
  organiser: string;
  description: string;
  ageRule: AgeRule;
}

export interface Coach {
  id: ID;
  name: string;
  sports: SportId[];
  color: string;
  rating: number;
  reviewCount: number;
  bio: string;
  qualifications: string[];
  safeguarding: boolean; // DBS-checked
  area: string;
  from: number; // pence per hour, 1:1
  /** Where they coach. */
  venueId?: ID;
  /** Short line shown in lists, e.g. "Ex-tour player". */
  headline?: string;
}

export interface TrainingSession {
  id: ID;
  coachId: ID;
  sport: SportId;
  title: string;
  kind: 'one-to-one' | 'group' | 'class' | 'camp';
  facilityId: ID;
  start: string;
  durationMins: number;
  price: number;
  capacity: number;
  taken: number;
  level: SkillLevel;
  rating: number;
  description: string;
  ageRule: AgeRule;
}

export interface Shop {
  id: ID;
  name: string;
  kind: 'shop' | 'repairs' | 'physio' | 'stringing';
  description: string;
  area: string;
  lat: number;
  lng: number;
  rating: number;
  sports: SportId[];
  hours: string;
}

export interface StatLine {
  sport: SportId;
  values: Record<string, number>;
  /** Most recent results, newest first. */
  form: Array<'W' | 'D' | 'L'>;
  /** Games per week for the last 8 weeks, oldest first. */
  weekly: number[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  metric: 'games' | 'tournaments' | 'early' | 'venues' | 'sports' | 'reliability' | 'bookings';
  threshold: number;
  icon: string;
}

export interface LeaderboardRow {
  userId: ID;
  value: number;
}

// ---------------------------------------------------------------- Registrations & reports

export interface Registration {
  id: ID;
  kind: 'tournament' | 'league' | 'event' | 'training';
  targetId: ID;
  teamName?: string;
  asFreeAgent?: boolean;
  amount: number;
  status: 'confirmed' | 'cancelled';
  createdAt: string;
}

export type ReportTarget = 'user' | 'game' | 'facility' | 'message' | 'review';

export interface Report {
  id: ID;
  targetType: ReportTarget;
  targetId: ID;
  reason: string;
  details: string;
  status: 'received' | 'reviewing' | 'resolved';
  createdAt: string;
}

// ---------------------------------------------------------------- Notifications & feed

export type NotificationType =
  | 'booking-confirmed'
  | 'booking-reminder'
  | 'game-reminder'
  | 'player-joined'
  | 'player-left'
  | 'game-nearly-full'
  | 'waitlist'
  | 'venue-alert'
  | 'invitation'
  | 'message'
  | 'cancellation'
  | 'refund'
  | 'tournament'
  | 'payment'
  | 'achievement';

export type NotificationCategory =
  | 'bookings'
  | 'games'
  | 'waitlist'
  | 'invitations'
  | 'messages'
  | 'payments'
  | 'competitions'
  | 'achievements';

/** Where tapping a notification or feed item goes. */
export interface Link {
  route: string;
  params?: Record<string, string>;
}

export interface Notification {
  id: ID;
  type: NotificationType;
  title: string;
  body: string;
  at: string;
  read: boolean;
  link?: Link;
}

export interface FeedItem {
  id: ID;
  kind: 'tournament' | 'new-venue' | 'event' | 'training' | 'popular-game' | 'announcement';
  title: string;
  body: string;
  sport?: SportId;
  at: string;
  link: Link;
  art?: ArtSpec;
}

// ---------------------------------------------------------------- Preferences

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export interface UserLocation {
  label: string;
  lat: number;
  lng: number;
  source: 'device' | 'manual';
}

export interface Preferences {
  distance: number; // miles
  times: TimeOfDay[];
  days: number[]; // 0 = Sunday
  mapsApp: 'ask' | 'google' | 'apple' | 'citymapper' | 'waze';
  splitByDefault: boolean;
  defaultDuration: number;
}

export type NotificationPrefs = Record<NotificationCategory, boolean> & { reminders: boolean };

export interface PrivacyPrefs {
  visibility: ProfileVisibility;
  showOnLeaderboards: boolean;
  showArea: boolean;
  invitesFrom: 'everyone' | 'played-with' | 'nobody';
}

// ---------------------------------------------------------------- Friends & coaching

export interface FriendRequest {
  id: ID;
  userId: ID;
  /** 'out' = I asked them; 'in' = they asked me. */
  dir: 'in' | 'out';
  at: string;
}

/** A paid session with a coach. */
export interface Lesson {
  id: ID;
  coachId: ID;
  facilityId: ID;
  sport: SportId;
  start: string;
  end: string;
  players: 1 | 2;
  amount: number;
  paymentId: ID;
  status: 'confirmed' | 'cancelled';
  createdAt: string;
}
