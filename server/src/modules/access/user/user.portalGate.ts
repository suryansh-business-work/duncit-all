import { GraphQLError } from 'graphql';
import { PORTAL_GATE_EXEMPT_KEYS, PORTAL_ROLE_REQUIREMENTS } from './user.constants';

/**
 * Server-side portal access gate for login. Consumer/partner surfaces (or an
 * absent portal_key) are never gated; SUPER_ADMIN passes every portal; an
 * unknown portal key fails open so a newly added portal cannot lock everyone
 * out before PORTAL_ROLE_REQUIREMENTS is updated.
 */
export function assertPortalLogin(
  portalKey: string | null | undefined,
  roleKeys: string[]
): void {
  const key = (portalKey ?? '').trim();
  if (!key || PORTAL_GATE_EXEMPT_KEYS.has(key)) return;
  if (roleKeys.includes('SUPER_ADMIN')) return;
  const allowed = PORTAL_ROLE_REQUIREMENTS[key];
  if (!allowed) return; // fail-open for portals not in the map yet
  if (roleKeys.some((role) => allowed.includes(role))) return;
  throw new GraphQLError('You do not have access to this portal', {
    extensions: { code: 'FORBIDDEN' },
  });
}
