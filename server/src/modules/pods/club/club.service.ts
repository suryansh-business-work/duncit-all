import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { ClubModel } from './club.model';
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
    host_ids: (d.host_ids ?? []).map((x: any) => String(x)),
    category_id: d.category_id ? String(d.category_id) : null,
    super_category_id: d.super_category_id ? String(d.super_category_id) : null,
    is_active: !!d.is_active,
    created_at: d.created_at?.toISOString?.() ?? '',
    updated_at: d.updated_at?.toISOString?.() ?? '',
  };
};

function notFound(): never {
  throw new GraphQLError('Club not found', { extensions: { code: 'NOT_FOUND' } });
}

export const clubService = {
  async list(filter?: { search?: string; category_id?: string; super_category_id?: string; is_active?: boolean }) {
    const q: any = {};
    if (filter?.search) {
      q.$or = [
        { club_name: new RegExp(filter.search, 'i') },
        { club_id: new RegExp(filter.search, 'i') },
      ];
    }
    if (filter?.category_id) q.category_id = filter.category_id;
    if (filter?.super_category_id) q.super_category_id = filter.super_category_id;
    if (filter?.is_active !== undefined) q.is_active = filter.is_active;
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
      host_ids: input.host_ids ?? [],
      category_id: input.category_id || null,
      super_category_id: input.super_category_id || null,
      is_active: input.is_active ?? true,
    });
    return toPub(doc);
  },

  async update(id: string, input: any) {
    const doc = await ClubModel.findById(id);
    if (!doc) notFound();
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
      'host_ids',
      'category_id',
      'super_category_id',
      'is_active',
    ];
    for (const f of fields) {
      if (input[f] !== undefined) (doc as any)[f] = input[f];
    }
    await doc.save();
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

  async followersCount(clubId: string) {
    if (!Types.ObjectId.isValid(clubId)) return 0;
    return ClubFollowerModel.countDocuments({ club_id: new Types.ObjectId(clubId) });
  },
};
