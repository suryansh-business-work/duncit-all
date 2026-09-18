import type { Connection } from 'mongoose';

/**
 * What happened to this API process's MongoDB connection, for Tech > Database >
 * Info.
 *
 * Held in memory on purpose: the moments worth reading here — a refused
 * connect at boot, a drop, the reconnect after it — are exactly the moments the
 * database cannot be written to, so a collection would lose the very events it
 * exists to keep. The list is per process and starts again on every restart.
 */
export type DbConnectionEventKind =
  | 'CONNECTED'
  | 'CONNECT_FAILED'
  | 'DISCONNECTED'
  | 'RECONNECTED'
  | 'ERROR'
  | 'CLOSED';

export interface DbConnectionEvent {
  at: string;
  kind: DbConnectionEventKind;
  message: string | null;
  attempt: number | null;
}

/** Enough to read a bad night back; small enough never to matter in memory. */
const MAX_EVENTS = 200;

/** Newest first — the order every reader wants. */
const events: DbConnectionEvent[] = [];

export function recordDbEvent(
  kind: DbConnectionEventKind,
  message: string | null = null,
  attempt: number | null = null,
): void {
  events.unshift({ at: new Date().toISOString(), kind, message, attempt });
  if (events.length > MAX_EVENTS) events.pop();
}

export function dbConnectionEvents(): DbConnectionEvent[] {
  return [...events];
}

let watching = false;

/** Record the driver's own lifecycle events. Idempotent: connectDB retries. */
export function watchDbConnection(connection: Connection): void {
  if (watching) return;
  watching = true;
  connection.on('disconnected', () => recordDbEvent('DISCONNECTED'));
  connection.on('reconnected', () => recordDbEvent('RECONNECTED'));
  connection.on('close', () => recordDbEvent('CLOSED'));
  connection.on('error', (err: Error) => recordDbEvent('ERROR', err.message));
}
