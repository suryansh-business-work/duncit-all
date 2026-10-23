/**
 * Pod venue and place helpers: venue ownership/club checks, venue-location
 * resolution, the location/zone → venue-id filter (with its cache), and the
 * venue-slot booking or hold a new pod takes.
 */
import { GraphQLError } from 'graphql';
import { trimTrailingSlash } from '@utils/url';
import { Types } from 'mongoose';
import { type PodMode } from './pod.model';
import { UserModel } from '@modules/access/user/user.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { LocationModel } from '@modules/platform/location/location.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { venueService } from '@modules/venues/venue/venue.service';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { notifyFreeSlotBooked, venueSlotService } from '@modules/venues/venueSlot/venueSlot.service';
import { transferPartnerRequestHold } from '@modules/venues/venueSlot/venueSlot.partnerHold';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import { podImageAssets } from '@modules/platform/whatsapp/whatsapp.assets';
import { sendVenueSlotRequestEmail } from '@services/email/email.service';
import { getUrlConfigs } from '@config/url-configs';
import { logs } from '@observability/log';
import { appDate, appDateTime, appTime } from '@utils/app-time';
import { emailTranslationVars, recipientLocale } from '@services/email/email-i18n';
import { isFreePod } from './pod.model';
import type { IVenueSlot } from '@modules/venues/venueSlot/venueSlot.model';
import type { OfferQuote, VenueOfferRequest } from '@modules/venues/venueOffer/venueOffer.types';

/** What a venue offer reads (and writes back) on a create, re-route or resubmit input. */
export interface VenueOfferCreateInput {
  venue_slot_id?: unknown;
  /** Instant booking at the venue's own price, sent by app builds from before offers. Refused. */
  venue_booking?: unknown;
  venue_offer?: VenueOfferRequest | null;
  venue_id?: string | null;
  no_of_spots?: number | null;
  pod_hosts_id?: unknown[] | null;
  /** A pod moving its booking: its own current booking does not block the new window. */
  reroute_pod_id?: string | null;
  pod_date_time?: unknown;
  pod_end_date_time?: unknown;
}

/** A resolved venue offer: the request to place, its price, and whether the host owns the venue. */
export interface ResolvedVenueOffer {
  request: VenueOfferRequest;
  quote: OfferQuote;
  own: boolean;
}

/** The pod fields a venue booking reads, notifies with, and writes back. */
type BookingPod = Parameters<typeof notifyFreeSlotBooked>[0] & {
  venue_id?: unknown;
  venue_slot_id?: unknown;
  no_of_spots?: number | null;
  pod_type?: string | null;
  deleteOne: () => Promise<unknown>;
  save: () => Promise<unknown>;
};

/** The localized key of the notice a venue gets with a FREE pod's request. */
const FREE_POD_NOTICE_KEY = 't:email.venueSlotRequest.freePodNotice';

/**
 * What a venue is told when a FREE pod requests its slot: the platform pays it
 * nothing, so the host will call about the charges — and the slot should not be
 * confirmed before they have. '' for a paid pod, so no paid request changes.
 * Server-first localization: the stored translation wins over the bundle.
 */
export async function freePodVenueNotice(
  pod: { pod_type?: string | null },
  locale?: string | null
): Promise<string> {
  if (!isFreePod(pod)) return '';
  return (await emailTranslationVars(locale))[FREE_POD_NOTICE_KEY] ?? '';
}

/**
 * Loads the venue the caller owns for this pod. The pod must actually sit at an
 * APPROVED venue booking, and that venue must belong to the caller.
 */
export async function assertOwnedVenue(doc: any, userId: string) {
  const venue =
    doc.venue_id && doc.venue_approval_status === 'APPROVED'
      ? await VenueModel.findOne({
          _id: doc.venue_id,
          owner_user_id: new Types.ObjectId(userId),
        }).select('_id')
      : null;
  if (!venue) {
    throw new GraphQLError('This pod is not booked at a venue you own', {
      extensions: { code: 'FORBIDDEN' },
    });
  }
}

/** Best-effort in-app note to the venue owner: a host requested one of their
 * slots and it's waiting in the partner portal's Slot Requests inbox. */
export async function notifyVenueSlotRequested(pod: any, slot: any) {
  try {
    const { notificationService } = await import(
      '@modules/engagement/notification/notification.service'
    );
    const when = appDateTime(slot.start_at);
    const notice = await freePodVenueNotice(pod);
    const noticeLine = notice ? ` ${notice}` : '';
    await notificationService.create({
      title: 'New slot booking request',
      body: `"${pod.pod_title}" requested your venue slot on ${when}. Review it in the Partners portal.${noticeLine}`,
      scope: 'USER',
      target_user_ids: [String(slot.owner_user_id)],
      silent: false,
    });
  } catch (err) {
    logs.server.error('pod', 'notifyVenueSlotRequested', {
      error: err,
      msg: 'slot request notification failed',
    });
  }
}

