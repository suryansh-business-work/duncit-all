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
  /** Google signup only: the skippable "got a referral code?" step. */
  ReferralPrompt: undefined;
  /** Account menu as its own page (URL /menu) — Back/refresh work. */
  Menu: undefined;
  Home: NavigatorScreenParams<TabParamList> | undefined;
  Search: undefined;
  // verifyEmail scrolls straight to the email-verification section, the RN twin
  // of mWeb's /profile?verifyEmail=1.
  Profile: { verifyEmail?: boolean } | undefined;
  Account: undefined;
  AccountHealth: undefined;
  Verification: undefined;
  VenueHealth: { venueId: string };
  Saved: undefined;
  PodHistory: undefined;
  PodHistoryDetails: { membershipId: string };
  /** Booking deep link from the receipt email; forwards to the pod detail. */
  Booking: { bookingId: string };
  BecomeHost: undefined;
  HostManage: undefined;
  HostApply: undefined;
  HostDashboard: undefined;
  Wallet: undefined;
  CreatePod: { draftId?: string } | undefined;
  /** Post-create waiting screen while the venue slot request is PENDING. */
  PodPending: { podId: string };
  RegisterVenue: undefined;
  VenueManage: undefined;
  VenueEarnings: undefined;
  VenueSlotRequests: undefined;
  Earn: undefined;
  ListProduct: undefined;
  BeClubAdmin: undefined;
  /** Club Studio — pods across the clubs the signed-in user administers. */
  ClubManage: undefined;
  ProductsManage: undefined;
  Support: undefined;
  Sos: undefined;
  Callback: undefined;
  ChatWithUs: undefined;
  LiveChat: undefined;
  AllSupportTickets: undefined;
  Feedback: undefined;
  Grievance: undefined;
  TicketDetails: { ticketId: string };
  PodIdeas: undefined;
  Referral: undefined;
  DuncitCoin: undefined;
  Faqs: undefined;
  TourGuide: undefined;
  PodPlans: undefined;
  Policies: undefined;
  SupportTickets: { podId?: string; podTitle?: string } | undefined;
  Policy: { slug: string };
  ChatRoom: { podId: string; title: string };
  // Always the slug pair (/club/:clubSlug/pod/:podSlug) — both in-app taps and
  // shared mWeb deep links — so the web URL matches mWeb exactly; resolved to a
  // doc id via podBySlugs. podId/title stay for back-compat with older links.
  PodDetails: { podId?: string; clubSlug?: string; podSlug?: string; title?: string };
  /** Rating form behind the link a host shares — mWeb's /pod/:podId/feedback. */
  PodFeedback: { podId: string };
  // Always the club slug (/club/:clubSlug) — in-app taps and shared deep links —
  // resolved to a doc id via clubBySlug. clubId/title stay for back-compat.
  ClubDetails: { clubId?: string; clubSlug?: string; title?: string };
  // initialIndex = pod index to land on ("See all" continues after the home
  // rail's cap).
  PreviousPods: { initialIndex?: number } | undefined;
  HappeningNearby: { initialIndex?: number } | undefined;
  // Pod-membership checkout (pod_amount only — never carries products).
  Checkout: { podId: string; seats?: number };
  // Standalone product checkout — EVERY cart line pays in one product payment.
  ProductCheckout: undefined;
  Cart: undefined;
  Shop: undefined;
  OrdersHistory: undefined;
  AddressBook: undefined;
  ProductDetail: { productId: string };
  HostsVenues: undefined;
  Venues: undefined;
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
  | 'PodPending'
  | 'Policy'
  | 'TicketDetails'
  | 'Login'
  | 'Signup'
  | 'ForgotPassword'
  | 'ResetPassword'
  | 'Survey'
  | 'ReferralPrompt'
  | 'ChatRoom'
  | 'PodDetails'
  | 'PodFeedback'
  | 'ClubDetails'
  | 'PodHistoryDetails'
  | 'Booking'
  | 'VenueHealth'
  | 'PublicProfile'
  | 'PostDetail'
  | 'Follow'
  | 'VenueDetails'
  | 'Checkout'
  | 'ProductCheckout'
  | 'ProductDetail'
>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
