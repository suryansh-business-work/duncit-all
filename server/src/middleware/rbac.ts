import { GraphQLError } from 'graphql';
import type { GraphQLContext, AuthUser } from '../context';
import { rbacService } from '../modules/rbac/rbac.service';

export function requireAuth(ctx: GraphQLContext): AuthUser {
  if (!ctx.user) {
    throw new GraphQLError('Not authenticated', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return ctx.user;
}

export function hasRole(user: AuthUser, allowed: readonly string[]): boolean {
  return user.roles.some((r) => allowed.includes(r));
}

export function requireRole(ctx: GraphQLContext, allowed: readonly string[]): AuthUser {
  const user = requireAuth(ctx);
  if (!hasRole(user, allowed)) {
    throw new GraphQLError('Access Denied', { extensions: { code: 'FORBIDDEN' } });
  }
  return user;
}

export async function requirePermission(
  ctx: GraphQLContext,
  perm: string
): Promise<AuthUser> {
  const user = requireAuth(ctx);
  if (user.roles.includes('SUPER_ADMIN')) return user;
  const perms = await rbacService.permissionsForRoleKeys(user.roles);
  if (!perms.includes(perm)) {
    throw new GraphQLError(`Missing permission: ${perm}`, {
      extensions: { code: 'FORBIDDEN' },
    });
  }
  return user;
}

/**
 * Scope check: a CITY_ADMIN may only operate inside their assigned_city,
 * and a ZONAL_ADMIN only inside their assigned_zones. SUPER_ADMIN bypasses.
 */
export function assertScope(
  ctx: GraphQLContext,
  target: { city?: string | null; zone?: string | null }
): void {
  const user = requireAuth(ctx);
  if (hasRole(user, ['SUPER_ADMIN'])) return;

  if (hasRole(user, ['CITY_ADMIN'])) {
    if (target.city && user.assigned_city && target.city !== user.assigned_city) {
      throw new GraphQLError('Out of city scope', { extensions: { code: 'FORBIDDEN' } });
    }
    return;
  }

  if (hasRole(user, ['ZONAL_ADMIN'])) {
    if (
      target.zone &&
      user.assigned_zones &&
      !user.assigned_zones.includes(target.zone)
    ) {
      throw new GraphQLError('Out of zone scope', { extensions: { code: 'FORBIDDEN' } });
    }
    return;
  }
}
