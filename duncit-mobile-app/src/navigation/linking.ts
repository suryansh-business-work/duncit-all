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
      Saved: 'saved',
      PodHistory: 'pod-history',
      BecomeHost: 'become-host',
      HostManage: 'host-manage',
      RegisterVenue: 'register-venue',
      VenueManage: 'venue-manage',
      Support: 'support',
      PodIdeas: 'pod-ideas',
      Faqs: 'faqs',
      PodPlans: 'pod-plans',
      Policy: 'policy/:slug',
      ChatRoom: 'chats/:podId',
      PodDetails: 'pod/:podId',
      ClubDetails: 'club/:clubId',
    },
  },
};
