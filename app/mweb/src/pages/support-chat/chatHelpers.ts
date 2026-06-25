import { format, isToday, isYesterday } from 'date-fns';
import type { SupportChatMessage } from './queries';

export type TickState = 'pending' | 'delivered' | 'seen';

/** Delivery state for one of the user's own messages, driving the WhatsApp-style ticks. */
export function userMessageTick(
  msg: SupportChatMessage,
  agentLastReadAt: string | null
): TickState {
  if (msg.pending) return 'pending';
  if (
    agentLastReadAt &&
    new Date(agentLastReadAt).getTime() >= new Date(msg.created_at).getTime()
  ) {
    return 'seen';
  }
  return 'delivered';
}

/** A friendly day separator label (Today / Yesterday / 3 Jun 2026). */
export function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'd MMM yyyy');
}

/** Whether a day separator should be shown before this message. */
export function showDaySeparator(curr: string, prev?: string): boolean {
  if (!prev) return true;
  return new Date(curr).toDateString() !== new Date(prev).toDateString();
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

/** Trigger a browser download of a base64-encoded UTF-8 text transcript. */
export function downloadBase64Text(filename: string, base64: string): void {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.codePointAt(i) ?? 0;
  }
  const blob = new Blob([bytes], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
