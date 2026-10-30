import { useEffect, useRef } from 'react';

/** Whether the member can see the page right now — a background tab is not being looked at. */
const pageVisible = () => document.visibilityState === 'visible';

/**
 * A countdown of `totalMs` that runs only while the page is visible: hiding
 * the tab banks the time already spent, showing it again carries on from there.
 */
function visibleCountdown(totalMs: number, onDone: () => void) {
  let remaining = totalMs;
  let startedAt = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let done = false;

  const pause = () => {
    if (timer === null) return;
    clearTimeout(timer);
    timer = null;
    remaining -= Date.now() - startedAt;
  };
  const finish = () => {
    timer = null;
    done = true;
    onDone();
  };
  const resume = () => {
    if (done || timer !== null) return;
    startedAt = Date.now();
    timer = setTimeout(finish, Math.max(0, remaining));
  };
  /** Follows the tab: counting while it is visible, paused while it is hidden. */
  const sync = () => {
    if (pageVisible()) resume();
    else pause();
  };
  return { sync, pause };
}

/**
 * Calls `onDone` once the page has been VISIBLE for `seconds` since `runKey`
 * was set — time spent in a hidden tab does not count. A new key starts the
 * count over; a null key, or unmounting, stops it.
 */
export function useVisibleDwell(runKey: string | null, seconds: number, onDone: () => void) {
  // The latest callback, so a re-render never restarts the count.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (runKey === null) return undefined;
    const countdown = visibleCountdown(seconds * 1000, () => onDoneRef.current());
    document.addEventListener('visibilitychange', countdown.sync);
    countdown.sync();
    return () => {
      document.removeEventListener('visibilitychange', countdown.sync);
      countdown.pause();
    };
  }, [runKey, seconds]);
}
