import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getSocketUrl } from '../../lib/socket-url';
import type { ChatMessage, ChatSocketMessage } from './chat.types';

/** Which room the socket follows. Club rooms speak the same events under a
 * `club_` prefix, so one open pod room and one club room never mix. */
export type ChatRoomKind = 'POD' | 'CLUB';

interface UsePodSocketParams {
  /** The pod's id, or the club's when `kind` is CLUB. */
  podId: string | undefined;
  kind?: ChatRoomKind;
  refetch: () => void;
  onMessage: (msg: ChatMessage) => void;
  onReactionUpdate: (msg: ChatSocketMessage) => void;
  /** A message removed by its author, a moderator or Legal. */
  onDeleted?: (msg: ChatSocketMessage) => void;
  onError: (message: string) => void;
}

const EVENTS: Record<ChatRoomKind, { join: string; leave: string; prefix: string }> = {
  POD: { join: 'join_pod', leave: 'leave_pod', prefix: '' },
  CLUB: { join: 'join_club', leave: 'leave_club', prefix: 'club_' },
};

const roomIdOf = (msg: ChatSocketMessage | null | undefined, kind: ChatRoomKind) =>
  kind === 'POD' ? msg?.pod_id : msg?.club_id;

export function usePodSocket({
  podId,
  kind = 'POD',
  refetch,
  onMessage,
  onReactionUpdate,
  onDeleted,
  onError,
}: UsePodSocketParams) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!podId) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const { join, leave, prefix } = EVENTS[kind];
    const s = io(getSocketUrl(), {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = s;
    s.on('connect', () => {
      s.emit(join, podId, (ok: boolean, err?: string) => {
        if (!ok) onError(err || 'Cannot join chat');
      });
    });
    s.on(`${prefix}message`, (msg: ChatMessage) => {
      if (roomIdOf(msg, kind) === podId) onMessage(msg);
    });
    s.on(`${prefix}reaction`, (msg: ChatSocketMessage) => {
      if (roomIdOf(msg, kind) === podId) {
        onReactionUpdate(msg);
        refetch();
      }
    });
    s.on(`${prefix}deleted`, (msg: ChatSocketMessage | null) => {
      if (msg?.id) onDeleted?.(msg);
      refetch();
    });
    s.on('connect_error', (e: Error) => onError(e?.message || 'Socket error'));
    return () => {
      s.emit(leave, podId);
      s.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podId, kind, refetch]);
}
