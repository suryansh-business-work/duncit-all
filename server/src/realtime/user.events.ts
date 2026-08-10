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
