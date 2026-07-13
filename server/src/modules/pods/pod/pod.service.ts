import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PodModel, type PodMode, type PodType } from './pod.model';
import { UserModel } from '@modules/access/user/user.model';
import { UserRoleModel } from '@modules/access/user/relations';
import { ClubModel } from '@modules/pods/club/club.model';
import { HostModel } from '@modules/venues/host/host.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { LocationModel } from '@modules/platform/location/location.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { venueService } from '@modules/venues/venue/venue.service';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { venueSlotService } from '@modules/venues/venueSlot/venueSlot.service';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import {
  sendPodCancelledEmail,
  sendPodRefundEmail,
  sendPodUpdatedEmail,
  sendVenueSlotRequestEmail,
} from '@services/email/email.service';
import { getUrlConfigs } from '@config/url-configs';
import { moderationService } from '@modules/moderation/moderation.service';

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
    pod_hosts_id: (d.pod_hosts_id ?? []).map(String),
    location_id: d.location_id ? String(d.location_id) : null,
    venue_id: d.venue_id ? String(d.venue_id) : null,
    venue_slot_id: d.venue_slot_id ? String(d.venue_slot_id) : null,
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
    pod_attendees: (d.pod_attendees ?? []).map(String),
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
      image_url: item.image_url ?? '',
      images: Array.isArray(item.images) ? item.images : [],
      unit_cost: item.unit_cost ?? 0,
      quantity: item.quantity ?? 0,
      available_count: item.quantity ?? 0,
      total_cost: item.total_cost ?? 0,
    })),
    product_cost_total: d.product_cost_total ?? 0,
    is_active: !!d.is_active,
    is_deleted: !!d.deleted_at,
    deleted_at: d.deleted_at?.toISOString?.() ?? null,
    venue_approval_status: d.venue_approval_status ?? 'NONE',
    liked_user_ids: (d.liked_user_ids ?? []).map(String),
    like_count: (d.liked_user_ids ?? []).length,
    comment_count: (d.comments ?? []).length,
    completed_at: d.completed_at?.toISOString?.() ?? null,
    created_at: d.created_at?.toISOString?.() ?? '',
    updated_at: d.updated_at?.toISOString?.() ?? '',
  };
};

/** Shared helpers so co-located features (e.g. search) can return pods in the
 * same public shape the `Pod` field resolvers expect. */
export const mapPodToPublic = (doc: any, clubSlugById?: Map<string, string>) =>
  toPub(doc, clubSlugById);
export const loadPodClubSlugMap = (podDocs: any[]) => loadClubSlugMap(podDocs);

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
  const meetingUrl = input.meeting_url === undefined ? current?.meeting_url : input.meeting_url;
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

