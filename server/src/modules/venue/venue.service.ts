import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { VenueModel, type IVenue } from './venue.model';
import { LocationModel } from '../location/location.model';

const toPub = (v: IVenue) => ({
  id: String(v._id),
  owner_user_id: String(v.owner_user_id),
  venue_name: v.venue_name ?? '',
  venue_type: v.venue_type ?? '',
  capacity: v.capacity ?? 0,
  description: v.description ?? '',
  amenities: v.amenities ?? [],
  cover_image_url: v.cover_image_url ?? '',
  gallery: v.gallery ?? [],
  location_id: v.location_id ? String(v.location_id) : null,
  country: v.country ?? 'India',
  country_code: v.country_code ?? 'IN',
  address_line1: v.address_line1 ?? '',
  address_line2: v.address_line2 ?? '',
  city: v.city ?? '',
  state: v.state ?? '',
  state_code: v.state_code ?? '',
  locality: v.locality ?? '',
  postal_code: v.postal_code ?? '',
  lat: v.lat ?? null,
  lng: v.lng ?? null,
  documents: (v.documents ?? []).map((d) => ({
    type: d.type,
    url: d.url,
    uploaded_at: d.uploaded_at?.toISOString?.() ?? '',
  })),
  gstin: v.gstin ?? '',
  pan: v.pan ?? '',
  owner_name: v.owner_name ?? '',
  owner_email: v.owner_email ?? '',
  owner_phone: v.owner_phone ?? '',
  owner_dob: v.owner_dob ? v.owner_dob.toISOString() : null,
  owner_address: v.owner_address ?? '',
  tags: v.tags ?? [],
  step_completed: v.step_completed ?? 0,
  status: v.status,
  reviewer_notes: v.reviewer_notes ?? '',
  submitted_at: v.submitted_at ? v.submitted_at.toISOString() : null,
  approved_at: v.approved_at ? v.approved_at.toISOString() : null,
  rejected_at: v.rejected_at ? v.rejected_at.toISOString() : null,
  created_at: v.created_at?.toISOString?.() ?? '',
  updated_at: v.updated_at?.toISOString?.() ?? '',
});

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function findStep1Location(input: any) {
  if (input.location_id) return LocationModel.findById(input.location_id);

  const city = String(input.city ?? '').trim();
  if (!city) return null;

  const cityRegex = new RegExp(`^${escapeRegex(city)}$`, 'i');
  const query: any = { $or: [{ city: cityRegex }, { location_name: cityRegex }] };
  if (input.state) query.state = new RegExp(`^${escapeRegex(String(input.state).trim())}$`, 'i');
  if (input.country_code) query.country_code = input.country_code;
  return LocationModel.findOne(query);
}

async function getOrCreate(userId: string) {
  const uid = new Types.ObjectId(userId);
  let v = await VenueModel.findOne({ owner_user_id: uid });
  if (!v) v = await VenueModel.create({ owner_user_id: uid });
  return v;
}

