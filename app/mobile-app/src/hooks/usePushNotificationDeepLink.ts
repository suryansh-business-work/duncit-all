import { useEffect } from 'react';
import { Linking, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/navigation/types';
import { resolveNotificationLink } from '@/utils/notification-link';
import { fireAndForget } from '@/utils/fire-and-forget';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Route a notification payload's `link` to the right screen (post-activity
 * notifications deep-link to PostDetail). Exported for direct unit testing. */
export function navigateForPushLink(navigation: Nav, link: unknown) {
  const target = resolveNotificationLink(typeof link === 'string' ? link : null);
  if (target.kind === 'external') {
    fireAndForget(Linking.openURL(target.url));
    return;
  }
  if (target.kind === 'post') {
    navigation.navigate('PostDetail', { postId: target.postId });
    return;
  }
  if (target.kind === 'screen') {
    navigation.navigate(target.route);
  }
}

/**
 * Deep-links Expo push taps (BUG-tap): when the user taps a native push, route
 * to the screen its `link` points at (e.g. a post-activity push → PostDetail).
 * Handles both a tap while running and a cold-start tap. Native-only — the
 * module loads lazily and degrades silently on web / Expo Go without the module.
 */
export function usePushNotificationDeepLink() {
  const navigation = useNavigation<Nav>();

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let subscription: { remove: () => void } | undefined;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy native-only module
      const Notifications = require('expo-notifications') as typeof import('expo-notifications');

      const handle = (response: unknown) => {
        const link = (
          response as { notification?: { request?: { content?: { data?: { link?: unknown } } } } }
        )?.notification?.request?.content?.data?.link;
        navigateForPushLink(navigation, link);
      };

      Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          if (response) handle(response);
        })
        .catch(() => undefined);
      subscription = Notifications.addNotificationResponseReceivedListener(handle);
    } catch {
      // No native module (web / Expo Go without it) — in-app routing still works.
    }
    return () => subscription?.remove();
  }, [navigation]);
}
