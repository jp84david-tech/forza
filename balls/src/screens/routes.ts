import { type ComponentType, createElement } from 'react';
import { SearchX } from 'lucide-react';
import { EmptyState, Screen } from '../components/ui';
import { FACILITY_BY_ID, SPACE_BY_ID, spacesFor } from '../data/facilities';
import { BookingConfirmedScreen, BookingDetailScreen, BookScreen, CheckoutScreen } from './Booking';
import { BookHubScreen, LessonScreen } from './BookHub';
import { CoachScreen, FriendsHubScreen } from './FriendsHub';
import { LeaderboardScreen, LeagueScreen, LeaguesScreen, TournamentScreen, TournamentsScreen } from './Compete';
import { EventScreen, EventsScreen, FeedScreen, NotificationsScreen, SearchScreen, ServicesScreen, SessionScreen, SportHubScreen, TrainingScreen } from './Discover';
import { CompareScreen, ExploreScreen } from './Explore';
import { FacilityScreen, ReviewsScreen, WriteReviewScreen } from './Facility';
import { HomeScreen } from './Home';
import { ChatScreen, CreateGameScreen, GameScreen, GamesScreen, PlayNowScreen } from './Play';
import { AchievementsScreen, EditProfileScreen, EditSportsScreen, MyReviewsScreen, PlayerScreen, ProfileScreen, SavedScreen, StatsScreen } from './Profile';
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
  /** Tab roots with the second switch above the tab bar (Book, Friends). */
  subbar?: boolean;
}

/** A screen for a venue, court or booking that doesn't exist (old link, removed venue). */
function NotFound({ what }: { what: string }) {
  const body = createElement(EmptyState, { icon: createElement(SearchX, { size: 24 }), title: `This ${what} isn’t available`, body: 'It may have been removed. Go back and try another.' });
  return createElement(Screen, { title: 'Not found', children: body });
}

/** Render `component` only when `ok(params)`; otherwise a friendly not-found screen. */
function guard(component: ComponentType<ScreenComponentProps>, what: string, ok: (p: ScreenComponentProps['params']) => boolean): ComponentType<ScreenComponentProps> {
  return function Guarded(props: ScreenComponentProps) {
    return ok(props.params) ? createElement(component, props) : createElement(NotFound, { what });
  };
}

const hasVenue = (p: ScreenComponentProps['params']) => !!FACILITY_BY_ID[p.id ?? ''];

export const ROUTES: Record<string, RouteDef> = {
  // tab roots
  home: { component: HomeScreen },
  explore: { component: ExploreScreen },
  bookHub: { component: BookHubScreen, subbar: true },
  friendsHub: { component: FriendsHubScreen, subbar: true },
  profile: { component: ProfileScreen },
  lesson: { component: LessonScreen, hideTabBar: true },

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
  facility: { component: guard(FacilityScreen, 'venue', hasVenue), hideTabBar: true },
  reviews: { component: guard(ReviewsScreen, 'venue', hasVenue), hideTabBar: true },
  writeReview: { component: guard(WriteReviewScreen, 'venue', hasVenue), hideTabBar: true },
  book: { component: guard(BookScreen, 'venue', (p) => !!FACILITY_BY_ID[p.facilityId ?? ''] && spacesFor(p.facilityId!).some((x) => !x.walkUp)), hideTabBar: true },
  checkout: { component: guard(CheckoutScreen, 'court', (p) => !!SPACE_BY_ID[p.spaceId ?? ''] && !!p.start), hideTabBar: true },
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
