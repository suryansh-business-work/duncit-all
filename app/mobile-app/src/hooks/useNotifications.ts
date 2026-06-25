import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { ResultOf } from '@graphql-typed-document-node/core';

import {
  MobileMarkAllNotificationsReadDocument,
  MobileMarkNotificationReadDocument,
  MobileNotificationsDocument,
} from '@/graphql/notification';
import { graphqlRequest } from '@/services/graphql.client';
import { displayLocalNotification } from '@/services/local-notifications';
import { useNotificationPrefsStore } from '@/stores/notification-prefs.store';

export type NotificationsData = ResultOf<typeof MobileNotificationsDocument>;
export type UserNotification = NotificationsData['myNotifications'][number];

/** Background refresh cadence so a newly-arrived notification surfaces on the
 * bell badge without the user opening the screen (BUG-A). */
const POLL_INTERVAL_MS = 30_000;

/**
 * Notifications feed + read mutations — RN port of mWeb's HeaderNotificationsBell
 * data layer. Loads the list and unread count, marks individual/all read and
 * refetches so the bell badge stays in sync.
 */
export function useNotifications() {
  const [data, setData] = useState<NotificationsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Ids already surfaced as device notifications (Notifee) this session — the
  // first load only seeds the set so old items never re-fire (B3-3).
  const surfacedIds = useRef<Set<string> | null>(null);

  const refetch = useCallback(async () => {
    const result = await graphqlRequest(MobileNotificationsDocument, undefined, { auth: true });
    setData(result);
    const seen = surfacedIds.current;
    surfacedIds.current = new Set(result.myNotifications.map((item) => item.id));
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
  }, []);

  useEffect(() => {
    let active = true;
    refetch()
      .catch(() => undefined)
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [refetch]);

  // Lightweight real-time refresh (BUG-A): poll on an interval and refetch when
  // the app returns to the foreground, so a newly-arrived notification updates
  // the bell badge without the user opening the screen. Both are RN-safe (no
  // EventSource) and are torn down on unmount.
  useEffect(() => {
    const poll = () => {
      refetch().catch(() => undefined);
    };
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') poll();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [refetch]);

  const markRead = useCallback(
    async (item: UserNotification) => {
      if (item.read_at) return;
      await graphqlRequest(MobileMarkNotificationReadDocument, { id: item.id }, { auth: true });
      await refetch();
    },
    [refetch],
  );

  const markAll = useCallback(async () => {
    await graphqlRequest(MobileMarkAllNotificationsReadDocument, undefined, { auth: true });
    await refetch();
  }, [refetch]);

  return {
    notifs: data?.myNotifications ?? [],
    unreadCount: data?.myUnreadNotificationCount ?? 0,
    isLoading,
    refetch,
    markRead,
    markAll,
  };
}
