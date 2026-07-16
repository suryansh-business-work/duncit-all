import { useCallback, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { urlConfigs } from '../../config/url-configs';

function getSocketUrl() {
  try {
    const u = new URL(urlConfigs.graphqlUrl);
    return `${u.protocol}//${u.host}`;
  } catch {
    return globalThis.window.location.origin;
  }
}

/** Live typing signal from a peer in the session room (B14a). */
export interface TypingPayload {
  role: 'USER' | 'AGENT';
  name: string | null;
}

interface Params {
  sessionId: string | null;
  onMessage: (msg: any) => void;
  onSession?: (session: any) => void;
  onTyping?: (payload: TypingPayload) => void;
}

/**
 * Connects the user to their support chat session room for live replies,
 * session updates (read receipts / status) and the agent's typing signal.
 * Returns an `emitTyping` helper so the agent sees the user typing too.
 */
export function useSupportChatSocket({ sessionId, onMessage, onSession, onTyping }: Params) {
  const socketRef = useRef<Socket | null>(null);
  const onMessageRef = useRef(onMessage);
  const onSessionRef = useRef(onSession);
  const onTypingRef = useRef(onTyping);
  onMessageRef.current = onMessage;
  onSessionRef.current = onSession;
  onTypingRef.current = onTyping;

  useEffect(() => {
    if (!sessionId) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const s = io(getSocketUrl(), {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = s;
    s.on('connect', () => {
      s.emit('join_support_session', sessionId);
    });
    s.on('support_chat:message', (msg: any) => {
      if (msg.session_id === sessionId) onMessageRef.current(msg);
    });
    s.on('support_chat:session_update', (session: any) => {
      if (session.id === sessionId) onSessionRef.current?.(session);
    });
    s.on('support_typing', (payload: any) => {
      if (payload?.session_id !== sessionId) return;
      onTypingRef.current?.({
        role: payload?.role === 'AGENT' ? 'AGENT' : 'USER',
        name: payload?.name ?? null,
      });
    });
    return () => {
      s.emit('leave_support_session', sessionId);
      s.disconnect();
      socketRef.current = null;
    };
  }, [sessionId]);

  const emitTyping = useCallback(() => {
    if (sessionId) socketRef.current?.emit('support_typing', sessionId);
  }, [sessionId]);

  return { emitTyping };
}
