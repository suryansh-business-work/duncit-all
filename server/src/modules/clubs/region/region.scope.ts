/**
 * What a Regional Club Admin is allowed to read, in one place.
 *
 * The role says "you manage a region", never "you may read regions": no query
 * takes a region id, and every scope below is derived from the CALLER's own
 * row. A second manager therefore cannot reach this one's branch by asking for
 * it, whatever id they send.
 *
 * The chain is always the same — region -> its Club Admins -> the clubs those
 * people run -> the pods in those clubs — so it is expressed once here rather
 * than re-derived at each of the dozen read sites that need it.
 */
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { ClubModel } from '@modules/clubs/club/club.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { UserModel } from '@modules/access/user/user.model';
import { RegionModel, type IRegion } from './region.model';

const forbidden = (): never => {
  throw new GraphQLError('Access Denied', { extensions: { code: 'FORBIDDEN' } });
};

const notFound = (what: string): never => {
  throw new GraphQLError(`${what} not found`, { extensions: { code: 'NOT_FOUND' } });
};

/** A lean() user, as far as naming one goes. */
export interface NamedUser {
  profile?: { first_name?: string | null; last_name?: string | null } | null;
  auth?: { email?: string | null } | null;
}

/** first+last name, or the email when a profile has neither. */
export const personName = (user: NamedUser): string =>
  [user.profile?.first_name, user.profile?.last_name].filter(Boolean).join(' ').trim() ||
  user.auth?.email ||
  '';

/**
 * Names for a set of user ids, in ONE read.
 *
 * Shared by the canvas and every table below: naming a person is the single
 * most repeated join in this module, and a per-node lookup is what turns a
 * forty-host region into forty round trips.
 */
export async function loadPeople(ids: Types.ObjectId[] | string[]) {
  const unique = [...new Set(ids.map(String))];
  if (unique.length === 0) return new Map<string, { name: string; email: string }>();
  const users = await UserModel.find({ _id: { $in: unique } })
    .select('profile.first_name profile.last_name auth.email')
    .lean<Array<NamedUser & { _id: unknown }>>();
  return new Map(
    users.map((user) => [
      String(user._id),
      { name: personName(user), email: user.auth?.email ?? '' },
    ])
  );
}

/**
 * The caller's region, created on first read.
 *
 * There is no onboarding application behind this role, so there is nothing to
 * approve and nothing to wait for: granting the role IS the appointment, and
 * the row appears the moment its holder opens the console. Create-on-conflict
 * rather than find-then-create because two tabs opening together would
 * otherwise both create one, and `manager_user_id` is unique.
 */
export async function ownRegion(userId: string): Promise<IRegion> {
  const manager = new Types.ObjectId(userId);
  const existing = await RegionModel.findOne({ manager_user_id: manager });
  if (existing) return existing;
  const user = await UserModel.findById(userId)
    .select('profile.first_name profile.last_name auth.email')
    .lean<NamedUser | null>();
  const name = user ? personName(user) : '';
  const doc = new RegionModel({
    manager_user_id: manager,
    // Named after the person until they rename it — a blank title on a canvas
    // reads as a rendering fault rather than as an unnamed region.
    region_name: name ? `${name}'s Region` : 'My Region',
  });
  try {
    await doc.save();
    return doc;
  } catch {
    // Lost the race with another tab: whoever won has the row.
    const won = await RegionModel.findOne({ manager_user_id: manager });
    if (!won) {
      throw new GraphQLError('Could not open your region', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }
    return won;
  }
}

/** Every club in the region — the scope every pod read below is limited to. */
export async function regionClubIds(clubAdminIds: Types.ObjectId[]): Promise<Types.ObjectId[]> {
  if (clubAdminIds.length === 0) return [];
  const clubs = await ClubModel.find({ admin_user_ids: { $in: clubAdminIds } })
    .select('_id')
    .lean();
  return clubs.map((club) => club._id as Types.ObjectId);
}

/** Throw unless `clubAdminId` is one of the Club Admins in the caller's region. */
export async function assertRegionMember(userId: string, clubAdminId: string) {
  if (!Types.ObjectId.isValid(clubAdminId)) notFound('Club Admin');
  const region = await ownRegion(userId);
  const inRegion = (region.club_admin_user_ids ?? []).some(
    (id) => String(id) === String(clubAdminId)
  );
  if (!inRegion) forbidden();
  return region;
}

/**
 * Throw unless `clubDocId` is run by one of the region's Club Admins.
 *
 * Membership of the club is what proves it, not a role: a Regional Club Admin
 * holds no club membership themselves, so the club's OWN admin list — filtered
 * to the region — is the only honest answer.
 */
export async function assertRegionClub(userId: string, clubDocId: string) {
  if (!Types.ObjectId.isValid(clubDocId)) notFound('Club');
  const region = await ownRegion(userId);
  const admins = region.club_admin_user_ids ?? [];
  if (admins.length === 0) forbidden();
  const ok = await ClubModel.exists({ _id: clubDocId, admin_user_ids: { $in: admins } });
  if (!ok) forbidden();
  return region;
}

/**
 * Throw unless the pod sits in a club one of the region's Club Admins runs.
 *
 * Cancelled pods resolve here (`includeDeleted`) exactly as they do for a club
 * admin: a manager reviewing what happened needs the pod that was called off
 * more than the one that ran.
 */
export async function assertRegionPod(userId: string, podDocId: string) {
  if (!Types.ObjectId.isValid(podDocId)) notFound('Pod');
  const pod = await PodModel.findById(podDocId)
    .setOptions({ includeDeleted: true })
    .select('club_id')
    .lean();
  if (!pod) notFound('Pod');
  await assertRegionClub(userId, String((pod as { club_id?: unknown }).club_id ?? ''));
}
