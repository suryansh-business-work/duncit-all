/**
 * The Regional Club Admin console's reads and writes.
 *
 * Everything here is scoped to the CALLER's own region. The role says "you
 * manage a region", never "you may read regions" — so no query takes a region
 * id, and a second Regional Club Admin cannot reach this one's branch by
 * asking for it.
 */
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { userHasRole } from '@modules/access/user/effective-roles';
import { PodModel } from '@modules/pods/pod/pod.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { RegionModel, type IRegion } from './region.model';
import { buildRegionTree, regionClubIds } from './region.tree';
import {
  runTableQuery,
  type TableEntityConfig,
  type TableQueryInput,
} from '@utils/table-query';

const clean = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/** The drawer's table: one host's pods inside this region. */
const POD_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['pod_title', 'pod_id'],
  sortFields: {
    pod_title: 'pod_title',
    pod_date_time: 'pod_date_time',
    pod_amount: 'pod_amount',
    no_of_spots: 'no_of_spots',
    created_at: 'created_at',
  },
  filterFields: {
    pod_date_time: { type: 'date' },
    pod_mode: { type: 'enum' },
    pod_amount: { type: 'number' },
  },
  defaultSort: { pod_date_time: -1 },
};

function toPub(doc: IRegion) {
  return {
    id: doc._id.toString(),
    region_no: doc.region_no ?? '',
    region_name: doc.region_name,
    manager_user_id: doc.manager_user_id.toString(),
    club_admin_user_ids: (doc.club_admin_user_ids ?? []).map(String),
    club_admin_count: (doc.club_admin_user_ids ?? []).length,
    is_active: doc.is_active,
    created_at: doc.created_at?.toISOString?.() ?? '',
    updated_at: doc.updated_at?.toISOString?.() ?? '',
  };
}

/** A lean() user, as far as naming one goes. */
interface NamedUser {
  profile?: { first_name?: string | null; last_name?: string | null } | null;
  auth?: { email?: string | null } | null;
}

/** first+last name, or the email when a profile has neither. */
const personName = (user: NamedUser) =>
  [user.profile?.first_name, user.profile?.last_name].filter(Boolean).join(' ').trim() ||
  user.auth?.email ||
  '';

/**
 * The caller's region, created on first read.
 *
 * There is no onboarding application behind this role, so there is nothing to
 * approve and nothing to wait for: granting the role IS the appointment, and
 * the row appears the moment its holder opens the console. `upsert` rather
 * than find-then-create because two tabs opening together would otherwise both
 * create one, and `manager_user_id` is unique.
 */
async function ownRegion(userId: string): Promise<IRegion> {
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
    if (!won) throw new GraphQLError('Could not open your region', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
    return won;
  }
}

