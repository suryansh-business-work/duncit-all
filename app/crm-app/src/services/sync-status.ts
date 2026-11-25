import { errorCode, ApiError } from '@/utils/errors';
import { readValue, STORAGE_KEYS, writeValue } from '@/services/secure-storage';

/**
 * What the last call syncs did, kept on the phone for Settings › Calling &
 * recording: when calls and recordings last synced, which calls were logged
 * recently (so the post-call screen can say "saved" truthfully even when an
 * earlier background run logged it), and the last few calls that could not be
 * logged. It holds lead numbers' match keys only — never a personal number.
 */

/** A call the server accepted: its number's match key and when it started. */
export interface LoggedCall {
  k: string;
  d: number;
}

/** A call or recording that could not be sent, and why. */
export interface SyncFailure {
  at: number;
  /** The server's error code, or the HTTP status of a refused upload. */
  code: string;
  what: 'call' | 'recording';
}

export interface SyncStatus {
  callAt: number | null;
  recordingAt: number | null;
  recent: LoggedCall[];
  failures: SyncFailure[];
}

const KEEP_RECENT = 10;
const KEEP_FAILURES = 5;
/** A logged call counts as "this call" when it started this close to the call the screen shows. */
export const SAME_CALL_MS = 2 * 60 * 1000;

export const EMPTY_STATUS: SyncStatus = {
  callAt: null,
  recordingAt: null,
  recent: [],
  failures: [],
};

export function parseStatus(raw: string | null): SyncStatus {
  if (!raw) return EMPTY_STATUS;
  try {
    const value = JSON.parse(raw) as Partial<SyncStatus>;
    return {
      callAt: typeof value.callAt === 'number' ? value.callAt : null,
      recordingAt: typeof value.recordingAt === 'number' ? value.recordingAt : null,
      recent: Array.isArray(value.recent) ? value.recent.slice(-KEEP_RECENT) : [],
      failures: Array.isArray(value.failures) ? value.failures.slice(-KEEP_FAILURES) : [],
    };
  } catch {
    return EMPTY_STATUS;
  }
}

export const readSyncStatus = async (): Promise<SyncStatus> =>
  parseStatus(await readValue(STORAGE_KEYS.syncStatus));

/** Apply a change to the stored status; the lists keep only their newest entries. */
export async function updateSyncStatus(change: (status: SyncStatus) => SyncStatus): Promise<void> {
  const next = change(await readSyncStatus());
  const trimmed: SyncStatus = {
    ...next,
    recent: next.recent.slice(-KEEP_RECENT),
    failures: next.failures.slice(-KEEP_FAILURES),
  };
  await writeValue(STORAGE_KEYS.syncStatus, JSON.stringify(trimmed));
}

/** Whether a call with this number key, starting around `startedAt`, has reached the CRM. */
export function wasLogged(status: SyncStatus, key: string, startedAt: number): boolean {
  return status.recent.some((c) => c.k === key && Math.abs(c.d - startedAt) <= SAME_CALL_MS);
}

/** Codes that mean "sending this again will fail the same way" — a deleted lead, a refused file. */
const PERMANENT_CODES = new Set(['BAD_USER_INPUT', 'NOT_FOUND']);
const PERMANENT_HTTP = new Set([400, 404, 413, 415, 422]);

/**
 * A permanent failure is recorded and stepped over, so one bad call can never
 * hold back every call after it. Anything else (offline, signed out, a server
 * error) stops the run and is retried from the same call next time.
 */
export function isPermanentSyncError(error: unknown): boolean {
  const code = errorCode(error);
  if (code && PERMANENT_CODES.has(code)) return true;
  return (
    error instanceof ApiError && error.status !== undefined && PERMANENT_HTTP.has(error.status)
  );
}

export function failureCode(error: unknown): string {
  const code = errorCode(error);
  if (code) return code;
  if (error instanceof ApiError && error.status !== undefined) return `HTTP_${error.status}`;
  return 'UNKNOWN';
}
