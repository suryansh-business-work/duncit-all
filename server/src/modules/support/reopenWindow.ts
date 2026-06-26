/**
 * Shared 3-calendar-day reopen window for support tickets & chats.
 *
 * A resolved/closed item can be reopened by the user up to and including the
 * resolution date + 2 days (i.e. 3 calendar days inclusive). The cutoff is the
 * start of the 4th day. Days are counted at the configured admin timezone
 * (default Asia/Kolkata / IST, +330m), so "resolved 10 Jun" stays reopenable
 * through 12 Jun and expires at the start of 13 Jun — independent of the exact
 * resolution time.
 *
 * The window timezone is admin-configurable (`appSettings.time_zone`). The
 * reopen helpers stay synchronous (they run inside synchronous publish mappers)
 * by reading a module-level cached zone, refreshed from settings on boot via
 * {@link setReopenWindowZone}. Callers may also pass an explicit `tz` override.
 */
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

export const REOPEN_WINDOW_DAYS = 3;
export const DEFAULT_REOPEN_ZONE = 'Asia/Kolkata';

let cachedZone = DEFAULT_REOPEN_ZONE;

/** Refresh the cached IANA zone used for calendar-day math (called on boot). */
export function setReopenWindowZone(tz?: string | null): void {
  cachedZone = (tz || '').trim() || DEFAULT_REOPEN_ZONE;
}

/** The IANA zone currently used for the reopen-window day boundaries. */
export function getReopenWindowZone(): string {
  return cachedZone;
}

/** The instant the reopen window closes (exclusive), or null if never resolved. */
export function reopenDeadline(resolvedAt?: Date | null, tz: string = cachedZone): Date | null {
  if (!resolvedAt) return null;
  // The wall-clock day of resolution in the configured zone.
  const zoned = toZonedTime(resolvedAt, tz);
  const zoneMidnight = new Date(zoned.getFullYear(), zoned.getMonth(), zoned.getDate(), 0, 0, 0, 0);
  // Convert that zone-local midnight back to a real UTC instant, then add the
  // inclusive window length in whole days.
  const startUtc = fromZonedTime(zoneMidnight, tz);
  return new Date(startUtc.getTime() + REOPEN_WINDOW_DAYS * 86_400_000);
}

/** True once the reopen window has elapsed for a resolved/closed item. */
export function reopenExpired(
  resolvedAt?: Date | null,
  now: number = Date.now(),
  tz: string = cachedZone
): boolean {
  const deadline = reopenDeadline(resolvedAt, tz);
  return !!deadline && now >= deadline.getTime();
}
