import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';

import { config } from '@/constants/config';
import { getAuthToken } from '@/services/auth-token';
import type { ChatMessage } from '@/hooks/useChat';

interface UsePodSocketParams {
  podId: string;
  onMessage: (msg: ChatMessage) => void;
  onReaction: (msg: ChatMessage) => void;
  onDeleted: (msg: ChatMessage) => void;
  onError: (message: string) => void;
}

type PodSocketHandlersRef = { current: Omit<UsePodSocketParams, 'podId'> };

/** Connects, joins the pod room and wires message/reaction/deleted/error events.
 * Hoisted out of the hook so the event handlers don't nest too deeply. */
function createPodSocket(token: string, podId: string, handlers: PodSocketHandlersRef): Socket {
  const s = io(config.apiUrl, {
    path: '/socket.io',
    auth: { token },
    transports: ['websocket'],
  });
  s.on('connect', () => {
    s.emit('join_pod', podId, (ok: boolean, err?: string) => {
      if (!ok) handlers.current.onError(err || 'Cannot join chat');
    });
  });
  s.on('message', (msg: ChatMessage) => {
    if (msg.pod_id === podId) handlers.current.onMessage(msg);
  });
  s.on('reaction', (msg: ChatMessage) => {
    if (msg.pod_id === podId) handlers.current.onReaction(msg);
  });
  s.on('deleted', (msg: ChatMessage) => {
    if (msg.pod_id === podId) handlers.current.onDeleted(msg);
  });
  s.on('connect_error', (e: Error) => handlers.current.onError(e?.message || 'Socket error'));
  return s;
}

/**
 * Live pod chat over socket.io — RN twin of mWeb's usePodSocket. Authenticates
 * with the stored JWT, joins the pod room, and forwards `message` / `reaction` /
 * `deleted` events (scoped to this pod) to the caller. Callbacks are held in a
 * ref so the connection only re-establishes when the pod changes.
 */
export function usePodSocket({
  podId,
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
      socket = createPodSocket(token, podId, handlers);
    });

    return () => {
      cancelled = true;
      if (socket) {
        socket.emit('leave_pod', podId);
        socket.disconnect();
      }
    };
  }, [podId]);
}
