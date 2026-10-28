import { useSyncExternalStore } from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { formatInTimeZone } from 'date-fns-tz';
import { deviceTimeZone } from '../../../shared/format';
import { useWebT } from '../../../shared/i18n';

/** ISO 8601's 24-hour time, the standard the header shows (no AM/PM, no regional order). */

/** Read by a screen reader, not drawn: the tooltip is for the pointer. */
const SR_ONLY = { position: 'absolute', width: 1, height: 1, p: 0, m: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 } as const;
const ISO_TIME = 'HH:mm';

/** "GMT+5:30" for a zone, from the platform's own names — never a hand-written format. */
export function offsetLabel(date: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en', { timeZone, timeZoneName: 'shortOffset' }).formatToParts(date);
    const label = parts.find((part) => part.type === 'timeZoneName')?.value ?? '';
    // ICU builds differ on a zero offset (GMT vs GMT+0); every browser shows the same.
    return label === 'GMT+0' || label === 'GMT-0' ? 'GMT' : label;
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
 * The reader's own time in the header as ISO 8601 (14:05), with the zone
 * (Asia/Kolkata · GMT+5:30) in a tooltip on hover and read out after the time
 * by a screen reader. Drawn only after
 * mount: the server cannot know the reader's clock, and a time in the server
 * HTML would never match the browser's first render.
 */
export function LocalClock() {
  const { t } = useWebT();
  const zone = deviceTimeZone();
  const minute = useSyncExternalStore(subscribeMinute, currentMinute, serverMinute);
  if (minute === null) return null;
  const at = new Date();
  const zoneLabel = t('liteWeb.nav.clockZone', { vars: { zone, offset: offsetLabel(at, zone) } });
  return (
    // describeChild: the zone describes the time; it must not replace the time as its name.
    <Tooltip title={zoneLabel} describeChild arrow>
      <Typography
        component="time"
        dateTime={formatInTimeZone(at, zone, "yyyy-MM-dd'T'HH:mmXXX")}
        variant="body2"
        color="text.secondary"
        sx={{ display: { xs: 'none', md: 'block' }, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontWeight: 600, cursor: 'default', borderRadius: 1 }}
        data-testid="header-clock"
      >
        {formatInTimeZone(at, zone, ISO_TIME)}
        <Box component="span" sx={SR_ONLY}>
          {` ${zoneLabel}`}
        </Box>
      </Typography>
    </Tooltip>
  );
}
