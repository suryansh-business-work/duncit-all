import { gql, useQuery } from '@apollo/client';
import {
  createDateFormatter,
  stampServerTime,
  toTimeSource,
  type DateFormatter,
} from '@duncit/datetime';

/**
 * Admin-configurable display settings (project rule 11): every rendered date
 * and time routes through these so the format — and, in time-zone-aware mode,
 * the zone — follows the admin panel, never a hardcoded pattern.
 *
 * The formatting itself lives in @duncit/datetime so mobile, mWeb and every
 * portal share ONE implementation; this module is just the Apollo adapter.
 */
/**
 * ONE `PublicAppSettings` operation for the whole monorepo. Surfaces used to
 * declare their own copies selecting different fields under the same operation
 * name, which makes Apollo's normalized cache thrash between them — so the
 * non-date fields other surfaces need live here too.
 */
export const PUBLIC_APP_SETTINGS = gql`
  query PublicAppSettings {
    publicAppSettings {
      date_format
      time_format
      time_zone
      time_source
      custom_time
      custom_time_set_at
      server_time
      min_signup_age
      draft_retention_days
    }
  }
`;

export type { DateInput } from '@duncit/datetime';

export interface UseDateFormatOptions {
  /**
   * When true, formats in the admin-configured `time_zone` (fallback
   * Asia/Kolkata) via date-fns-tz, and the default time pattern is 'HH:mm'.
   * When false (default), formats in the browser's local zone with the
   * default time pattern 'hh:mm a'.
   */
  timeZoneAware?: boolean;
}

/**
 * `publicAppSettings`-driven date/time formatter.
 *
 * All formatters return '' for empty/invalid input instead of throwing.
 * `dayLabel` returns Today / Yesterday / the configured date pattern;
 * `dayKey` returns a 'yyyy-MM-dd' calendar-day key for grouping.
 * `now()` respects the admin's time source (server / browser / custom anchor).
 */
export function useDateFormat(options?: Readonly<UseDateFormatOptions>): DateFormatter {
  const timeZoneAware = options?.timeZoneAware === true;
  const { data } = useQuery(PUBLIC_APP_SETTINGS, { fetchPolicy: 'cache-first' });
  const settings = data?.publicAppSettings;
  const serverTime: string | null = settings?.server_time ?? null;

  return createDateFormatter({
    dateFormat: settings?.date_format,
    timeFormat: settings?.time_format,
    timeZone: settings?.time_zone,
    timeZoneAware,
    clock: {
      source: toTimeSource(settings?.time_source),
      serverNow: serverTime,
      // Stamped once per distinct server_time, so the server clock keeps
      // ticking between fetches instead of freezing at the fetched value.
      serverNowReceivedAt: stampServerTime(serverTime),
      customTime: settings?.custom_time ?? null,
      customTimeSetAt: settings?.custom_time_set_at ?? null,
    },
  });
}
