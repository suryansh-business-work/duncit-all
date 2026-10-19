import { useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { CHAT_UNREAD_TOTAL } from './queries';
import { onChatNew, onChatRead } from './chatAlerts';

/** A safety net for counts that move without a socket frame (another device read the room). */
const REFRESH_MS = 60_000;

/**
 * Unread lines across the viewer's pod and club rooms, muted rooms left out —
 * the Chats tile's badge. It refreshes when a message arrives elsewhere, when
 * a room is read here, and once a minute. 0 while signed out or loading.
 */
export function useChatUnreadTotal(enabled = true): number {
  const { data, refetch } = useQuery<{ chatUnreadTotal: number }>(CHAT_UNREAD_TOTAL, {
    skip: !enabled,
    fetchPolicy: 'cache-and-network',
    pollInterval: enabled ? REFRESH_MS : 0,
  });

  useEffect(() => {
    if (!enabled) return undefined;
    const refresh = () => {
      refetch().catch(() => undefined);
    };
    const offNew = onChatNew(refresh);
    const offRead = onChatRead(refresh);
    return () => {
      offNew();
      offRead();
    };
  }, [enabled, refetch]);

  return data?.chatUnreadTotal ?? 0;
}
