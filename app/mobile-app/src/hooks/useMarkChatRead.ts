import { useCallback, useEffect, useRef } from 'react';
import { logs } from '@duncit/logs';

import { MarkChatReadDocument } from '@/graphql/chat-state';
import { ChatRoomKind } from '@/generated/graphql/graphql';
import { graphqlRequest } from '@/services/graphql.client';
import { useChatAlertsStore } from '@/stores/chat-alerts.store';
import type { ChatRoomKind as SocketRoomKind } from '@/hooks/usePodSocket';

/** A busy room marks itself read at most this often while it stays open. */
const MARK_EVERY_MS = 2000;

/**
 * Marks an open pod or club room read: once when it opens, then (throttled)
 * whenever a line arrives while it is on screen. A failure is logged and left
 * for the next mark — an unread count one line high is not worth an error.
 * mWeb twin: components/chat-state/useMarkChatRead.
 */
export function useMarkChatRead(kind: SocketRoomKind, roomId: string) {
  const last = useRef(0);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  const send = useCallback(() => {
    if (!roomId) return;
    last.current = Date.now();
    const gqlKind = kind === 'CLUB' ? ChatRoomKind.Club : ChatRoomKind.Pod;
    graphqlRequest(MarkChatReadDocument, { kind: gqlKind, id: roomId }, { auth: true })
      .then(() => useChatAlertsStore.getState().roomRead())
      .catch((error: unknown) => logs.mobileApp.warn('chat-room', 'markChatRead', { kind, error }));
  }, [kind, roomId]);

  const mark = useCallback(() => {
    if (pending.current) return;
    const wait = Math.max(0, last.current + MARK_EVERY_MS - Date.now());
    pending.current = setTimeout(() => {
      pending.current = null;
      send();
    }, wait);
  }, [send]);

  useEffect(() => {
    send();
    return () => {
      if (pending.current) clearTimeout(pending.current);
      pending.current = null;
    };
  }, [send]);

  return mark;
}
