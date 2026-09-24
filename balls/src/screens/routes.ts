import type { ComponentType } from 'react';
import { BookingConfirmedScreen, BookingDetailScreen, BookingsScreen, BookScreen, CheckoutScreen } from './Booking';
import { CompeteScreen, LeaderboardScreen, LeagueScreen, LeaguesScreen, TournamentScreen, TournamentsScreen } from './Compete';
import { CoachScreen, EventScreen, EventsScreen, FeedScreen, NotificationsScreen, SearchScreen, ServicesScreen, SessionScreen, SportHubScreen, TrainingScreen } from './Discover';
import { CompareScreen, ExploreScreen } from './Explore';
import { FacilityScreen, ReviewsScreen, WriteReviewScreen } from './Facility';
import { HomeScreen } from './Home';
import { ChatScreen, CreateGameScreen, GameScreen, GamesScreen, PlayNowScreen } from './Play';
import { AchievementsScreen, EditProfileScreen, EditSportsScreen, FriendsScreen, MyReviewsScreen, PlayerScreen, ProfileScreen, SavedScreen, StatsScreen } from './Profile';
import {
  AccountSettings,
  AppearanceSettings,
  BlockedSettings,
  DemoSettings,
  HelpSettings,
  LegalSettings,
  LocationSettings,
  NotificationSettings,
  PartnerScreen,
  PaymentSettings,
  PlaySettings,
  PrivacySettings,
  ReportProblemSettings,
  SecuritySettings,
  SettingsScreen,
} from './Settings';

export interface ScreenComponentProps {
  params: Record<string, string | undefined>;
  routeKey: string;
  retap: number;
}

interface RouteDef {
  component: ComponentType<ScreenComponentProps>;
  /** Flow and detail screens with their own bottom action hide the tab bar. */
  hideTabBar?: boolean;
  /** Slides up rather than across (Play Now, Search). */
  modal?: boolean;
}

export const ROUTES: Record<string, RouteDef> = {
  // tab roots
  home: { component: HomeScreen },
  explore: { component: ExploreScreen },
  bookings: { component: BookingsScreen },
  compete: { component: CompeteScreen },
  profile: { component: ProfileScreen },

  // discovery
  search: { component: SearchScreen, hideTabBar: true, modal: true },
  notifications: { component: NotificationsScreen },
  sport: { component: SportHubScreen },
  feed: { component: FeedScreen },
  events: { component: EventsScreen },
  event: { component: EventScreen, hideTabBar: true },
  training: { component: TrainingScreen },
  session: { component: SessionScreen, hideTabBar: true },
  coach: { component: CoachScreen, hideTabBar: true },
  services: { component: ServicesScreen },
  compare: { component: CompareScreen },

  // venues & booking
  facility: { component: FacilityScreen, hideTabBar: true },
  reviews: { component: ReviewsScreen, hideTabBar: true },
  writeReview: { component: WriteReviewScreen, hideTabBar: true },
  book: { component: BookScreen, hideTabBar: true },
  checkout: { component: CheckoutScreen, hideTabBar: true },
  bookingConfirmed: { component: BookingConfirmedScreen, hideTabBar: true, modal: true },
  booking: { component: BookingDetailScreen },

  // play
  playNow: { component: PlayNowScreen as ComponentType<ScreenComponentProps>, hideTabBar: true, modal: true },
  games: { component: GamesScreen, hideTabBar: true },
  game: { component: GameScreen, hideTabBar: true },
  createGame: { component: CreateGameScreen, hideTabBar: true },
  chat: { component: ChatScreen, hideTabBar: true },

  // compete
  tournaments: { component: TournamentsScreen },
  tournament: { component: TournamentScreen, hideTabBar: true },
  leagues: { component: LeaguesScreen },
  league: { component: LeagueScreen, hideTabBar: true },
  leaderboard: { component: LeaderboardScreen },

  // profile
  player: { component: PlayerScreen, hideTabBar: true },
  stats: { component: StatsScreen, hideTabBar: true },
  achievements: { component: AchievementsScreen },
  saved: { component: SavedScreen },
  myReviews: { component: MyReviewsScreen },
  friends: { component: FriendsScreen },
  editProfile: { component: EditProfileScreen, hideTabBar: true },
  editSports: { component: EditSportsScreen, hideTabBar: true },

  // settings
  settings: { component: SettingsScreen },
  settingsAccount: { component: AccountSettings },
  settingsLocation: { component: LocationSettings },
  settingsPlay: { component: PlaySettings },
  settingsNotifications: { component: NotificationSettings },
  settingsAppearance: { component: AppearanceSettings },
  settingsPrivacy: { component: PrivacySettings },
  settingsSecurity: { component: SecuritySettings },
  settingsPayments: { component: PaymentSettings },
  settingsBlocked: { component: BlockedSettings },
  settingsHelp: { component: HelpSettings },
  settingsReport: { component: ReportProblemSettings, hideTabBar: true },
  settingsLegal: { component: LegalSettings },
  settingsDemo: { component: DemoSettings },
  partner: { component: PartnerScreen },
};
