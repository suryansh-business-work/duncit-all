import { formatInTimeZone } from 'date-fns-tz';

export type TickState = 'pending' | 'delivered' | 'seen' | 'failed';

const FALLBACK_ZONE = 'Asia/Kolkata';

export interface TickMessage {
  id: string;
  created_at: string;
  pending?: boolean;
  failed?: boolean;
}

/** WhatsApp-style delivery state for one of the user's own messages. */
export function tickState(msg: TickMessage, agentLastReadAt?: string | null): TickState {
  if (msg.failed) return 'failed';
  if (msg.pending) return 'pending';
  if (
    agentLastReadAt &&
    new Date(agentLastReadAt).getTime() >= new Date(msg.created_at).getTime()
  ) {
    return 'seen';
  }
  return 'delivered';
}

/** The configured-zone calendar day (yyyy-MM-dd) for a timestamp, '' if invalid. */
function zonedDay(iso: string, timeZone: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return formatInTimeZone(d, timeZone, 'yyyy-MM-dd');
}

/** Safe time formatter in the admin-configured zone — '' for an invalid stamp. */
export function formatTime(
  iso: string,
  timeZone: string = FALLBACK_ZONE,
  pattern = 'HH:mm',
): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : formatInTimeZone(d, timeZone, pattern);
}

/** Friendly day-separator label (Today / Yesterday / 3 Jun 2026) in the zone. */
export function dayLabel(iso: string, timeZone: string = FALLBACK_ZONE): string {
  const day = zonedDay(iso, timeZone);
  if (!day) return '';
  const now = new Date();
  if (day === zonedDay(now.toISOString(), timeZone)) return 'Today';
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (day === zonedDay(yesterday.toISOString(), timeZone)) return 'Yesterday';
  return formatInTimeZone(new Date(iso), timeZone, 'd MMM yyyy');
}

/** Whether a day separator should appear before this message (zone-aware). */
export function showDaySeparator(
  curr: string,
  prev?: string,
  timeZone: string = FALLBACK_ZONE,
): boolean {
  if (!prev) return true;
  return zonedDay(curr, timeZone) !== zonedDay(prev, timeZone);
}

/** Human call duration, or null when not recorded. */
export function durationLabel(seconds?: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/** Replace an optimistic (temp) message with its server-acknowledged version, de-duping. */
export function mergeReal<T extends { id: string }>(prev: T[], tempId: string, real: T): T[] {
  const without = prev.filter((m) => m.id !== tempId);
  return without.some((m) => m.id === real.id) ? without : [...without, real];
}

/** Append a live message unless it is already present (socket de-dup). */
export function appendUnique<T extends { id: string }>(prev: T[], msg: T): T[] {
  return prev.some((m) => m.id === msg.id) ? prev : [...prev, msg];
}

/**
 * Whether the user may still re-open a resolved/closed item. The server blocks a
 * reopen once `now >= reopen_deadline`; we mirror that to gate the UI (Bug 3/11).
 * Missing/invalid deadlines are treated as "closed" (no reopen) — parity with mWeb.
 */
export function canReopen(reopenDeadline?: string | null, now: Date = new Date()): boolean {
  if (!reopenDeadline) return false;
  const ms = new Date(reopenDeadline).getTime();
  if (Number.isNaN(ms)) return false;
  return now.getTime() < ms;
}
