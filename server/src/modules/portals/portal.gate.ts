import { GraphQLError } from 'graphql';
import { PORTAL_GATE_EXEMPT_KEYS, PORTAL_ROLE_REQUIREMENTS } from './portal.constants';

/**
 * Server-side portal access gate for login. Consumer/partner surfaces (or an
 * absent portal_key) are never gated; SUPER_ADMIN passes every portal; an
 * unknown portal key fails CLOSED — a portal that a client config knows about
 * but PORTAL_ROLE_REQUIREMENTS does not would otherwise have no server-side
 * login gate at all. Adding a portal means adding it to the map (or to
 * PORTAL_GATE_EXEMPT_KEYS) in the same change.
 */
export function assertPortalLogin(
  portalKey: string | null | undefined,
  roleKeys: string[]
): void {
  const key = (portalKey ?? '').trim();
  if (!key || PORTAL_GATE_EXEMPT_KEYS.has(key)) return;
  if (roleKeys.includes('SUPER_ADMIN')) return;
  const allowed = PORTAL_ROLE_REQUIREMENTS[key];
  if (allowed && roleKeys.some((role) => allowed.includes(role))) return;
  throw new GraphQLError('You do not have access to this portal', {
    extensions: { code: 'FORBIDDEN' },
  });
}
