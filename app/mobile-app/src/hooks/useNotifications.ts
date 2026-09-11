import { useCallback, useEffect, useState } from 'react';

import {
  MobileMarkAllNotificationsReadDocument,
  MobileMarkNotificationReadDocument,
} from '@/graphql/notification';
import { graphqlRequest } from '@/services/graphql.client';
import { useRefreshRegistration } from '@/components/PullToRefresh';
import {
  startNotificationsPoll,
  useNotificationsStore,
  type NotificationsData,
} from '@/stores/notifications.store';

export type { NotificationsData } from '@/stores/notifications.store';
export type UserNotification = NotificationsData['myNotifications'][number];

/**
 * Notifications feed + read mutations — RN port of mWeb's HeaderNotificationsBell
 * data layer. Reads the app-wide feed (one request and one poll however many
 * tab headers are mounted), marks individual/all read and refetches so the bell
 * badge stays in sync.
 */
export function useNotifications() {
  const data = useNotificationsStore((s) => s.data);
  // Loading until the first answer settles, either way — not on every poll.
  const isLoading = useNotificationsStore((s) => s.data === undefined && s.error === undefined);
  const fetchFeed = useNotificationsStore((s) => s.fetch);
  const refetchFeed = useNotificationsStore((s) => s.refetch);
  const refetch = useCallback(() => refetchFeed(), [refetchFeed]);

  useEffect(() => {
    fetchFeed().catch(() => undefined);
  }, [fetchFeed]);

  useRefreshRegistration(refetch);

  // Lightweight real-time refresh (BUG-A): the shared poll plus a refetch when
  // the app returns to the foreground, so a newly-arrived notification updates
  // the bell badge without the user opening the screen.
  useEffect(() => startNotificationsPoll(), []);

  // Which row is mid-mark-read, and whether mark-all is running. Both round-trip
  // (mutation + refetch), and without this the tap looked like it did nothing.
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markAllBusy, setMarkAllBusy] = useState(false);

  const markRead = useCallback(
    async (item: UserNotification) => {
      if (item.read_at) return;
      setBusyId(item.id);
      try {
        await graphqlRequest(MobileMarkNotificationReadDocument, { id: item.id }, { auth: true });
        await refetch();
      } finally {
        setBusyId(null);
      }
    },
    [refetch],
  );

  const markAll = useCallback(async () => {
    setMarkAllBusy(true);
    try {
      await graphqlRequest(MobileMarkAllNotificationsReadDocument, undefined, { auth: true });
      await refetch();
    } finally {
      setMarkAllBusy(false);
    }
  }, [refetch]);

  // Drop content-less notifications (legacy/junk rows whose title and body are
  // both blank) so the list never renders empty cards — the row has nothing to
  // show for them. Keeps the badge count honest by filtering at the source.
  const notifs = (data?.myNotifications ?? []).filter(
    (item) => item.notification.title.trim() !== '' || item.notification.body.trim() !== '',
  );

  return {
    notifs,
    unreadCount: data?.myUnreadNotificationCount ?? 0,
    isLoading,
    busyId,
    markAllBusy,
    refetch,
    markRead,
    markAll,
  };
}