async function normalizeStep1Location(input: any) {
  const next = { ...input };
  const location = await findStep1Location(next);
  if (!location) {
    throw new GraphQLError('Selected location was not found', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  const locality = String(next.locality ?? '').trim();
  const zones = location.location_zones ?? [];
  const zone = locality
    ? zones.find((item) => item.zone_name === locality || item.zone_code === locality)
    : null;

  if (zones.length > 0 && !locality) {
    throw new GraphQLError('Select a locality for this city', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  if (locality && !zone) {
    throw new GraphQLError('Selected locality is not available for this city', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  return {
    ...next,
    location_id: location._id,
    country: location.country ?? 'India',
    country_code: location.country_code ?? 'IN',
    state: location.state ?? '',
    state_code: location.state_code ?? '',
    city: location.city || location.location_name,
    locality: zone?.zone_name || locality || location.location_name || location.city,
    postal_code: zone?.pincode || location.location_pincode,
  };
}

export const venueService = {
  async getMine(userId: string) {
    const v = await VenueModel.findOne({ owner_user_id: new Types.ObjectId(userId) });
    return v ? toPub(v) : null;
  },
  async list(filter?: { status?: string }) {
    const q: any = {};
    if (filter?.status) q.status = filter.status;
    const docs = await VenueModel.find(q).sort({ created_at: -1 });
    return docs.map(toPub);
  },
  async getById(id: string) {
    const v = await VenueModel.findById(id);
    return v ? toPub(v) : null;
  },
  async submitStep1(userId: string, input: any) {
    const v = await getOrCreate(userId);
    Object.assign(v, await normalizeStep1Location(input));
    if (v.step_completed < 1) v.step_completed = 1;
    if (v.status === 'REJECTED') v.status = 'DRAFT';
    await v.save();
    return toPub(v);
  },
  async submitStep2(userId: string, input: any) {
    const v = await getOrCreate(userId);
    if (v.step_completed < 1) {
      throw new GraphQLError('Complete venue details first', { extensions: { code: 'BAD_REQUEST' } });
    }
    v.documents = (input.documents || [])
      .filter((d: any) => d && d.type && d.url)
      .map((d: any) => ({
        type: String(d.type).trim(),
        url: String(d.url).trim(),
        uploaded_at: new Date(),
      }));
    if (input.gstin !== undefined) v.gstin = input.gstin;
    if (input.pan !== undefined) v.pan = input.pan;
    if (v.step_completed < 2) v.step_completed = 2;
    await v.save();
    return toPub(v);
  },
  async submitStep3(userId: string, input: any) {
    const v = await getOrCreate(userId);
    if (v.step_completed < 2) {
      throw new GraphQLError('Complete documentation step first', { extensions: { code: 'BAD_REQUEST' } });
    }
    v.owner_name = input.owner_name;
    v.owner_email = input.owner_email;
    v.owner_phone = input.owner_phone;
    if (input.owner_dob) v.owner_dob = new Date(input.owner_dob);
    if (input.owner_address !== undefined) v.owner_address = input.owner_address;
    if (v.step_completed < 3) v.step_completed = 3;
    await v.save();
    return toPub(v);
  },
  async submitFinal(userId: string) {
    const v = await getOrCreate(userId);
    if (v.step_completed < 3) {
      throw new GraphQLError('Complete all steps first', { extensions: { code: 'BAD_REQUEST' } });
    }
    v.step_completed = 4;
    v.status = 'SUBMITTED';
    v.submitted_at = new Date();
    await v.save();
    return toPub(v);
  },
  async approve(id: string, notes?: string, tags?: string[]) {
    const v = await VenueModel.findById(id);
    if (!v) throw new GraphQLError('Venue not found', { extensions: { code: 'NOT_FOUND' } });
    v.status = 'APPROVED';
    v.approved_at = new Date();
    v.reviewer_notes = notes ?? v.reviewer_notes;
    if (tags) v.tags = tags.map((tag) => tag.trim()).filter(Boolean);
    await v.save();
    return toPub(v);
  },
  async reject(id: string, notes: string) {
    const v = await VenueModel.findById(id);
    if (!v) throw new GraphQLError('Venue not found', { extensions: { code: 'NOT_FOUND' } });
    v.status = 'REJECTED';
    v.rejected_at = new Date();
    v.reviewer_notes = notes;
    await v.save();
    return toPub(v);
  },
  async adminCreate(opts: {
    ownerUserId: string;
    step1: any;
    step2: any;
    step3: any;
    submit?: boolean;
  }) {
    const v = await getOrCreate(opts.ownerUserId);
    Object.assign(v, await normalizeStep1Location(opts.step1));
    v.documents = (opts.step2.documents || [])
      .filter((d: any) => d && d.type && d.url)
      .map((d: any) => ({ type: String(d.type).trim(), url: String(d.url).trim(), uploaded_at: new Date() }));
    if (opts.step2.gstin !== undefined) v.gstin = opts.step2.gstin;
    if (opts.step2.pan !== undefined) v.pan = opts.step2.pan;
    v.owner_name = opts.step3.owner_name;
    v.owner_email = opts.step3.owner_email;
    v.owner_phone = opts.step3.owner_phone;
    if (opts.step3.owner_dob) v.owner_dob = new Date(opts.step3.owner_dob);
    if (opts.step3.owner_address !== undefined) v.owner_address = opts.step3.owner_address;
    if (opts.step1.tags !== undefined) v.tags = opts.step1.tags;
    v.step_completed = opts.submit ? 4 : 3;
    if (opts.submit) {
      v.status = 'SUBMITTED';
      v.submitted_at = new Date();
    }
    await v.save();
    return toPub(v);
  },
  async adminUpdate(id: string, opts: { step1: any; step2: any; step3: any; status?: string }) {
    const v = await VenueModel.findById(id);
    if (!v) throw new GraphQLError('Venue not found', { extensions: { code: 'NOT_FOUND' } });
    Object.assign(v, await normalizeStep1Location(opts.step1));
    v.documents = (opts.step2.documents || [])
      .filter((d: any) => d && d.type && d.url)
      .map((d: any) => ({ type: String(d.type).trim(), url: String(d.url).trim(), uploaded_at: new Date() }));
    if (opts.step2.gstin !== undefined) v.gstin = opts.step2.gstin;
    if (opts.step2.pan !== undefined) v.pan = opts.step2.pan;
    v.owner_name = opts.step3.owner_name;
    v.owner_email = opts.step3.owner_email;
    v.owner_phone = opts.step3.owner_phone;
    v.owner_dob = opts.step3.owner_dob ? new Date(opts.step3.owner_dob) : null;
    if (opts.step3.owner_address !== undefined) v.owner_address = opts.step3.owner_address;
    if (opts.step1.tags !== undefined) v.tags = opts.step1.tags;
    v.step_completed = Math.max(v.step_completed ?? 0, 3);
    if (opts.status) {
      v.status = opts.status as any;
      if (opts.status === 'APPROVED' && !v.approved_at) v.approved_at = new Date();
      if (opts.status === 'SUBMITTED' && !v.submitted_at) v.submitted_at = new Date();
      if (opts.status !== 'REJECTED') v.rejected_at = null;
    }
    await v.save();
    return toPub(v);
  },
};