export const regionService = {
  async myRegion(userId: string) {
    return toPub(await ownRegion(userId));
  },

  async myRegionTree(userId: string) {
    const region = await ownRegion(userId);
    return buildRegionTree(region.region_name, region.club_admin_user_ids ?? []);
  },

  async rename(userId: string, name: string) {
    const region = await ownRegion(userId);
    const next = clean(name, 160);
    if (!next) {
      throw new GraphQLError('Give the region a name', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    region.region_name = next;
    await region.save();
    return toPub(region);
  },

  /**
   * Add a Club Admin to the region.
   *
   * Two guards, both about the tree being truthful: the person must actually
   * hold CLUB_ADMIN (otherwise their branch would be permanently empty), and
   * they must not already belong to somebody else's region (a club admin under
   * two managers is two people accountable for the same clubs).
   */
  async addClubAdmin(userId: string, clubAdminId: string) {
    if (!Types.ObjectId.isValid(clubAdminId)) {
      throw new GraphQLError('Club Admin not found', { extensions: { code: 'NOT_FOUND' } });
    }
    const region = await ownRegion(userId);
    const candidate = await UserModel.findById(clubAdminId).select('_id').lean();
    if (!candidate) {
      throw new GraphQLError('Club Admin not found', { extensions: { code: 'NOT_FOUND' } });
    }
    // Through effectiveRoleKeys, not the denormalized cache: this is an
    // authorization question, and the cache is only what `me { roles }` falls
    // back to. A gate that disagrees with `me` shows an enabled button in
    // front of a mutation that refuses (effective-roles.ts).
    if (!(await userHasRole(clubAdminId, 'CLUB_ADMIN'))) {
      throw new GraphQLError('That person does not hold the Club Admin role', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const taken = await RegionModel.findOne({
      club_admin_user_ids: new Types.ObjectId(clubAdminId),
      _id: { $ne: region._id },
    }).select('region_name');
    if (taken) {
      throw new GraphQLError(`Already in the region "${taken.region_name}"`, {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    // $addToSet, so adding the same person twice is a no-op rather than a
    // duplicate branch on the canvas.
    await RegionModel.updateOne(
      { _id: region._id },
      { $addToSet: { club_admin_user_ids: new Types.ObjectId(clubAdminId) } }
    );
    return toPub((await RegionModel.findById(region._id)) as IRegion);
  },

  async removeClubAdmin(userId: string, clubAdminId: string) {
    const region = await ownRegion(userId);
    await RegionModel.updateOne(
      { _id: region._id },
      { $pull: { club_admin_user_ids: new Types.ObjectId(clubAdminId) } }
    );
    return toPub((await RegionModel.findById(region._id)) as IRegion);
  },

  /** The region's Club Admins, with the clubs each one runs. */
  async members(userId: string) {
    const region = await ownRegion(userId);
    const ids = region.club_admin_user_ids ?? [];
    if (ids.length === 0) return [];
    const [users, clubs] = await Promise.all([
      UserModel.find({ _id: { $in: ids } })
        .select('profile.first_name profile.last_name auth.email')
        .lean<Array<NamedUser & { _id: unknown }>>(),
      ClubModel.find({ admin_user_ids: { $in: ids } })
        .select('club_name admin_user_ids')
        .lean(),
    ]);
    const clubsByAdmin = new Map<string, string[]>();
    for (const club of clubs) {
      for (const admin of club.admin_user_ids ?? []) {
        const key = String(admin);
        clubsByAdmin.set(key, [...(clubsByAdmin.get(key) ?? []), club.club_name]);
      }
    }
    return users.map((user) => ({
      user_id: String(user._id),
      name: personName(user),
      email: user.auth?.email ?? '',
      clubs: clubsByAdmin.get(String(user._id)) ?? [],
      club_count: (clubsByAdmin.get(String(user._id)) ?? []).length,
    }));
  },

  /**
   * Club Admins this manager could add.
   *
   * Anyone already in ANY region is left out — the picker offering somebody who
   * cannot be added is a dead option, and the add would fail anyway.
   */
  async candidates(userId: string, search: string, limit: number) {
    const region = await ownRegion(userId);
    const claimed = await RegionModel.find({}).select('club_admin_user_ids').lean();
    const taken = new Set(
      claimed.flatMap((row) => (row.club_admin_user_ids ?? []).map(String))
    );
    const term = clean(search, 80);
    const rx = term ? new RegExp(escapeRegex(term), 'i') : null;
    const filter: Record<string, unknown> = { 'metadata.role_keys': 'CLUB_ADMIN' };
    if (rx) {
      filter.$or = [
        { 'profile.first_name': rx },
        { 'profile.last_name': rx },
        { 'auth.email': rx },
      ];
    }
    const users = await UserModel.find(filter)
      .select('profile.first_name profile.last_name auth.email')
      .limit(limit + taken.size)
      .lean<Array<NamedUser & { _id: unknown }>>();
    return users
      .filter((user) => !taken.has(String(user._id)))
      .slice(0, limit)
      .map((user) => ({
        user_id: String(user._id),
        name: personName(user),
        email: user.auth?.email ?? '',
        region_name: region.region_name,
      }));
  },

  /**
   * One host's pods — the side drawer's table.
   *
   * Scoped twice: the host must be one this region can see, AND the pods are
   * limited to the region's own clubs. A host runs pods for clubs outside this
   * region too, and those are not this manager's to read.
   */
  async hostPods(userId: string, hostUserId: string, input?: TableQueryInput | null) {
    if (!Types.ObjectId.isValid(hostUserId)) {
      throw new GraphQLError('Host not found', { extensions: { code: 'NOT_FOUND' } });
    }
    const region = await ownRegion(userId);
    const clubIds = await regionClubIds(region.club_admin_user_ids ?? []);
    if (clubIds.length === 0) {
      return { rows: [], total: 0, page: 1, page_size: 25 };
    }
    const { docs, total, page, page_size } = await runTableQuery<any>(
      PodModel,
      { club_id: { $in: clubIds }, pod_hosts_id: new Types.ObjectId(hostUserId) },
      input,
      POD_TABLE_CONFIG
    );
    const clubs = await ClubModel.find({ _id: { $in: docs.map((pod) => pod.club_id) } })
      .select('club_name')
      .lean();
    const clubName = new Map(clubs.map((club) => [String(club._id), club.club_name]));
    return {
      rows: docs.map((pod) => ({
        id: String(pod._id),
        pod_id: pod.pod_id ?? '',
        pod_title: pod.pod_title ?? '',
        pod_date_time: pod.pod_date_time?.toISOString?.() ?? '',
        pod_mode: pod.pod_mode ?? '',
        pod_amount: pod.pod_amount ?? 0,
        no_of_spots: pod.no_of_spots ?? 0,
        club_name: clubName.get(String(pod.club_id)) ?? '',
        is_active: pod.is_active !== false,
      })),
      total,
      page,
      page_size,
    };
  },
};
