import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { ClubModel } from './club.model';
import { ClubRatingModel } from './clubRating.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { UserModel } from '@modules/access/user/user.model';
import { ClubFollowerModel } from '@modules/access/user/relations';

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const toPub = (d: any) => {
  if (!d) return null;
  return {
    id: String(d._id),
    club_id: d.club_id,
    club_name: d.club_name,
    club_description: d.club_description ?? '',
    club_feature_images_and_videos: (d.club_feature_images_and_videos ?? []).map((m: any) => ({
      url: m.url,
      type: m.type ?? 'IMAGE',
    })),
    club_whats_app_community_link: d.club_whats_app_community_link ?? '',
    club_whats_app_announcement_link: d.club_whats_app_announcement_link ?? '',
    club_whats_app_group_link: d.club_whats_app_group_link ?? '',
    club_moments: (d.club_moments ?? []).map((m: any) => ({
      url: m.url,
      type: m.type ?? 'IMAGE',
    })),
    who_we_are: d.who_we_are ?? [],
    what_we_do: d.what_we_do ?? [],
    perks: d.perks ?? [],
    values: d.values ?? [],
    faqs: (d.faqs ?? []).map((f: any) => ({ question: f.question, answer: f.answer })),
    meetup_venues_id: d.meetup_venues_id ?? [],
    location_id: d.location_id ? String(d.location_id) : null,
    locality: d.locality ?? '',
    host_ids: (d.host_ids ?? []).map((x: any) => String(x)),
    admin_user_ids: (d.admin_user_ids ?? []).map((x: any) => String(x)),
    category_id: d.category_id ? String(d.category_id) : null,
    super_category_id: d.super_category_id ? String(d.super_category_id) : null,
    is_verified: !!d.is_verified,
    is_active: !!d.is_active,
    created_at: d.created_at?.toISOString?.() ?? '',
    updated_at: d.updated_at?.toISOString?.() ?? '',
  };
};

/** Shared public-shape mapper, so co-located features (e.g. search) return clubs
 * that the existing `Club` field resolvers can read without re-querying. */
export const mapClubToPublic = (doc: any) => toPub(doc);

function notFound(): never {
  throw new GraphQLError('Club not found', { extensions: { code: 'NOT_FOUND' } });
}

