import { useEffect, useRef } from 'react';
import { io as ioClient, type Socket } from 'socket.io-client';
import { urlConfigs } from '../../config/url-configs';

interface BouncerEvents {
  onSos?: (alert: any) => void;
  onSosUpdate?: (alert: any) => void;
  onCallback?: (req: any) => void;
  onCallbackUpdate?: (req: any) => void;
  onFeedback?: (fb: any) => void;
}

function socketOrigin(): string {
  try {
    const u = new URL(urlConfigs.graphqlUrl);
    return `${u.protocol}//${u.host}`;
  } catch {
    return 'http://localhost:2001';
  }
}

// Plays a short two-tone beep. Generated with the Web Audio API so we don't
// need an audio asset on disk. Falls back silently if the browser blocks
// audio before the first user gesture.
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

export function useBouncerSocket(events: BouncerEvents) {
  const socketRef = useRef<Socket | null>(null);
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    const socket = ioClient(socketOrigin(), {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('bouncer:sos_new', (payload) => {
      playBeep();
      eventsRef.current.onSos?.(payload);
    });
    socket.on('bouncer:sos_update', (payload) => eventsRef.current.onSosUpdate?.(payload));
    socket.on('bouncer:callback_new', (payload) => eventsRef.current.onCallback?.(payload));
    socket.on('bouncer:callback_update', (payload) => eventsRef.current.onCallbackUpdate?.(payload));
    socket.on('bouncer:feedback_new', (payload) => eventsRef.current.onFeedback?.(payload));

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);
}
