import { GraphQLError } from 'graphql';
import type { AuthUser } from '@context';
import { hasRole } from '@middleware/rbac';

/**
 * What a City or Zonal Admin may do to another account through updateUser and
 * deleteUser, beyond the place check (assertScope) and the role check
 * (assertMayAssignRoles):
 *
 *   • only manage accounts BELOW their own admin level — a City Admin can
 *     never change a Super Admin's or another City Admin's email (a password
 *     reset away from taking the account over), nor delete one;
 *   • never move their own assigned city or zones, and hand out only the
 *     place they hold themselves;
 *   • never change the host share or commission, which are money.
 *
 * A Super Admin passes every check. Values re-sent unchanged always pass — the
 * Admin console sends the whole profile on every save.
 */

const ADMIN_RANK: Readonly<Record<string, number>> = { SUPER_ADMIN: 3, CITY_ADMIN: 2, ZONAL_ADMIN: 1 };
const MONEY_FIELDS = ['host_share_pct', 'host_commission_pct'] as const;

/** The stored account, as userService.getById returns it. */
export interface EditTarget {
  user_id: string;
  roles?: readonly string[] | null;
  assigned_city?: string | null;
  assigned_zones?: readonly string[] | null;
  host_share_pct?: number | null;
  host_commission_pct?: number | null;
}

const forbidden = (message: string) => new GraphQLError(message, { extensions: { code: 'FORBIDDEN' } });
const isSuperAdmin = (actor: AuthUser) => hasRole(actor, ['SUPER_ADMIN']);

/** The highest admin level among the roles: Super 3, City 2, Zonal 1, anything else 0. */
export const adminRank = (roles: readonly string[]): number =>
  roles.reduce((rank, role) => Math.max(rank, ADMIN_RANK[role.toUpperCase()] ?? 0), 0);

/** Refuses acting on an account at or above the actor's own admin level (their own is fine). */
export function assertMayManage(actor: AuthUser, target: EditTarget): void {
  if (isSuperAdmin(actor) || actor.id === target.user_id) return;
  if (adminRank(target.roles ?? []) >= adminRank(actor.roles)) {
    throw forbidden('You can only manage accounts below your own admin level');
  }
}

function assertMoneyUnchanged(input: Record<string, unknown>, target: EditTarget): void {
  for (const field of MONEY_FIELDS) {
    if (input[field] !== undefined && input[field] !== (target[field] ?? 0)) {
      throw forbidden(`Only a Super Admin can change ${field}`);
    }
  }
}

const sameZones = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((zone) => b.includes(zone));

function assertScopeChange(actor: AuthUser, target: EditTarget, input: Record<string, unknown>): void {
  const city = input.assigned_city as string | null | undefined;
  const zones = input.assigned_zones as string[] | null | undefined;
  const cityChanged = city !== undefined && (city ?? '') !== (target.assigned_city ?? '');
  const zonesChanged = zones !== undefined && !sameZones(zones ?? [], target.assigned_zones ?? []);
  if (!cityChanged && !zonesChanged) return;
  if (actor.id === target.user_id) throw forbidden('You cannot change your own assigned city or zones');
  const cityAdmin = hasRole(actor, ['CITY_ADMIN']);
  if (cityChanged && !(cityAdmin && (!city || city === actor.assigned_city))) {
    throw forbidden('You can only assign the city you hold yourself');
  }
  if (zonesChanged && !cityAdmin && !(zones ?? []).every((zone) => (actor.assigned_zones ?? []).includes(zone))) {
    throw forbidden('You can only assign zones you hold yourself');
  }
}

/** Refuses an edit that changes fields beyond the actor's reach. */
export function assertMayEditFields(actor: AuthUser, target: EditTarget, input: Record<string, unknown>): void {
  if (isSuperAdmin(actor)) return;
  assertMoneyUnchanged(input, target);
  assertScopeChange(actor, target, input);
}