/** Best-effort email to the venue owner mirroring the in-app slot-request note,
 * so the venue is alerted off-platform too and can approve/decline it in the
 * Partners portal. Recipient is the venue's contact email (owner account email
 * as a fallback). */
export async function emailVenueSlotRequested(pod: any, slot: any) {
  try {
    const venue = await VenueModel.findById(slot.venue_id).select(
      'venue_name owner_email owner_name owner_user_id'
    );
    if (!venue) return;
    // The phone fields ride along because the same owner is messaged on
    // WhatsApp below, and `destinationFor` reads them off this document.
    const owner = await UserModel.findById(venue.owner_user_id)
      .select('profile.first_name profile.last_name auth.email auth.phone communication.whatsapp')
      .lean();
    // No early return on a missing address: the send logs it as FAILED, and a
    // venue nobody can reach about a slot request is worth seeing in the log.
    const to = (venue.owner_email || (owner as any)?.auth?.email || '').trim();
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
    const when = appDateTime(slot.start_at);
    const { partnersUrl } = await getUrlConfigs();
    // The two CTAs open the same decision page with the intent pre-selected.
    // The page is auth-gated, so a mail scanner following the link cannot
    // decide anything — and the venue owner lands back on it after logging in.
    const decisionUrl = `${trimTrailingSlash(partnersUrl)}/venues/requests/${String(slot._id)}`;
    const reviewUrl = `${trimTrailingSlash(partnersUrl)}/venues/requests`;
    // A free pod promises the venue no earnings. The stored template's closing
    // line says the portal shows "what this booking earns you", so for a free
    // pod that line is replaced — through the caller-vars-win rule of sendEmail,
    // no template edit — by the notice. `free_pod_notice` is passed too, so a
    // Communications Portal edit can place it more prominently.
    const notice = isFreePod(pod) ? await freePodVenueNotice(pod, await recipientLocale(to)) : '';
    const freeVars = notice
      ? { extra_vars: { free_pod_notice: notice, 't:email.venueSlotRequest.earningsNote': notice } }
      : {};
    await sendVenueSlotRequestEmail({
      to,
      owner_name: ownerName,
      venue_name: venue.venue_name || 'your venue',
      pod_title: pod.pod_title,
      host_name: hostName,
      when,
      review_url: reviewUrl,
      approve_url: `${decisionUrl}?action=approve`,
      decline_url: `${decisionUrl}?action=decline`,
      ...freeVars,
    });
    await whatsappService.send({
      event: 'VENUE_SLOT_REQUESTED',
      entityId: String(slot._id),
      user: owner,
      name: ownerName,
      assets: podImageAssets(pod.pod_images_and_videos),
      params: [
        ownerName,
        pod.pod_title,
        appDate(slot.start_at),
        appTime(slot.start_at),
        hostName,
        reviewUrl,
      ],
    });
  } catch (err) {
    logs.server.error('pod', 'emailVenueSlotRequested', {
      error: err,
      msg: 'slot request email failed',
    });
  }
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

// Slot bookings go to any venue partner's availability calendar, so the
// club↔venue match only constrains the manual (no-slot) path. Venues now
// auto-match a club by location + category (single source of truth in
// venueService); a club with no location yet imposes no constraint.
async function assertVenueAllowedForClub(input: any, venue: any) {
  const booked = input.venue_slot_id || input.venue_offer;
  const club = !booked && input.club_id ? await ClubModel.findById(input.club_id) : null;
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

/** Exported so the Request Change flow resolves a swapped-in venue's place
 * through this exact function rather than a second copy of the city lookup
 * (rule 40). Pass `venue_slot_id` for a partner booking, as create does. */
export async function resolveVenueLocation(input: any) {
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

/**
 * A city's venue ids barely move, yet the feed asked for them on every load —
 * two serial Atlas reads (the location, then its venues) before the pod query
 * could even start. Held per process for the response cache's own TTL, so a
 * venue added to a city reaches the feed no later than a cached feed would.
 * Only settled answers are kept (a failed read is retried next time), and the
 * map is bounded because the zone half of the key is caller-supplied.
 */
const VENUE_IDS_TTL_MS = 60_000;

const VENUE_IDS_MAX_KEYS = 200;

const venueIdsByPlace = new Map<string, { at: number; ids: Types.ObjectId[] }>();

async function venueIdsForLocationFilter(locationId?: string, zoneName?: string) {
  const key = `${locationId ?? ''}|${zoneName?.trim() ?? ''}`;
  const hit = venueIdsByPlace.get(key);
  if (hit && Date.now() - hit.at < VENUE_IDS_TTL_MS) return hit.ids;
  const ids = await readVenueIdsForLocation(locationId, zoneName);
  if (venueIdsByPlace.size >= VENUE_IDS_MAX_KEYS) venueIdsByPlace.clear();
  venueIdsByPlace.set(key, { at: Date.now(), ids });
  return ids;
}

async function readVenueIdsForLocation(locationId?: string, zoneName?: string): Promise<Types.ObjectId[]> {
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

export async function buildPodPlaceFilter(filter?: { location_id?: string; zone_name?: string }) {
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

/** A booking (an open slot, or an offer to the venue) may target ANY approved
 * venue partner; the manual no-slot path is still restricted to the host's own
 * approved venues. */
export async function assertPartnerVenue(input: any, userObjectId: Types.ObjectId) {
  const booking = !!(input.venue_slot_id || input.venue_offer);
  const venueMatch = booking
    ? { _id: input.venue_id, status: 'APPROVED', is_active: true }
    : { _id: input.venue_id, owner_user_id: userObjectId, status: 'APPROVED', is_active: true };
  const venue = input.venue_id
    ? await VenueModel.findOne(venueMatch).select('_id')
    : null;
  if (!venue) {
    throw new GraphQLError(
      booking ? 'Select an approved venue' : 'Select one of your approved venues',
      { extensions: { code: 'BAD_USER_INPUT' } }
    );
  }
}

/** A picked slot is the source of truth for the pod's window — overwrite
 * the incoming date/time so a stale or hand-edited form value can't break
 * the booking contract. The slot itself is booked atomically *after* the
 * pod row is created (see `bookOrHoldSlotForPod`) so we never orphan a slot. */
export async function resolveSlotForCreate(
  input: any,
  podMode: PodMode,
  autoPodId?: string | null,
  partnerRequestId?: string | null
): Promise<{ slotDoc: any; needsVenueApproval: boolean }> {
  if (!(podMode === 'PHYSICAL' && input.venue_slot_id)) {
    return { slotDoc: null, needsVenueApproval: false };
  }
  // A Pod Request's slot was confirmed by both sides and has been held for it
  // (BOOKED under booked_by_partner_request_id) — that confirmation is the
  // approval, exactly like an Auto Pod's.
  if (partnerRequestId) {
    const held = await VenueSlotModel.findOne({
      _id: input.venue_slot_id,
      booked_by_partner_request_id: new Types.ObjectId(partnerRequestId),
      status: 'BOOKED',
    });
    if (!held) {
      throw new GraphQLError('The slot for this Pod Request is no longer held', {
        extensions: { code: 'CONFLICT' },
      });
    }
    input.venue_id = String(held.venue_id);
    input.pod_date_time = held.start_at.toISOString();
    input.pod_end_date_time = held.end_at.toISOString();
    return { slotDoc: held, needsVenueApproval: false };
  }
  // An Auto Pod's venue already accepted the offer and has been HOLDING this
  // slot (BOOKED under booked_by_auto_pod_id) ever since, so the AVAILABLE and
  // holiday checks below would reject the venue's own booking. That acceptance
  // IS the approval — there is nothing left for the venue to answer.
  if (autoPodId) {
    const held = await VenueSlotModel.findOne({
      _id: input.venue_slot_id,
      booked_by_auto_pod_id: new Types.ObjectId(autoPodId),
      status: 'BOOKED',
    });
    if (!held) {
      throw new GraphQLError('The venue slot for this Auto Pod is no longer held', {
        extensions: { code: 'CONFLICT' },
      });
    }
    input.venue_id = String(held.venue_id);
    input.pod_date_time = held.start_at.toISOString();
    input.pod_end_date_time = held.end_at.toISOString();
    return { slotDoc: held, needsVenueApproval: false };
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
  // No venue approval any more: a venue's open slot is booked instantly at
  // its own price, whoever's venue it is.
  input.venue_id = String(slotDoc.venue_id);
  input.pod_date_time = slotDoc.start_at.toISOString();
  input.pod_end_date_time = slotDoc.end_at.toISOString();
  return { slotDoc, needsVenueApproval: false };
}

/**
 * A host's offer to the venue: the server checks and prices the window — the
 * client's date, time and total are never trusted — and the pod's window
 * becomes the offered window. Nothing is written here; `placeVenueOfferForPod`
 * holds the time once the pod exists. An app build from before offers sends
 * an instant booking instead, which is refused with a message to update.
 */
export async function resolveVenueOfferForCreate(
  input: VenueOfferCreateInput,
  podMode: PodMode
): Promise<ResolvedVenueOffer | null> {
  if (podMode !== 'PHYSICAL' || input.venue_slot_id) return null;
  if (!input.venue_offer) {
    if (!input.venue_booking) return null;
    const { UPDATE_APP_TO_BOOK } = await import('@modules/venues/venuePricing/venuePricing.service');
    throw new GraphQLError(UPDATE_APP_TO_BOOK, { extensions: { code: 'FAILED_PRECONDITION' } });
  }
  if (!input.venue_id) throw new GraphQLError('Select a venue', { extensions: { code: 'BAD_USER_INPUT' } });
  const { venueOfferService } = await import('@modules/venues/venueOffer/venueOffer.service');
  // The pod's spots ARE the booking's guests — one number, so the venue is
  // offered exactly the seats the pod sells.
  const spots = Math.floor(Number(input.no_of_spots) || 0);
  const request: VenueOfferRequest = { ...input.venue_offer, pax: spots > 0 ? spots : (input.venue_offer.pax ?? 0) };
  const prepared = await venueOfferService.prepare(input.venue_id, request, input.reroute_pod_id ?? undefined);
  input.pod_date_time = prepared.start.toISOString();
  input.pod_end_date_time = prepared.end.toISOString();
  const own = (input.pod_hosts_id ?? []).map(String).includes(prepared.ownerUserId);
  return { request, quote: prepared.quote, own };
}

/**
 * Holds the offered time for the pod and points the pod at it: a PENDING
 * offer the venue answers, or — at the host's own venue — a confirmed
 * booking. A lost race (someone took the time a moment ago) deletes a NEW pod
 * (`deleteOnConflict`) and throws CONFLICT, as a lost slot claim always has.
 */
export async function placeVenueOfferForPod(
  doc: BookingPod,
  offer: ResolvedVenueOffer,
  opts: { deleteOnConflict: boolean } = { deleteOnConflict: true }
) {
  const { venueOfferService } = await import('@modules/venues/venueOffer/venueOffer.service');
  let slot;
  try {
    slot = await venueOfferService.place(String(doc._id), String(doc.venue_id), offer.request, offer.own);
  } catch (e) {
    if (opts.deleteOnConflict) await doc.deleteOne();
    throw e;
  }
  doc.venue_slot_id = slot._id;
  await doc.save();
  // The host's own venue hears nothing (the owner is the host); every other venue gets the request.
  if (!offer.own) announceSlotRequest(doc, slot);
  return slot;
}

/** The host books a slot at a venue they own. */
const isOwnSlot = (hostIds: unknown[] | null | undefined, slot: { owner_user_id?: unknown }) =>
  (hostIds ?? []).map(String).includes(String(slot.owner_user_id));

/**
 * A FREE pod on a slot priced ₹0 books instantly, at any partner's venue. Gated
 * on both halves: a paid pod on a ₹0 slot, and a free pod on a priced slot,
 * still go to the venue as a request exactly as before.
 */
export const isFreeSlotForFreePod = (
  pod: { pod_type?: string | null },
  slot: { price?: number | null }
): boolean => isFreePod(pod) && (Number(slot.price) || 0) === 0;

/**
 * After a slot was BOOKED for a pod without a request: a free pod on a
 * partner's ₹0 slot tells that venue (see notifyFreeSlotBooked). An own-venue
 * booking tells nobody — the owner is the host — so nothing changes there.
 */
export function announceFreeSlotBooking(
  doc: Parameters<typeof notifyFreeSlotBooked>[0] & { pod_type?: string | null },
  slotDoc: Parameters<typeof notifyFreeSlotBooked>[1]
) {
  if (!isFreeSlotForFreePod(doc, slotDoc) || isOwnSlot(doc.pod_hosts_id, slotDoc)) return;
  notifyFreeSlotBooked(doc, slotDoc).catch((error) =>
    logs.server.error('pods', 'notifyFreeSlotBooked', { error, pod_id: String(doc._id) })
  );
}

/** An Auto Pod's venue approved when it accepted the offer; every other pod
 * either waits for its venue or needs no approval at all. */
export function venueApprovalForCreate(
  preApprovedSlot: { slotId: string } | null,
  needsVenueApproval: boolean
): 'NONE' | 'PENDING' | 'APPROVED' {
  if (preApprovedSlot) return 'APPROVED';
  return needsVenueApproval ? 'PENDING' : 'NONE';
}

/**
 * Atomic book/hold — if a concurrent request snatched the slot between our
 * status check and now, this throws CONFLICT and we roll the pod back so
 * the caller can retry with a different slot.
 *
 * ONLY the slot claim decides whether the pod survives. Telling the venue about
 * it does not: the notification and the email used to sit inside this try, on
 * the request path, so publishing a pod waited on SMTP — and a slow or
 * unreachable mail host hung `publishPodDraft` until the client timed out. Worse,
 * a mail failure landed in the catch below and DELETED a pod that was already
 * created and whose slot was already held.
 *
 * They are now fired after the claim succeeds, and their failures are logged
 * rather than thrown. A venue that was not emailed still has the request in its
 * approval queue; a pod deleted because SMTP blipped is unrecoverable.
 */
export async function bookOrHoldSlotForPod(
  doc: any,
  slotDoc: any,
  needsVenueApproval: boolean,
  autoPodSlot?: { slotId: string; autoPodId: string } | null,
  partnerRequestSlot?: { slotId: string; requestId: string } | null
) {
  if (!slotDoc) return;
  // A Pod Request already holds this slot: hand it over in one conditional
  // write, the same way an Auto Pod's hold moves to its pod.
  if (partnerRequestSlot) {
    try {
      await transferPartnerRequestHold(partnerRequestSlot.slotId, partnerRequestSlot.requestId, String(doc._id));
    } catch (e) {
      await doc.deleteOne();
      throw e;
    }
    return;
  }
  // The Auto Pod already holds this slot: hand the booking over in ONE
  // conditional write rather than booking it again, so it is never AVAILABLE
  // in between for an ordinary pod to snatch.
  if (autoPodSlot) {
    try {
      await venueSlotService.transferAutoPodHold(
        autoPodSlot.slotId,
        autoPodSlot.autoPodId,
        String(doc._id)
      );
    } catch (e) {
      await doc.deleteOne();
      throw e;
    }
    return;
  }
  try {
    if (needsVenueApproval) {
      await venueSlotService.holdForPod(String(slotDoc._id), String(slotDoc.venue_id), String(doc._id));
    } else {
      await venueSlotService.bookForPod(String(slotDoc._id), String(slotDoc.venue_id), String(doc._id));
    }
  } catch (e) {
    await doc.deleteOne();
    throw e;
  }

  if (!needsVenueApproval) {
    await settleSlotBooking(doc, slotDoc);
    return;
  }
  announceSlotRequest(doc, slotDoc);
}

/**
 * After a pod books a venue's open slot (create, portal re-route or host
 * resubmit — one rule for all three): freeze the price it was booked at, then
 * tell the venue. The host's own venue hears nothing; a free pod on a ₹0 slot
 * gets the free-slot note; every other partner booking is "New booking
 * confirmed" — for a free pod with the notice that the host settles the venue
 * directly, since the platform pays it nothing. Never fails the booking.
 */
export async function settleSlotBooking(doc: Omit<BookingPod, 'deleteOne' | 'save'>, slotDoc: IVenueSlot) {
  const { venuePricingService } = await import('@modules/venues/venuePricing/venuePricing.service');
  const booked = await venuePricingService.freezeSlotPrice(String(slotDoc._id), doc.no_of_spots ?? 0);
  if (isOwnSlot(doc.pod_hosts_id, slotDoc)) return;
  if (isFreeSlotForFreePod(doc, slotDoc)) {
    announceFreeSlotBooking(doc, slotDoc);
    return;
  }
  const notice = await freePodVenueNotice(doc);
  const { notifyInstantBooking } = await import('@modules/venues/venueSlot/venueSlot.service');
  notifyInstantBooking(doc, booked ?? slotDoc, notice).catch((error) =>
    logs.server.error('pods', 'notifyInstantBooking', { error, pod_id: String(doc._id) })
  );
}

/** Tells the venue a pod asked for one of its slots. A recurring series calls
 * this once, for its first date, instead of once per date. */
export function announceSlotRequest(
  doc: Parameters<typeof notifyVenueSlotRequested>[0],
  slotDoc: Parameters<typeof notifyVenueSlotRequested>[1]
) {
  // Fire-and-forget: never block the publish response, never fail the pod.
  notifyVenueSlotRequested(doc, slotDoc).catch((error) =>
    logs.server.error('pods', 'notifyVenueSlotRequested', { error, pod_id: String(doc._id) })
  );
  emailVenueSlotRequested(doc, slotDoc).catch((error) =>
    logs.server.error('pods', 'emailVenueSlotRequested', { error, pod_id: String(doc._id) })
  );
}
