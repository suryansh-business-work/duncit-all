import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { urlConfigs } from '../../config/url-configs';

function getSocketUrl() {
  try {
    const u = new URL(urlConfigs.graphqlUrl);
    return `${u.protocol}//${u.host}`;
  } catch {
    return window.location.origin;
  }
}

interface Params {
  sessionId: string | null;
  onMessage: (msg: any) => void;
}

/** Connects the user to their support chat session room for live replies. */
export function useSupportChatSocket({ sessionId, onMessage }: Params) {
  const socketRef = useRef<Socket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

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
    return () => {
      s.emit('leave_support_session', sessionId);
      s.disconnect();
      socketRef.current = null;
    };
  }, [sessionId]);
}
