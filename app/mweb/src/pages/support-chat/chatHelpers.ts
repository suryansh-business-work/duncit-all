import { formatInTimeZone } from 'date-fns-tz';
import type { SupportChatMessage } from './queries';

export type TickState = 'pending' | 'delivered' | 'seen' | 'failed';

/** Delivery state for one of the user's own messages, driving the WhatsApp-style ticks. */
export function userMessageTick(
  msg: SupportChatMessage,
  agentLastReadAt: string | null
): TickState {
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

/** The calendar-day key (yyyy-MM-dd) of an instant in the configured zone. */
function zonedDayKey(iso: string, timeZone: string): string {
  return formatInTimeZone(new Date(iso), timeZone, 'yyyy-MM-dd');
}

/**
 * A friendly day separator label (Today / Yesterday / 3 Jun 2026) computed in
 * the admin-configured zone so it never drifts by the viewer's device tz (B10).
 */
export function dayLabel(iso: string, timeZone: string): string {
  const key = zonedDayKey(iso, timeZone);
  const now = new Date();
  if (key === formatInTimeZone(now, timeZone, 'yyyy-MM-dd')) return 'Today';
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (key === formatInTimeZone(yesterday, timeZone, 'yyyy-MM-dd')) return 'Yesterday';
  return formatInTimeZone(new Date(iso), timeZone, 'd MMM yyyy');
}

/** Whether a day separator should be shown before this message (zone-aware). */
export function showDaySeparator(curr: string, prev: string | undefined, timeZone: string): boolean {
  if (!prev) return true;
  return zonedDayKey(curr, timeZone) !== zonedDayKey(prev, timeZone);
}

/** Replace an optimistic (temp) message with its server-acknowledged version, de-duping. */
export function mergeReal(
  prev: SupportChatMessage[],
  tempId: string,
  real: SupportChatMessage
): SupportChatMessage[] {
  const without = prev.filter((m) => m.id !== tempId);
  return without.some((m) => m.id === real.id) ? without : [...without, real];
}

/**
 * Whether the user may still re-open a resolved/closed item. The server blocks
 * a reopen once `now >= reopen_deadline`; we mirror that to gate the UI.
 * Missing/invalid deadlines are treated as "closed" (no reopen).
 */
export function canReopen(reopenDeadline: string | null | undefined): boolean {
  if (!reopenDeadline) return false;
  const ms = new Date(reopenDeadline).getTime();
  if (Number.isNaN(ms)) return false;
  return Date.now() < ms;
}

/** MIME type for the Word (.docx) transcript export (B15, per server contract). */
export const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const TXT_MIME = 'text/plain;charset=utf-8';

/** Trigger a browser download of a base64-encoded transcript (.txt or .docx). */
export function downloadBase64File(filename: string, base64: string, mime: string): void {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.codePointAt(i) ?? 0;
  }
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** The download MIME for a transcript format. */
export function transcriptMime(format: 'TXT' | 'DOCX'): string {
  return format === 'DOCX' ? DOCX_MIME : TXT_MIME;
}
