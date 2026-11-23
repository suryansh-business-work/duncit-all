import { GraphQLError } from 'graphql';
import type { AuthUser, GraphQLContext } from '@context';
import { requireAuth } from '@middleware/rbac';
import { INTEL_MANAGER, INTEL_USER, type IntelLevel } from '../intel.constants';

/**
 * Who may do what in Duncit Intel. Decided here, on the server, for every
 * request — the console hides buttons too, but hiding is never the gate.
 *
 *  - EMPLOYEE (INTEL_USER): chat, their own history, their own files.
 *  - ADMIN (INTEL_MANAGER): + settings, connectors, sync, approvals.
 *  - SUPER_ADMIN: + access policy and security settings.
 */

const RANK: Record<IntelLevel, number> = { EMPLOYEE: 1, ADMIN: 2, SUPER_ADMIN: 3 };

/** The person's Intel level from their (freshly resolved) account roles, or null when they have none. */
export function intelLevel(roles: readonly string[]): IntelLevel | null {
  if (roles.includes('SUPER_ADMIN')) return 'SUPER_ADMIN';
  if (roles.includes(INTEL_MANAGER)) return 'ADMIN';
  if (roles.includes(INTEL_USER)) return 'EMPLOYEE';
  return null;
}

export const atLeast = (level: IntelLevel | null, needed: IntelLevel): boolean =>
  level !== null && RANK[level] >= RANK[needed];

export interface IntelActor {
  user: AuthUser;
  level: IntelLevel;
}

export function forbidden(message = 'You do not have access to this part of Duncit Intel.'): GraphQLError {
  return new GraphQLError(message, { extensions: { code: 'FORBIDDEN' } });
}

/** Signed in AND holding at least `needed`. Roles on the context are already resolved fresh. */
export function requireIntel(ctx: GraphQLContext, needed: IntelLevel = 'EMPLOYEE'): IntelActor {
  const user = requireAuth(ctx);
  const level = intelLevel(user.roles);
  if (!atLeast(level, needed) || level === null) throw forbidden();
  return { user, level };
}

/** The same check for plain-HTTP routes (uploads, files, voice), which hold an AuthUser directly. */
export function actorFromUser(user: AuthUser | null, needed: IntelLevel = 'EMPLOYEE'): IntelActor | null {
  if (!user) return null;
  const level = intelLevel(user.roles);
  return level !== null && atLeast(level, needed) ? { user, level } : null;
}
