import { GraphQLError } from 'graphql';
import type { AuthUser, GraphQLContext } from '@context';
import { hasRole, requireAuth } from '@middleware/rbac';
import { hasPortalAccess } from '@modules/portals/portal.gate';
import { MCP_MANAGER_ROLES, MCP_PORTAL_KEY } from './mcp.constants';

/**
 * The two MCP audiences. An MCP user connects AI apps and sees their own
 * activity; an MCP manager (or a super admin) sees everyone's and owns the
 * settings. Both are decided by the same portal gate the console login uses.
 */

export const isMcpManager = (user: AuthUser): boolean => hasRole(user, MCP_MANAGER_ROLES);

/** Signed in AND allowed to use MCP at all (MCP_USER, MCP_MANAGER or SUPER_ADMIN). */
export function requireMcpUser(ctx: GraphQLContext): AuthUser {
  const user = requireAuth(ctx);
  if (!hasPortalAccess(MCP_PORTAL_KEY, user.roles)) {
    throw new GraphQLError('Your account does not have MCP access', { extensions: { code: 'FORBIDDEN' } });
  }
  return user;
}

export function requireMcpManager(ctx: GraphQLContext): AuthUser {
  const user = requireAuth(ctx);
  if (!isMcpManager(user)) throw new GraphQLError('Access Denied', { extensions: { code: 'FORBIDDEN' } });
  return user;
}
