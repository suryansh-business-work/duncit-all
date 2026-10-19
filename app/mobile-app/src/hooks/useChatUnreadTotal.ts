import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { logs } from '@duncit/logs';

import { ChatUnreadTotalDocument } from '@/graphql/chat-state';
import { graphqlRequest } from '@/services/graphql.client';
import { useAuthStore } from '@/stores/auth.store';
import { useChatAlertsStore } from '@/stores/chat-alerts.store';

/** A safety net for counts that move without a socket frame (another device read the room). */
const REFRESH_MS = 60_000;

/**
 * Unread lines across the viewer's pod and club rooms, muted rooms left out —
 * the Chats tile's badge. It refreshes when a message arrives elsewhere, when a
 * room is read here, when the app comes back to the foreground, and once a
 * minute. 0 while signed out or before the first answer. mWeb twin:
 * components/chat-state/useChatUnreadTotal.
 */
export function useChatUnreadTotal(): number {
  const token = useAuthStore((s) => s.token);
  const changes = useChatAlertsStore((s) => s.changes);
  const [total, setTotal] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!token) return undefined;
    const timer = setInterval(() => setTick((n) => n + 1), REFRESH_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setTick((n) => n + 1);
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [token]);

  useEffect(() => {
    if (!token) {
      setTotal(0);
      return undefined;
    }
    let active = true;
    graphqlRequest(ChatUnreadTotalDocument, {}, { auth: true })
      .then((res) => active && setTotal(res.chatUnreadTotal))
      .catch((error: unknown) => logs.mobileApp.warn('chats', 'chatUnreadTotal', { error }));
    return () => {
      active = false;
    };
  }, [token, changes, tick]);

  return total;
}
