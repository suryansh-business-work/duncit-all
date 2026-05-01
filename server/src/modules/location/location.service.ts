import { GraphQLError } from 'graphql';
import { LocationModel } from './location.model';

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
    location_id: d.location_id,
    location_name: d.location_name,
    location_image: d.location_image,
    location_pincode: d.location_pincode,
    location_zones: (d.location_zones ?? []).map((z: any) => ({
      zone_name: z.zone_name,
      zone_code: z.zone_code ?? '',
      pincode: z.pincode ?? '',
    })),
    is_active: !!d.is_active,
    created_at: d.created_at?.toISOString?.() ?? '',
    updated_at: d.updated_at?.toISOString?.() ?? '',
  };
};

function notFound(): never {
  throw new GraphQLError('Location not found', { extensions: { code: 'NOT_FOUND' } });
}

export const locationService = {
  async list(filter?: { search?: string; is_active?: boolean }) {
    const q: any = {};
    if (filter?.search) {
      q.$or = [
        { location_name: new RegExp(filter.search, 'i') },
        { location_id: new RegExp(filter.search, 'i') },
        { location_pincode: new RegExp(filter.search, 'i') },
      ];
    }
    if (filter?.is_active !== undefined) q.is_active = filter.is_active;
    const docs = await LocationModel.find(q).sort({ location_name: 1 });
    return docs.map(toPub);
  },

  async getById(id: string) {
    const d = await LocationModel.findById(id);
    return toPub(d);
  },

  async create(input: {
    location_name: string;
    location_id?: string;
    location_image: string;
    location_pincode: string;
    location_zones?: { zone_name: string; zone_code?: string; pincode?: string }[];
  }) {
    const location_id = (input.location_id?.trim() || slugify(input.location_name));
    const dupe = await LocationModel.findOne({ location_id });
    if (dupe) {
      throw new GraphQLError('Location with that ID already exists', {
        extensions: { code: 'CONFLICT' },
      });
    }
    const doc = await LocationModel.create({
      location_id,
      location_name: input.location_name.trim(),
      location_image: input.location_image,
      location_pincode: input.location_pincode.trim(),
      location_zones: input.location_zones ?? [],
    });
    return toPub(doc);
  },

  async update(
    id: string,
    input: {
      location_name?: string;
      location_image?: string;
      location_pincode?: string;
      location_zones?: { zone_name: string; zone_code?: string; pincode?: string }[];
      is_active?: boolean;
    }
  ) {
    const doc = await LocationModel.findById(id);
    if (!doc) notFound();
    if (input.location_name !== undefined) doc.location_name = input.location_name.trim();
    if (input.location_image !== undefined) doc.location_image = input.location_image;
    if (input.location_pincode !== undefined) doc.location_pincode = input.location_pincode.trim();
    if (input.location_zones !== undefined) doc.location_zones = input.location_zones as any;
    if (input.is_active !== undefined) doc.is_active = input.is_active;
    await doc.save();
    return toPub(doc);
  },

  async remove(id: string) {
    const doc = await LocationModel.findById(id);
    if (!doc) notFound();
    await doc!.deleteOne();
    return true;
  },
};
