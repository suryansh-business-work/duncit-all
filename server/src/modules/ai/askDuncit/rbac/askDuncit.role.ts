import {
  NON_STAFF_ROLES,
  ROLE_GRANTS,
  ROLE_PRECEDENCE,
  STUDIO_MODE_ROLE,
  isAskDuncitRoleKey,
  type AskDuncitRoleKey,
} from '../askDuncit.constants';

/**
 * Which assistant role a conversation runs under. Pure: the caller reads the
 * account's roles fresh from the database (effectiveRoleKeys) — never from the
 * JWT, which can be minutes stale after a role is taken away.
 */

/** Every assistant role this account holds. Every signed-in account is a member. */
export function heldRoleKeys(accountRoles: readonly string[]): AskDuncitRoleKey[] {
  const held = new Set<AskDuncitRoleKey>(['MEMBER']);
  for (const [roleKey, accountRole] of Object.entries(ROLE_GRANTS)) {
    if (accountRole && accountRoles.includes(accountRole) && isAskDuncitRoleKey(roleKey)) held.add(roleKey);
  }
  if (accountRoles.some((role) => role !== 'SUPER_ADMIN' && !NON_STAFF_ROLES.has(role))) held.add('STAFF');
  return ROLE_PRECEDENCE.filter((role) => held.has(role));
}

export interface RoleResolution {
  role: AskDuncitRoleKey;
  held: AskDuncitRoleKey[];
  /** The caller asked for a role (or studio mode) the account does not hold. */
  escalation: boolean;
  requested: string | null;
}

/** A role key (`HOST`) or a studio mode (`VENUE`) → the assistant role it names. */
function normalise(requested: string): AskDuncitRoleKey | null {
  if (isAskDuncitRoleKey(requested)) return requested;
  return STUDIO_MODE_ROLE[requested] ?? null;
}

/**
 * The requested role when the account holds it; otherwise the most specific
 * role it does hold. Asking for a role you do not have is not an error for the
 * person — they get their own role — but it is reported as an escalation
 * attempt, because a client never sends one on its own.
 */
export function resolveRoleKey(accountRoles: readonly string[], requested?: string | null): RoleResolution {
  const held = heldRoleKeys(accountRoles);
  const wanted = requested ? normalise(requested.trim().toUpperCase()) : null;
  if (wanted && held.includes(wanted)) return { role: wanted, held, escalation: false, requested: requested ?? null };
  return {
    role: held[0],
    held,
    escalation: Boolean(requested) && wanted !== null,
    requested: requested ?? null,
  };
}
