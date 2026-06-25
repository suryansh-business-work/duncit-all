import { Platform } from 'react-native';

import {
  MobileDeleteExpoPushTokenDocument,
  MobileSaveExpoPushTokenDocument,
} from '@/graphql/notification';
import { getItem, removeItem, setItem } from '@/services/secure-storage';
import { graphqlRequest } from '@/services/graphql.client';
import { registerForPushNotifications } from '@/services/notifications.service';

/**
 * Expo push registration (BUG-C). Wires {@link registerForPushNotifications}
 * (permission + Expo token) to the server contract so the backend can deliver
 * native pushes to this device. Every call is best-effort — a registration
 * failure must never block login/logout — so callers fire-and-forget and we
 * swallow errors here.
 */
const PUSH_TOKEN_KEY = 'duncit.push.token';

/** Request permission, fetch the Expo token, persist it locally and register it
 * with the server. No-op (returns silently) when permission is denied. */
export async function syncExpoPushToken(): Promise<void> {
  try {
    const token = await registerForPushNotifications();
    if (!token) return;
    await setItem(PUSH_TOKEN_KEY, token);
    await graphqlRequest(
      MobileSaveExpoPushTokenDocument,
      { token, platform: Platform.OS },
      { auth: true },
    );
  } catch {
    // Best-effort: push registration must never block the session bootstrap.
  }
}

/** Unbind this device's stored push token from the user on logout. */
export async function removeExpoPushToken(): Promise<void> {
  try {
    const token = await getItem(PUSH_TOKEN_KEY);
    if (!token) return;
    await removeItem(PUSH_TOKEN_KEY);
    await graphqlRequest(MobileDeleteExpoPushTokenDocument, { token }, { auth: true });
  } catch {
    // Best-effort: a stale server token is harmless and reaped server-side.
  }
}
