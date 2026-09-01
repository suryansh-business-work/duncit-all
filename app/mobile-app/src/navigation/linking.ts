import { getStateFromPath, type LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';

import { bookingIdFromPath, rememberPendingBooking } from '@/navigation/pendingBooking';
import { useAuthStore } from '@/stores/auth.store';
import type { RootStackParamList } from '@/navigation/types';

/**
 * Deep-link / URL config so the web build's address bar reflects the active
 * route (mirrors mWeb's paths: /explore, /clubs, /pod/:id …). The five tabs live
 * under the `Home` stack screen, so they're nested under it.
 */
export const linking: LinkingOptions<RootStackParamList> = {
  // The custom scheme (duncit://) plus the mWeb origin: a shared mWeb link
  // opens the installed app via Android App Links / the OS chooser (app.json
  // android.intentFilters). Verified App Links additionally need
  // /.well-known/assetlinks.json served from mweb.duncit.com with the Play
  // signing cert's SHA-256 fingerprint.
  prefixes: [Linking.createURL('/'), 'https://mweb.duncit.com'],
  // A booking link that lands while signed out would resolve to a screen the
  // auth-gated stack has not rendered, and React Navigation would silently drop
  // it. Park the booking id and send the user to Login instead — RootNavigator
  // replays it after sign-in, the native twin of mWeb's `?redirect`.
  getStateFromPath: (path, options) => {
    const bookingId = bookingIdFromPath(path);
    // Park whenever the Booking screen is NOT in the rendered stack — that is
    // signed out (Login only) AND signed in with the survey still pending
    // (Survey only). Checking the token alone covered the first case only: a
    // user mid-survey had the link silently dropped by React Navigation, with
    // nothing parked to replay once RootNavigator swapped in the app stack.
    const { token, surveyCompleted } = useAuthStore.getState();
    if (bookingId && (!token || !surveyCompleted)) {
      rememberPendingBooking(bookingId);
      return getStateFromPath(token ? '/survey' : '/login', options);
    }
    return getStateFromPath(path, options);
  },
  config: {
    screens: {
      Login: 'login',
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
          Chats: 'chats',
          Following: 'following',
        },
      },
      Search: 'search',
      Profile: 'profile',
      Account: 'account',
      AccountHealth: 'account/health',
      // Both preference screens use mWeb's paths. MailPreference was shipped
      // without a URL, so the web export had no address for it at all.
      MailPreference: 'account/mail-preference',
      WhatsAppPreference: 'account/whatsapp-preference',
      SmsPreference: 'account/sms-preference',
      VenueHealth: 'venues/:venueId/health',
      Saved: 'saved',
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
      Earn: 'earn',
      RegisterVenue: 'register-venue',
      VenueManage: 'venues/manage',
      VenueEarnings: 'venues/earnings',
      // Auto Pods, on mWeb's exact paths — the server's enrolment
      // notifications carry these three URLs verbatim.
      VenueAutoPods: 'venues/auto-pods',
      HostAutoPods: 'host/auto-pods',
      ClubAutoPods: 'clubs/auto-pods',
      ProductsManage: 'products/manage',
      ClubManage: 'clubs/manage',
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
      Badges: 'badges',
      TourGuide: 'tour-guide',
      PodPlans: 'pod-plans',
      Policies: 'policies',
      SupportTickets: 'support/tickets',
      Policy: 'policies/:slug',
      ChatRoom: 'chats/:podId',
      // Pod + club deep links use the exact mWeb URL grammar (slug-based) so a
      // link shared from mWeb opens the same screen in the app. The screens
      // resolve the slug → doc id via podBySlugs / clubBySlug.
      PodDetails: 'club/:clubSlug/pod/:podSlug',
      // The rating link a host shares. Same grammar as mWeb, so the link opens
      // the app when it is installed and the browser when it is not.
      PodFeedback: 'pod/:podId/feedback',
      ClubDetails: 'club/:clubSlug',
      HostsVenues: 'hosts-venues',
      Venues: 'venues',
      // The segment is the @handle on every link shared since handles
      // existed, and a raw user id on the ones shared before. The server
      // resolves both, so the pattern stays one param either way.
      PublicProfile: 'u/:userId',
      PostDetail: 'post/:postId',
      VenueDetails: 'venue/:venueId',
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
      Cart: 'cart',
      OrdersHistory: 'orders',
      ProductDetail: 'product/:productId',
      Feedback: 'support/feedback',
      Grievance: 'support/grievance',
      NotFound: '*',
    },
  },
};
