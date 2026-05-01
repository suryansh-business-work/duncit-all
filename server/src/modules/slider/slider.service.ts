import { GraphQLError } from 'graphql';
import { SliderModel, type ISlider, type SliderScope } from './slider.model';

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const toPub = (s: ISlider) => ({
  id: String(s._id),
  slider_id: s.slider_id,
  title: s.title,
  description: s.description ?? '',
  media_url: s.media_url,
  media_type: s.media_type,
  link_url: s.link_url ?? '',
  scope: s.scope,
  location_id: s.location_id ? String(s.location_id) : null,
  zone_name: s.zone_name ?? null,
  sort_order: s.sort_order,
  starts_at: s.starts_at ? s.starts_at.toISOString() : null,
  ends_at: s.ends_at ? s.ends_at.toISOString() : null,
  is_active: s.is_active,
  created_at: s.created_at.toISOString(),
  updated_at: s.updated_at.toISOString(),
});

const validateScope = (input: { scope: SliderScope; location_id?: string | null; zone_name?: string | null }) => {
  if (input.scope === 'LOCATION' && !input.location_id) {
    throw new GraphQLError('location_id is required for LOCATION scope', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  if (input.scope === 'ZONE') {
    if (!input.location_id) throw new GraphQLError('location_id is required for ZONE scope', { extensions: { code: 'BAD_USER_INPUT' } });
    if (!input.zone_name) throw new GraphQLError('zone_name is required for ZONE scope', { extensions: { code: 'BAD_USER_INPUT' } });
  }
};

export const sliderService = {
  async list(filter?: { scope?: SliderScope; location_id?: string; zone_name?: string; is_active?: boolean; search?: string }) {
    const q: any = {};
    if (filter?.scope) q.scope = filter.scope;
    if (filter?.location_id) q.location_id = filter.location_id;
    if (filter?.zone_name) q.zone_name = filter.zone_name;
    if (typeof filter?.is_active === 'boolean') q.is_active = filter.is_active;
    if (filter?.search) q.title = { $regex: filter.search, $options: 'i' };
    const docs = await SliderModel.find(q).sort({ sort_order: 1, created_at: -1 });
    return docs.map(toPub);
  },

  async getById(id: string) {
    const doc = await SliderModel.findById(id);
    return doc ? toPub(doc) : null;
  },

  async create(input: any) {
    validateScope(input);
    const slider_id = (input.slider_id && slugify(input.slider_id)) || `${slugify(input.title)}-${Date.now().toString(36)}`;
    const dup = await SliderModel.findOne({ slider_id });
    if (dup) throw new GraphQLError('slider_id already exists', { extensions: { code: 'CONFLICT' } });

    const doc = await SliderModel.create({
      slider_id,
      title: input.title,
      description: input.description ?? '',
      media_url: input.media_url,
      media_type: input.media_type ?? 'IMAGE',
      link_url: input.link_url ?? '',
      scope: input.scope,
      location_id: input.scope === 'GLOBAL' ? null : input.location_id ?? null,
      zone_name: input.scope === 'ZONE' ? input.zone_name : null,
      sort_order: input.sort_order ?? 0,
      starts_at: input.starts_at ? new Date(input.starts_at) : null,
      ends_at: input.ends_at ? new Date(input.ends_at) : null,
      is_active: input.is_active ?? true,
    });
    return toPub(doc);
  },

  async update(id: string, input: any) {
    const doc = await SliderModel.findById(id);
    if (!doc) throw new GraphQLError('Slider not found', { extensions: { code: 'NOT_FOUND' } });

    const next = {
      scope: input.scope ?? doc.scope,
      location_id: input.location_id !== undefined ? input.location_id : doc.location_id ? String(doc.location_id) : null,
      zone_name: input.zone_name !== undefined ? input.zone_name : doc.zone_name,
    };
    validateScope(next);

    const fields = ['title', 'description', 'media_url', 'media_type', 'link_url', 'scope', 'sort_order', 'is_active'] as const;
    for (const f of fields) if (input[f] !== undefined) (doc as any)[f] = input[f];

    if (input.scope !== undefined || input.location_id !== undefined) {
      doc.location_id = next.scope === 'GLOBAL' ? null : (next.location_id as any);
    }
    if (input.scope !== undefined || input.zone_name !== undefined) {
      doc.zone_name = next.scope === 'ZONE' ? next.zone_name ?? null : null;
    }
    if (input.starts_at !== undefined) doc.starts_at = input.starts_at ? new Date(input.starts_at) : null;
    if (input.ends_at !== undefined) doc.ends_at = input.ends_at ? new Date(input.ends_at) : null;

    await doc.save();
    return toPub(doc);
  },

  async remove(id: string) {
    const res = await SliderModel.findByIdAndDelete(id);
    return !!res;
  },
};
