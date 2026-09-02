import { Types } from 'mongoose';
import type { IAutoPodLocation } from './autoPod.model';
import { autoPodFail } from './autoPod.common';
import { ClubModel } from '@modules/clubs/club/club.model';
import { HostModel } from '@modules/venues/host/host.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { UserModel } from '@modules/access/user/user.model';

/**
 * WHO can enrol in an Auto Pod of a given sub-category — the one place that
 * rule is written. The notifications ask it who to tell, the admin's template
 * form asks it how many partners exist before the offer is rolled out, and the
 * side drawer behind each count lists exactly the same people.
 *
 * All three roles are matched on the SUB-category: a host is approved into
 * sub-categories, a club carries its sub in `category_id`, and a venue
 * declares the sub it wants to host pods in (`venue_category`). A partner with
 * no category cannot be matched and is never offered anything.
 */

/** Only partners in the pinned city are offered a pinned Auto Pod. */
const inCity = (location: IAutoPodLocation | null) =>
  location ? { location_id: location.location_id } : {};

export interface AudienceVenue {
  id: string;
  venue_name: string;
  city: string;
  locality: string;
  owner_user_id: string;
}

export interface AudienceHost {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
}

export interface AudienceClub {
  id: string;
  club_name: string;
  admin_user_ids: string[];
}

/** Approved, active venues that host this sub-category (in the city, once pinned). */
export async function audienceVenues(
  subCategoryId: Types.ObjectId,
  location: IAutoPodLocation | null
): Promise<AudienceVenue[]> {
  const venues = await VenueModel.find({
    status: 'APPROVED',
    is_active: true,
    'venue_category.sub_category_id': subCategoryId,
    ...inCity(location),
  })
    .select('venue_name city locality owner_user_id')
    .lean();
  return (venues as any[]).map((v) => ({
    id: String(v._id),
    venue_name: v.venue_name ?? '',
    city: v.city ?? '',
    locality: v.locality ?? '',
    owner_user_id: String(v.owner_user_id),
  }));
}

/** Approved, active hosts onboarded into this sub-category. A host has no city
 * of their own — they pick one when they enrol — so category is the audience. */
export async function audienceHosts(subCategoryId: Types.ObjectId): Promise<AudienceHost[]> {
  const hosts = await HostModel.find({
    status: 'APPROVED',
    is_active: true,
    'host_categories.sub_category_id': subCategoryId,
  })
    .select('user_id full_name email phone')
    .lean();
  return (hosts as any[]).map((h) => ({
    user_id: String(h.user_id),
    full_name: h.full_name ?? '',
    email: h.email ?? '',
    phone: h.phone ?? '',
  }));
}

/** Active clubs carrying this sub-category (in the city, once pinned), with
 * the admins who could claim the offer for them. */
export async function audienceClubs(
  subCategoryId: Types.ObjectId,
  location: IAutoPodLocation | null
): Promise<AudienceClub[]> {
  const clubs = await ClubModel.find({
    category_id: subCategoryId,
    is_active: true,
    ...inCity(location),
  })
    .select('club_name admin_user_ids')
    .lean();
  return (clubs as any[]).map((c) => ({
    id: String(c._id),
    club_name: c.club_name ?? '',
    admin_user_ids: (c.admin_user_ids ?? []).map(String),
  }));
}

/** One club admin as the drawer lists them: the person, and every matching
 * club they could claim the offer for. */
export interface AudienceClubAdmin {
  user_id: string;
  full_name: string;
  email: string;
  club_names: string[];
}

/** What the admin sees on step 1 of the template: the three counts, and the
 * rows behind each one. */
export interface AutoPodAudience {
  venue_count: number;
  host_count: number;
  club_admin_count: number;
  venues: (AudienceVenue & { owner_name: string })[];
  hosts: AudienceHost[];
  club_admins: AudienceClubAdmin[];
}

interface NamedUser {
  name: string;
  email: string;
}

/** Display name + email for a set of users, keyed by id. */
async function namedUsers(userIds: string[]): Promise<Map<string, NamedUser>> {
  const unique = [...new Set(userIds)].filter((id) => Types.ObjectId.isValid(id));
  if (unique.length === 0) return new Map();
  const users = await UserModel.find({ _id: { $in: unique.map((id) => new Types.ObjectId(id)) } })
    .select('profile.first_name profile.last_name auth.email')
    .lean();
  return new Map(
    (users as any[]).map((u) => [
      String(u._id),
      {
        name: `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim(),
        email: u.auth?.email ?? '',
      },
    ])
  );
}

/** Distinct club admins across the matching clubs, each with their club names. */
function clubAdminRows(clubs: AudienceClub[], users: Map<string, NamedUser>): AudienceClubAdmin[] {
  const byUser = new Map<string, AudienceClubAdmin>();
  for (const club of clubs) {
    for (const userId of club.admin_user_ids) {
      const row = byUser.get(userId) ?? {
        user_id: userId,
        full_name: users.get(userId)?.name ?? '',
        email: users.get(userId)?.email ?? '',
        club_names: [],
      };
      row.club_names.push(club.club_name);
      byUser.set(userId, row);
    }
  }
  return [...byUser.values()];
}

/**
 * The audience for a FRESH template — no city is pinned yet, so every partner
 * in the sub-category counts. All three counts must be positive before an
 * admin may roll the template out: an offer nobody can enrol in never goes
 * live, and the admin should learn that before writing the pod, not after.
 */
export async function autoPodAudience(subCategoryId: string): Promise<AutoPodAudience> {
  if (!Types.ObjectId.isValid(subCategoryId)) {
    autoPodFail('BAD_USER_INPUT', 'Select a category');
  }
  const sub = new Types.ObjectId(subCategoryId);
  const [venues, hosts, clubs] = await Promise.all([
    audienceVenues(sub, null),
    audienceHosts(sub),
    audienceClubs(sub, null),
  ]);
  const users = await namedUsers([
    ...venues.map((v) => v.owner_user_id),
    ...clubs.flatMap((c) => c.admin_user_ids),
  ]);
  const clubAdmins = clubAdminRows(clubs, users);
  return {
    venue_count: venues.length,
    host_count: hosts.length,
    club_admin_count: clubAdmins.length,
    venues: venues.map((v) => ({ ...v, owner_name: users.get(v.owner_user_id)?.name ?? '' })),
    hosts,
    club_admins: clubAdmins,
  };
}
