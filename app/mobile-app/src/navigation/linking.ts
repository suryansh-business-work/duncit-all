import { getStateFromPath, type LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';

import { isAppleAuthReturn } from '@/components/AppleAuthButton/appleSignIn';
import { linkingConfig } from '@/navigation/linkingConfig';
import { bookingIdFromPath, rememberPendingBooking } from '@/navigation/pendingBooking';
import { useAuthStore } from '@/stores/auth.store';
import type { RootStackParamList } from '@/navigation/types';

/**
 * Deep-link / URL config so the web build's address bar reflects the active
 * route. The screen ↔ path map itself lives in `linkingConfig.ts`.
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
    // Sign in with Apple's answer comes back to duncit://apple-auth, where the
    // auth session waiting on it reads it. It is not a place in the app, and
    // routing it would open NotFound over the sign-in screen.
    if (isAppleAuthReturn(path)) return undefined;
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
  config: linkingConfig,
};
