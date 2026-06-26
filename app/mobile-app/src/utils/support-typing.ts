/** Who is typing, from the socket `support_typing` payload (B14a). */
export interface TypingInfo {
  role?: 'USER' | 'AGENT' | null;
  name?: string | null;
}

/**
 * Builds the "<who> is typing…" label from the socket payload (B14a):
 * an AGENT is always shown as "Support"; otherwise the carried display name,
 * falling back to "Someone" when the socket doesn't carry one.
 */
export function typingLabel(info: TypingInfo | null): string {
  if (!info) return '';
  if (info.role === 'AGENT') return 'Support is typing…';
  const who = info.name?.trim() || 'Someone';
  return `${who} is typing…`;
}
