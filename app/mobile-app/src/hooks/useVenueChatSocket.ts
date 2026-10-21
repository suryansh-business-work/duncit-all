import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { logs } from '@duncit/logs';
import { VENUE_CHAT_SOCKET } from '@duncit/utils';

import { config } from '@/constants/config';
import { getAuthToken } from '@/services/auth-token';
import type { ChatMessage } from '@/hooks/useChat';

interface Handlers {
  onLine: (line: ChatMessage) => void;
  /** The join was refused (its code, e.g. FORBIDDEN) or the socket could not connect. */
  onJoinFailed: (code: string) => void;
}

interface Options extends Handlers {
  /** The thread's own pod id (`venueChatRoom.pod_id`); nothing connects until it is known. */
  podId: string | null;
}

/** Connects, joins the thread and wires its events. Hoisted out of the hook so
 * the handlers don't nest too deeply (the pod socket does the same). */
function connectVenueChat(token: string, podId: string, handlers: { current: Handlers }): Socket {
  const s = io(config.apiUrl, {
    path: '/socket.io',
    auth: { token },
    transports: ['websocket', 'polling'],
  });
  s.on('connect', () => {
    s.emit(VENUE_CHAT_SOCKET.join, podId, (ok: boolean, err?: string) => {
      if (ok) return;
      logs.mobileApp.warn('venueChat', 'join', { podId, code: err });
      handlers.current.onJoinFailed(err || 'ERROR');
    });
  });
  s.on(VENUE_CHAT_SOCKET.message, (line: ChatMessage) => handlers.current.onLine(line));
  s.on('connect_error', (error: Error) => {
    logs.mobileApp.warn('venueChat', 'connect', { podId, error });
    handlers.current.onJoinFailed('ERROR');
  });
  return s;
}

/**
 * Follows one venue thread live — RN twin of mWeb's useVenueChatSocket. Joins
 * with the pod id and hands every line to `onLine`; the server only puts the
 * thread's members in its room, so no frame needs filtering. Callbacks are held
 * in a ref so the connection re-establishes only when the thread changes.
 */
export function useVenueChatSocket({ podId, onLine, onJoinFailed }: Options) {
  const handlers = useRef<Handlers>({ onLine, onJoinFailed });
  handlers.current = { onLine, onJoinFailed };

  useEffect(() => {
    if (!podId) return undefined;
    let socket: Socket | undefined;
    let cancelled = false;

    getAuthToken()
      .then((token) => {
        if (!cancelled && token) socket = connectVenueChat(token, podId, handlers);
      })
      .catch((error) => logs.mobileApp.error('venueChat', 'token', { error, podId }));

    return () => {
      cancelled = true;
      if (socket) {
        socket.emit(VENUE_CHAT_SOCKET.leave, podId);
        socket.disconnect();
      }
    };
  }, [podId]);
}
