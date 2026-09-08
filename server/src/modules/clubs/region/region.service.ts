/**
 * The Regional Club Admin console's reads and writes.
 *
 * Everything here is scoped to the CALLER's own region. The role says "you
 * manage a region", never "you may read regions" — so no query takes a region
 * id, and a second Regional Club Admin cannot reach this one's branch by
 * asking for it. The scope chain itself lives in `region.scope`, and the
 * drill-down (clubs, pods, one pod's detail) in `region.pod`.
 */
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { userHasRole } from '@modules/access/user/effective-roles';
import { ClubModel } from '@modules/clubs/club/club.model';
import { RegionModel, type IRegion } from './region.model';
import { buildRegionTree } from './region.tree';
import { loadPeople, ownRegion, personName, type NamedUser } from './region.scope';

const clean = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

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

  /**
   * The region's Club Admins, with the clubs each one runs.
   *
   * TWO reads for the whole table — the people and their clubs — and the clubs
   * are grouped by pushing into the map rather than rebuilding each list, which
   * is what keeps a manager with forty clubs linear instead of quadratic.
   */
  async members(userId: string) {
    const region = await ownRegion(userId);
    const ids = region.club_admin_user_ids ?? [];
    if (ids.length === 0) return [];
    const inRegion = new Set(ids.map(String));
    const [people, clubs] = await Promise.all([
      loadPeople(ids),
      ClubModel.find({ admin_user_ids: { $in: ids } })
        .select('club_name admin_user_ids')
        .lean(),
    ]);
    const clubsByAdmin = new Map<string, string[]>();
    for (const club of clubs) {
      for (const admin of club.admin_user_ids ?? []) {
        const key = String(admin);
        // A club co-run by somebody outside this region must not put that
        // person's name in the table — only this region's own rows are listed.
        if (!inRegion.has(key)) continue;
        const list = clubsByAdmin.get(key);
        if (list) list.push(club.club_name);
        else clubsByAdmin.set(key, [club.club_name]);
      }
    }
    return ids.map((id) => {
      const key = String(id);
      const person = people.get(key);
      const own = clubsByAdmin.get(key) ?? [];
      return {
        user_id: key,
        name: person?.name ?? '',
        email: person?.email ?? '',
        clubs: own,
        club_count: own.length,
      };
    });
  },

  /**
   * Club Admins this manager could add.
   *
   * Anyone already in ANY region is left out — the picker offering somebody who
   * cannot be added is a dead option, and the add would fail anyway. The taken
   * set is excluded IN the query (`$nin`) rather than over-fetching and
   * filtering afterwards, so the limit is the number of rows the database
   * actually returns.
   */
  async candidates(userId: string, search: string, limit: number) {
    const region = await ownRegion(userId);
    const taken = (await RegionModel.distinct('club_admin_user_ids')) as Types.ObjectId[];
    const term = clean(search, 80);
    const filter: Record<string, unknown> = { 'metadata.role_keys': 'CLUB_ADMIN' };
    if (taken.length > 0) filter._id = { $nin: taken };
    if (term) {
      const rx = new RegExp(escapeRegex(term), 'i');
      filter.$or = [
        { 'profile.first_name': rx },
        { 'profile.last_name': rx },
        { 'auth.email': rx },
      ];
    }
    const users = await UserModel.find(filter)
      .select('profile.first_name profile.last_name auth.email')
      .limit(limit)
      .lean<Array<NamedUser & { _id: unknown }>>();
    return users.map((user) => ({
      user_id: String(user._id),
      name: personName(user),
      email: user.auth?.email ?? '',
      region_name: region.region_name,
    }));
  },
};
