import type { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';

import type { RootStackParamList } from '@/navigation/types';

/**
 * Deep-link / URL config so the web build's address bar reflects the active
 * route (mirrors mWeb's paths: /explore, /clubs, /pod/:id …). The five tabs live
 * under the `Home` stack screen, so they're nested under it.
 */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/')],
  config: {
    screens: {
      Login: 'login',
      Signup: 'signup',
      ForgotPassword: 'forgot-password',
      ResetPassword: 'reset-password',
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
      VenueHealth: 'venues/:venueId/health',
      Saved: 'saved',
      PodHistory: 'pod-history',
      PodHistoryDetails: 'pod-history/:membershipId',
      BecomeHost: 'become-host',
      HostManage: 'host-manage',
      HostDashboard: 'host-dashboard',
      Verification: 'verification',
      Wallet: 'wallet',
      CreatePod: 'create-pod',
      RegisterVenue: 'register-venue',
      VenueManage: 'venue-manage',
      VenueEarnings: 'venue-earnings',
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
      HappeningNearby: 'happening-nearby',
      Faqs: 'faqs',
      PodPlans: 'pod-plans',
      Policies: 'policies',
      SupportTickets: 'support/tickets',
      Policy: 'policy/:slug',
      ChatRoom: 'chats/:podId',
      PodDetails: 'pod/:podId',
      ClubDetails: 'club/:clubId',
      HostsVenues: 'hosts-venues',
      PublicProfile: 'u/:userId',
      PostDetail: 'post/:postId',
      VenueDetails: 'venue/:venueId',
      Checkout: 'checkout/:podId',
      NotFound: '*',
    },
  },
};
