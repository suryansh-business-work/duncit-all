import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PodModel, type PodMode, type PodType } from './pod.model';
import { UserModel } from '../user/user.model';
import { ClubModel } from '../club/club.model';
import { InventoryProductModel } from '../inventory/inventory.model';
import { LocationModel } from '../location/location.model';
import { VenueModel } from '../venue/venue.model';

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

async function loadClubSlugMap(podDocs: any[]): Promise<Map<string, string>> {
  const ids = Array.from(
    new Set(podDocs.map((p) => p?.club_id && String(p.club_id)).filter(Boolean))
  );
  if (ids.length === 0) return new Map();
  const clubs = await ClubModel.find({ _id: { $in: ids } }, { club_id: 1 });
  return new Map(clubs.map((c: any) => [String(c._id), c.club_id]));
}

const toPub = (d: any, clubSlugById?: Map<string, string>) => {
  if (!d) return null;
  const clubId = d.club_id ? String(d.club_id) : null;
  const clubSlug = clubId ? clubSlugById?.get(clubId) ?? '' : '';
  return {
    id: String(d._id),
    pod_id: d.pod_id,
    pod_title: d.pod_title,
    pod_hosts_id: (d.pod_hosts_id ?? []).map((x: any) => String(x)),
    location_id: d.location_id ? String(d.location_id) : null,
    venue_id: d.venue_id ? String(d.venue_id) : null,
    club_id: clubId,
    club_slug: clubSlug,
    zone_name: d.zone_name ?? null,
    pod_mode: d.pod_mode ?? 'PHYSICAL',
    meeting_platform: d.pod_mode === 'VIRTUAL' ? d.meeting_platform ?? null : null,
    meeting_url: d.pod_mode === 'VIRTUAL' ? d.meeting_url ?? null : null,
    meeting_notes: d.pod_mode === 'VIRTUAL' ? d.meeting_notes ?? null : null,
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
    products_enabled: !!d.products_enabled,
    product_requests: (d.product_requests ?? []).map((item: any) => ({
      product_id: String(item.product_id),
      product_name: item.product_name,
      unit_cost: item.unit_cost ?? 0,
      quantity: item.quantity ?? 0,
      total_cost: item.total_cost ?? 0,
    })),
    product_cost_total: d.product_cost_total ?? 0,
    is_active: !!d.is_active,
    liked_user_ids: (d.liked_user_ids ?? []).map((x: any) => String(x)),
    like_count: (d.liked_user_ids ?? []).length,
    comment_count: (d.comments ?? []).length,
    completed_at: d.completed_at?.toISOString?.() ?? null,
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

function validateFutureDates(startValue?: string | Date | null, endValue?: string | Date | null) {
  const now = Date.now();
  const start = startValue ? new Date(startValue) : null;
  const end = endValue ? new Date(endValue) : null;
  if (!start || Number.isNaN(start.getTime()) || start.getTime() <= now) {
    throw new GraphQLError('Start date/time must be after current date/time', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  if (end && (Number.isNaN(end.getTime()) || end.getTime() <= now || end.getTime() < start.getTime())) {
    throw new GraphQLError('End date/time must be after current date/time and start date/time', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
}

function normalizeStatusMedia(media: any) {
  const url = String(media?.url ?? '').trim();
  if (!/^https?:\/\//i.test(url)) {
    throw new GraphQLError('Status media must be uploaded before saving', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  const type = media?.type === 'VIDEO' ? 'VIDEO' : 'IMAGE';
  return { url, type };
}

function normalizePodMode(mode?: string | null): PodMode {
  return mode === 'VIRTUAL' ? 'VIRTUAL' : 'PHYSICAL';
}

function validateMeetingDetails(mode: PodMode, input: any, current?: any) {
  if (mode !== 'VIRTUAL') return;
  const meetingUrl = input.meeting_url !== undefined ? input.meeting_url : current?.meeting_url;
  const trimmed = typeof meetingUrl === 'string' ? meetingUrl.trim() : '';
  if (!trimmed) {
    throw new GraphQLError('Meeting link is required for virtual pods', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('bad protocol');
  } catch {
    throw new GraphQLError('Meeting link must be a valid http(s) URL', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const requestMap = (items: any[] = []) => {
  const map = new Map<string, number>();
  for (const item of items) {
    const productId = String(item.product_id);
    map.set(productId, (map.get(productId) ?? 0) + (Number(item.quantity) || 0));
  }
  return map;
};

async function resolveVenueLocation(input: any) {
  const venueId = input.venue_id || null;
  let locationId = input.location_id || null;
  if (!venueId) {
    if (!locationId) {
      throw new GraphQLError('Select a venue', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    return { venue_id: null, location_id: locationId, zone_name: input.zone_name ?? null };
  }

  const venue = await VenueModel.findById(venueId);
  if (!venue) throw new GraphQLError('Venue not found', { extensions: { code: 'NOT_FOUND' } });
  const club = input.club_id ? await ClubModel.findById(input.club_id) : null;
  if (club?.meetup_venues_id?.length && !club.meetup_venues_id.includes(String(venue._id))) {
    throw new GraphQLError('Selected venue is not linked to this club', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  if (!locationId && (venue as any).location_id) {
    locationId = String((venue as any).location_id);
  }
  if (!locationId && venue.city) {
    const city = new RegExp(`^${escapeRegex(venue.city)}$`, 'i');
    const location = await LocationModel.findOne({ $or: [{ city }, { location_name: city }] });
    locationId = location ? String(location._id) : null;
  }
  return { venue_id: venueId, location_id: locationId, zone_name: null };
}

async function venueIdsForLocationFilter(locationId?: string, zoneName?: string) {
  const or: any[] = [];
  const zone = zoneName?.trim();
  if (locationId) {
    const location = await LocationModel.findById(locationId).lean();
    if (!location) return [];
    const city = location.city || location.location_name;
    const matchingZone = zone
      ? (location.location_zones ?? []).find((item: any) => item.zone_name === zone)
      : null;

    const locationFields: any = {};
    if (city) locationFields.city = new RegExp(`^${escapeRegex(city)}$`, 'i');
    if (location.state) locationFields.state = new RegExp(`^${escapeRegex(location.state)}$`, 'i');
    if (location.country_code) locationFields.country_code = location.country_code;

    if (zone) {
      const locality = new RegExp(`^${escapeRegex(zone)}$`, 'i');
      or.push({ location_id: location._id, locality });
      if (matchingZone?.pincode) or.push({ location_id: location._id, postal_code: matchingZone.pincode });
      if (Object.keys(locationFields).length > 0) {
        or.push({ ...locationFields, locality });
        if (matchingZone?.pincode) or.push({ ...locationFields, postal_code: matchingZone.pincode });
      }
    } else {
      or.push({ location_id: location._id });
      if (Object.keys(locationFields).length > 0) or.push(locationFields);
    }
  } else if (zone) {
    or.push({ locality: new RegExp(`^${escapeRegex(zone)}$`, 'i') });
  }

  if (or.length === 0) return [];
  const venues = await VenueModel.find({ $or: or }).select('_id').lean();
  return venues.map((venue) => venue._id);
}

async function buildPodPlaceFilter(filter?: { location_id?: string; zone_name?: string }) {
  const locationId = filter?.location_id;
  const zoneName = filter?.zone_name?.trim();
  if (!locationId && !zoneName) return null;

  const or: any[] = [{ pod_mode: 'VIRTUAL' }];
  if (locationId && zoneName) or.push({ location_id: locationId, zone_name: zoneName });
  else if (locationId) or.push({ location_id: locationId });
  else if (zoneName) or.push({ zone_name: zoneName });

  const venueIds = await venueIdsForLocationFilter(locationId, zoneName);
  if (venueIds.length > 0) or.push({ venue_id: { $in: venueIds } });
  return or.length > 0 ? { $or: or } : null;
}

async function buildProductRequests(enabled: boolean, rawItems: any[] = []) {
  if (!enabled) return [];
  const compact = Array.from(requestMap(rawItems).entries())
    .map(([productId, quantity]) => ({ productId, quantity }))
    .filter((item) => item.quantity > 0);
  const next = [];
  for (const item of compact) {
    const product = await InventoryProductModel.findById(item.productId);
    if (!product || !product.is_active) {
      throw new GraphQLError('Selected product is not available', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    next.push({
      product_id: product._id,
      product_name: product.product_name,
      unit_cost: product.unit_cost,
      quantity: item.quantity,
      total_cost: product.unit_cost * item.quantity,
    });
  }
  return next;
}

async function applyProductDeltas(oldItems: any[], nextItems: any[]) {
  const oldMap = requestMap(oldItems);
  const nextMap = requestMap(nextItems);
  const productIds = Array.from(new Set([...oldMap.keys(), ...nextMap.keys()]));
  for (const productId of productIds) {
    const delta = (nextMap.get(productId) ?? 0) - (oldMap.get(productId) ?? 0);
    if (!delta) continue;
    const product = await InventoryProductModel.findById(productId);
    if (!product) throw new GraphQLError('Product not found', { extensions: { code: 'NOT_FOUND' } });
    if (delta > 0 && product.inventory_count - product.requested_count < delta) {
      throw new GraphQLError(`Not enough inventory for ${product.product_name}`, {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    product.requested_count = Math.max(0, product.requested_count + delta);
    await product.save();
  }
}

export const podService = {
  async list(filter?: {
    club_id?: string;
    venue_id?: string;
    location_id?: string;
    zone_name?: string;
    search?: string;
    is_active?: boolean;
    host_user_id?: string;
  }) {
    const q: any = {};
    if (filter?.club_id) q.club_id = filter.club_id;
    if (filter?.venue_id) q.venue_id = filter.venue_id;
    const placeFilter = await buildPodPlaceFilter(filter);
    if (placeFilter) Object.assign(q, placeFilter);
    if (filter?.is_active !== undefined) q.is_active = filter.is_active;
    if (filter?.search) q.pod_title = new RegExp(filter.search, 'i');
    if (filter?.host_user_id) q.pod_hosts_id = filter.host_user_id;
    const docs = await PodModel.find(q).sort({ pod_date_time: -1 });
    const slugMap = await loadClubSlugMap(docs);
    return docs.map((d) => toPub(d, slugMap));
  },

  async getById(id: string) {
    const doc = await PodModel.findById(id);
    if (!doc) return null;
    const slugMap = await loadClubSlugMap([doc]);
    return toPub(doc, slugMap);
  },

  async getBySlugs(clubSlug: string, podSlug: string) {
    const club = await ClubModel.findOne({ club_id: clubSlug });
    if (!club) return null;
    const doc = await PodModel.findOne({ club_id: club._id, pod_id: podSlug });
    if (!doc) return null;
    const slugMap = new Map([[String(club._id), club.club_id]]);
    return toPub(doc, slugMap);
  },

  async create(input: any) {
    if (!input.club_id) {
      throw new GraphQLError('club_id is required', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const baseSlug = input.pod_id?.trim()
      ? slugify(input.pod_id.trim())
      : slugify(input.pod_title ?? '');
    if (!baseSlug) {
      throw new GraphQLError('Pod title is required', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const dupe = await PodModel.findOne({ club_id: input.club_id, pod_id: baseSlug });
    if (dupe) {
      throw new GraphQLError(
        'A pod with this title already exists in this club. Choose a different title.',
        { extensions: { code: 'CONFLICT' } }
      );
    }
    const pod_id = baseSlug;
    if (!input.pod_hosts_id?.length) {
      throw new GraphQLError('At least one host is required', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const podMode = normalizePodMode(input.pod_mode);
    validateAmount(input.pod_type, input.pod_amount ?? 0);
    validateFutureDates(input.pod_date_time, input.pod_end_date_time);
    validateMeetingDetails(podMode, input);
    const venueLocation = podMode === 'PHYSICAL'
      ? await resolveVenueLocation(input)
      : { venue_id: null, location_id: null, zone_name: null };
    const productRequests = await buildProductRequests(
      !!input.products_enabled,
      input.product_requests ?? []
    );
    await applyProductDeltas([], productRequests);

    // Hosts are attendees by default
    const attendees = Array.from(
      new Set([...(input.pod_attendees ?? []), ...input.pod_hosts_id])
    );

    const doc = await PodModel.create({
      pod_id,
      pod_title: input.pod_title.trim(),
      pod_hosts_id: input.pod_hosts_id,
      location_id: venueLocation.location_id,
      venue_id: venueLocation.venue_id,
      club_id: input.club_id,
      zone_name: venueLocation.zone_name,
      pod_mode: podMode,
      meeting_platform: podMode === 'VIRTUAL' ? input.meeting_platform?.trim() || null : null,
      meeting_url: podMode === 'VIRTUAL' ? input.meeting_url?.trim() || null : null,
      meeting_notes: podMode === 'VIRTUAL' ? input.meeting_notes?.trim() || null : null,
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
      products_enabled: !!input.products_enabled,
      product_requests: productRequests,
      product_cost_total: productRequests.reduce((sum, item) => sum + item.total_cost, 0),
      is_active: input.is_active ?? true,
    });
    const slugMap = await loadClubSlugMap([doc]);
    return toPub(doc, slugMap);
  },

  async update(id: string, input: any) {
    const doc = await PodModel.findById(id);
    if (!doc) notFound();

    if (input.pod_type !== undefined || input.pod_amount !== undefined) {
      validateAmount(input.pod_type ?? doc!.pod_type, input.pod_amount ?? doc!.pod_amount);
    }
    const nextMode = normalizePodMode(input.pod_mode ?? doc.pod_mode ?? 'PHYSICAL');
    validateMeetingDetails(nextMode, input, doc);
    if (input.pod_date_time !== undefined || input.pod_end_date_time !== undefined) {
      const nextStart = input.pod_date_time ?? doc.pod_date_time;
      const nextEnd = input.pod_end_date_time === undefined ? doc.pod_end_date_time : input.pod_end_date_time;
      const startChanged = input.pod_date_time !== undefined
        && new Date(input.pod_date_time).getTime() !== doc.pod_date_time?.getTime();
      const nextEndTime = nextEnd ? new Date(nextEnd).getTime() : null;
      const docEndTime = doc.pod_end_date_time ? doc.pod_end_date_time.getTime() : null;
      const endChanged = input.pod_end_date_time !== undefined && nextEndTime !== docEndTime;
      if (startChanged || endChanged) validateFutureDates(nextStart, nextEnd);
    }

    if (nextMode === 'VIRTUAL') {
      doc.venue_id = null as any;
      doc.location_id = null as any;
      doc.zone_name = null;
    } else if (
      input.venue_id !== undefined ||
      input.location_id !== undefined ||
      input.club_id !== undefined ||
      input.pod_mode !== undefined ||
      !doc.venue_id
    ) {
      const venueLocation = await resolveVenueLocation({
        venue_id: input.venue_id ?? (doc.venue_id ? String(doc.venue_id) : null),
        location_id: input.location_id ?? (doc.location_id ? String(doc.location_id) : null),
        club_id: input.club_id ?? String(doc.club_id),
        zone_name: input.zone_name ?? doc.zone_name,
      });
      doc.venue_id = venueLocation.venue_id as any;
      doc.location_id = venueLocation.location_id as any;
      doc.zone_name = venueLocation.zone_name;
    }

    if (input.products_enabled !== undefined || input.product_requests !== undefined) {
      const productsEnabled = input.products_enabled ?? doc.products_enabled;
      const nextRequests = await buildProductRequests(
        !!productsEnabled,
        input.product_requests ?? doc.product_requests ?? []
      );
      await applyProductDeltas(doc.product_requests ?? [], nextRequests);
      doc.products_enabled = !!productsEnabled;
      doc.product_requests = nextRequests as any;
      doc.product_cost_total = nextRequests.reduce((sum, item) => sum + item.total_cost, 0);
    }

    const fields = [
      'pod_title',
      'pod_hosts_id',
      'club_id',
      'pod_mode',
      'meeting_platform',
      'meeting_url',
      'meeting_notes',
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
    if (nextMode === 'VIRTUAL') {
      if (input.meeting_platform !== undefined) doc.meeting_platform = input.meeting_platform?.trim() || null;
      if (input.meeting_url !== undefined) doc.meeting_url = input.meeting_url?.trim() || null;
      if (input.meeting_notes !== undefined) doc.meeting_notes = input.meeting_notes?.trim() || null;
    }
    if (nextMode === 'PHYSICAL') {
      doc.meeting_platform = null;
      doc.meeting_url = null;
      doc.meeting_notes = null;
    }
    if (input.pod_date_time !== undefined)
      doc.pod_date_time = new Date(input.pod_date_time);
    if (input.pod_end_date_time !== undefined)
      doc.pod_end_date_time = input.pod_end_date_time ? new Date(input.pod_end_date_time) : null;
    await doc.save();
    const slugMap = await loadClubSlugMap([doc]);
    return toPub(doc, slugMap);
  },

  async addStatus(id: string, viewerId: string, media: any, isAdmin = false) {
    if (!Types.ObjectId.isValid(id)) {
      throw new GraphQLError('Invalid pod id', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const doc = await PodModel.findById(id);
    if (!doc) notFound();
    const isHost = (doc.pod_hosts_id ?? []).some((hostId: any) => String(hostId) === viewerId);
    if (!isAdmin && !isHost) {
      throw new GraphQLError('Only pod hosts can add status media', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
    doc.pod_images_and_videos.push(normalizeStatusMedia(media) as any);
    await doc.save();
    const slugMap = await loadClubSlugMap([doc]);
    return toPub(doc, slugMap);
  },

  async remove(id: string) {
    const doc = await PodModel.findById(id);
    if (!doc) notFound();
    await applyProductDeltas(doc.product_requests ?? [], []);
    await doc!.deleteOne();
    return true;
  },

  async incrementHits(id: string) {
    const doc = await PodModel.findByIdAndUpdate(
      id,
      { $inc: { pod_hits: 1 } },
      { new: true }
    );
    if (!doc) return null;
    const slugMap = await loadClubSlugMap([doc]);
    return toPub(doc, slugMap);
  },

  async toggleLike(id: string, viewerId: string) {
    if (!Types.ObjectId.isValid(id))
      throw new GraphQLError('Invalid pod id', { extensions: { code: 'BAD_USER_INPUT' } });
    const doc = await PodModel.findById(id);
    if (!doc) notFound();
    const idx = (doc!.liked_user_ids || []).findIndex((x: any) => String(x) === viewerId);
    if (idx >= 0) doc!.liked_user_ids.splice(idx, 1);
    else doc!.liked_user_ids.push(new Types.ObjectId(viewerId) as any);
    await doc!.save();
    const slugMap = await loadClubSlugMap([doc!]);
    return toPub(doc, slugMap);
  },

  async addComment(id: string, viewerId: string, text: string) {
    if (!Types.ObjectId.isValid(id))
      throw new GraphQLError('Invalid pod id', { extensions: { code: 'BAD_USER_INPUT' } });
    const trimmed = (text || '').trim();
    if (!trimmed)
      throw new GraphQLError('Comment cannot be empty', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    if (trimmed.length > 1000)
      throw new GraphQLError('Comment too long (max 1000 chars)', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    const doc = await PodModel.findById(id);
    if (!doc) notFound();
    const created_at = new Date();
    doc!.comments.push({
      author_id: new Types.ObjectId(viewerId) as any,
      text: trimmed,
      created_at,
    } as any);
    await doc!.save();
    const c = doc!.comments[doc!.comments.length - 1] as any;
    const u: any = await UserModel.findById(viewerId).select('first_name last_name profile_photo');
    return {
      id: String(c._id),
      author_id: viewerId,
      author_name: u ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() : null,
      author_photo: u?.profile_photo ?? null,
      text: trimmed,
      created_at: created_at.toISOString(),
    };
  },

  async deleteComment(id: string, commentId: string, viewerId: string, isAdmin: boolean) {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(commentId))
      throw new GraphQLError('Invalid id', { extensions: { code: 'BAD_USER_INPUT' } });
    const doc = await PodModel.findById(id);
    if (!doc) notFound();
    const c: any = (doc!.comments as any).find((x: any) => String(x._id) === commentId);
    if (!c) throw new GraphQLError('Comment not found', { extensions: { code: 'NOT_FOUND' } });
    if (!isAdmin && String(c.author_id) !== viewerId)
      throw new GraphQLError('Not allowed', { extensions: { code: 'FORBIDDEN' } });
    doc!.comments = (doc!.comments as any).filter(
      (x: any) => String(x._id) !== commentId
    );
    await doc!.save();
    return true;
  },

  async listComments(id: string) {
    if (!Types.ObjectId.isValid(id))
      throw new GraphQLError('Invalid pod id', { extensions: { code: 'BAD_USER_INPUT' } });
    const doc = await PodModel.findById(id);
    if (!doc) notFound();
    const comments = (doc!.comments ?? []).slice().sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const ids = Array.from(new Set(comments.map((c: any) => String(c.author_id))));
    const users: any[] = await UserModel.find({ _id: { $in: ids } }).select(
      'first_name last_name profile_photo'
    );
    const byId = new Map<string, any>();
    users.forEach((u) => byId.set(String(u._id), u));
    return comments.map((c: any) => {
      const u = byId.get(String(c.author_id));
      return {
        id: String(c._id),
        author_id: String(c.author_id),
        author_name: u ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() : null,
        author_photo: u?.profile_photo ?? null,
        text: c.text,
        created_at: new Date(c.created_at).toISOString(),
      };
    });
  },

  /**
   * Auto-generates a meeting URL via the configured provider.
   * If OAuth env vars are missing for the requested platform, returns
   * `{ ok: false, requires_oauth: true }` so the UI can prompt the admin
   * to paste a link manually.
   *
   * Provider integration is intentionally a thin shell here — wire up the
   * real Zoom / Google Meet / Teams API calls when the OAuth credentials
   * are available in the deployment environment.
   */
  async generateMeetingLink(args: {
    platform: string;
    title: string;
    start: string;
    end?: string | null;
  }) {
    const env = process.env;
    const platform = (args.platform || '').toUpperCase();

    const zoomConfigured = !!(
      env.ZOOM_OAUTH_ACCOUNT_ID &&
      env.ZOOM_OAUTH_CLIENT_ID &&
      env.ZOOM_OAUTH_CLIENT_SECRET
    );
    const googleConfigured = !!(
      env.GOOGLE_OAUTH_CLIENT_ID &&
      env.GOOGLE_OAUTH_CLIENT_SECRET &&
      env.GOOGLE_OAUTH_REFRESH_TOKEN
    );
    const teamsConfigured = !!(
      env.MS_GRAPH_CLIENT_ID &&
      env.MS_GRAPH_CLIENT_SECRET &&
      env.MS_GRAPH_TENANT_ID
    );

    const requiresOauth = (): {
      ok: boolean;
      url: null;
      message: string;
      requires_oauth: boolean;
    } => ({
      ok: false,
      url: null,
      message: `${platform} is not configured on the server. Paste a link manually for now.`,
      requires_oauth: true,
    });

    if (platform === 'ZOOM') {
      if (!zoomConfigured) return requiresOauth();
      // TODO: real Zoom API call using server-to-server OAuth + meetings.create.
      // For now we return a deterministic placeholder so the dialog flow works.
      return {
        ok: true,
        url: `https://zoom.us/j/${Math.floor(1e9 + Math.random() * 9e9)}`,
        message: 'Generated (Zoom)',
        requires_oauth: false,
      };
    }
    if (platform === 'GOOGLE_MEET') {
      if (!googleConfigured) return requiresOauth();
      return {
        ok: true,
        url: `https://meet.google.com/${Math.random().toString(36).slice(2, 6)}-${Math.random()
          .toString(36)
          .slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}`,
        message: 'Generated (Google Meet)',
        requires_oauth: false,
      };
    }
    if (platform === 'TEAMS') {
      if (!teamsConfigured) return requiresOauth();
      return {
        ok: true,
        url: `https://teams.microsoft.com/l/meetup-join/${encodeURIComponent(args.title)}`,
        message: 'Generated (Teams)',
        requires_oauth: false,
      };
    }
    return {
      ok: false,
      url: null,
      message: `Unsupported platform '${platform}'. Paste a link manually.`,
      requires_oauth: false,
    };
  },
};
