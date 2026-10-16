import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';

import { config } from '@/constants/config';
import { getAuthToken } from '@/services/auth-token';
import type { ChatMessage } from '@/hooks/useChat';

/** Which room the socket follows. Club rooms speak the same events under a
 * `club_` prefix, so a pod room and a club room never mix (mWeb's twin). */
export type ChatRoomKind = 'POD' | 'CLUB';

interface UsePodSocketParams {
  /** The pod's id, or the club's when `kind` is CLUB. */
  podId: string;
  kind?: ChatRoomKind;
  onMessage: (msg: ChatMessage) => void;
  onReaction: (msg: ChatMessage) => void;
  onDeleted: (msg: ChatMessage) => void;
  onError: (message: string) => void;
}

type PodSocketHandlersRef = { current: Omit<UsePodSocketParams, 'podId' | 'kind'> };

const EVENTS: Record<ChatRoomKind, { join: string; leave: string; prefix: string }> = {
  POD: { join: 'join_pod', leave: 'leave_pod', prefix: '' },
  CLUB: { join: 'join_club', leave: 'leave_club', prefix: 'club_' },
};

const roomIdOf = (msg: ChatMessage, kind: ChatRoomKind) =>
  kind === 'POD' ? msg.pod_id : msg.club_id;

/** Connects, joins the room and wires message/reaction/deleted/error events.
 * Hoisted out of the hook so the event handlers don't nest too deeply. */
function createPodSocket(
  token: string,
  roomId: string,
  kind: ChatRoomKind,
  handlers: PodSocketHandlersRef,
): Socket {
  const { join, prefix } = EVENTS[kind];
  const s = io(config.apiUrl, {
    path: '/socket.io',
    auth: { token },
    // Fall back to long-polling when WebSockets are blocked (some mobile/captive
    // networks) instead of failing to connect. Mirrors mWeb's usePodSocket.
    transports: ['websocket', 'polling'],
  });
  s.on('connect', () => {
    s.emit(join, roomId, (ok: boolean, err?: string) => {
      if (!ok) handlers.current.onError(err || 'Cannot join chat');
    });
  });
  s.on(`${prefix}message`, (msg: ChatMessage) => {
    if (roomIdOf(msg, kind) === roomId) handlers.current.onMessage(msg);
  });
  s.on(`${prefix}reaction`, (msg: ChatMessage) => {
    if (roomIdOf(msg, kind) === roomId) handlers.current.onReaction(msg);
  });
  s.on(`${prefix}deleted`, (msg: ChatMessage) => {
    if (roomIdOf(msg, kind) === roomId) handlers.current.onDeleted(msg);
  });
  s.on('connect_error', (e: Error) => handlers.current.onError(e?.message || 'Socket error'));
  return s;
}

/**
 * Live chat over socket.io — RN twin of mWeb's usePodSocket. Authenticates
 * with the stored JWT, joins the pod's (or club's) room, and forwards
 * `message` / `reaction` / `deleted` events scoped to that room. Callbacks are
 * held in a ref so the connection only re-establishes when the room changes.
 */
export function usePodSocket({
  podId,
  kind = 'POD',
  onMessage,
  onReaction,
  onDeleted,
  onError,
}: UsePodSocketParams) {
  const handlers = useRef({ onMessage, onReaction, onDeleted, onError });
  handlers.current = { onMessage, onReaction, onDeleted, onError };

  useEffect(() => {
    let socket: Socket | undefined;
    let cancelled = false;

    getAuthToken().then((token) => {
      if (cancelled || !token) return;
      socket = createPodSocket(token, podId, kind, handlers);
    });

    return () => {
      cancelled = true;
      if (socket) {
        socket.emit(EVENTS[kind].leave, podId);
        socket.disconnect();
      }
    };
  }, [podId, kind]);
}
