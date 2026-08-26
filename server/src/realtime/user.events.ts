import { getIo, userRoom } from './io';

/**
 * Push a changed account to every surface that user has open.
 *
 * The payload is a PARTIAL — the client merges it into the session it already
 * holds. That is deliberate: a full `me` here would need the 7-collection read
 * `toPublic` performs, on every profile keystroke, for a client that only cares
 * about the two fields that moved.
 *
 * Fire-and-forget by design. A profile save must not fail because the socket
 * server is not up (it is not, in tests and in the CLI scripts), and the client
 * re-reads `me` on its next mount regardless.
 */
export function emitUserChanged(userId: string, patch: Record<string, unknown>): void {
  if (!userId) return;
  try {
    getIo().to(userRoom(userId)).emit('user:changed', { user_id: userId, patch });
  } catch {
    /* socket server not initialised — nothing to notify */
  }
}

/**
 * Tell every surface this account has open to sign out, now.
 *
 * The token is already refused by then — `isAccountLocked` sees to that — so
 * this is not what ends the session; it is what makes the ending VISIBLE. A
 * phone left on a screen would otherwise sit there looking signed in until
 * something made it talk to the server, and "you have been signed out
 * everywhere" has to be true of the device that is not being touched.
 *
 * Fire-and-forget for the same reason as the patch above: filing a deletion
 * request must not fail because the socket server is not up. A surface that
 * misses the frame still signs out on its next request, which is the floor
 * this only raises.
 */
export function emitSessionRevoked(userId: string, reason: string): void {
  if (!userId) return;
  try {
    getIo().to(userRoom(userId)).emit('session:revoked', { user_id: userId, reason });
  } catch {
    /* socket server not initialised — the next request signs them out */
  }
}
