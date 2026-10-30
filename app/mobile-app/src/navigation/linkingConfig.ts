import type { LinkingOptions } from '@react-navigation/native';

import type { LoginMethod, RootStackParamList } from '@/navigation/types';

const LOGIN_STEP_BY_SEGMENT: Record<string, LoginMethod | undefined> = {
  'with-otp': 'OTP',
  'with-password': 'PASSWORD',
};

/**
 * The screen ↔ URL map (mirrors mWeb's paths: /explore, /clubs, /pod/:id …).
 * The five tabs live under the `Home` stack screen, so they're nested under it.
 *
 * Its own module so the notification tap router (`utils/notification-link.ts`)
 * can open any mWeb path a notification carries on the same screen a shared
 * link would, without pulling in the deep-link prefixes `linking.ts` builds.
 */
export const linkingConfig: NonNullable<LinkingOptions<RootStackParamList>['config']> = {
  screens: {
    // The chosen sign-in method is its own entry, as on mWeb: /login/with-otp.
    Login: {
      path: 'login/:step?',
      parse: { step: (segment: string) => LOGIN_STEP_BY_SEGMENT[segment] },
      stringify: { step: (step: string) => (step === 'OTP' ? 'with-otp' : 'with-password') },
    },
    Signup: 'signup',
    ForgotPassword: 'forgot-password',
    Survey: 'survey',
    Menu: 'menu',
    Home: {
      path: '',
      screens: {
        HomeTab: '',
        Explore: 'explore',
        Clubs: 'clubs',
        Venues: 'venues',
        Cart: 'cart',
      },
    },
    // Both were tabs; they are pushed screens now, opened from the menu.
    Chats: 'chats',
    Following: 'following',
    Search: 'search',
    Profile: 'profile',
    Account: 'account',
    AccountHealth: 'account/health',
    // Both preference screens use mWeb's paths. MailPreference was shipped
    // without a URL, so the web export had no address for it at all.
    MailPreference: 'account/mail-preference',
    Privacy: 'account/privacy',
    WhatsAppPreference: 'account/whatsapp-preference',
    SmsPreference: 'account/sms-preference',
    VenueHealth: 'venues/:venueId/health',
    Saved: 'saved',
    Contacts: 'contacts',
    PodHistory: 'pod-history',
    PodHistoryDetails: 'pod-history/:membershipId',
    // Booking deep link from the payment-receipt email — resolves the booking
    // server-side and forwards to its pod detail screen.
    Booking: 'booking/:bookingId',
    PreviousPods: { path: 'previous-pods', parse: { initialIndex: Number } },
    BecomeHost: 'become-host',
    HostManage: 'host/manage',
    HostDashboard: 'host/dashboard',
    HostApply: 'host/apply',
    Verification: 'verification',
    Wallet: 'host/wallet',
    CreatePod: 'create-pod',
    PodPending: 'host/pod-pending/:podId',
    // Mirrors mWeb's /host/pod/:podId/attendance exactly.
    PodAttendance: 'host/pod/:podId/attendance',
    // Both mirror mWeb exactly, so a shared challenge link opens the app when
    // it is installed and the browser when it is not.
    HostPodChallenges: 'host/pod/:podId/challenges',
    ChallengeArena: 'pod/:podId/challenges/:challengeId/live',
    Earn: 'earn',
    RegisterVenue: 'register-venue',
    VenueManage: 'venues/manage',
    VenueEarnings: 'venues/earnings',
    // Old paths kept resolving: both open the screens that replaced them.
    VenueSlotRequests: 'venues/slot-requests',
    VenueEventRequests: 'venues/event-requests',
    // The owner's calendar and policy, on mWeb's exact paths.
    VenueAvailability: 'venues/availability',
    VenuePricing: 'venues/pricing',
    VenueSettings: 'venues/settings',
    // Pod Requests, on mWeb's exact paths — notifications carry /pod-requests/:id.
    NearbyHosts: 'venues/nearby-hosts',
    NearbyVenues: 'host/nearby-venues',
    HostPodRequests: 'host/pod-requests',
    VenuePodRequests: 'venues/pod-requests',
    PodRequestDetail: 'pod-requests/:id',
    // Auto Pods, on mWeb's exact paths — the server's enrolment
    // notifications carry these three URLs verbatim.
    VenueAutoPods: 'venues/auto-pods',
    ChangeRequests: 'change-requests',
    HostAutoPods: 'host/auto-pods',
    ClubAutoPods: 'clubs/auto-pods',
    ProductsManage: 'products/manage',
    // The studios' Options pages and the venue pages they open, on mWeb's paths.
    VenueOptions: 'venues/options',
    HostOptions: 'host/options',
    ClubOptions: 'clubs/options',
    BrandOptions: 'products/options',
    VenueList: 'venues/list',
    VenuePublish: 'venues/publish',
    HostPublish: 'host/publish',
    HostShare: 'host/share',
    HostCategories: 'host/categories',
    VenuePods: 'venues/pods',
    VenueChats: 'venues/chats',
    // The venue's food desk, on mWeb's paths.
    VenueFoodDashboard: 'venues/food-dashboard',
    VenueFoodMenu: 'venues/food-menu',
    VenueFoodOrders: 'venues/food-orders',
    VenueFoodCoupons: 'venues/food-coupons',
    VenueRentedItems: 'venues/rented-items',
    // The brand desk, on mWeb's paths.
    BrandOrders: 'products/orders',
    BrandOrderDetail: 'products/orders/:id',
    BrandWarehouses: 'products/warehouses',
    ClubManage: 'clubs/manage',
    // The Club Admin's pages, on mWeb's exact paths (rule 27).
    ClubAdminDashboard: 'clubs/dashboard',
    ClubPodMonitoring: 'clubs/monitoring',
    ClubPods: 'clubs/:clubId/pods',
    ClubPodEditor: 'clubs/:clubId/pods/new',
    ClubPodEdit: 'clubs/:clubId/pods/:podId/edit',
    // Declared AFTER the two above so `new` and `…/edit` keep their own
    // screens: this pattern would otherwise swallow both path shapes.
    ClubPodDetails: 'clubs/:clubId/pods/:podId',
    ClubEdit: 'clubs/:clubId/edit',
    BeClubAdmin: 'be-club-admin',
    Support: 'support',
    Sos: 'support/sos',
    Callback: 'support/callback',
    ChatWithUs: 'support/chat',
    LiveChat: 'live-chat',
    AllSupportTickets: 'support/all',
    TicketDetails: 'tickets/:ticketId',
    PodIdeas: 'pod-ideas',
    Referral: 'referral',
    DuncitCoin: 'duncit-coin',
    HappeningNearby: { path: 'happening-nearby', parse: { initialIndex: Number } },
    Faqs: 'faqs',
    Tutorials: 'learnings',
    Badges: 'badges',
    TourGuide: 'tour-guide',
    PodPlans: 'pod-plans',
    Policies: 'policies',
    SupportTickets: 'support/tickets',
    Policy: 'policies/:slug',
    ChatRoom: 'chats/:podId',
    // A venue booking's private thread, on mWeb's exact path (also the push link).
    VenueChat: 'venue-chat/:podId',
    // Pod + club deep links use the exact mWeb URL grammar (slug-based) so a
    // link shared from mWeb opens the same screen in the app. The screens
    // resolve the slug → doc id via podBySlugs / clubBySlug.
    PodDetails: 'club/:clubSlug/pod/:podSlug',
    // The rating link a host shares. Same grammar as mWeb, so the link opens
    // the app when it is installed and the browser when it is not.
    PodFeedback: 'pod/:podId/feedback',
    ClubDetails: 'club/:clubSlug',
    HostsVenues: 'hosts-venues',
    // The segment is the @handle on every link shared since handles
    // existed, and a raw user id on the ones shared before. The server
    // resolves both, so the pattern stays one param either way.
    PublicProfile: 'u/:userId',
    PostDetail: 'post/:postId',
    VenueDetails: 'venue/:venueId',
    // A food order placed from the venue's menu, on mWeb's exact path. The
    // access key rides as `?key=`, which lands in the route params as `key` —
    // as `?feedback=1` lands as `feedback`.
    VenueFoodOrder: 'venue/:venueId/food-order/:orderId',
    // A dish's own page and Your Food Orders, on mWeb's exact paths.
    VenueFoodItem: 'venue/:venueId/food/:itemId',
    MyFoodOrders: 'food-orders',
    MyRentedItems: 'rented-items',
    // Gig Jobs on mWeb's exact paths — the poster's interest notification links to /gigs/:id.
    GigJobs: 'gigs',
    GigJobForm: 'gigs/new',
    MyGigJobs: 'gigs/mine',
    GigJobDetail: 'gigs/:id',
    FreelancerProfile: 'earn/freelancer',
    // The link a member shares from a city's waitlist, on mWeb's exact path.
    CityLaunch: 'city-launch/:locationId',
    Checkout: 'checkout/:podId',
    ProductCheckout: 'product-checkout',
    AddressBook: 'address-book',
    Leaderboard: 'leaderboard',
    Membership: 'membership',
    // Gift cards, using mWeb's paths — the claim link mailed with every card
    // is an mWeb URL, so it must open the app on the card, not NotFound.
    GiftCards: 'gift-cards',
    GiftCardCheckout: 'gift-cards/checkout',
    GiftCardRedeem: 'gift-cards/redeem',
    GiftCardClaim: 'gift-card/:code',
    // The shop, using mWeb's paths. These screens have existed all along but
    // were missing from this map, so a shared /shop or /product link opened
    // the app on NotFound — the one outcome worse than staying in the browser.
    Shop: 'shop',
    OrdersHistory: 'orders',
    OrderDetail: 'orders/:orderId',
    ProductDetail: 'product/:productId',
    Feedback: 'support/feedback',
    Grievance: 'support/grievance',
    NotFound: '*',
  },
};
