import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { logs } from '@duncit/logs';
import { VENUE_CHAT_SOCKET, type VenueChatLine } from '@duncit/utils';
import { getSocketUrl } from '../../lib/socket-url';

interface Options {
  /** The thread's own pod id (`venueChatRoom.pod_id`); nothing connects until it is known. */
  podId: string | undefined;
  onLine: (line: VenueChatLine) => void;
  /** The join was refused (its code, e.g. FORBIDDEN) or the socket could not connect. */
  onJoinFailed: (code: string) => void;
}

/**
 * Follows one venue thread live: joins it with the pod id and hands every line
 * that arrives to `onLine`. The server only puts a thread's members in its
 * room, so no frame needs filtering here. Same connection as the pod rooms'
 * `usePodSocket`, with the venue thread's own events.
 */
export function useVenueChatSocket({ podId, onLine, onJoinFailed }: Options) {
  // Read inside the handlers, so a new callback never reconnects the socket.
  const handlers = useRef({ onLine, onJoinFailed });
  handlers.current = { onLine, onJoinFailed };

  useEffect(() => {
    if (!podId) return undefined;
    const token = localStorage.getItem('token');
    if (!token) return undefined;
    const socket = io(getSocketUrl(), { path: '/socket.io', auth: { token }, transports: ['websocket', 'polling'] });
    socket.on('connect', () => {
      socket.emit(VENUE_CHAT_SOCKET.join, podId, (ok: boolean, err?: string) => {
        if (ok) return;
        logs.mWeb.warn('venueChat', 'join', { podId, code: err });
        handlers.current.onJoinFailed(err || 'ERROR');
      });
    });
    socket.on(VENUE_CHAT_SOCKET.message, (line: VenueChatLine) => handlers.current.onLine(line));
    socket.on('connect_error', (error: Error) => {
      logs.mWeb.warn('venueChat', 'connect', { podId, error });
      handlers.current.onJoinFailed('ERROR');
    });
    return () => {
      socket.emit(VENUE_CHAT_SOCKET.leave, podId);
      socket.disconnect();
    };
  }, [podId]);
}
