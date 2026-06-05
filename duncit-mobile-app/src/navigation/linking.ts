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
      Profile: 'profile',
      Account: 'account',
      AccountHealth: 'account/health',
      VenueHealth: 'venues/:venueId/health',
      Saved: 'saved',
      PodHistory: 'pod-history',
      PodHistoryDetails: 'pod-history/:membershipId',
      BecomeHost: 'become-host',
      HostManage: 'host-manage',
      RegisterVenue: 'register-venue',
      VenueManage: 'venue-manage',
      Support: 'support',
      Sos: 'support/sos',
      Callback: 'support/callback',
      Feedback: 'support/feedback',
      PodIdeas: 'pod-ideas',
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
      VenueDetails: 'venue/:venueId',
      NotFound: '*',
    },
  },
};
