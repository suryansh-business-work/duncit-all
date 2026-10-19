import { useCallback, useMemo, useRef, useState } from 'react';
import { pingForMessage } from '../../components/chat-state/chatAlerts';
import { useMarkChatRead } from '../../components/chat-state/useMarkChatRead';
import { usePodSocket, type ChatRoomKind } from './usePodSocket';
import type { ChatRoomSource } from './useChatRoomSource';
import type { ChatMessage, ChatSocketMessage } from './chat.types';

interface Options {
  kind: ChatRoomKind;
  id: string | undefined;
  room: ChatRoomSource;
  /** A muted room stays silent even while it is open. */
  muted: boolean;
  onError: (message: string) => void;
}

/**
 * The open room's lines: the loaded pages plus what arrives over the socket.
 * A line from someone else pings (one per burst, never in a muted room) and
 * marks the room read, since the reader is looking at it.
 */
export function useLiveMessages({ kind, id, room, muted, onError }: Options) {
  const [live, setLive] = useState<ChatMessage[]>([]);
  const markRead = useMarkChatRead(kind, id);
  // Read inside the socket handler without reconnecting when they change.
  const facts = useRef({ myId: room.myId, muted });
  facts.current = { myId: room.myId, muted };

  const messages = useMemo(() => {
    const merged = [...room.messages];
    const ids = new Set(room.messages.map((m) => m.id));
    for (const m of live) if (!ids.has(m.id)) merged.push(m);
    return merged;
  }, [room.messages, live]);

  const onMessage = useCallback(
    (msg: ChatMessage) => {
      setLive((p) => [...p, msg]);
      if (String(msg.user_id) === String(facts.current.myId)) return;
      if (!facts.current.muted) pingForMessage(msg.id);
      markRead();
    },
    [markRead]
  );
  const onReactionUpdate = useCallback(
    (msg: ChatSocketMessage) =>
      setLive((p) => p.map((m) => (m.id === msg.id ? { ...m, reactions: msg.reactions ?? m.reactions } : m))),
    []
  );
  const onDeleted = useCallback(
    (msg: ChatSocketMessage) => setLive((p) => p.filter((m) => m.id !== msg.id)),
    []
  );

  usePodSocket({ podId: id, kind, refetch: room.refetch, onMessage, onReactionUpdate, onDeleted, onError });

  return { messages, onDeleted };
}
