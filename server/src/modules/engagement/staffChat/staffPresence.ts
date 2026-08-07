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
  /*
    KEPT, not deleted.

    lastSeen was being written on the way out and thrown away in the next line,
    which made "last seen" impossible to answer — the only record of when
    somebody left went with the entry. The row stays with no sockets so the
    timestamp survives; prune() stops that from growing without bound.
  */
  existing.status = 'OFFLINE';
  existing.since = new Date();
  prune();
  return 'OFFLINE';
}

/** How long a departed person's last-seen is worth keeping. */
const KEEP_OFFLINE_MS = 24 * 60 * 60 * 1000;

/** Drop people who left yesterday: "last seen 3 days ago" helps nobody. */
function prune() {
  const cutoff = Date.now() - KEEP_OFFLINE_MS;
  for (const [id, entry] of entries) {
    if (entry.sockets <= 0 && entry.lastSeen.getTime() < cutoff) entries.delete(id);
  }
}

/** When they were last connected, or null if we never saw them. */
export function lastSeenOf(userId: string): string | null {
  const entry = entries.get(userId);
  return entry ? entry.lastSeen.toISOString() : null;
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
export function snapshot(): {
  user_id: string;
  status: PresenceStatus;
  since: string;
  last_seen: string;
}[] {
  return [...entries.entries()].map(([user_id, entry]) => ({
    user_id,
    status: entry.status,
    since: entry.since.toISOString(),
    last_seen: entry.lastSeen.toISOString(),
  }));
}

/** Test seam — presence is process state, and a test must be able to reset it. */
export function resetPresence(): void {
  entries.clear();
}
