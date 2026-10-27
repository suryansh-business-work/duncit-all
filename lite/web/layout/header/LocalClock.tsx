import { useSyncExternalStore } from 'react';
import { Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { deviceTimeZone } from '../../../shared/format';

/** "GMT+5:30" for a zone, from the platform's own names — never a hand-written format. */
export function offsetLabel(date: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en', { timeZone, timeZoneName: 'shortOffset' }).formatToParts(date);
    return parts.find((part) => part.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

const MINUTE_MS = 60_000;

/** A tick each minute, as an external store: the minute number in the browser, null on the server. */
const subscribeMinute = (onTick: () => void) => {
  const timer = setInterval(onTick, MINUTE_MS / 4);
  return () => clearInterval(timer);
};
const currentMinute = () => Math.floor(Date.now() / MINUTE_MS);
const serverMinute = () => null;

/**
 * The reader's own time and zone in the header, in the console's time format.
 * Drawn only after mount: the server cannot know the reader's clock, and a
 * time in the server HTML would never match the browser's first render.
 */
export function LocalClock() {
  const zone = deviceTimeZone();
  const { formatTime, now } = useDateFormat({ timeZone: zone });
  const minute = useSyncExternalStore(subscribeMinute, currentMinute, serverMinute);
  if (minute === null) return null;
  const at = now();
  return (
    <Typography component="time" dateTime={at.toISOString()} variant="body2" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' }, whiteSpace: 'nowrap' }} data-testid="header-clock">
      {formatTime(at)} {offsetLabel(at, zone)}
    </Typography>
  );
}
