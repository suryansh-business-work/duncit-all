import { useCallback, useEffect, useMemo } from 'react';
import { logs } from '@duncit/logs';
import { createChatReadMarker } from '@duncit/utils';

import { MarkChatReadDocument } from '@/graphql/chat-state';
import { ChatRoomKind } from '@/generated/graphql/graphql';
import { graphqlRequest } from '@/services/graphql.client';
import { useChatAlertsStore } from '@/stores/chat-alerts.store';
import type { ChatRoomKind as SocketRoomKind } from '@/hooks/usePodSocket';

/**
 * Marks an open pod or club room read: once when it opens, then (throttled by
 * the shared `createChatReadMarker`) whenever a line arrives while it is on
 * screen. A failure is logged and left for the next mark — an unread count one
 * line high is not worth an error. mWeb twin: components/chat-state/useMarkChatRead.
 */
export function useMarkChatRead(kind: SocketRoomKind, roomId: string) {
  const send = useCallback(() => {
    if (!roomId) return;
    const gqlKind = kind === 'CLUB' ? ChatRoomKind.Club : ChatRoomKind.Pod;
    graphqlRequest(MarkChatReadDocument, { kind: gqlKind, id: roomId }, { auth: true })
      .then(() => useChatAlertsStore.getState().roomRead())
      .catch((error: unknown) => logs.mobileApp.warn('chat-room', 'markChatRead', { kind, error }));
  }, [kind, roomId]);

  const marker = useMemo(() => createChatReadMarker(send), [send]);
  useEffect(() => {
    marker.now();
    return marker.cancel;
  }, [marker]);

  return marker.soon;
}