/** Every pod must carry at least one IMAGE in its media gallery. */
function validateHasImage(media: any[] | null | undefined) {
  const hasImage = (media ?? []).some((m: any) => (m?.type ?? 'IMAGE') === 'IMAGE' && m?.url);
  if (!hasImage) {
    throw new GraphQLError('At least one pod image is required', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
}

/** Subjects offered in the host's delete-pod reason dropdown (kept in sync with the apps). */
export const POD_DELETE_REASON_SUBJECTS = [
  'Event cancelled',
  'Venue unavailable',
  'Low attendance',
  'Rescheduling',
  'Other',
] as const;

const POD_DELETE_REASON_SET = new Set<string>(POD_DELETE_REASON_SUBJECTS);

function buildDeleteReason(subject: string, note?: string | null): string {
  const cleanSubject = (subject ?? '').trim();
  const cleanNote = (note ?? '').trim();
  if (!POD_DELETE_REASON_SET.has(cleanSubject)) {
    throw new GraphQLError('Select a valid delete reason', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  if (cleanSubject === 'Other' && !cleanNote) {
    throw new GraphQLError('Please describe the reason', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  return cleanNote ? `${cleanSubject} — ${cleanNote}` : cleanSubject;
}

/** Loads a pod and asserts the viewer is one of its hosts. */
async function findHostedPod(id: string, userId: string) {
  if (!Types.ObjectId.isValid(id)) {
    throw new GraphQLError('Invalid pod id', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const doc = await PodModel.findById(id);
  if (!doc) notFound();
  const isHost = (doc!.pod_hosts_id ?? []).some((hostId: any) => String(hostId) === userId);
  if (!isHost) {
    throw new GraphQLError('Only the pod host can manage this pod', {
      extensions: { code: 'FORBIDDEN' },
    });
  }
  return doc!;
}

const podWhenLabel = (doc: any) =>
  doc.pod_date_time
    ? new Date(doc.pod_date_time).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : '—';

/** Attendee users (excluding the acting host) with an email on file. */
async function podAudience(doc: any, excludeUserId: string) {
  const ids = (doc.pod_attendees ?? [])
    .map(String)
    .filter((id: string) => id !== excludeUserId);
  if (ids.length === 0) return [];
  const users = await UserModel.find({ _id: { $in: ids } })
    .select('profile.first_name profile.last_name auth.email')
    .lean();
  return users
    .map((u: any) => ({
      user_id: String(u._id),
      email: u.auth?.email ?? '',
      name: `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim() || 'there',
    }))
    .filter((u: { email: string }) => !!u.email);
}

/** Best-effort in-app note to the venue owner: a host requested one of their
 * slots and it's waiting in the partner portal's Slot Requests inbox. */
async function notifyVenueSlotRequested(pod: any, slot: any) {
  try {
    const { notificationService } = await import(
      '@modules/engagement/notification/notification.service'
    );
    const when = new Date(slot.start_at).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    await notificationService.create({
      title: 'New slot booking request',
      body: `"${pod.pod_title}" requested your venue slot on ${when}. Review it in the Partners portal.`,
      scope: 'USER',
      target_user_ids: [String(slot.owner_user_id)],
      silent: false,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[pod] slot request notification failed:', err);
  }
}

/** Best-effort email to the venue owner mirroring the in-app slot-request note,
 * so the venue is alerted off-platform too and can approve/decline it in the
 * Partners portal. Recipient is the venue's contact email (owner account email
 * as a fallback). */
async function emailVenueSlotRequested(pod: any, slot: any) {
  try {
    const venue = await VenueModel.findById(slot.venue_id).select(
      'venue_name owner_email owner_name owner_user_id'
    );
    if (!venue) return;
    const owner = await UserModel.findById(venue.owner_user_id)
      .select('profile.first_name profile.last_name auth.email')
      .lean();
    const to = (venue.owner_email || (owner as any)?.auth?.email || '').trim();
    if (!to) return;
    const ownerName =
      (venue.owner_name ?? '').trim() ||
      `${(owner as any)?.profile?.first_name ?? ''} ${(owner as any)?.profile?.last_name ?? ''}`.trim() ||
      'there';
    const host = await UserModel.findById((pod.pod_hosts_id ?? [])[0])
      .select('profile.first_name profile.last_name')
      .lean();
    const hostName =
      `${(host as any)?.profile?.first_name ?? ''} ${(host as any)?.profile?.last_name ?? ''}`.trim() ||
      'A host';
    const when = new Date(slot.start_at).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    const { partnersUrl } = await getUrlConfigs();
    await sendVenueSlotRequestEmail({
      to,
      owner_name: ownerName,
      venue_name: venue.venue_name || 'your venue',
      pod_title: pod.pod_title,
      host_name: hostName,
      when,
      review_url: `${partnersUrl.replace(/\/+$/, '')}/venues/requests`,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[pod] slot request email failed:', err);
  }
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

const requestMap = (items: any[] = []) => {
  const map = new Map<string, number>();
  for (const item of items) {
    const productId = String(item.product_id);
    map.set(productId, (map.get(productId) ?? 0) + (Number(item.quantity) || 0));
  }
  return map;
};

// Slot bookings go to any venue partner's availability calendar, so the
// club↔venue match only constrains the manual (no-slot) path. Venues now
// auto-match a club by location + category (single source of truth in
// venueService); a club with no location yet imposes no constraint.
async function assertVenueAllowedForClub(input: any, venue: any) {
  const club = !input.venue_slot_id && input.club_id ? await ClubModel.findById(input.club_id) : null;
  if (!club?.location_id) return;
  const matched = await venueService.findMatchingForClub({
    location_id: String(club.location_id),
    locality: club.locality ?? null,
    super_category_id: club.super_category_id ? String(club.super_category_id) : null,
    category_id: club.category_id ? String(club.category_id) : null,
  });
  if (!matched.some((v: { id: string }) => String(v.id) === String(venue._id))) {
    throw new GraphQLError('Selected venue is not available for this club', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
}

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
  await assertVenueAllowedForClub(input, venue);
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

/** The `$or` branches that match a venue against one location (optionally
 * narrowed to a single zone: its locality or pincode). */
function locationVenueOr(location: any, zone?: string): any[] {
  const city = location.city || location.location_name;
  const locationFields: any = {};
  if (city) locationFields.city = new RegExp(`^${escapeRegex(city)}$`, 'i');
  if (location.state) locationFields.state = new RegExp(`^${escapeRegex(location.state)}$`, 'i');
  if (location.country_code) locationFields.country_code = location.country_code;
  const hasLocationFields = Object.keys(locationFields).length > 0;

  if (zone) {
    const matchingZone = (location.location_zones ?? []).find((item: any) => item.zone_name === zone);
    const locality = new RegExp(`^${escapeRegex(zone)}$`, 'i');
    const zoned: any[] = [{ location_id: location._id, locality }];
    if (matchingZone?.pincode) zoned.push({ location_id: location._id, postal_code: matchingZone.pincode });
    if (hasLocationFields) {
      zoned.push({ ...locationFields, locality });
      if (matchingZone?.pincode) zoned.push({ ...locationFields, postal_code: matchingZone.pincode });
    }
    return zoned;
  }

  const all: any[] = [{ location_id: location._id }];
  if (hasLocationFields) all.push(locationFields);
  return all;
}

async function venueIdsForLocationFilter(locationId?: string, zoneName?: string) {
  const or: any[] = [];
  const zone = zoneName?.trim();
  if (locationId) {
    const location = await LocationModel.findById(locationId).lean();
    if (!location) return [];
    or.push(...locationVenueOr(location, zone));
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

function buildPodDateRange(range?: { from?: string | null; to?: string | null }) {
  const dateRange: any = {};
  if (range?.from) {
    const from = new Date(range.from);
    if (Number.isNaN(from.getTime())) throw new GraphQLError('Invalid from date', { extensions: { code: 'BAD_USER_INPUT' } });
    dateRange.$gte = from;
  }
  if (range?.to) {
    const to = new Date(range.to);
    if (Number.isNaN(to.getTime())) throw new GraphQLError('Invalid to date', { extensions: { code: 'BAD_USER_INPUT' } });
    dateRange.$lte = to;
  }
  return Object.keys(dateRange).length > 0 ? dateRange : null;
}

async function buildProductRequests(enabled: boolean, rawItems: any[] = []) {
  if (!enabled) return [];
  const compact = Array.from(requestMap(rawItems).entries())
    .map(([productId, quantity]) => ({ productId, quantity }))
    .filter((item) => item.quantity > 0);
  const next = [];
  for (const item of compact) {
    const product = await InventoryProductModel.findById(item.productId);
    if (!product?.is_active) {
      throw new GraphQLError('Selected product is not available', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    next.push({
      product_id: product._id,
      product_name: product.product_name,
      image_url: product.image_url ?? '',
      images: Array.isArray(product.images) ? product.images : [],
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

/** Slot bookings may target ANY approved venue partner (the venue approves the
 * request before the pod goes live); the manual no-slot path is still restricted
 * to the host's own approved venues. */
async function assertPartnerVenue(input: any, userObjectId: Types.ObjectId) {
  const venueMatch = input.venue_slot_id
    ? { _id: input.venue_id, status: 'APPROVED', is_active: true }
    : { _id: input.venue_id, owner_user_id: userObjectId, status: 'APPROVED', is_active: true };
  const venue = input.venue_id
    ? await VenueModel.findOne(venueMatch).select('_id')
    : null;
  if (!venue) {
    throw new GraphQLError(
      input.venue_slot_id ? 'Select an approved venue' : 'Select one of your approved venues',
      { extensions: { code: 'BAD_USER_INPUT' } }
    );
  }
}

/** The new pod's slug: an explicit `pod_id` wins over the title, and it must be
 * unique inside its club. */
async function resolvePodSlugForCreate(input: any): Promise<string> {
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
  return baseSlug;
}

/** A picked slot is the source of truth for the pod's window — overwrite
 * the incoming date/time so a stale or hand-edited form value can't break
 * the booking contract. The slot itself is booked atomically *after* the
 * pod row is created (see `bookOrHoldSlotForPod`) so we never orphan a slot. */
async function resolveSlotForCreate(
  input: any,
  podMode: PodMode
): Promise<{ slotDoc: any; needsVenueApproval: boolean }> {
  if (!(podMode === 'PHYSICAL' && input.venue_slot_id)) {
    return { slotDoc: null, needsVenueApproval: false };
  }
  const slotDoc = await VenueSlotModel.findById(input.venue_slot_id);
  if (!slotDoc) {
    throw new GraphQLError('Selected slot not found', { extensions: { code: 'NOT_FOUND' } });
  }
  if (slotDoc.status !== 'AVAILABLE') {
    throw new GraphQLError('Selected slot is no longer available', {
      extensions: { code: 'CONFLICT' },
    });
  }
  if (input.venue_id && String(slotDoc.venue_id) !== String(input.venue_id)) {
    throw new GraphQLError('Slot does not belong to the selected venue', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  const slotVenue = await VenueModel.findById(slotDoc.venue_id).select('settings.holidays owner_user_id');
  const holidays = new Set(slotVenue?.settings?.holidays ?? []);
  const { venueLocalYmd } = await import('@modules/venues/autoExtend/slotGenerator');
  if (holidays.has(venueLocalYmd(slotDoc.start_at))) {
    throw new GraphQLError('The venue is on leave on this date. Pick another slot.', {
      extensions: { code: 'CONFLICT' },
    });
  }
  // Booking another partner's venue holds the slot until that venue
  // approves; booking your own venue confirms instantly.
  const needsVenueApproval = !(input.pod_hosts_id ?? [])
    .map(String)
    .includes(String(slotDoc.owner_user_id));
  input.venue_id = String(slotDoc.venue_id);
  input.pod_date_time = slotDoc.start_at.toISOString();
  input.pod_end_date_time = slotDoc.end_at.toISOString();
  return { slotDoc, needsVenueApproval };
}

/** Meeting details are persisted for virtual pods only. */
function meetingFieldsForCreate(
  podMode: PodMode,
  input: any
): { platform: any; url: any; notes: any } {
  if (podMode !== 'VIRTUAL') return { platform: null, url: null, notes: null };
  return {
    platform: input.meeting_platform?.trim() || null,
    url: input.meeting_url?.trim() || null,
    notes: input.meeting_notes?.trim() || null,
  };
}

/** Atomic book/hold — if a concurrent request snatched the slot between our
 * status check and now, this throws CONFLICT and we roll the pod back so
 * the caller can retry with a different slot. */
async function bookOrHoldSlotForPod(doc: any, slotDoc: any, needsVenueApproval: boolean) {
  if (!slotDoc) return;
  try {
    if (needsVenueApproval) {
      await venueSlotService.holdForPod(String(slotDoc._id), String(slotDoc.venue_id), String(doc._id));
      await notifyVenueSlotRequested(doc, slotDoc);
      await emailVenueSlotRequested(doc, slotDoc);
    } else {
      await venueSlotService.bookForPod(String(slotDoc._id), String(slotDoc.venue_id), String(doc._id));
    }
  } catch (e) {
    await doc.deleteOne();
    throw e;
  }
}

/** An edit only re-checks the pod window when the incoming start/end actually
 * differ from what is stored, so re-saving an untouched date still works. */
function validatePodDatesForUpdate(input: any, doc: any) {
  if (input.pod_date_time === undefined && input.pod_end_date_time === undefined) return;
  const nextStart = input.pod_date_time ?? doc.pod_date_time;
  const nextEnd = input.pod_end_date_time === undefined ? doc.pod_end_date_time : input.pod_end_date_time;
  const startChanged = input.pod_date_time !== undefined
    && new Date(input.pod_date_time).getTime() !== doc.pod_date_time?.getTime();
  const nextEndTime = nextEnd ? new Date(nextEnd).getTime() : null;
  const docEndTime = doc.pod_end_date_time ? doc.pod_end_date_time.getTime() : null;
  const endChanged = input.pod_end_date_time !== undefined && nextEndTime !== docEndTime;
  if (startChanged || endChanged) validateFutureDates(nextStart, nextEnd);
}

/** A virtual pod carries no place; a physical one re-resolves its venue/location
 * whenever a place input (or the mode) moves, or it has no venue yet. */
async function applyPlaceForUpdate(doc: any, input: any, nextMode: PodMode) {
  if (nextMode === 'VIRTUAL') {
    doc.venue_id = null as any;
    doc.location_id = null as any;
    doc.zone_name = null;
    return;
  }
  if (
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
    doc.venue_id = venueLocation.venue_id;
    doc.location_id = venueLocation.location_id;
    doc.zone_name = venueLocation.zone_name;
  }
}

/** Re-prices the pod's product requests and moves the reserved inventory counts. */
async function applyProductsForUpdate(doc: any, input: any) {
  if (input.products_enabled === undefined && input.product_requests === undefined) return;
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

/** Meeting details are normalized on a virtual pod and cleared on a physical one. */
function applyMeetingFieldsForUpdate(doc: any, input: any, nextMode: PodMode) {
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
}

function applyDatesForUpdate(doc: any, input: any) {
  if (input.pod_date_time !== undefined) {
    doc.pod_date_time = new Date(input.pod_date_time);
  }
  if (input.pod_end_date_time !== undefined) {
    doc.pod_end_date_time = input.pod_end_date_time ? new Date(input.pod_end_date_time) : null;
  }
}

export const podService = {
  async list(
    filter?: {
      club_id?: string;
      venue_id?: string;
      location_id?: string;
      zone_name?: string;
      search?: string;
      is_active?: boolean;
      host_user_id?: string;
    },
    opts?: { includePendingApproval?: boolean }
  ) {
    const q: any = {};
    if (filter?.club_id) q.club_id = filter.club_id;
    if (filter?.venue_id) q.venue_id = filter.venue_id;
    const placeFilter = await buildPodPlaceFilter(filter);
    if (placeFilter) Object.assign(q, placeFilter);
    if (filter?.is_active !== undefined) q.is_active = filter.is_active;
    if (filter?.search) q.pod_title = new RegExp(filter.search, 'i');
    if (filter?.host_user_id) q.pod_hosts_id = filter.host_user_id;
    // A pod awaiting the venue owner's slot approval is NOT live. Hide it from
    // every non-review caller so it can never surface in discovery (or via an
    // unfiltered public read) until the owner approves — a server guarantee, not
    // just a client `is_active` filter. Admin/onboarding reviewers opt in.
    if (!opts?.includePendingApproval) q.venue_approval_status = { $ne: 'PENDING' };
    const docs = await PodModel.find(q).sort({ pod_date_time: -1 });
    const slugMap = await loadClubSlugMap(docs);
    return docs.map((d) => toPub(d, slugMap));
  },

  async activeLocationIds(): Promise<string[]> {
    // Locations that currently host at least one live pod (active and not past).
    const ids = await PodModel.distinct('location_id', {
      is_active: true,
      location_id: { $ne: null },
      pod_date_time: { $gte: new Date() },
    });
    return ids.map(String);
  },

  async listMyHostPods(userId: string, range?: { from?: string | null; to?: string | null }) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
    }
    const q: any = { pod_hosts_id: new Types.ObjectId(userId) };
    const dateRange = buildPodDateRange(range);
    if (dateRange) q.pod_date_time = dateRange;
    const docs = await PodModel.find(q).sort({ pod_date_time: -1 }).limit(200);
    const slugMap = await loadClubSlugMap(docs);
    return docs.map((d) => toPub(d, slugMap));
  },

  async getById(id: string, opts?: { includeDeleted?: boolean }) {
    // Pod History resolves a booking's pod even after it was soft-deleted; every
    // other caller gets the default (deleted pods excluded by the schema hook).
    const query = PodModel.findById(id);
    if (opts?.includeDeleted) query.setOptions({ includeDeleted: true });
    const doc = await query;
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
    const pod_id = await resolvePodSlugForCreate(input);
    if (!input.pod_hosts_id?.length) {
      throw new GraphQLError('At least one host is required', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    validateHasImage(input.pod_images_and_videos);
    const podMode = normalizePodMode(input.pod_mode);
    validateAmount(input.pod_type, input.pod_amount ?? 0);

    const { slotDoc, needsVenueApproval } = await resolveSlotForCreate(input, podMode);

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
    const meeting = meetingFieldsForCreate(podMode, input);

    const doc = await PodModel.create({
      pod_id,
      pod_title: input.pod_title.trim(),
      pod_hosts_id: input.pod_hosts_id,
      location_id: venueLocation.location_id,
      venue_id: venueLocation.venue_id,
      venue_slot_id: slotDoc ? slotDoc._id : null,
      club_id: input.club_id,
      zone_name: venueLocation.zone_name,
      pod_mode: podMode,
      meeting_platform: meeting.platform,
      meeting_url: meeting.url,
      meeting_notes: meeting.notes,
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
      // A pod awaiting the venue's slot approval stays offline until approved.
      is_active: needsVenueApproval ? false : input.is_active ?? true,
      venue_approval_status: needsVenueApproval ? 'PENDING' : 'NONE',
    });

    await bookOrHoldSlotForPod(doc, slotDoc, needsVenueApproval);

    const slugMap = await loadClubSlugMap([doc]);
    return toPub(doc, slugMap);
  },

  async createForPartner(userId: string, input: any) {
    const userObjectId = new Types.ObjectId(userId);
    // Host capability follows the HOST role — granted by the admin role toggle
    // AND automatically on host-application approval. An approved host profile is
    // accepted as a fallback so legacy approved hosts (without the cached role)
    // keep working.
    // A deactivated host may not create pods even if they still hold the cached
    // HOST role. Role-only hosts (no Host doc) are unaffected.
    const hostDoc = await HostModel.findOne({ user_id: userObjectId }).select('status is_active');
    if (hostDoc?.is_active === false) {
      throw new GraphQLError('Your host account has been deactivated', { extensions: { code: 'FORBIDDEN' } });
    }
    const hasHostRole = await UserRoleModel.exists({ user_id: userObjectId, role: 'HOST' });
    const approvedHost = !hasHostRole && hostDoc?.status === 'APPROVED';
    if (!hasHostRole && !approvedHost) {
      throw new GraphQLError('Host access is required before creating pods', { extensions: { code: 'FORBIDDEN' } });
    }
    // Deterministic content guard so a crafted client can't bypass the client-side
    // AI preflight and publish a pod with a phone/email/link/payment handle etc.
    moderationService.assertCleanOrThrow({
      pod_title: input.pod_title ?? '',
      pod_description: input.pod_description ?? '',
      pod_info: input.pod_info ?? '',
      pod_hashtag: input.pod_hashtag ?? [],
    });
    const podMode = normalizePodMode(input.pod_mode);
    if (podMode === 'PHYSICAL') {
      await assertPartnerVenue(input, userObjectId);
    }
    return this.create({ ...input, pod_mode: podMode, pod_hosts_id: [userId], pod_attendees: [userId] });
  },

  async update(id: string, input: any) {
    const doc = await PodModel.findById(id);
    if (!doc) notFound();

    if (input.pod_type !== undefined || input.pod_amount !== undefined) {
      validateAmount(input.pod_type ?? doc!.pod_type, input.pod_amount ?? doc!.pod_amount);
    }
    const nextMode = normalizePodMode(input.pod_mode ?? doc.pod_mode ?? 'PHYSICAL');
    validateMeetingDetails(nextMode, input, doc);
    validatePodDatesForUpdate(input, doc);

    await applyPlaceForUpdate(doc, input, nextMode);

    await applyProductsForUpdate(doc, input);

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
    applyMeetingFieldsForUpdate(doc, input, nextMode);
    applyDatesForUpdate(doc, input);
    await doc.save();
    const slugMap = await loadClubSlugMap([doc]);
    return toPub(doc, slugMap);
  },

  /** Host self-service edit — only title, description and media (2A). */
  async hostUpdate(id: string, userId: string, input: any) {
    const doc = await findHostedPod(id, userId);
    const title = (input.pod_title ?? '').trim();
    if (title.length < 3) {
      throw new GraphQLError('Title is too short', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const description = (input.pod_description ?? '').trim();
    if (!description) {
      throw new GraphQLError('Description is required', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    validateHasImage(input.pod_images_and_videos);
    doc.pod_title = title;
    doc.pod_description = description;
    doc.pod_images_and_videos = (input.pod_images_and_videos ?? []).map((m: any) => ({
      url: m.url,
      type: m.type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
    }));
    await doc.save();

    // Best-effort: tell every attendee the pod changed.
    try {
      const audience = await podAudience(doc, userId);
      const when = podWhenLabel(doc);
      await Promise.allSettled(
        audience.map((user) =>
          sendPodUpdatedEmail({ to: user.email, name: user.name, pod_title: doc.pod_title, when })
        )
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[pod] update emails failed:', err);
    }

    const slugMap = await loadClubSlugMap([doc]);
    return toPub(doc, slugMap);
  },

  /** What deleting this pod means: other attendees + refundable paid amount (2B). */
  async hostDeleteImpact(id: string, userId: string) {
    const doc = await findHostedPod(id, userId);
    const hostIds = new Set((doc.pod_hosts_id ?? []).map(String));
    const others = (doc.pod_attendees ?? []).map(String).filter((uid: string) => !hostIds.has(uid));
    const payments = await PaymentModel.find({ pod_id: doc._id, status: 'SUCCESS' })
      .select('total currency_symbol')
      .lean();
    const settings = payments.length === 0 ? await getFinanceSettings() : null;
    return {
      other_attendee_count: others.length,
      refundable_payment_count: payments.length,
      refund_total: payments.reduce((sum: number, p: any) => sum + (p.total ?? 0), 0),
      currency_symbol: payments[0]?.currency_symbol ?? settings?.currency_symbol ?? '₹',
    };
  },

  /**
   * Host self-service delete (2B): mandatory reason, refunds every SUCCESS
   * payment (visible in the Finance portal's payment logs), and emails the
   * audience — a cancellation note to each attendee and a refund note to payers.
   */
  async hostRemove(id: string, userId: string, reasonSubject: string, reasonNote?: string | null) {
    const doc = await findHostedPod(id, userId);
    const reason = buildDeleteReason(reasonSubject, reasonNote);
    const when = podWhenLabel(doc);
    const podTitle = doc.pod_title;

    const payments = await PaymentModel.find({ pod_id: doc._id, status: 'SUCCESS' });
    const refundedByUser = new Map<string, any>();
    for (const payment of payments) {
      payment.status = 'REFUNDED';
      (payment as any).metadata = {
        ...(payment as any).metadata,
        refund_reason: reason,
        refunded_at: new Date().toISOString(),
        refund_initiated_by: 'HOST',
        refund_initiator_id: userId,
      };
      payment.markModified('metadata');
      await payment.save();
      refundedByUser.set(String(payment.user_id), payment);
    }

    const audience = await podAudience(doc, userId);
    await this.remove(id);

    // Best-effort after the delete commits: cancellation + refund emails.
    try {
      await Promise.allSettled([
        ...audience.map((user) => {
          const payment = refundedByUser.get(user.user_id);
          const refundLine = payment
            ? `Your payment of ${payment.currency_symbol}${payment.total} will be refunded.`
            : '';
          return sendPodCancelledEmail({
            to: user.email,
            name: user.name,
            pod_title: podTitle,
            when,
            reason,
            refund_line: refundLine,
          });
        }),
        ...payments.map((payment) =>
          sendPodRefundEmail({
            to: payment.user_email,
            name: payment.user_name,
            pod_title: podTitle,
            amount: `${payment.currency_symbol}${payment.total}`,
            reason,
          })
        ),
      ]);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[pod] delete emails failed:', err);
    }

    return true;
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
    // Soft delete: release the venue slot + reserved inventory, then mark the
    // pod deleted (keep the row so bookings/payments/tickets/history survive).
    await applyProductDeltas(doc!.product_requests ?? [], []);
    await venueSlotService.releaseForPod(String(doc!._id));
    doc!.deleted_at = new Date();
    doc!.is_active = false;
    await doc!.save();
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
    const u: any = await UserModel.findById(viewerId).select(
      'profile.first_name profile.last_name profile.profile_photo'
    );
    return {
      id: String(c._id),
      author_id: viewerId,
      author_name: u ? `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim() : null,
      author_photo: u?.profile?.profile_photo ?? null,
      text: trimmed,
      likes: [],
      created_at: created_at.toISOString(),
    };
  },

  /** Like/unlike a single pod comment (explore item 4). Returns the comment in
   * the same shape as listComments so the client can refresh it in place. */
  async toggleCommentLike(id: string, commentId: string, viewerId: string) {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(commentId))
      throw new GraphQLError('Invalid id', { extensions: { code: 'BAD_USER_INPUT' } });
    const doc = await PodModel.findById(id);
    if (!doc) notFound();
    const c: any = (doc!.comments as any).find((x: any) => String(x._id) === commentId);
    if (!c) throw new GraphQLError('Comment not found', { extensions: { code: 'NOT_FOUND' } });
    c.likes = c.likes ?? [];
    const idx = c.likes.findIndex((x: any) => String(x) === viewerId);
    if (idx >= 0) c.likes.splice(idx, 1);
    else c.likes.push(new Types.ObjectId(viewerId));
    await doc!.save();
    const u: any = await UserModel.findById(c.author_id).select(
      'profile.first_name profile.last_name profile.profile_photo'
    );
    return {
      id: String(c._id),
      author_id: String(c.author_id),
      author_name: u ? `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim() : null,
      author_photo: u?.profile?.profile_photo ?? null,
      text: c.text,
      likes: (c.likes ?? []).map(String),
      created_at: new Date(c.created_at).toISOString(),
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
      'profile.first_name profile.last_name profile.profile_photo'
    );
    const byId = new Map<string, any>();
    users.forEach((u) => byId.set(String(u._id), u));
    return comments.map((c: any) => {
      const u = byId.get(String(c.author_id));
      return {
        id: String(c._id),
        author_id: String(c.author_id),
        author_name: u ? `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim() : null,
        author_photo: u?.profile?.profile_photo ?? null,
        text: c.text,
        likes: (c.likes ?? []).map(String),
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
