/**
 * Who is at their desk.
 *
 * Held in memory on purpose. Presence is true for exactly as long as a socket
 * is open, so a database row would only ever be a stale copy of something the
 * socket layer already knows — and it would survive a restart as a lie, showing
 * everyone online who is not.
 *
 * The cost is that presence is per server process. This product runs one, and
 * the day it runs two the honest fix is a shared adapter for socket.io itself
 * rather than a table here.
 */

export const PRESENCE_STATUSES = [
  /** At the keyboard. */
  'ONLINE',
  /** Connected but idle, or said so. */
  'AWAY',
  /** Connected and asked not to be disturbed. */
  'BUSY',
  /** No socket, or said so. */
  'OFFLINE',
] as const;
export type PresenceStatus = (typeof PRESENCE_STATUSES)[number];

interface Entry {
  status: PresenceStatus;
  /** How many sockets this person has open — tabs and portals both count. */
  sockets: number;
  since: Date;
  lastSeen: Date;
}

const entries = new Map<string, Entry>();

/** A socket arrived. The first one brings them online; the rest just count. */
export function addSocket(userId: string, status: PresenceStatus = 'ONLINE'): PresenceStatus {
  const existing = entries.get(userId);
  if (existing) {
    existing.sockets += 1;
    existing.lastSeen = new Date();
    // A second tab must not undo a chosen "busy".
    return existing.status;
  }
  entries.set(userId, { status, sockets: 1, since: new Date(), lastSeen: new Date() });
  return status;
}

/**
 * A socket went away. Only the last one takes them offline — closing one of
 * three tabs is not leaving.
 */
export function removeSocket(userId: string): PresenceStatus {
  const existing = entries.get(userId);
  if (!existing) return 'OFFLINE';
  existing.sockets -= 1;
  existing.lastSeen = new Date();
  if (existing.sockets > 0) return existing.status;
  entries.delete(userId);
  return 'OFFLINE';
}

/** They chose a status, or their client reported going idle. */
export function setStatus(userId: string, status: PresenceStatus): PresenceStatus {
  const existing = entries.get(userId);
  if (!existing) return 'OFFLINE';
  existing.status = status;
  existing.lastSeen = new Date();
  return status;
}

export function statusOf(userId: string): PresenceStatus {
  return entries.get(userId)?.status ?? 'OFFLINE';
}

/** Everyone currently connected, for the first paint of the coworker list. */
export function snapshot(): { user_id: string; status: PresenceStatus; since: string }[] {
  return [...entries.entries()].map(([user_id, entry]) => ({
    user_id,
    status: entry.status,
    since: entry.since.toISOString(),
  }));
}

/** Test seam — presence is process state, and a test must be able to reset it. */
export function resetPresence(): void {
  entries.clear();
}
