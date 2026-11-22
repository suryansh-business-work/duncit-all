import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { ASK_DUNCIT_SOCKET_EVENTS, type AskDuncitActionView, type AskDuncitMessageView } from '@duncit/utils';
import { getSocketUrl } from '../../lib/socket-url';

export interface AskDuncitSocketHandlers {
  onDelta: (event: { message_id: string; text: string }) => void;
  onTool: (event: { message_id: string; name: string; title?: string; status: string }) => void;
  onAction: (action: AskDuncitActionView) => void;
  onDone: (message: AskDuncitMessageView) => void;
  onError: (event: { message_id: string; code?: string | null }) => void;
  /** The socket reconnected — frames may have been missed, so re-read the stored message. */
  onReconnect: () => void;
}

/**
 * Ask Duncit's answers stream over the account's own socket room (the server
 * joins every signed-in socket to it), so there is nothing to join here —
 * only listen. Handlers are read through a ref so a re-render never re-wires
 * the socket mid-answer.
 */
export function useAskDuncitSocket(handlers: AskDuncitSocketHandlers) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const socket: Socket = io(getSocketUrl(), { path: '/socket.io', auth: { token }, transports: ['websocket', 'polling'] });
    let connectedOnce = false;
    socket.on('connect', () => {
      if (connectedOnce) ref.current.onReconnect();
      connectedOnce = true;
    });
    socket.on(ASK_DUNCIT_SOCKET_EVENTS.delta, (e) => ref.current.onDelta(e));
    socket.on(ASK_DUNCIT_SOCKET_EVENTS.tool, (e) => ref.current.onTool(e));
    socket.on(ASK_DUNCIT_SOCKET_EVENTS.action, (e: { action?: AskDuncitActionView }) => {
      if (e?.action) ref.current.onAction(e.action);
    });
    socket.on(ASK_DUNCIT_SOCKET_EVENTS.done, (e: { message?: AskDuncitMessageView }) => {
      if (e?.message) ref.current.onDone(e.message);
    });
    socket.on(ASK_DUNCIT_SOCKET_EVENTS.error, (e) => ref.current.onError(e));
    return () => {
      socket.disconnect();
    };
  }, []);
}
