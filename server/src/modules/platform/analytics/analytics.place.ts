import { userScopeFilter, type ReadScope } from '@middleware/rbac';
import { locationsNamed } from '@modules/finance/financeScope';
import { UserModel } from '@modules/access/user/user.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { HostModel } from '@modules/venues/host/host.model';
import { ContactSubmissionModel } from '@modules/crm/contact/contact.model';

/**
 * The place the admin dashboard counts in, as one filter per collection on
 * the place field that collection carries. null is the whole platform
 * (SUPER_ADMIN and every role not held to a place, rbac `readScope`).
 *
 *  - users:  their own profile city / zone — the fields usersTable is scoped by.
 *  - pods:   their own Location and zone_name (the `location_id, zone_name` index).
 *  - clubs, venues: their Location, or their locality (a Location zone_name).
 *  - hosts:  a host has no place of its own, so it is placed by its user.
 */
export interface PlaceFilters {
  users: Record<string, unknown>;
  pods: Record<string, unknown>;
  clubs: Record<string, unknown>;
  venues: Record<string, unknown>;
}

export async function placeFilters(scope: ReadScope): Promise<PlaceFilters | null> {
  if (!scope) return null;
  const users = userScopeFilter(scope);
  if ('zones' in scope) {
    const locality = { locality: { $in: scope.zones } };
    return { users, pods: { zone_name: { $in: scope.zones } }, clubs: locality, venues: locality };
  }
  // The assigned city may be a Location's name, slug or id; none known → no Location → counts of 0.
  const atLocation = { location_id: { $in: (await locationsNamed(scope.city)).map((loc) => loc._id) } };
  return { users, pods: atLocation, clubs: atLocation, venues: atLocation };
}

/** Hosts whose own account is in the place — one aggregate, the user join on its _id index. */
async function hostsIn(users: Record<string, unknown>): Promise<number> {
  const [row] = await HostModel.aggregate<{ n: number }>([
    {
      $lookup: {
        from: UserModel.collection.name,
        localField: 'user_id',
        foreignField: '_id',
        pipeline: [{ $match: users }, { $project: { _id: 1 } }],
        as: 'placed',
      },
    },
    { $match: { 'placed.0': { $exists: true } } },
    { $count: 'n' },
  ]);
  return row?.n ?? 0;
}

/** The dashboard's entity totals, counted only inside `place` when there is one. */
export function placeTotals(place: PlaceFilters | null) {
  if (!place) {
    return Promise.all([
      UserModel.countDocuments({}),
      PodModel.countDocuments({}),
      ClubModel.countDocuments({}),
      VenueModel.countDocuments({}),
      HostModel.countDocuments({}),
      ContactSubmissionModel.countDocuments({ status: { $in: ['NEW', 'IN_PROGRESS'] } }),
      ContactSubmissionModel.countDocuments({}),
      ContactSubmissionModel.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);
  }
  // Support tickets here are website contact-form messages: a name, an email
  // and no user or place on them, so no city can claim one. A city or zonal
  // admin is shown 0 for them rather than the platform's total.
  return Promise.all([
    UserModel.countDocuments(place.users),
    PodModel.countDocuments(place.pods),
    ClubModel.countDocuments(place.clubs),
    VenueModel.countDocuments(place.venues),
    hostsIn(place.users),
    0,
    0,
    [] as Array<{ _id: string; count: number }>,
  ]);
}
