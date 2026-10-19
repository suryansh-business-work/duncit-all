import { useCallback, useEffect, useMemo } from 'react';
import { useMutation } from '@apollo/client/react';
import type { ChatRoomKind } from '@duncit/gql-types';
import { logs } from '@duncit/logs';
import { createChatReadMarker } from '@duncit/utils';
import { MARK_CHAT_READ } from './queries';
import { announceChatRead } from './chatAlerts';

/**
 * Marks an open pod or club room read: once when it opens, then (throttled by
 * the shared `createChatReadMarker`) whenever a line arrives while it is on
 * screen. Failures are logged and left for the next mark — an unread count one
 * line high is not worth an error. Native twin: hooks/useMarkChatRead.
 */
export function useMarkChatRead(kind: Extract<ChatRoomKind, 'POD' | 'CLUB'>, id: string | undefined) {
  const [markRead] = useMutation(MARK_CHAT_READ);

  const send = useCallback(() => {
    if (!id) return;
    markRead({ variables: { kind, id } })
      .then(announceChatRead)
      .catch((error: unknown) => logs.mWeb.warn('chat-room', 'markChatRead', { kind, error }));
  }, [id, kind, markRead]);

  const marker = useMemo(() => createChatReadMarker(send), [send]);
  useEffect(() => {
    marker.now();
    return marker.cancel;
  }, [marker]);

  return marker.soon;
}
