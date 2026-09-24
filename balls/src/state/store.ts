import { useSyncExternalStore } from 'react';
import type {
  AgeGroup,
  AttendanceRecord,
  Booking,
  Game,
  GamePlayer,
  Message,
  Notification,
  NotificationPrefs,
  Payment,
  PaymentMethod,
  Preferences,
  PrivacyPrefs,
  Registration,
  Report,
  Review,
  SportLevel,
  StatLine,
  UserLocation,
  Waitlist,
} from '../data/types';
import type { MaintenanceBlock } from '../services/availability';

/**
 * Client state. Everything the signed-in user creates or changes lives here and
 * is persisted locally; catalogue data (venues, public games, events) is read
 * from the data layer. In production most of this would be server state behind
 * the same action functions.
 */

export interface Account {
  id: 'me';
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  color: string;
  photo?: string;
  ageGroup: AgeGroup;
  joined: string;
  demo: boolean;
}

export interface Profile {
  sports: SportLevel[];
  attendance: AttendanceRecord;
  gamesPlayed: number;
  achievements: Array<{ id: string; at: string }>;
  stats: StatLine[];
  venues: string[];
  earlyGames: number;
  tournaments: number;
  bio: string;
}

export interface Settings {
  theme: 'system' | 'light' | 'dark';
  simulateErrors: boolean;
}

export interface AppState {
  v: 1;
  account: Account | null;
  onboarded: boolean;
  profile: Profile;
  prefs: Preferences;
  location: UserLocation | null;
  notificationPrefs: NotificationPrefs;
  privacy: PrivacyPrefs;
  bookings: Booking[];
  payments: Payment[];
  paymentMethods: PaymentMethod[];
  games: Game[];
  gamePlayers: GamePlayer[];
  messages: Message[];
  notifications: Notification[];
  reviews: Review[];
  saved: Array<{ facilityId: string; at: string }>;
  waitlists: Waitlist[];
  reports: Report[];
  blocked: string[];
  following: string[];
  registrations: Registration[];
  recentSearches: string[];
  blocks: MaintenanceBlock[];
  priceOverrides: Record<string, { offPeak: number; peak: number }>;
  alerts: string[];
  mutedChats: string[];
  settings: Settings;
}

export const DEFAULT_PREFS: Preferences = {
  distance: 3,
  times: ['evening'],
  days: [1, 2, 3, 4, 5],
  mapsApp: 'ask',
  splitByDefault: true,
  defaultDuration: 60,
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  bookings: true,
  games: true,
  waitlist: true,
  invitations: true,
  messages: true,
  payments: true,
  competitions: true,
  achievements: true,
  reminders: true,
};

export const DEFAULT_PRIVACY: PrivacyPrefs = {
  visibility: 'everyone',
  showOnLeaderboards: true,
  showArea: true,
  invitesFrom: 'everyone',
};

export function emptyState(settings?: Settings): AppState {
  return {
    v: 1,
    account: null,
    onboarded: false,
    profile: { sports: [], attendance: { attended: 0, lateCancels: 0, noShows: 0 }, gamesPlayed: 0, achievements: [], stats: [], venues: [], earlyGames: 0, tournaments: 0, bio: '' },
    prefs: DEFAULT_PREFS,
    location: null,
    notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
    privacy: DEFAULT_PRIVACY,
    bookings: [],
    payments: [],
    paymentMethods: [],
    games: [],
    gamePlayers: [],
    messages: [],
    notifications: [],
    reviews: [],
    saved: [],
    waitlists: [],
    reports: [],
    blocked: [],
    following: [],
    registrations: [],
    recentSearches: [],
    blocks: [],
    priceOverrides: {},
    alerts: [],
    mutedChats: [],
    settings: settings ?? { theme: 'system', simulateErrors: false },
  };
}

// ---------------------------------------------------------------- persistence

const KEY = 'balls.state.v1';

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as AppState;
    if (parsed?.v !== 1) return emptyState();
    // Fill any fields added since the state was saved.
    return { ...emptyState(), ...parsed };
  } catch {
    return emptyState();
  }
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
function persist(s: AppState) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* storage unavailable (private mode, sandbox) — the app still works in memory */
    }
  }, 250);
}

// ---------------------------------------------------------------- store

let state: AppState = load();
const listeners = new Set<() => void>();

export function getState(): AppState {
  return state;
}

export function setState(update: (s: AppState) => AppState) {
  const next = update(state);
  if (next === state) return;
  state = next;
  persist(state);
  listeners.forEach((l) => l());
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Subscribe a component to app state. */
export function useApp(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}
