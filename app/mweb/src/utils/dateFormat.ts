import { useQuery } from '@apollo/client/react';
import {
  PUBLIC_APP_SETTINGS,
  ambientDateFormatter,
  useDateFormat as useSharedDateFormat,
  type DateInput,
} from '@duncit/app-settings';
import { DEFAULT_MIN_ACCOUNT_AGE_YEARS } from '@duncit/datetime';
import { DEFAULT_HAPPENING_NEARBY_DAYS, DEFAULT_TICKET_DISCOUNT_MAX_PCT } from '@duncit/utils';

/**
 * mWeb's date/time entry point. The implementation lives in @duncit/datetime
 * (via @duncit/app-settings) so mobile, mWeb and every portal format dates
 * identically and follow the admin's time source — this module only keeps the
 * mWeb-specific settings hooks and preserves the existing import paths.
 */
export { PUBLIC_APP_SETTINGS };
export type { DateInput };

/**
 * Plain (non-hook) formatters, for the helpers that build date text OUTSIDE a
 * component — list-item subtitles, `valueGetter`-style mappers, pure modules.
 * They read the settings the root provider publishes, so they answer the same
 * as `useDateFormat()` without needing a component to call them from.
 *
 * Named to match the native app's `utils/date-format` (rule 27), so the twin
 * files read alike.
 */
export const formatDate = (input: DateInput): string => ambientDateFormatter().formatDate(input);
export const formatTime = (input: DateInput): string => ambientDateFormatter().formatTime(input);
export const formatDateTime = (input: DateInput): string =>
  ambientDateFormatter().formatDateTime(input);
/** A stored 'yyyy-MM-dd' calendar day — never shifted by a time zone. */
export const formatDay = (value: string): string => ambientDateFormatter().formatDay(value);

const FALLBACK_DRAFT_RETENTION_DAYS = 3;

/**
 * Formats in the admin-configured IANA zone so every client renders the same
 * wall-clock time regardless of the viewer's device timezone (B10).
 */
export function useDateFormat() {
  return useSharedDateFormat({ timeZoneAware: true });
}

/** Admin-configured minimum joining age (Admin > Settings), with a safe
 * fallback. Every date-of-birth input validates against it. */
export function useMinSignupAge(): number {
  const { data } = useQuery<any>(PUBLIC_APP_SETTINGS, { fetchPolicy: 'cache-first' });
  return (data?.publicAppSettings?.min_signup_age as number) ?? DEFAULT_MIN_ACCOUNT_AGE_YEARS;
}

/** Admin-configured draft-pod retention window in days (Admin > Pods > Pod
 * Settings), with a safe fallback. Drives the Host Studio draft-expiry note. */
export function useDraftRetentionDays(): number {
  const { data } = useQuery<any>(PUBLIC_APP_SETTINGS, { fetchPolicy: 'cache-first' });
  return (data?.publicAppSettings?.draft_retention_days as number) ?? FALLBACK_DRAFT_RETENTION_DAYS;
}

/** Admin-configured cap on a multi-ticket discount tier's % (Admin > Pods > Pod
 * Settings). The shared default only stands in while the settings load. */
export function useTicketDiscountMaxPct(): number {
  const { data } = useQuery<any>(PUBLIC_APP_SETTINGS, { fetchPolicy: 'cache-first' });
  return (data?.publicAppSettings?.ticket_discount_max_pct as number) ?? DEFAULT_TICKET_DISCOUNT_MAX_PCT;
}

/** Admin-configured "Happening nearby" window in days (Pods > Pod Settings): Home
 * lists only upcoming pods starting within it. The shared default stands in while
 * the settings load. */
export function useHappeningNearbyDays(): number {
  const { data } = useQuery<{ publicAppSettings?: { happening_nearby_days?: number | null } | null }>(
    PUBLIC_APP_SETTINGS,
    { fetchPolicy: 'cache-first' }
  );
  return data?.publicAppSettings?.happening_nearby_days ?? DEFAULT_HAPPENING_NEARBY_DAYS;
}

/** Human duration between two dates — one rule shared with native. */
export { formatDurationBetween } from '@duncit/datetime';
