/**
 * Shared 3-calendar-day reopen window for support tickets & chats.
 *
 * A resolved/closed item can be reopened by the user up to and including the
 * resolution date + 2 days (i.e. 3 calendar days inclusive). The cutoff is the
 * start of the 4th day. Days are counted at the configured wall-clock offset
 * (IST, +330m), so "resolved 10 Jun" stays reopenable through 12 Jun and
 * expires at the start of 13 Jun — independent of the exact resolution time.
 */
export const REOPEN_WINDOW_DAYS = 3;
const IST_OFFSET_MS = 330 * 60_000;

/** The instant the reopen window closes (exclusive), or null if never resolved. */
export function reopenDeadline(resolvedAt?: Date | null): Date | null {
  if (!resolvedAt) return null;
  const local = new Date(resolvedAt.getTime() + IST_OFFSET_MS);
  const localMidnightUtc = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - IST_OFFSET_MS;
  return new Date(localMidnightUtc + REOPEN_WINDOW_DAYS * 86_400_000);
}

/** True once the reopen window has elapsed for a resolved/closed item. */
export function reopenExpired(resolvedAt?: Date | null, now: number = Date.now()): boolean {
  const deadline = reopenDeadline(resolvedAt);
  return !!deadline && now >= deadline.getTime();
}
