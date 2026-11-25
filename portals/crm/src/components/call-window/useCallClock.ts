import { useEffect, useState } from 'react';
import { crmElapsedSeconds, crmFormatDuration } from '@duncit/utils';

/** "m:ss", or "h:mm:ss" past an hour — shared with the CRM app. */
export const formatDuration = crmFormatDuration;

const elapsed = (since: string | null) => crmElapsedSeconds(since);

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
