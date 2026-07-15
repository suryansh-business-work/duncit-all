import type { NavigatorScreenParams } from '@react-navigation/native';

import type { TabParamList } from '@/navigation/tabs';

/** The single React Navigation stack. Auth/Survey/App screens are gated by the
 * auth store, but they share one param list for typed navigation everywhere. */
export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email: string };
  Survey: undefined;
  /** Account drawer as a routable overlay (URL /menu) — Back/refresh work. */
  Menu: undefined;
  Home: NavigatorScreenParams<TabParamList> | undefined;
  Search: undefined;
  Profile: undefined;
  Account: undefined;
  AccountHealth: undefined;
  Verification: undefined;
  VenueHealth: { venueId: string };
  Saved: undefined;
  PodHistory: undefined;
  PodHistoryDetails: { membershipId: string };
  BecomeHost: undefined;
  HostManage: undefined;
  HostApply: undefined;
  HostDashboard: undefined;
  Wallet: undefined;
  CreatePod: { draftId?: string } | undefined;
  RegisterVenue: undefined;
  VenueManage: undefined;
  VenueEarnings: undefined;
  Earn: undefined;
  ListProduct: undefined;
  ProductsManage: undefined;
  Support: undefined;
  Sos: undefined;
  Callback: undefined;
  ChatWithUs: undefined;
  LiveChat: undefined;
  AllSupportTickets: undefined;
  TicketDetails: { ticketId: string };
  PodIdeas: undefined;
  Referral: undefined;
  Faqs: undefined;
  PodPlans: undefined;
  Policies: undefined;
  SupportTickets: { podId?: string; podTitle?: string } | undefined;
  Policy: { slug: string };
  ChatRoom: { podId: string; title: string };
  PodDetails: { podId: string; title: string };
  ClubDetails: { clubId: string; title: string };
  PreviousPods: undefined;
  HappeningNearby: undefined;
  Checkout: { podId: string; selectedProducts?: { product_id: string; quantity: number }[] };
  HostsVenues: undefined;
  PublicProfile: { userId: string };
  PostDetail: { postId: string };
  Follow: { userId: string; tab: 'followers' | 'following' };
  VenueDetails: { venueId: string };
  NotFound: undefined;
};

/** Param-less destinations reachable from the account drawer menu. */
export type MenuRoute = Exclude<
  keyof RootStackParamList,
  | 'Menu'
  | 'CreatePod'
  | 'Policy'
  | 'TicketDetails'
  | 'Login'
  | 'Signup'
  | 'ForgotPassword'
  | 'ResetPassword'
  | 'Survey'
  | 'ChatRoom'
  | 'PodDetails'
  | 'ClubDetails'
  | 'PodHistoryDetails'
  | 'VenueHealth'
  | 'PublicProfile'
  | 'PostDetail'
  | 'Follow'
  | 'VenueDetails'
  | 'Checkout'
>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
