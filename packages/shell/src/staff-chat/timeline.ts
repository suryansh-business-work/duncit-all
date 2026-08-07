import type { StaffCall, StaffMessage } from './queries';

export type TimelineEntry =
  | { kind: 'MESSAGE'; id: string; at: number; message: StaffMessage }
  | { kind: 'CALL'; id: string; at: number; call: StaffCall };

const timeOf = (iso?: string | null) => (iso ? new Date(iso).getTime() : 0);

/**
 * Messages and calls, in the order they happened.
 *
 * A call is part of the conversation, not a separate log: "we discussed it on
 * the phone" is unreadable when the phone call is on another screen. Merged by
 * time so the thread reads the way the day actually went.
 *
 * Calls older than the loaded messages are dropped rather than stacked at the
 * top — a thread showing the last fifty messages and every call ever made would
 * open on a wall of call rows.
 */
export function buildTimeline(
  messages: StaffMessage[],
  calls: StaffCall[]
): TimelineEntry[] {
  const entries: TimelineEntry[] = messages.map((message) => ({
    kind: 'MESSAGE',
    id: message.id,
    at: timeOf(message.created_at),
    message,
  }));

  const earliest = entries.length > 0 ? entries[0].at : 0;

  for (const call of calls) {
    const at = timeOf(call.started_at);
    if (at < earliest) continue;
    entries.push({ kind: 'CALL', id: `call-${call.id}`, at, call });
  }

  // A pending message has no created_at yet, so it sorts to 0 — it belongs at
  // the end, where it was just typed, not at the beginning of the thread.
  const order = (entry: TimelineEntry) => entry.at || Number.MAX_SAFE_INTEGER;
  entries.sort((a, b) => order(a) - order(b));
  return entries;
}

/** "11m 04s", or "45s" — what a call row says about its length. */
export function callDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}m ${String(rest).padStart(2, '0')}s`;
}
