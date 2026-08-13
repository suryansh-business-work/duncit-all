import { GraphQLError } from 'graphql';
import { PORTAL_GATE_EXEMPT_KEYS, PORTAL_ROLE_REQUIREMENTS } from './portal.constants';

/**
 * Whether these roles open this portal. Consumer/partner surfaces are never
 * gated; SUPER_ADMIN passes every portal; an unknown portal key fails CLOSED —
 * a portal that a client config knows about but PORTAL_ROLE_REQUIREMENTS does
 * not would otherwise have no server-side login gate at all. Adding a portal
 * means adding it to the map (or to PORTAL_GATE_EXEMPT_KEYS) in the same change.
 *
 * This is the single decision: the login gate below, the Jump to Portal
 * directory and the Ask Bot's "you can open this one" all read it, so none of
 * them can promise access the login then refuses.
 */
export function hasPortalAccess(portalKey: string, roleKeys: readonly string[]): boolean {
  if (PORTAL_GATE_EXEMPT_KEYS.has(portalKey)) return true;
  if (roleKeys.includes('SUPER_ADMIN')) return true;
  const allowed = PORTAL_ROLE_REQUIREMENTS[portalKey];
  return !!allowed && roleKeys.some((role) => allowed.includes(role));
}

/** Server-side portal access gate for login. An absent portal_key is never gated. */
export function assertPortalLogin(
  portalKey: string | null | undefined,
  roleKeys: string[]
): void {
  const key = (portalKey ?? '').trim();
  if (!key || hasPortalAccess(key, roleKeys)) return;
  throw new GraphQLError('You do not have access to this portal', {
    extensions: { code: 'FORBIDDEN' },
  });
}
