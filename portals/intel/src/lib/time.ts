import { formatDateTime } from '@duncit/app-settings';

/**
 * "2 min ago" for the last few days, then the admin-configured date format.
 * The words come from the catalogue (`intel.time.*`), never hard-coded.
 */

type Translate = (key: string, opts?: { vars?: Record<string, string | number> }) => string;

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function relativeTime(iso: string | null | undefined, t: Translate, now = Date.now()): string {
  if (!iso) return t('intel.time.never');
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return t('intel.time.never');
  const diff = Math.max(0, now - at);
  if (diff < MIN) return t('intel.time.justNow');
  if (diff < HOUR) return t('intel.time.minutesAgo', { vars: { count: Math.floor(diff / MIN) } });
  if (diff < DAY) return t('intel.time.hoursAgo', { vars: { count: Math.floor(diff / HOUR) } });
  if (diff < 7 * DAY) return t('intel.time.daysAgo', { vars: { count: Math.floor(diff / DAY) } });
  return formatDateTime(iso);
}
