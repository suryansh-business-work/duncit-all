import { useEffect, useRef } from 'react';
import { io as ioClient, type Socket } from 'socket.io-client';
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
}

function socketOrigin(): string {
  try {
    const u = new URL(urlConfigs.graphqlUrl);
    return `${u.protocol}//${u.host}`;
  } catch {
    return 'http://localhost:2001';
  }
}

// Short two-tone beep generated with the Web Audio API so we don't need an
// audio asset on disk. Falls back silently if the browser blocks audio.
function playBeep() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const beep = (when: number, freq: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + when);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + when + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + when);
      osc.stop(ctx.currentTime + when + dur + 0.02);
    };
    beep(0, 880, 0.18);
    beep(0.22, 660, 0.22);
    window.setTimeout(() => ctx.close().catch(() => {}), 800);
  } catch {
    // ignore — audio is best-effort
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
      playBeep();
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

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return socketRef;
}
