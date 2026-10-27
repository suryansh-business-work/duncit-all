import { GraphQLError } from 'graphql';
import type { GraphQLContext, AuthUser } from '../context';

export function requireAuth(ctx: GraphQLContext): AuthUser {
  if (!ctx.user) {
    throw new GraphQLError('Not authenticated', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return ctx.user;
}

/**
 * The Logs console (logs.duncit.com) mounts the log pages of the other consoles
 * as they are. Every query one of those pages READS adds this role to its gate,
 * so a Logs seat reads every log without being handed the console it came from.
 * Writes never take it: acting on a row stays with the console that owns it.
 */
export const LOGS_READER = 'LOGS_MANAGER';

/**
 * The Finance Analyst seat ("Finance console access (analyst level)"). It signs
 * in to the Finance console and every query that console READS adds this role
 * to its gate. Writes never take it: approving, refunding, paying out and
 * changing finance settings stay with FINANCE_MANAGER and the platform admins.
 */
export const FINANCE_READER = 'FINANCE_USER';

/**
 * The Tests console (tests.duncit.com). The E2E, stress, telemetry, error
 * boundary, GraphQL monitor and SonarQube pages moved there from Tech, so every
 * gate those pages hit — reads AND writes — adds this role beside
 * TECH_MANAGER. TECH_MANAGER stays: the CI reporters sign in with a
 * TECH_MANAGER token (DUNCIT_RELEASE_TOKEN), and removing it would orphan them.
 */
export const TESTS_MANAGER = 'TESTS_MANAGER';

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

/** Where a caller may act or look: one city, a set of zones, or everywhere (null). */
export type ReadScope = { city: string } | { zones: string[] } | null;

const outOfCity = () => new GraphQLError('Out of city scope', { extensions: { code: 'FORBIDDEN' } });
const outOfZone = () => new GraphQLError('Out of zone scope', { extensions: { code: 'FORBIDDEN' } });

/**
 * The place a CITY_ADMIN or ZONAL_ADMIN is held to — their assigned_city, or
 * their assigned_zones. SUPER_ADMIN, and every role that is not held to a
 * place, gets null: everywhere. An admin with no city (or no zones) assigned
 * operates nowhere — refused, never shown every city — as the finance scope
 * does (finance/financeScope.ts).
 *
 * Lists use it to narrow what they show; `assertScope` uses it to check one
 * record. One rule, so a read can never see a place a write would refuse.
 */
export function readScope(ctx: GraphQLContext): ReadScope {
  const user = requireAuth(ctx);
  if (hasRole(user, ['SUPER_ADMIN'])) return null;

  if (hasRole(user, ['CITY_ADMIN'])) {
    if (!user.assigned_city) throw outOfCity();
    return { city: user.assigned_city };
  }

  if (hasRole(user, ['ZONAL_ADMIN'])) {
    const zones = user.assigned_zones ?? [];
    if (zones.length === 0) throw outOfZone();
    return { zones };
  }
  return null;
}

/** A read scope as a Mongo filter on a member's own city / zone — the fields assertScope checks. */
export function userScopeFilter(scope: ReadScope): Record<string, unknown> {
  if (!scope) return {};
  if ('city' in scope) return { 'profile.city': scope.city };
  return { 'profile.zone': { $in: scope.zones } };
}

/**
 * Scope check: a CITY_ADMIN may only operate inside their assigned_city,
 * and a ZONAL_ADMIN only inside their assigned_zones. SUPER_ADMIN bypasses.
 * An admin with no city (or no zones) assigned operates nowhere — the check
 * fails closed (see {@link readScope}).
 */
export function assertScope(
  ctx: GraphQLContext,
  target: { city?: string | null; zone?: string | null }
): void {
  const scope = readScope(ctx);
  if (!scope) return;
  if ('city' in scope) {
    if (target.city && target.city !== scope.city) throw outOfCity();
    return;
  }
  if (target.zone && !scope.zones.includes(target.zone)) throw outOfZone();
}
