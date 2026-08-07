import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';

export type PresenceStatus = 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE';

/** Ten minutes without a keystroke, a click or a scroll. */
const IDLE_MS = 10 * 60 * 1000;
const ACTIVITY = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'focus'] as const;
/** Remembered so a refresh does not silently put you back on ONLINE. */
const CHOICE_KEY = 'duncit_chat_status';

const isStatus = (value: string | null): value is PresenceStatus =>
  value === 'ONLINE' || value === 'AWAY' || value === 'BUSY' || value === 'OFFLINE';

function readChoice(): PresenceStatus {
  try {
    const saved = globalThis.localStorage.getItem(CHOICE_KEY);
    return isStatus(saved) ? saved : 'ONLINE';
  } catch {
    return 'ONLINE';
  }
}

/**
 * Your own status, and everyone else's.
 *
 * The server never guesses whether someone is at their desk — only the browser
 * knows that — so the idle timer lives here and reports AWAY when it fires.
 * A status you chose yourself outranks the timer: someone who set BUSY did not
 * ask to be marked away ten minutes later, and someone who set OFFLINE did not
 * ask to be dragged back online by moving their mouse.
 */
export function usePresence(socket: Socket | null, meId?: string | null) {
  const [mine, setMine] = useState<PresenceStatus>(readChoice);
  const [others, setOthers] = useState<Record<string, PresenceStatus>>({});
  /** When each person was last connected — what 'last seen' reads from. */
  const [lastSeen, setLastSeen] = useState<Record<string, string>>({});
  // Read inside the timer without making it a dependency, or every keystroke
  // would tear the listeners down and rebuild them.
  const mineRef = useRef(mine);
  mineRef.current = mine;

  const publish = useCallback(
    (status: PresenceStatus) => {
      socket?.emit('staff_status', status);
    },
    [socket]
  );

  /** A deliberate choice: remembered, published, and safe from the timer. */
  const choose = useCallback(
    (status: PresenceStatus) => {
      setMine(status);
      try {
        globalThis.localStorage.setItem(CHOICE_KEY, status);
      } catch {
        // A browser refusing storage still gets the status for this session.
      }
      publish(status);
    },
    [publish]
  );

  // Tell the server what we already are, as soon as there is a socket to tell.
  useEffect(() => {
    if (socket) publish(mineRef.current);
  }, [socket, publish]);

  useEffect(() => {
    if (!socket) return undefined;
    const onPresence = (payload: {
      user_id: string;
      status: PresenceStatus;
      last_seen?: string | null;
    }) => {
      if (!payload?.user_id || payload.user_id === meId) return;
      setOthers((current) => ({ ...current, [payload.user_id]: payload.status }));
      if (payload.last_seen) {
        setLastSeen((current) => ({ ...current, [payload.user_id]: payload.last_seen as string }));
      }
    };
    socket.on('staff_presence', onPresence);
    return () => {
      socket.off('staff_presence', onPresence);
    };
  }, [socket, meId]);

  useEffect(() => {
    if (!socket) return undefined;
    let timer: ReturnType<typeof globalThis.setTimeout> | undefined;
    const arm = () => {
      if (timer) globalThis.clearTimeout(timer);
      timer = globalThis.setTimeout(() => {
        // Only an ONLINE person drifts to AWAY. BUSY and OFFLINE were asked for.
        if (mineRef.current === 'ONLINE') {
          setMine('AWAY');
          publish('AWAY');
        }
      }, IDLE_MS);
    };
    const onActivity = () => {
      // Coming back undoes the timer's AWAY, never a chosen status.
      if (mineRef.current === 'AWAY' && readChoice() === 'ONLINE') {
        setMine('ONLINE');
        publish('ONLINE');
      }
      arm();
    };
    for (const event of ACTIVITY) globalThis.addEventListener(event, onActivity, { passive: true });
    arm();
    return () => {
      if (timer) globalThis.clearTimeout(timer);
      for (const event of ACTIVITY) globalThis.removeEventListener(event, onActivity);
    };
  }, [socket, publish]);

  return { mine, choose, others, lastSeen, statusOf: (id: string): PresenceStatus => others[id] ?? 'OFFLINE' };
}
