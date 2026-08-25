import { useEffect, useRef, useState } from 'react';
import { useDateFormat } from '@duncit/app-settings';
import { withSeconds } from './clock';

export interface TaskbarClockValue {
  /** The instant on screen, per the admin's time source. */
  now: Date;
  time: string;
  date: string;
  /** Long form for the tray: the same instant, date and time together. */
  full: string;
  /** The zone actually being rendered in, resolved. */
  zone: string;
}

/**
 * The clock in the taskbar, ticking once a second.
 *
 * "Now" comes from the shared formatter rather than `Date.now()`, so the
 * admin's time source (server, browser or a custom anchor) drives the taskbar
 * exactly as it drives every other date on the page — a console whose clock
 * disagreed with its own tables would be worse than no clock.
 */
export function useTaskbarClock(zone: string, seconds: boolean): TaskbarClockValue {
  const format = useDateFormat({ timeZoneAware: true, timeZone: zone || undefined });
  const [now, setNow] = useState<Date>(() => format.now());

  /*
    The formatter is rebuilt on every render — it is a plain object over the
    settings — so the interval reads it through a ref. In the dependency list it
    would tear the timer down and start a new one on every render, and a clock
    that restarts its second is a clock that skips one.
  */
  const live = useRef(format);
  live.current = format;

  useEffect(() => {
    const id = setInterval(() => setNow(live.current.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const pattern = seconds ? withSeconds(format.timeFormat) : format.timeFormat;

  return {
    now,
    time: format.formatPattern(now, pattern),
    date: format.formatDate(now),
    full: format.formatDateTime(now),
    zone: format.timeZone,
  };
}
