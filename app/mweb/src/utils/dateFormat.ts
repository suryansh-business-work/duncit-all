import { useQuery } from '@apollo/client';
import { PUBLIC_APP_SETTINGS, useDateFormat as useSharedDateFormat } from '@duncit/app-settings';

/**
 * mWeb's date/time entry point. The implementation lives in @duncit/datetime
 * (via @duncit/app-settings) so mobile, mWeb and every portal format dates
 * identically and follow the admin's time source — this module only keeps the
 * mWeb-specific settings hooks and preserves the existing import paths.
 */
export { PUBLIC_APP_SETTINGS };
export type { DateInput } from '@duncit/app-settings';

const FALLBACK_DRAFT_RETENTION_DAYS = 3;
const FALLBACK_MIN_BIRTH_YEAR = 1940;
const FALLBACK_MAX_BIRTH_YEAR = 2012;

/**
 * Formats in the admin-configured IANA zone so every client renders the same
 * wall-clock time regardless of the viewer's device timezone (B10).
 */
export function useDateFormat() {
  return useSharedDateFormat({ timeZoneAware: true });
}

/** Admin-configured draft-pod retention window in days (Admin > Pods > Pod
 * Settings), with a safe fallback. Drives the Host Studio draft-expiry note. */
export function useDraftRetentionDays(): number {
  const { data } = useQuery(PUBLIC_APP_SETTINGS, { fetchPolicy: 'cache-first' });
  return (data?.publicAppSettings?.draft_retention_days as number) ?? FALLBACK_DRAFT_RETENTION_DAYS;
}

/** Admin-configured signup birth-year bounds (Admin > Settings), with fallbacks. */
export function useSignupBirthYearBounds() {
  const { data } = useQuery(PUBLIC_APP_SETTINGS, { fetchPolicy: 'cache-first' });
  return {
    minBirthYear: (data?.publicAppSettings?.min_birth_year as number) ?? FALLBACK_MIN_BIRTH_YEAR,
    maxBirthYear: (data?.publicAppSettings?.max_birth_year as number) ?? FALLBACK_MAX_BIRTH_YEAR,
  };
}

/** Human duration between two dates — "2d 3h", "2h 30m", "45m"; null when
 * either side is missing or the end isn't after the start. Mirrors mobile. */
export function formatDurationBetween(start: Date | null, end: Date | null): string | null {
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  if (minutes <= 0) return null;
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (mins || parts.length === 0) parts.push(`${mins}m`);
  return parts.join(' ');
}
