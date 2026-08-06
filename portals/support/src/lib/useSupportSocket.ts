import { useEffect, useRef } from 'react';
import { io as ioClient, type Socket } from 'socket.io-client';
import { playNotificationBeep } from '@duncit/utils';
import { urlConfigs } from '../config/url-configs';
import { appConfig } from '../config/app-config';

export interface SupportSocketEvents {
  onSos?: (alert: any) => void;
  onSosUpdate?: (alert: any) => void;
  onCallback?: (req: any) => void;
  onCallbackUpdate?: (req: any) => void;
  onFeedback?: (fb: any) => void;
  onTicketNew?: (t: any) => void;
  onTicketUpdate?: (t: any) => void;
  onChatSessionNew?: (s: any) => void;
  onChatSessionUpdate?: (s: any) => void;
  onChatMessage?: (m: any) => void;
  onChatTyping?: (p: ChatTypingPayload) => void;
}

export interface ChatTypingPayload {
  session_id: string;
  user_id: string;
  role: 'USER' | 'AGENT';
  name: string | null;
}

function socketOrigin(): string {
  try {
    const u = new URL(urlConfigs.graphqlUrl);
    return `${u.protocol}//${u.host}`;
  } catch {
    return 'http://localhost:2001';
  }
}

/**
 * Connects to the realtime server using the Support portal token and wires the
 * given handlers. The agent auto-joins `support:agents` (server-side), so
 * bouncer + ticket + chat-session events arrive without an explicit subscribe.
 * Returns the live socket ref so callers can join per-session chat rooms.
 */
export function useSupportSocket(events: SupportSocketEvents) {
  const socketRef = useRef<Socket | null>(null);
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => {
    const token = localStorage.getItem(appConfig.tokenKey);
    if (!token) return;

    const socket = ioClient(socketOrigin(), {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('bouncer:sos_new', (p) => {
      playNotificationBeep();
      eventsRef.current.onSos?.(p);
    });
    socket.on('bouncer:sos_update', (p) => eventsRef.current.onSosUpdate?.(p));
    socket.on('bouncer:callback_new', (p) => eventsRef.current.onCallback?.(p));
    socket.on('bouncer:callback_update', (p) => eventsRef.current.onCallbackUpdate?.(p));
    socket.on('bouncer:feedback_new', (p) => eventsRef.current.onFeedback?.(p));
    socket.on('ticket:new', (p) => eventsRef.current.onTicketNew?.(p));
    socket.on('ticket:update', (p) => eventsRef.current.onTicketUpdate?.(p));
    socket.on('support_chat:session_new', (p) => eventsRef.current.onChatSessionNew?.(p));
    socket.on('support_chat:session_update', (p) => eventsRef.current.onChatSessionUpdate?.(p));
    socket.on('support_chat:message', (p) => eventsRef.current.onChatMessage?.(p));
    socket.on('support_typing', (p) => eventsRef.current.onChatTyping?.(p));

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return socketRef;
}
