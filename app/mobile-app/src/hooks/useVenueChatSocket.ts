import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { logs } from '@duncit/logs';
import { VENUE_CHAT_SOCKET, type VenueChatReadMark } from '@duncit/utils';

import { config } from '@/constants/config';
import { getAuthToken } from '@/services/auth-token';
import type { VenueChatMessage } from '@/hooks/useVenueChat';

interface Handlers {
  /** A new line. */
  onLine: (line: VenueChatMessage) => void;
  /** A line changed — edited, reacted to, a counter revised: the whole line again. */
  onUpdate: (line: VenueChatMessage) => void;
  /** A line was taken out (deleted, a counter withdrawn). */
  onRemove: (id: string) => void;
  /** A member read the thread this far. */
  onRead: (mark: VenueChatReadMark) => void;
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
  s.on(VENUE_CHAT_SOCKET.message, (line: VenueChatMessage) => handlers.current.onLine(line));
  s.on(VENUE_CHAT_SOCKET.update, (line: VenueChatMessage) => handlers.current.onUpdate(line));
  s.on(VENUE_CHAT_SOCKET.remove, (gone: { id: string }) => handlers.current.onRemove(gone.id));
  s.on(VENUE_CHAT_SOCKET.read, (mark: VenueChatReadMark) => handlers.current.onRead(mark));
  s.on('connect_error', (error: Error) => {
    logs.mobileApp.warn('venueChat', 'connect', { podId, error });
    handlers.current.onJoinFailed('ERROR');
  });
  return s;
}

/**
 * Follows one venue thread live — RN twin of mWeb's useVenueChatSocket. Joins
 * with the pod id and hands every new line to `onLine`, every changed line to
 * `onUpdate`, every removed one to `onRemove` and every member's read mark to
 * `onRead`; the server only puts the thread's members in its room, so no frame
 * needs filtering. Callbacks are held in a ref so the connection
 * re-establishes only when the thread changes.
 */
export function useVenueChatSocket({ podId, ...callbacks }: Options) {
  const handlers = useRef<Handlers>(callbacks);
  handlers.current = callbacks;

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
