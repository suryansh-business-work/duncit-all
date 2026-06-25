import { format, isToday, isYesterday } from 'date-fns';

export type TickState = 'pending' | 'delivered' | 'seen';

export interface TickMessage {
  id: string;
  created_at: string;
  pending?: boolean;
}

/** WhatsApp-style delivery state for one of the user's own messages. */
export function tickState(msg: TickMessage, agentLastReadAt?: string | null): TickState {
  if (msg.pending) return 'pending';
  if (
    agentLastReadAt &&
    new Date(agentLastReadAt).getTime() >= new Date(msg.created_at).getTime()
  ) {
    return 'seen';
  }
  return 'delivered';
}

/** Safe HH:mm formatter — returns '' for a missing/invalid timestamp. */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : format(d, 'HH:mm');
}

/** Friendly day-separator label (Today / Yesterday / 3 Jun 2026). */
export function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'd MMM yyyy');
}

/** Whether a day separator should appear before this message. */
export function showDaySeparator(curr: string, prev?: string): boolean {
  if (!prev) return true;
  return new Date(curr).toDateString() !== new Date(prev).toDateString();
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
