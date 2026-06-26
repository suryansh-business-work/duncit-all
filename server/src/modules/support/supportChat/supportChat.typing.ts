/**
 * Pure builder for the `support_typing` socket payload (B14a). Kept out of the
 * `.socket.ts` file so it is unit-testable / coverage-tracked: the socket
 * handler just forwards the socket's roles + (optional) display name here.
 *
 * Clients use `role` to label the indicator ("Support is typing…" when AGENT,
 * "<name> is typing…" / "<user> is typing…" otherwise).
 */
export type SupportTypingRole = 'USER' | 'AGENT';

export interface SupportTypingPayload {
  session_id: string;
  user_id: string;
  role: SupportTypingRole;
  name: string | null;
}

const SUPPORT_TYPING_ROLES = new Set(['SUPER_ADMIN', 'SUPPORT_MANAGER', 'SUPPORT_USER']);

export function buildTypingPayload(opts: {
  sessionId: string;
  userId: string;
  roles?: string[] | null;
  name?: string | null;
}): SupportTypingPayload {
  const isAgent = (opts.roles ?? []).some((r) => SUPPORT_TYPING_ROLES.has(r));
  return {
    session_id: opts.sessionId,
    user_id: opts.userId,
    role: isAgent ? 'AGENT' : 'USER',
    name: opts.name ?? null,
  };
}
