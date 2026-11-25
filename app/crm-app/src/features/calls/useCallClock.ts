import { useEffect, useState } from 'react';
import { crmElapsedSeconds } from '@duncit/utils';

/**
 * Seconds since the contact picked up, ticking while the call is live and
 * holding the final figure once it ends — the portal's call clock. The start
 * time comes from the server, so it is right after the screen reopens too.
 */
export function useCallClock(answeredAt: string | null, running: boolean): number {
  const [seconds, setSeconds] = useState(() => crmElapsedSeconds(answeredAt));

  useEffect(() => {
    if (!running) return;
    setSeconds(crmElapsedSeconds(answeredAt));
    if (!answeredAt) return;
    const timer = setInterval(() => setSeconds(crmElapsedSeconds(answeredAt)), 1000);
    return () => clearInterval(timer);
  }, [answeredAt, running]);

  return seconds;
}
