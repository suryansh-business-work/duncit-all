import { GraphQLError } from 'graphql';
import { PodModel, type PodType } from './pod.model';

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const toPub = (d: any) => {
  if (!d) return null;
  return {
    id: String(d._id),
    pod_id: d.pod_id,
    pod_title: d.pod_title,
    pod_hosts_id: (d.pod_hosts_id ?? []).map((x: any) => String(x)),
    location_id: d.location_id ? String(d.location_id) : null,
    club_id: d.club_id ? String(d.club_id) : null,
    zone_name: d.zone_name ?? null,
    pod_hashtag: d.pod_hashtag ?? [],
    pod_images_and_videos: (d.pod_images_and_videos ?? []).map((m: any) => ({
      url: m.url,
      type: m.type ?? 'IMAGE',
    })),
    pod_hits: d.pod_hits ?? 0,
    pod_attendees: (d.pod_attendees ?? []).map((x: any) => String(x)),
    pod_description: d.pod_description ?? '',
    pod_date_time: d.pod_date_time?.toISOString?.() ?? null,
    pod_end_date_time: d.pod_end_date_time?.toISOString?.() ?? null,
    pod_type: d.pod_type,
    pod_amount: d.pod_amount ?? 0,
    pod_occurrence: d.pod_occurrence ?? 'ONE_TIME',
    no_of_spots: d.no_of_spots ?? 0,
    pod_info: d.pod_info ?? '',
    what_this_pod_offers: d.what_this_pod_offers ?? [],
    available_perks: d.available_perks ?? [],
    payment_terms: d.payment_terms ?? null,
    place_charges: (d.place_charges ?? []).map((c: any) => ({
      label: c.label,
      amount: c.amount ?? 0,
      note: c.note ?? null,
    })),
    is_active: !!d.is_active,
    created_at: d.created_at?.toISOString?.() ?? '',
    updated_at: d.updated_at?.toISOString?.() ?? '',
  };
};

function notFound(): never {
  throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });
}

function validateAmount(type: PodType, amount: number) {
  if (amount < 0 || amount > 1999) {
    throw new GraphQLError('pod_amount must be between 0 and 1999', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  if ((type === 'NATIVE_FREE' || type === 'NON_NATIVE_FREE') && amount !== 0) {
    throw new GraphQLError('Free pods must have amount 0', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
}

export const podService = {
  async list(filter?: {
    club_id?: string;
    location_id?: string;
    zone_name?: string;
    search?: string;
    is_active?: boolean;
    host_user_id?: string;
  }) {
    const q: any = {};
    if (filter?.club_id) q.club_id = filter.club_id;
    if (filter?.location_id) q.location_id = filter.location_id;
    if (filter?.zone_name) q.zone_name = filter.zone_name;
    if (filter?.is_active !== undefined) q.is_active = filter.is_active;
    if (filter?.search) q.pod_title = new RegExp(filter.search, 'i');
    if (filter?.host_user_id) q.pod_hosts_id = filter.host_user_id;
    const docs = await PodModel.find(q).sort({ pod_date_time: -1 });
    return docs.map(toPub);
  },

  async getById(id: string) {
    return toPub(await PodModel.findById(id));
  },

  async create(input: any) {
    const pod_id = (input.pod_id?.trim() || `${slugify(input.pod_title)}-${Date.now().toString(36)}`);
    const dupe = await PodModel.findOne({ pod_id });
    if (dupe) {
      throw new GraphQLError('Pod with that ID already exists', {
        extensions: { code: 'CONFLICT' },
      });
    }
    if (!input.pod_hosts_id?.length) {
      throw new GraphQLError('At least one host is required', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    validateAmount(input.pod_type, input.pod_amount ?? 0);

    // Hosts are attendees by default
    const attendees = Array.from(
      new Set([...(input.pod_attendees ?? []), ...input.pod_hosts_id])
    );

    const doc = await PodModel.create({
      pod_id,
      pod_title: input.pod_title.trim(),
      pod_hosts_id: input.pod_hosts_id,
      location_id: input.location_id,
      club_id: input.club_id,
      zone_name: input.zone_name ?? null,
      pod_hashtag: input.pod_hashtag ?? [],
      pod_images_and_videos: input.pod_images_and_videos ?? [],
      pod_hits: 0,
      pod_attendees: attendees,
      pod_description: input.pod_description,
      pod_date_time: new Date(input.pod_date_time),
      pod_end_date_time: input.pod_end_date_time ? new Date(input.pod_end_date_time) : null,
      pod_type: input.pod_type,
      pod_amount: input.pod_amount ?? 0,
      pod_occurrence: input.pod_occurrence ?? 'ONE_TIME',
      no_of_spots: input.no_of_spots ?? 0,
      pod_info: input.pod_info ?? '',
      what_this_pod_offers: input.what_this_pod_offers ?? [],
      available_perks: input.available_perks ?? [],
      payment_terms: input.payment_terms ?? null,
      place_charges: input.place_charges ?? [],
    });
    return toPub(doc);
  },

  async update(id: string, input: any) {
    const doc = await PodModel.findById(id);
    if (!doc) notFound();

    if (input.pod_type !== undefined || input.pod_amount !== undefined) {
      validateAmount(input.pod_type ?? doc!.pod_type, input.pod_amount ?? doc!.pod_amount);
    }

    const fields = [
      'pod_title',
      'pod_hosts_id',
      'location_id',
      'club_id',
      'zone_name',
      'pod_hashtag',
      'pod_images_and_videos',
      'pod_attendees',
      'pod_description',
      'pod_type',
      'pod_amount',
      'pod_occurrence',
      'no_of_spots',
      'pod_info',
      'what_this_pod_offers',
      'available_perks',
      'payment_terms',
      'place_charges',
      'is_active',
    ];
    for (const f of fields) {
      if (input[f] !== undefined) (doc as any)[f] = input[f];
    }
    if (input.pod_date_time !== undefined)
      doc.pod_date_time = new Date(input.pod_date_time);
    if (input.pod_end_date_time !== undefined)
      doc.pod_end_date_time = input.pod_end_date_time ? new Date(input.pod_end_date_time) : null;
    await doc.save();
    return toPub(doc);
  },

  async remove(id: string) {
    const doc = await PodModel.findById(id);
    if (!doc) notFound();
    await doc!.deleteOne();
    return true;
  },

  async incrementHits(id: string) {
    const doc = await PodModel.findByIdAndUpdate(
      id,
      { $inc: { pod_hits: 1 } },
      { new: true }
    );
    return toPub(doc);
  },
};
