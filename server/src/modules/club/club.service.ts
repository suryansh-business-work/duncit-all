import { GraphQLError } from 'graphql';
import { ClubModel } from './club.model';

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
    meetup_venues_id: d.meetup_venues_id ?? [],
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
      meetup_venues_id: input.meetup_venues_id ?? [],
      category_id: input.category_id || null,
      super_category_id: input.super_category_id || null,
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
      'meetup_venues_id',
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
};
