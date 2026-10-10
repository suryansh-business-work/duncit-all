import type { NavigatorScreenParams } from '@react-navigation/native';

import type { TabParamList } from '@/navigation/tabs';
import type { GoogleSignupHandoff } from '@duncit/utils';

import type { GiftCardSelection } from '@/utils/gift-cards';

/** The single React Navigation stack. Auth/Survey/App screens are gated by the
 * auth store, but they share one param list for typed navigation everywhere. */
export type RootStackParamList = {
  Login: undefined;
  /**
   * Optionally carrying the credential the login screen's "no Duncit account
   * yet" invite was answered with, so signup opens on the Google door already
   * holding it rather than on a button they have just pressed. The screen
   * CLAIMS it once: a param outlives the remount that re-reads it, and the
   * credential behind it must be spent exactly once.
   */
  Signup: { googleSignup?: GoogleSignupHandoff } | undefined;
  ForgotPassword: undefined;
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
  /** Profile Settings → Communication Preferences: the hub that lists the
   * three channels. Twin of mWeb's /account/communication. */
  CommPreference: undefined;
  /** Profile Settings → Privacy & data: tracking choices and the data download.
   * Twin of mWeb's /account/privacy. */
  Privacy: undefined;
  /** Communication Preferences → Mail, the twin of mWeb's /account/mail-preference. */
  MailPreference: undefined;
  /** Profile → WhatsApp Preference, mWeb's /account/whatsapp-preference. */
  WhatsAppPreference: undefined;
  /** Profile → SMS Preference, mWeb's /account/sms-preference. */
  SmsPreference: undefined;
  Verification: undefined;
  VenueHealth: { venueId: string };
  Saved: undefined;
  /** Your Contacts on Duncit, mWeb's /contacts. */
  Contacts: undefined;
  PodHistory: undefined;
  PodHistoryDetails: { membershipId: string };
  /** Booking deep link from the receipt email; forwards to the pod detail. */
  Booking: { bookingId: string };
  BecomeHost: undefined;
  HostManage: undefined;
  /** Host Studio > Your Pods > actions > See Marked Attendance. */
  PodAttendance: { podId: string };
  /** Host Studio > Your Pods > actions > Challenges. */
  HostPodChallenges: { podId: string };
  /** The full-screen Live Challenge Arena (also the published result). */
  /** `checkpoint` is what a scanned checkpoint QR link carries (`<tool>.<code>`). */
  ChallengeArena: { podId: string; challengeId: string; checkpoint?: string };
  /** A pod's own photos and videos — the host's, and the guests' from the link. */
  PodMedia: { podId: string };
  HostApply: undefined;
  HostDashboard: undefined;
  Wallet: undefined;
  /** `partnerRequestId` opens a fresh pod on a Pod Request's confirmed venue + slot. */
  CreatePod: { draftId?: string; partnerRequestId?: string } | undefined;
  /** Post-create waiting screen while the venue slot request is PENDING. */
  PodPending: { podId: string };
  RegisterVenue: undefined;
  VenueManage: undefined;
  VenueEarnings: undefined;
  VenueSlotRequests: undefined;
  /** /venues/nearby-hosts — Venue Studio's Search Nearby Hosts (mWeb's exact path). */
  NearbyHosts: undefined;
  /** /host/nearby-venues — Host Studio's Search Nearby Venues (mWeb's exact path). */
  NearbyVenues: undefined;
  /** Studio menu → Requests → Pod Requests, one inbox per side. */
  HostPodRequests: undefined;
  VenuePodRequests: undefined;
  /** /pod-requests/:id — one Pod Request; its notifications land here. */
  PodRequestDetail: { id: string };
  ChangeRequests: undefined;
  /** /venues/availability — the owner's slot calendar (mWeb's exact path). */
  VenueAvailability: undefined;
  /** /venues/settings — the owner's cancellation policy (mWeb's exact path). */
  VenueSettings: undefined;
  /** Auto Pods a venue may accept — the FIRST of the three enrolments. */
  VenueAutoPods: undefined;
  /** Auto Pods waiting for a host, once a venue has dated them. */
  HostAutoPods: undefined;
  /** Auto Pods waiting for a club admin to attach them to one of their clubs. */
  ClubAutoPods: undefined;
  Earn: undefined;
  ListProduct: undefined;
  BeClubAdmin: undefined;
  /** Club Studio — pods across the clubs the signed-in user administers. */
  ClubManage: undefined;
  /** /clubs/dashboard — the Club Admin's figures across every club they run. */
  ClubAdminDashboard: undefined;
  /** /clubs/monitoring — the AI-monitored trail of every pod edit in their clubs. */
  ClubPodMonitoring: undefined;
  /** /clubs/:clubId/pods — one club's pods. `notice` is what the editor just did. */
  ClubPods: { clubId: string; notice?: 'created' | 'updated' | 'draft' };
  /** /clubs/:clubId/pods/new — a new pod, pinned to the club. */
  ClubPodEditor: { clubId: string };
  /** /clubs/:clubId/pods/:podId/edit — the same editor over an existing pod. Its
   * own screen because React Navigation gives a screen ONE path and mWeb has two. */
  ClubPodEdit: { clubId: string; podId: string };
  /** /clubs/:clubId/pods/:podId — the club-scoped pod detail: roster, payments,
   * ratings and the audit trail. NOT the public pod page (rule 27). */
  ClubPodDetails: { clubId: string; podId: string };
  /** /clubs/:clubId/edit — the club's own page. */
  ClubEdit: { clubId: string };
  ProductsManage: undefined;
  /** The studios' Options pages — the one highlighted sidebar entry per studio. */
  VenueOptions: undefined;
  HostOptions: undefined;
  ClubOptions: undefined;
  BrandOptions: undefined;
  /** Venue Options → Your Venues, Publish Your Venue, Pods at Your Venue. */
  VenueList: undefined;
  VenuePublish: undefined;
  VenuePods: undefined;
  /** Host Options → Publish Your Host Page. */
  HostPublish: undefined;
  /** Brand Options → Brand Orders, one order, and ShipRocket Warehouses. */
  BrandOrders: undefined;
  BrandOrderDetail: { id: string };
  BrandWarehouses: undefined;
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
  Badges: undefined;
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
  Shop: undefined;
  OrdersHistory: undefined;
  AddressBook: undefined;
  Leaderboard: undefined;
  Membership: undefined;
  GiftCards: undefined;
  GiftCardCheckout: { selection: GiftCardSelection };
  GiftCardRedeem: undefined;
  GiftCardClaim: { code: string };
  ProductDetail: { productId: string };
  HostsVenues: undefined;
  /** Pod rooms and the people you follow. Both were bottom tabs; they are
   * pushed screens now, opened from the account menu's grid. */
  Chats: undefined;
  Following: undefined;
  /**
   * Someone else’s profile. `userId` carries the @handle when the link came
   * from a share (`/u/<handle>`) and a raw user id when it came from inside
   * the app; `publicUserProfile` resolves either.
   */
  PublicProfile: { userId: string };
  PostDetail: { postId: string };
  Follow: { userId: string; tab: 'followers' | 'following' };
  VenueDetails: { venueId: string };
  /** /city-launch/:locationId — a not-yet-launched city's waitlist (its slug, or Location.id). */
  CityLaunch: { locationId: string };
  NotFound: undefined;
};

/**
 * Param-less destinations reachable from the account drawer menu — the stack's
 * own screens plus the bottom tabs, because the menu's Shop group still offers
 * the Cart and the cart is a tab now. {@link TAB_ROUTE_NAMES} is how a caller
 * tells the two apart at runtime.
 */
export type MenuRoute = keyof TabParamList | MenuStackRoute;

/** The stack half of {@link MenuRoute}. */
export type MenuStackRoute = Exclude<
  keyof RootStackParamList,
  | 'Menu'
  | 'CreatePod'
  | 'PodRequestDetail'
  | 'PodPending'
  | 'PodAttendance'
  | 'HostPodChallenges'
  | 'ChallengeArena'
  | 'PodMedia'
  | 'Policy'
  | 'TicketDetails'
  | 'Login'
  | 'Signup'
  | 'ForgotPassword'
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
  | 'CityLaunch'
  | 'Checkout'
  | 'ProductCheckout'
  | 'ProductDetail'
  | 'GiftCardCheckout'
  | 'GiftCardClaim'
  | 'ClubPods'
  | 'ClubPodEditor'
  | 'ClubPodEdit'
  | 'ClubPodDetails'
  | 'ClubEdit'
  | 'BrandOrderDetail'
>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
