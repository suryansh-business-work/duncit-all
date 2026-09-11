import { AppState, type NativeEventSubscription } from 'react-native';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { MobileNotificationsDocument } from '@/graphql/notification';
import { graphqlRequest } from '@/services/graphql.client';
import { displayLocalNotification } from '@/services/local-notifications';
import { useNotificationPrefsStore } from '@/stores/notification-prefs.store';

import { createQueryStore } from './create-query-store';

export type NotificationsData = ResultOf<typeof MobileNotificationsDocument>;

/** Background refresh cadence so a newly-arrived notification surfaces on the
 * bell badge without the user opening the screen (BUG-A). */
const POLL_INTERVAL_MS = 30_000;

// Ids already surfaced as device notifications (Notifee) this session — the
// first load only seeds the set so old items never re-fire (B3-3).
let surfacedIds: Set<string> | null = null;
// Bumped when the session ends, so an answer still in flight for the old
// account is dropped instead of landing in the next one's store.
let generation = 0;

function surfaceNew(result: NotificationsData): void {
  const seen = surfacedIds;
  surfacedIds = new Set(result.myNotifications.map((item) => item.id));
  if (!seen) return;
  // Master switch (Notifications screen) gates device notifications (B4-13).
  if (!useNotificationPrefsStore.getState().enabled) return;
  result.myNotifications
    .filter((item) => !item.read_at && !seen.has(item.id))
    .forEach((item) => {
      displayLocalNotification({
        id: item.id,
        title: item.notification.title,
        body: item.notification.body,
      }).catch(() => undefined);
    });
}

/**
 * The notifications feed, once for the whole app. Every tab keeps its own header
 * mounted, and each header's bell used to own a copy of the list, its own 30s
 * poll and its own "already surfaced" set — five tabs visited meant five
 * requests every 30 seconds, and a new item could be surfaced once per bell.
 */
export const useNotificationsStore = createQueryStore(async () => {
  const asked = generation;
  const result = await graphqlRequest(MobileNotificationsDocument, undefined, { auth: true });
  if (asked !== generation) throw new Error('notifications: answer from an ended session');
  surfaceNew(result);
  return result;
});

let pollers = 0;
let timer: ReturnType<typeof setInterval> | null = null;
let foreground: NativeEventSubscription | null = null;

function poll(): void {
  // A backgrounded app has no badge to update; the foreground listener below
  // refreshes the moment it comes back.
  if (AppState.currentState !== 'active') return;
  useNotificationsStore
    .getState()
    .refetch()
    .catch(() => undefined);
}

/**
 * Keep the shared feed fresh while at least one bell is mounted: the first
 * caller starts the poll and the foreground refresh, the last one's cleanup
 * stops them. Returns that cleanup.
 */
export function startNotificationsPoll(): () => void {
  pollers += 1;
  if (pollers === 1) {
    timer = setInterval(poll, POLL_INTERVAL_MS);
    foreground = AppState.addEventListener('change', (state) => {
      if (state === 'active') poll();
    });
  }
  return () => {
    pollers -= 1;
    if (pollers > 0) return;
    if (timer) clearInterval(timer);
    foreground?.remove();
    timer = null;
    foreground = null;
  };
}

/** Per-account data: dropped with the session so the next person to sign in on
 * this phone never sees (or is re-notified of) the previous account's feed. */
export function resetNotifications(): void {
  generation += 1;
  surfacedIds = null;
  useNotificationsStore.getState().reset();
}
