import { logs } from '@observability/log';
import { UserModel } from '@modules/access/user/user.model';

/**
 * Which accounts have ended the sessions their OLD password opened.
 *
 * Duncit JWTs are stateless and deliberately never expire (`signToken`), so
 * there is no session row to delete and no expiry to wait out — a token stops
 * being accepted only if something refuses it on every request. Resetting a
 * forgotten password is exactly the moment that has to be true of: the whole
 * point of the flow is that somebody else may be holding the old credentials,
 * and a browser they left signed in is the thing the reset is supposed to
 * close.
 *
 * WHY A MAP AND NOT A QUERY. Same reasoning as `accountDeletion.lock`, which
 * this deliberately mirrors rather than shares: the two answer different
 * questions (that one refuses an ACCOUNT, this one refuses a TOKEN older than
 * an instant) and folding them together would mean every caller of one carries
 * the other's semantics. Reading the database on every authenticated request to
 * answer a question whose answer is "no" for virtually every account would be a
 * round trip per request for nothing.
 *
 * WHY ITS OWN FIELD. `security.password_changed_at` already existed and is
 * written by the signed-in change flow, so seeding from it would sign out
 * everybody who has ever changed their password the moment this deploys —
 * tokens that were legitimately issued AFTER their change included, since the
 * comparison is against an instant nobody recorded a token's age against.
 * `security.sessions_invalidated_at` is written only by the doors below, so the
 * map starts empty on a real database and fills as resets happen.
 *
 * FAILS OPEN, ON PURPOSE. A load that throws leaves the map as it was rather
 * than sealing or unsealing anything: signing everybody out because Mongo
 * blinked is a far worse outage than one stale token surviving a minute longer.
 */

/** userId -> the instant every token older than it stops being accepted. */
const sealedAt = new Map<string, number>();

/** How often the map is rebuilt, as a safety net for a write in another process. */
const REFRESH_MS = 60_000;

/**
 * Whether a token minted at `issuedAt` is too old for this account.
 *
 * A token with no `iat` is refused once the account is sealed. Every token this
 * server mints carries one (jsonwebtoken stamps it by default), so the only
 * thing that reaches here without one is a token this server did not make the
 * ordinary way — and "I cannot tell how old it is" is not a reason to accept it
 * from an account that has just asked for its sessions to end.
 */
export function isSessionSealed(
  userId: string | null | undefined,
  issuedAt: number | null | undefined
): boolean {
  if (!userId) return false;
  const at = sealedAt.get(userId);
  if (at === undefined) return false;
  if (typeof issuedAt !== 'number') return true;
  // `iat` is in SECONDS. Comparing it to a millisecond instant unconverted
  // would make every token look ~53 years old and sign out the account that
  // just reset — including the session it is about to open.
  return issuedAt * 1000 < at;
}

/** End every session older than `at`. Called the moment a password is reset. */
export function sealSessions(userId: string, at: Date = new Date()): void {
  if (userId) sealedAt.set(userId, at.getTime());
}

/** Rebuild the map from the accounts that hold a seal. Returns how many. */
export async function loadSessionSeals(): Promise<number> {
  const rows = await UserModel.find({ 'security.sessions_invalidated_at': { $ne: null } })
    .select('security.sessions_invalidated_at')
    .lean();
  const next = new Map<string, number>();
  for (const row of rows) {
    const at = (row as { security?: { sessions_invalidated_at?: Date } }).security
      ?.sessions_invalidated_at;
    if (at) next.set(String(row._id), new Date(at).getTime());
  }
  sealedAt.clear();
  for (const [id, at] of next) sealedAt.set(id, at);
  return sealedAt.size;
}

/** Start the safety-net refresh. Returns a stop function. No-op under test. */
export function startSessionSealRefresh(): () => void {
  if (process.env.NODE_ENV === 'test') return () => undefined;
  const interval = setInterval(() => {
    loadSessionSeals().catch((error) => {
      // Deliberately does NOT clear the map: see "fails open" above.
      logs.server.error('auth', 'session-seal-refresh', { error });
    });
  }, REFRESH_MS);
  // Never keep the process alive just for this timer.
  interval.unref?.();
  return () => clearInterval(interval);
}
