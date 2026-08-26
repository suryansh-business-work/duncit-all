import { logs } from '@observability/log';
import { AccountDeletionRequestModel } from './accountDeletion.model';

/**
 * Which accounts are sealed because their owner asked to be deleted.
 *
 * Filing a deletion request ENDS the account. Every token it ever handed out
 * stops being accepted, the sockets it holds are told to sign out, and no door
 * mints it a new one — the account is on its way out and there is nothing left
 * for it to do. What the grace period buys is time for a human to reverse the
 * decision, not time to keep using the account.
 *
 * WHY A MAP AND NOT A QUERY. Duncit JWTs are stateless and deliberately never
 * expire (`signToken`), so there is no session row to delete and no expiry to
 * wait out — a token is refused only if something refuses it on every request.
 * Reading the database on every authenticated request to answer a question
 * whose answer is "no" for virtually every account would be a round trip per
 * request for nothing. The set of sealed accounts is small, changes rarely and
 * is knowable at boot, so it is held in memory and mutated by the four writes
 * that can move it.
 *
 * FAILS OPEN, ON PURPOSE. A load that throws leaves the map as it was rather
 * than sealing or unsealing anything: locking every account out because Mongo
 * blinked is a far worse outage than a sealed account staying reachable for one
 * more minute, and the refresh below closes that gap on its own.
 */

/** userId → the instant the account was sealed. */
const locked = new Map<string, number>();

/**
 * How often the map is rebuilt from the database.
 *
 * The four write paths keep it correct inside this process, so the refresh is
 * a safety net for the two things they cannot cover: a request written by a
 * script or a second process, and a write path added later that forgets to
 * call `lockAccount`. A minute is the worst case for either.
 */
const REFRESH_MS = 60_000;

/** Whether this account's tokens and sign-ins must be refused. */
export function isAccountLocked(userId: string | null | undefined): boolean {
  return !!userId && locked.has(userId);
}

/** When it was sealed, or null. Read by the audit log, not by the gates. */
export function accountLockedAt(userId: string): Date | null {
  const at = locked.get(userId);
  return at === undefined ? null : new Date(at);
}

/** Seal an account. Called the moment a deletion request is filed. */
export function lockAccount(userId: string, at: Date = new Date()): void {
  if (userId) locked.set(userId, at.getTime());
}

/**
 * Unseal it — the request was withdrawn, turned down, or carried out.
 *
 * A carried-out request unseals too: the user document is gone by then, so
 * every token naming it is refused by `me` returning nothing anyway, and
 * leaving the id in the map would grow it by one row per deleted member
 * forever.
 */
export function unlockAccount(userId: string): void {
  locked.delete(userId);
}

/**
 * Rebuild the map from the open requests. Returns how many are sealed.
 *
 * Run once at boot (before the server listens) and on the refresh below. The
 * swap is atomic from a caller's point of view: the new set is built first and
 * only then replaces the old, so a request arriving mid-load is answered by
 * one complete picture rather than a half-populated one.
 */
export async function loadAccountLocks(): Promise<number> {
  const open = await AccountDeletionRequestModel.find({ status: 'PENDING' })
    .select('user_id requested_at')
    .lean();
  const next = new Map<string, number>();
  for (const row of open) {
    next.set(String(row.user_id), (row.requested_at ?? new Date()).getTime());
  }
  locked.clear();
  for (const [id, at] of next) locked.set(id, at);
  return locked.size;
}

/** Start the safety-net refresh. Returns a stop function. No-op under test. */
export function startAccountLockRefresh(): () => void {
  if (process.env.NODE_ENV === 'test') return () => undefined;
  const interval = setInterval(() => {
    loadAccountLocks().catch((error) => {
      // Deliberately does NOT clear the map: see "fails open" above — the
      // sealed accounts already known stay sealed through a database blip.
      logs.server.error('account-deletion', 'lock-refresh', { error });
    });
  }, REFRESH_MS);
  // Never keep the process alive just for this timer.
  interval.unref?.();
  return () => clearInterval(interval);
}
