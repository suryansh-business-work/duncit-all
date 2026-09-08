/**
 * Every date or time the server prints FOR A PERSON — a booking email, a
 * WhatsApp template, the ticket PDF, an in-app note — is read here, in the
 * admin's configured zone and patterns (Admin > Settings: time zone, date
 * format, time format).
 *
 * Why this exists: forty-odd sites called `toLocaleString('en-IN', …)` with no
 * `timeZone`, which formats in the PROCESS zone. The container runs on UTC, so
 * a 6:30 pm pod in Kolkata was confirmed on WhatsApp, by email and on the
 * ticket itself as 1:00 pm — from either app, because the server wrote all
 * three. The clients already format through `@duncit/datetime` with the same
 * admin settings; this is the server's half of that rule (CLAUDE.md rule 11),
 * kept apart because `server/src` imports no `@duncit/*` package.
 *
 * The settings are a module-level cache, refreshed on boot and on every save
 * (`settingsService.refreshDerivedCaches` / `updateAppSettings`), so the
 * helpers stay synchronous — they are called inside template parameter arrays
 * and PDF draw calls, not from anywhere that could await a settings read. The
 * support reopen window reads its zone from the same cache.
 */
import { formatInTimeZone } from 'date-fns-tz';
import { logs } from '@observability/log';

export const DEFAULT_APP_ZONE = 'Asia/Kolkata';
export const DEFAULT_DATE_FORMAT = 'dd MMM yyyy';
export const DEFAULT_TIME_FORMAT = 'hh:mm a';

/** The three admin settings, as the settings document spells them. A field
 * left `undefined` is untouched; `null` or blank resets it to the default. */
export interface AppTimeSettings {
  time_zone?: string | null;
  date_format?: string | null;
  time_format?: string | null;
}

/** Anything a stored instant arrives as. Blank and unparseable both print ''. */
export type AppInstant = Date | string | number | null | undefined;

let zone = DEFAULT_APP_ZONE;
let dateFormat = DEFAULT_DATE_FORMAT;
let timeFormat = DEFAULT_TIME_FORMAT;

/**
 * A zone or pattern an admin typed is only trusted once it has formatted a real
 * instant — an IANA name Intl does not know, or a pattern with a token date-fns
 * refuses, throws here rather than inside a booking send hours later.
 */
function proven(candidate: string, fallback: string, tryZone: string, tryPattern: string): string {
  try {
    formatInTimeZone(new Date(), tryZone, tryPattern);
    return candidate;
  } catch (error) {
    logs.server.warn('app-time', 'setAppTimeSettings', {
      error,
      msg: 'app time setting rejected; keeping the default',
      candidate,
      fallback,
    });
    return fallback;
  }
}

/** Refresh the cached settings — on boot, and whenever an admin saves them. */
export function setAppTimeSettings(input: AppTimeSettings | null | undefined): void {
  if (input?.time_zone !== undefined) {
    const next = (input.time_zone ?? '').trim() || DEFAULT_APP_ZONE;
    zone = proven(next, DEFAULT_APP_ZONE, next, DEFAULT_DATE_FORMAT);
  }
  if (input?.date_format !== undefined) {
    const next = (input.date_format ?? '').trim() || DEFAULT_DATE_FORMAT;
    dateFormat = proven(next, DEFAULT_DATE_FORMAT, zone, next);
  }
  if (input?.time_format !== undefined) {
    const next = (input.time_format ?? '').trim() || DEFAULT_TIME_FORMAT;
    timeFormat = proven(next, DEFAULT_TIME_FORMAT, zone, next);
  }
}

/** The IANA zone every printed time is read in. */
export function getAppTimeZone(): string {
  return zone;
}

function toDate(value: AppInstant): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** An instant in the app's zone, in any date-fns pattern. */
export function appFormat(value: AppInstant, pattern: string): string {
  const date = toDate(value);
  return date ? formatInTimeZone(date, zone, pattern) : '';
}

/** The day, in the admin's date pattern — "08 Sep 2026". */
export const appDate = (value: AppInstant): string => appFormat(value, dateFormat);

/** The clock time, in the admin's time pattern — "06:30 PM". */
export const appTime = (value: AppInstant): string => appFormat(value, timeFormat);

/** Both, the way an in-app note or an email line reads — "08 Sep 2026, 06:30 PM". */
export function appDateTime(value: AppInstant): string {
  const date = toDate(value);
  return date ? `${appDate(date)}, ${appTime(date)}` : '';
}

/** The ticket's own line, where the weekday earns its place —
 * "Tuesday, 08 Sep 2026 at 06:30 PM". */
export function appDateTimeLong(value: AppInstant): string {
  const date = toDate(value);
  return date ? `${appFormat(date, 'EEEE')}, ${appDate(date)} at ${appTime(date)}` : '';
}
