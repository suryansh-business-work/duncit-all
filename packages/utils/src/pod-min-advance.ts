import { addDaysYmd } from './venue-booking';
import { dayKeyInZone, startOfDayInZone } from './zone-day';

/**
 * Minimum Advance Days for Pod Creation (Admin > Pods > Pod Settings, with a
 * per-host override in the Hosts console): how many calendar days ahead of
 * today a host's new pod must start, so there is time to promote it.
 *
 * The server refuses a pod that starts too soon, and the apps grey out every
 * day before the first allowed one. All three read the rule from here, so the
 * calendar can never offer a day the server would refuse.
 */

/** The platform default when an admin has set nothing. */
export const DEFAULT_POD_MIN_ADVANCE_DAYS = 2;
/** The fewest days an admin may set. */
export const MIN_POD_MIN_ADVANCE_DAYS = 1;
/** The most days an admin may set. */
export const MAX_POD_MIN_ADVANCE_DAYS = 30;

/** A whole number of days inside the admin's range, or `null` when it is not one. */
export function podMinAdvanceDaysOrNull(value: unknown): number | null {
  if (typeof value === 'string' && value.trim() === '') return null;
  const days = Number(value);
  if (!Number.isInteger(days)) return null;
  return days >= MIN_POD_MIN_ADVANCE_DAYS && days <= MAX_POD_MIN_ADVANCE_DAYS ? days : null;
}

/**
 * The stored platform setting as the rule applies it: a fraction is floored and
 * anything outside 1–30 is held to the nearest end; a value that is not a
 * number at all reads as the default.
 */
export function cleanPodMinAdvanceDays(value: unknown): number {
  // `Number(null)` and `Number('')` are 0, which would clamp to 1 rather than
  // fall back — an unset value is the default, not the minimum.
  if (value === null || value === undefined || value === '') return DEFAULT_POD_MIN_ADVANCE_DAYS;
  const days = Math.floor(Number(value));
  if (!Number.isFinite(days)) return DEFAULT_POD_MIN_ADVANCE_DAYS;
  return Math.min(MAX_POD_MIN_ADVANCE_DAYS, Math.max(MIN_POD_MIN_ADVANCE_DAYS, days));
}

/** The first day a new pod may start on, and the instant that day begins. */
export interface PodMinAdvanceWindow {
  /** `yyyy-MM-dd` in the admin's time zone. */
  day: string;
  /** Local midnight of `day` in that zone, as epoch ms. */
  startMs: number;
}

/**
 * The first day a host's new pod may start: `days` calendar days after today
 * on the admin's clock. Today 10 Nov with 5 days → 15 Nov, from midnight.
 */
export function podMinAdvanceWindow(nowMs: number, timeZone: string, days: number): PodMinAdvanceWindow {
  const day = addDaysYmd(dayKeyInZone(nowMs, timeZone), cleanPodMinAdvanceDays(days));
  return { day, startMs: startOfDayInZone(day, timeZone) };
}

/** Whether a pod starting at `startMs` is far enough ahead under the window. */
export function meetsPodMinAdvance(startMs: number, window: Readonly<PodMinAdvanceWindow>): boolean {
  return Number.isFinite(startMs) && startMs >= window.startMs;
}

/** The items (slots, tiles) that start on or after the window — all of them with no window. */
export function startsWithinPodMinAdvance<T extends { start_at: string }>(
  items: readonly T[],
  window: Readonly<PodMinAdvanceWindow> | null,
): T[] {
  if (!window) return [...items];
  return items.filter((item) => meetsPodMinAdvance(Date.parse(item.start_at), window));
}

/**
 * The caller's own minimum — their host override, else the platform setting —
 * as an SDL string (mWeb wraps it with `gql`; the native app re-declares it for
 * its codegen).
 */
export const MY_POD_MIN_ADVANCE_DAYS_SDL = `
  query MyPodMinAdvanceDays {
    myPodMinAdvanceDays
  }
`;
