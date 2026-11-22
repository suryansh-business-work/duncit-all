import { useEffect, useState } from 'react';

/** "m:ss", or "h:mm:ss" past an hour. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = String(s % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}

const elapsed = (since: string | null) => {
  const start = since ? Date.parse(since) : Number.NaN;
  return Number.isNaN(start) ? 0 : Math.max(0, Math.floor((Date.now() - start) / 1000));
};

/**
 * Seconds since the contact picked up, ticking while the call is live and
 * holding the final figure once it ends. The start time comes from the
 * server, so the clock is right after a reload too.
 */
export function useCallClock(answeredAt: string | null, running: boolean): number {
  const [seconds, setSeconds] = useState(() => elapsed(answeredAt));

  useEffect(() => {
    if (!running) return;
    setSeconds(elapsed(answeredAt));
    if (!answeredAt) return;
    const timer = setInterval(() => setSeconds(elapsed(answeredAt)), 1000);
    return () => clearInterval(timer);
  }, [answeredAt, running]);

  return seconds;
}
