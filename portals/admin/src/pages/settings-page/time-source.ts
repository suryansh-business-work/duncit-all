import { useEffect, useReducer } from 'react';
import { useQuery } from '@apollo/client';
import {
  PUBLIC_APP_SETTINGS,
  createDateFormatter,
  stampServerTime,
  toTimeSource,
} from '@duncit/app-settings';

/** Common IANA zones; any other zone can still be typed in free-text. */
export const TIME_ZONES = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
  'Australia/Sydney',
  'UTC',
];

export const SOURCE_OPTIONS = [
  {
    value: 'SERVER',
    label: 'Sync time with server',
    hint: "Every app follows the server's clock. Recommended — keeps all devices in step even if a phone's own clock is wrong.",
  },
  {
    value: 'BROWSER',
    label: 'Sync time with browser',
    hint: "Each device uses its own clock. Dates can differ between users whose devices disagree.",
  },
  {
    value: 'CUSTOM',
    label: 'Custom time',
    hint: 'Pin the clock to a chosen instant; it then runs forward from there. Affects every rendered date and which occasion icons are active — use for testing.',
  },
];

const PAD = (n: number) => String(n).padStart(2, '0');

/**
 * ISO instant -> the `YYYY-MM-DDTHH:mm` shape `<input type="datetime-local">`
 * expects, in the browser's local zone (which is what the input displays).
 * Returns '' for missing/unusable input.
 */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${PAD(d.getMonth() + 1)}-${PAD(d.getDate())}T${PAD(d.getHours())}:${PAD(d.getMinutes())}`;
}

interface SavedClock {
  time_source?: string | null;
  custom_time?: string | null;
  custom_time_set_at?: string | null;
}

interface PreviewInput {
  zone: string;
  source: string;
  customTime: string;
  saved?: SavedClock | null;
}

/**
 * What the apps would display right now for the currently selected (possibly
 * unsaved) settings. Ticks every second so the preview is visibly live —
 * which is how an admin can tell a custom clock is running, not frozen.
 */
export function useClockPreview({ zone, source, customTime, saved }: Readonly<PreviewInput>): string {
  const { data } = useQuery(PUBLIC_APP_SETTINGS, { fetchPolicy: 'cache-first' });
  // Re-render trigger only: the preview is recomputed from the clock on every
  // render, so bumping this each second is what makes it visibly move. This is
  // useReducer rather than useState because the counter's VALUE is never read —
  // a useState pair would leave either an unused binding (S1481) or an
  // asymmetric destructure (S6754); a dispatch-only reducer has neither.
  const [, tick] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick]);

  const serverTime: string | null = data?.publicAppSettings?.server_time ?? null;
  // A pending anchor has no save-stamp yet, so it previews frozen at the chosen
  // instant — exactly what the apps will read the moment it is saved.
  const anchorSaved = !!saved?.custom_time && toLocalInput(saved.custom_time) === customTime;
  const customIso = customTime ? new Date(customTime).toISOString() : null;

  // Built through the shared core so the preview uses the very same clock and
  // formatter the apps do — an admin sees exactly what users will see.
  const formatter = createDateFormatter({
    timeZone: zone,
    timeZoneAware: true,
    clock: {
      source: toTimeSource(source),
      serverNow: serverTime,
      serverNowReceivedAt: stampServerTime(serverTime),
      customTime: customIso,
      customTimeSetAt: anchorSaved ? saved?.custom_time_set_at : null,
    },
  });

  return formatter.formatPattern(formatter.now(), 'dd MMM yyyy, HH:mm:ss (zzz)') || 'Invalid time zone';
}
