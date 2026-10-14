import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import type { AuthUser, GraphQLContext } from '@context';
import { hasRole, requireAuth } from '@middleware/rbac';
import { PodModel } from '@modules/pods/pod/pod.model';
import { LocationModel } from '@modules/platform/location/location.model';
import { UserModel } from '@modules/access/user/user.model';
import { escapeRegExp } from '@utils/regex';

/**
 * City / zone scope for money writes.
 *
 * CITY_ADMIN and ZONAL_ADMIN pass the finance write gates (payment release,
 * settlement, refunds, withdrawals, pod expenses, pod coupons…) — but their
 * reach is ONE city, or a set of zones. Without this a city admin could approve
 * a payout, refund a booking or pay a withdrawal for any city on the platform.
 *
 * The rule, fail-closed:
 *  - A caller who passes the gate through any role OTHER than CITY_ADMIN /
 *    ZONAL_ADMIN (SUPER_ADMIN, FINANCE_MANAGER, MARKETING_MANAGER…) is not
 *    city-bound and is never checked here.
 *  - A city-bound caller may touch a pod only when the pod's Location is their
 *    assigned city (CITY_ADMIN) or the pod's zone is one of their assigned zones
 *    (ZONAL_ADMIN). A pod with no location, an admin with no assigned city, a
 *    payment or withdrawal tied to no pod: refused — money nobody can place in
 *    their city is not theirs to move.
 *  - Platform-wide settings belong to no city, so a city-bound caller may not
 *    change them at all.
 */

const SCOPED_ROLES: ReadonlySet<string> = new Set(['CITY_ADMIN', 'ZONAL_ADMIN']);

const outOfScope = () =>
  new GraphQLError('This is outside the city or zone you administer', {
    extensions: { code: 'FORBIDDEN' },
  });

const norm = (value: unknown): string => (typeof value === 'string' ? value.trim().toLowerCase() : '');

/** True when the caller got past `allowed` only through a city/zone-scoped admin role. */
export function isScopedOnly(user: AuthUser, allowed: readonly string[]): boolean {
  return !user.roles.some((role) => allowed.includes(role) && !SCOPED_ROLES.has(role));
}

/** An id as its 24-hex text — an ObjectId or a hex string; anything else is blank. */
export function idText(id: unknown): string {
  if (id instanceof Types.ObjectId) return id.toHexString();
  return typeof id === 'string' && /^[a-f\d]{24}$/i.test(id) ? id : '';
}

/** Every name a Location is known by: its id, its slug, its display name, its city. */
function locationKeys(loc: { _id: unknown; location_id?: string; location_name?: string; city?: string }): string[] {
  return [idText(loc._id), loc.location_id, loc.location_name, loc.city].map(norm).filter(Boolean);
}

function inScope(user: AuthUser, cityKeys: ReadonlySet<string>, zone: unknown): boolean {
  const city = norm(user.assigned_city);
  if (hasRole(user, ['CITY_ADMIN']) && city && cityKeys.has(city)) return true;
  const z = norm(zone);
  return hasRole(user, ['ZONAL_ADMIN']) && !!z && (user.assigned_zones ?? []).some((own) => norm(own) === z);
}

const validIds = (ids: readonly unknown[]): Types.ObjectId[] => [
  ...new Map(
    ids
      .map(idText)
      .filter(Boolean)
      .map((id) => [id, new Types.ObjectId(id)] as const)
  ).values(),
];

async function assertPodsInScope(user: AuthUser, podIds: readonly unknown[]): Promise<void> {
  const ids = validIds(podIds);
  if (ids.length === 0) throw outOfScope();
  // includeDeleted: a cancelled pod is soft-deleted, and refunding or settling
  // one is the normal case for these writes, not an edge one.
  const pods = await PodModel.find({ _id: { $in: ids } })
    .select('location_id zone_name')
    .setOptions({ includeDeleted: true })
    .lean();
  if (pods.length !== ids.length) throw outOfScope();
  const locations = await LocationModel.find({ _id: { $in: validIds(pods.map((p) => p.location_id)) } })
    .select('location_id location_name city')
    .lean();
  const keysByLocation = new Map(locations.map((loc) => [idText(loc._id), new Set(locationKeys(loc))]));
  for (const pod of pods) {
    const keys = keysByLocation.get(idText(pod.location_id)) ?? new Set<string>();
    if (!inScope(user, keys, pod.zone_name)) throw outOfScope();
  }
}

/**
 * Refuse a city/zone-bound admin a money write on pods outside their city or
 * zones. `podIds` is a thunk so callers who are not city-bound never pay for
 * the lookup.
 */
export async function assertPodFinanceScope(
  ctx: GraphQLContext,
  allowed: readonly string[],
  podIds: () => Promise<readonly unknown[]> | readonly unknown[]
): Promise<void> {
  const user = requireAuth(ctx);
  if (!isScopedOnly(user, allowed)) return;
  await assertPodsInScope(user, await podIds());
}

/** Platform-wide money settings: no city owns them, so a city-bound admin may not change them. */
export function assertPlatformFinanceWrite(ctx: GraphQLContext, allowed: readonly string[]): void {
  const user = requireAuth(ctx);
  if (isScopedOnly(user, allowed)) {
    throw new GraphQLError('Only Finance or a super admin can change platform-wide finance settings', {
      extensions: { code: 'FORBIDDEN' },
    });
  }
}

/** A money write bound to one person (a host's commission): their city must be the admin's. */
export async function assertUserFinanceScope(
  ctx: GraphQLContext,
  allowed: readonly string[],
  userId: string
): Promise<void> {
  const user = requireAuth(ctx);
  if (!isScopedOnly(user, allowed)) return;
  const target = Types.ObjectId.isValid(userId)
    ? await UserModel.findById(userId).select('profile.city profile.zone').lean<{ profile?: { city?: string; zone?: string } }>()
    : null;
  const city = target?.profile?.city?.trim();
  const keys = new Set<string>(city ? [norm(city)] : []);
  if (city) {
    // The admin's assigned city may be written as the Location's slug or id
    // rather than its name — resolve the person's city to all of them.
    const exact = new RegExp(`^${escapeRegExp(city)}$`, 'i');
    const locations = await LocationModel.find({ $or: [{ location_name: exact }, { city: exact }, { location_id: norm(city) }] })
      .select('location_id location_name city')
      .lean();
    locations.flatMap(locationKeys).forEach((key) => keys.add(key));
  }
  if (!inScope(user, keys, target?.profile?.zone)) throw outOfScope();
}
