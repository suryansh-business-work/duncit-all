import { useCallback, useEffect, useRef } from 'react';
import { useMutation } from '@apollo/client/react';
import type { ChatRoomKind } from '@duncit/gql-types';
import { logs } from '@duncit/logs';
import { MARK_CHAT_READ } from './queries';
import { announceChatRead } from './chatAlerts';

/** A busy room marks itself read at most this often while it stays open. */
const MARK_EVERY_MS = 2000;

/**
 * Marks an open pod or club room read: once when it opens, then (throttled)
 * whenever a line arrives while it is on screen. Failures are logged and left
 * for the next mark — an unread count one line high is not worth an error.
 */
export function useMarkChatRead(kind: Extract<ChatRoomKind, 'POD' | 'CLUB'>, id: string | undefined) {
  const [markRead] = useMutation(MARK_CHAT_READ);
  const last = useRef(0);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  const send = useCallback(() => {
    if (!id) return;
    last.current = Date.now();
    markRead({ variables: { kind, id } })
      .then(announceChatRead)
      .catch((error: unknown) => logs.mWeb.warn('chat-room', 'markChatRead', { kind, error }));
  }, [id, kind, markRead]);

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
