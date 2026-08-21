import crypto from 'node:crypto';

/**
 * A one-shot pass that lets a browser POST a file to our own upload route.
 *
 * The browser cannot sign an ImageKit upload — that needs the private key — and
 * it cannot send our JWT either, because the uploader is shared code that has no
 * idea which portal's storage key the token lives under. So the authenticated
 * GraphQL call hands out a ticket, and the raw POST carries only that.
 *
 * Single use and short-lived: a ticket in a URL is a ticket in somebody's access
 * log, so it must be worthless by the time anyone reads it.
 */

const TTL_MS = 10 * 60 * 1000;
/** A stray ticket is 100 bytes; this cap exists so a leak cannot grow forever. */
const MAX_OPEN = 5000;

/**
 * Which store the upload lands in. Decided when the ticket is ISSUED, by the
 * authenticated call that knows what is being uploaded — never inferred from
 * the raw POST, which carries nothing but the ticket.
 */
export type UploadStore = 'imagekit' | 'builds';

interface Ticket {
  userId: string;
  folder: string;
  store: UploadStore;
  /**
   * Which client family issued it. Fixed here for the same reason the folder is:
   * the raw POST carries only the ticket, so the surface an AI Monitoring row is
   * attributed to has to be decided by the authenticated call that knows it.
   */
  surface: string;
  expiresAt: number;
}

const tickets = new Map<string, Ticket>();

function sweep(): void {
  const now = Date.now();
  for (const [id, ticket] of tickets) {
    if (ticket.expiresAt <= now) tickets.delete(id);
  }
}

/** Issue a ticket for one upload by this user, into this folder and store. */
export function issueUploadTicket(
  userId: string,
  folder: string,
  store: UploadStore = 'imagekit',
  surface = ''
): string {
  sweep();
  // Refuse rather than grow without bound: something is very wrong if five
  // thousand tickets are open at once, and quietly eating memory hides it.
  if (tickets.size >= MAX_OPEN) throw new Error('Too many uploads in flight');
  const id = crypto.randomUUID();
  tickets.set(id, { userId, folder, store, surface, expiresAt: Date.now() + TTL_MS });
  return id;
}

/**
 * Spend a ticket. Returns who it belonged to, or null if it is unknown, already
 * used or expired — the caller must treat all three the same way.
 */
export function spendUploadTicket(
  id: string
): { userId: string; folder: string; store: UploadStore; surface: string } | null {
  sweep();
  const ticket = tickets.get(id);
  if (!ticket) return null;
  tickets.delete(id);
  return {
    userId: ticket.userId,
    folder: ticket.folder,
    store: ticket.store,
    surface: ticket.surface,
  };
}

/** Test seam — tickets are process state. */
export function resetUploadTickets(): void {
  tickets.clear();
}
