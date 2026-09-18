import { useEffect, useRef, useState } from 'react';
import { useDateFormat } from '@duncit/app-settings';

export interface Countdown {
  hours: number;
  minutes: number;
  seconds: number;
  /** The end has passed (or there is no end at all when `ends` is false). */
  over: boolean;
  ends: boolean;
}

const SECOND = 1000;

/** Time left until `endsAt`, ticking each second on the admin-configured clock. */
export function useCountdown(endsAt: string | null): Countdown {
  const { now } = useDateFormat();
  const target = endsAt ? Date.parse(endsAt) : Number.NaN;
  const ends = Number.isFinite(target);
  const [current, setCurrent] = useState(() => now().getTime());
  // The formatter is rebuilt every render; the interval reads the latest one.
  const clock = useRef(now);
  clock.current = now;

  useEffect(() => {
    if (!ends) return undefined;
    const timer = globalThis.setInterval(() => setCurrent(clock.current().getTime()), SECOND);
    return () => globalThis.clearInterval(timer);
  }, [ends]);

  const left = ends ? Math.max(0, Math.floor((target - current) / SECOND)) : 0;
  return {
    hours: Math.floor(left / 3600),
    minutes: Math.floor((left % 3600) / 60),
    seconds: left % 60,
    over: ends && left === 0,
    ends,
  };
}