export const clubService = {
  async list(filter?: {
    search?: string;
    category_id?: string;
    super_category_id?: string;
    location_id?: string;
    locality?: string;
    is_active?: boolean;
    is_verified?: boolean;
  }) {
    const q: any = {};
    if (filter?.search) {
      q.$or = [
        { club_name: new RegExp(filter.search, 'i') },
        { club_id: new RegExp(filter.search, 'i') },
      ];
    }
    if (filter?.category_id) q.category_id = filter.category_id;
    if (filter?.super_category_id) q.super_category_id = filter.super_category_id;
    if (filter?.location_id) q.location_id = filter.location_id;
    // Narrow to a specific locality/zone within the city (Home > Clubs area filter).
    if (filter?.locality) q.locality = filter.locality;
    if (filter?.is_active !== undefined) q.is_active = filter.is_active;
    if (filter?.is_verified !== undefined) q.is_verified = filter.is_verified;
    const docs = await ClubModel.find(q).sort({ club_name: 1 });
    return docs.map(toPub);
  },

  async getById(id: string) {
    return toPub(await ClubModel.findById(id));
  },

  async getBySlug(slug: string) {
    return toPub(await ClubModel.findOne({ club_id: slug }));
  },

  async create(input: any) {
    const baseSlug = input.club_id?.trim() ? slugify(input.club_id.trim()) : slugify(input.club_name ?? '');
    if (!baseSlug) {
      throw new GraphQLError('Club name is required', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const dupe = await ClubModel.findOne({ club_id: baseSlug });
    if (dupe) {
      throw new GraphQLError(
        'A club with this name already exists. Choose a different name.',
        { extensions: { code: 'CONFLICT' } }
      );
    }
    const club_id = baseSlug;
    const doc = await ClubModel.create({
      club_id,
      club_name: input.club_name.trim(),
      club_description: input.club_description ?? '',
      club_feature_images_and_videos: input.club_feature_images_and_videos ?? [],
      club_whats_app_community_link: input.club_whats_app_community_link ?? '',
      club_whats_app_announcement_link: input.club_whats_app_announcement_link ?? '',
      club_whats_app_group_link: input.club_whats_app_group_link ?? '',
      club_moments: input.club_moments ?? [],
      who_we_are: input.who_we_are ?? [],
      what_we_do: input.what_we_do ?? [],
      perks: input.perks ?? [],
      values: input.values ?? [],
      faqs: input.faqs ?? [],
      meetup_venues_id: input.meetup_venues_id ?? [],
      location_id: input.location_id || null,
      locality: input.locality ?? '',
      host_ids: input.host_ids ?? [],
      admin_user_ids: input.admin_user_ids ?? [],
      category_id: input.category_id || null,
      super_category_id: input.super_category_id || null,
      is_verified: input.is_verified ?? false,
      is_active: input.is_active ?? true,
    });
    if ((input.admin_user_ids ?? []).length) {
      await this.syncClubAdminRoles([], (doc.admin_user_ids ?? []).map(String));
    }
    return toPub(doc);
  },

  async update(id: string, input: any) {
    const doc = await ClubModel.findById(id);
    if (!doc) notFound();
    const prevAdminIds = (doc!.admin_user_ids ?? []).map(String);
    const fields = [
      'club_name',
      'club_description',
      'club_feature_images_and_videos',
      'club_whats_app_community_link',
      'club_whats_app_announcement_link',
      'club_whats_app_group_link',
      'club_moments',
      'who_we_are',
      'what_we_do',
      'perks',
      'values',
      'faqs',
      'meetup_venues_id',
      'location_id',
      'locality',
      'host_ids',
      'admin_user_ids',
      'category_id',
      'super_category_id',
      'is_verified',
      'is_active',
    ];
    const nullableRefs = new Set(['location_id', 'category_id', 'super_category_id']);
    for (const f of fields) {
      if (input[f] === undefined) continue;
      (doc as any)[f] = nullableRefs.has(f) ? input[f] || null : input[f];
    }
    await doc.save();
    if (input.admin_user_ids !== undefined) {
      await this.syncClubAdminRoles(prevAdminIds, (doc!.admin_user_ids ?? []).map(String));
    }
    return toPub(doc);
  },

  async remove(id: string) {
    const doc = await ClubModel.findById(id);
    if (!doc) notFound();
    await doc!.deleteOne();
    return true;
  },

  /**
   * Resolved host profiles for a club (Bug 5): the admin-linked hosts, or — when
   * none are linked — the distinct hosts of the club's pods as a fallback.
   */
  async getHosts(clubId: string, hostIds: string[]) {
    let ids = (hostIds ?? []).filter((x) => Types.ObjectId.isValid(x));
    if (ids.length === 0 && Types.ObjectId.isValid(clubId)) {
      const pods = await PodModel.find({ club_id: new Types.ObjectId(clubId) })
        .select('pod_hosts_id')
        .lean();
      ids = Array.from(
        new Set(pods.flatMap((p: any) => (p.pod_hosts_id ?? []).map((x: any) => String(x))))
      );
    }
    if (ids.length === 0) return [];
    const users = await UserModel.find({ _id: { $in: ids } }).select(
      'profile.first_name profile.last_name profile.profile_photo'
    );
    return users.map((u: any) => ({
      id: String(u._id),
      name: `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim() || 'Host',
      avatar_url: u.profile?.profile_photo ?? null,
    }));
  },

  /** Resolved profiles of a club's assigned admins (explicit only — no fallback). */
  async getClubAdmins(adminIds: string[]) {
    const ids = (adminIds ?? []).filter((x) => Types.ObjectId.isValid(x));
    if (ids.length === 0) return [];
    const users = await UserModel.find({ _id: { $in: ids } }).select(
      'profile.first_name profile.last_name profile.profile_photo'
    );
    return users.map((u: any) => ({
      id: String(u._id),
      name: `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim() || 'Member',
      avatar_url: u.profile?.profile_photo ?? null,
    }));
  },

  /** Keep the CLUB_ADMIN role in sync with club assignment. Newly-assigned users
   * gain the role; users removed from a club lose it only when they no longer
   * administer ANY club. Dynamic import breaks the club<->user service cycle;
   * best-effort so a role hiccup never blocks the club write. */
  async syncClubAdminRoles(prevIds: string[], nextIds: string[]) {
    const prev = new Set(prevIds.map(String));
    const next = new Set(nextIds.map(String));
    const added = [...next].filter((x) => !prev.has(x));
    const removed = [...prev].filter((x) => !next.has(x));
    if (added.length === 0 && removed.length === 0) return;
    const { userService } = await import('@modules/access/user/user.service');
    for (const uid of added) {
      try {
        await userService.addRole(uid, 'CLUB_ADMIN');
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[clubService.syncClubAdminRoles] grant failed:', err);
      }
    }
    for (const uid of removed) {
      const stillAdmin = await ClubModel.exists({ admin_user_ids: new Types.ObjectId(uid) });
      if (stillAdmin) continue;
      try {
        await userService.removeRole(uid, 'CLUB_ADMIN');
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[clubService.syncClubAdminRoles] revoke failed:', err);
      }
    }
  },

  /** Pull a user out of every club's admin list. Called when the CLUB_ADMIN role
   * is revoked from the admin console (mirrors the Host/Venue revoke-sync). */
  async revokeAdminForUser(userId: string) {
    if (!Types.ObjectId.isValid(userId)) return;
    await ClubModel.updateMany(
      { admin_user_ids: new Types.ObjectId(userId) },
      { $pull: { admin_user_ids: new Types.ObjectId(userId) } }
    );
  },

  async followersCount(clubId: string) {
    if (!Types.ObjectId.isValid(clubId)) return 0;
    return ClubFollowerModel.countDocuments({ club_id: new Types.ObjectId(clubId) });
  },

  async getRating(clubId: string): Promise<number> {
    if (!Types.ObjectId.isValid(clubId)) return 0;
    const [row] = await ClubRatingModel.aggregate([
      { $match: { club_id: new Types.ObjectId(clubId) } },
      { $group: { _id: null, avg: { $avg: '$stars' } } },
    ]);
    return row?.avg ?? 0;
  },

  async getRatingsCount(clubId: string): Promise<number> {
    if (!Types.ObjectId.isValid(clubId)) return 0;
    return ClubRatingModel.countDocuments({ club_id: new Types.ObjectId(clubId) });
  },

  async listRatings(clubId: string) {
    if (!Types.ObjectId.isValid(clubId)) return [];
    const ratings = await ClubRatingModel.find({ club_id: new Types.ObjectId(clubId) }).sort({
      created_at: -1,
    });
    const userIds = ratings.map((r) => r.user_id);
    const users = await UserModel.find({ _id: { $in: userIds } }).select(
      'profile.first_name profile.last_name profile.profile_photo'
    );
    const userMap = new Map(users.map((u: any) => [String(u._id), u]));
    return ratings.map((r) => {
      const u: any = userMap.get(String(r.user_id));
      return {
        id: String(r._id),
        user_id: String(r.user_id),
        user_name: u ? `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim() || 'Member' : 'Member',
        user_photo: u?.profile?.profile_photo ?? null,
        stars: r.stars,
        comment: r.comment ?? null,
        created_at: r.created_at.toISOString(),
      };
    });
  },

  async addRating(clubId: string, userId: string, stars: number, comment?: string) {
    if (!Types.ObjectId.isValid(clubId) || !Types.ObjectId.isValid(userId)) {
      throw new GraphQLError('Invalid club or user', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    if (stars < 1 || stars > 5) {
      throw new GraphQLError('Stars must be between 1 and 5', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    await ClubRatingModel.findOneAndUpdate(
      { club_id: new Types.ObjectId(clubId), user_id: new Types.ObjectId(userId) },
      { stars, comment: comment ?? undefined },
      { upsert: true }
    );
    return this.getById(clubId);
  },

  /** Number of ACTIVE clubs in each location, keyed by the location's id
   * (string). A club is tied to one location (`location_id`); venues auto-match
   * it by that location + category. Used by the Home location selector to show
   * "<N> Clubs" under each city. */
  async activeClubCountsByLocation(): Promise<Record<string, number>> {
    const rows = await ClubModel.aggregate([
      { $match: { is_active: true, location_id: { $ne: null } } },
      { $group: { _id: '$location_id', count: { $sum: 1 } } },
    ]);
    const map: Record<string, number> = {};
    for (const row of rows) map[String(row._id)] = row.count as number;
    return map;
  },

  /** Number of ACTIVE clubs per (city, locality) pair, keyed
   * `${location_id}|${locality}`. Powers the per-locality club count shown at the
   * locality level of the location picker. A club's `locality` is a Location
   * zone_name; clubs with no locality are not counted. */
  async activeClubCountsByLocality(): Promise<Record<string, number>> {
    const rows = await ClubModel.aggregate([
      { $match: { is_active: true, location_id: { $ne: null }, locality: { $nin: [null, ''] } } },
      { $group: { _id: { location_id: '$location_id', locality: '$locality' }, count: { $sum: 1 } } },
    ]);
    const map: Record<string, number> = {};
    for (const row of rows) {
      map[`${String(row._id.location_id)}|${row._id.locality}`] = row.count as number;
    }
    return map;
  },
};
