/**
 * Write-path helpers for creating and editing a pod: meeting fields, ticket
 * discounts, the shared edit core, and the slot reroute / resubmit steps.
 */
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { type PodMode, type PodType } from './pod.model';
import {
  assertTicketDiscountTiers,
  sameTicketDiscountTiers,
  ticketDiscountMaxTickets,
  type TicketDiscountTier,
} from './pod.ticketDiscount';
import { venueSlotService } from '@modules/venues/venueSlot/venueSlot.service';
import { settingsService } from '@modules/platform/settings/settings.service';
import type { PodAuditSource } from '@modules/pods/podAudit/podAudit.model';
import { logs } from '@observability/log';
import {
  assertWritablePodType,
  normalizePodMode,
  normalizeReelUrl,
  validateAmount,
  validateFutureDates,
  validateMeetingDetails,
} from './pod.validation';
import {
  assertPartnerVenue,
  emailVenueSlotRequested,
  notifyVenueSlotRequested,
  resolveSlotForCreate,
  resolveVenueLocation,
} from './pod.venue';
import { applyProductsForUpdate, assertMeetsMinPax, resolveClubCategory } from './pod.products';

/** Meeting details are persisted for virtual pods only. */
export function meetingFieldsForCreate(
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

/** An edit only re-checks the pod window when the incoming start/end (or the
 * mode, which decides whether an end is required) actually moves, so re-saving
 * an untouched date still works — including a virtual pod created before its
 * end became required, until somebody touches its schedule. */
function validatePodDatesForUpdate(input: any, doc: any, nextMode: PodMode) {
  const touchesSchedule =
    input.pod_date_time !== undefined ||
    input.pod_end_date_time !== undefined ||
    input.pod_mode !== undefined;
  if (!touchesSchedule) return;
  const nextStart = input.pod_date_time ?? doc.pod_date_time;
  const nextEnd = input.pod_end_date_time === undefined ? doc.pod_end_date_time : input.pod_end_date_time;
  if (nextMode === 'VIRTUAL' && !nextEnd) {
    throw new GraphQLError('End date/time is required for a virtual pod', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  const startChanged = input.pod_date_time !== undefined
    && new Date(input.pod_date_time).getTime() !== doc.pod_date_time?.getTime();
  const nextEndTime = nextEnd ? new Date(nextEnd).getTime() : null;
  const docEndTime = doc.pod_end_date_time ? doc.pod_end_date_time.getTime() : null;
  const endChanged = input.pod_end_date_time !== undefined && nextEndTime !== docEndTime;
  if (startChanged || endChanged) validateFutureDates(nextStart, nextEnd, nextMode === 'VIRTUAL');
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
      // Slot bookings may target ANY approved partner venue (same rule as
      // create) — forwarded so the club-match check is skipped for them.
      venue_slot_id: input.venue_slot_id,
    });
    doc.venue_id = venueLocation.venue_id;
    doc.location_id = venueLocation.location_id;
    doc.zone_name = venueLocation.zone_name;
  }
}

type PodTicketDiscountFields = {
  ticket_discount_enabled: boolean;
  ticket_discount_tiers: TicketDiscountTier[];
};

/** A free or zero-priced pod has no ticket money for a multi-ticket discount to come off. */
function podHasTicketPrice(type: PodType, amount: number | null | undefined): boolean {
  return type !== 'FREE' && (amount ?? 0) > 0;
}

/**
 * The multi-ticket discount a new pod is written with: switched off (no tiers)
 * on a free or zero-priced pod or when not asked for, otherwise the tiers
 * validated against the pod's spots and Admin > Pod Settings' max discount.
 */
export async function ticketDiscountForCreate(input: any): Promise<PodTicketDiscountFields> {
  if (!input.ticket_discount_enabled || !podHasTicketPrice(input.pod_type, input.pod_amount)) {
    return { ticket_discount_enabled: false, ticket_discount_tiers: [] };
  }
  const tiers = assertTicketDiscountTiers(input.ticket_discount_tiers ?? [], {
    maxPct: await settingsService.getTicketDiscountMaxPct(),
    noOfSpots: input.no_of_spots ?? 0,
  });
  return { ticket_discount_enabled: true, ticket_discount_tiers: tiers };
}

/** Untouched stored tiers still have to be reachable by one booking once the
 * pod is resized — a pod cannot shrink below a tier it advertises. */
function assertStoredTiersFitSpots(stored: TicketDiscountTier[], noOfSpots: number) {
  const maxTickets = ticketDiscountMaxTickets(noOfSpots);
  if (stored.some((tier) => tier.min_tickets > maxTickets)) {
    throw new GraphQLError('Lower the multi-ticket discount tiers first', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
}

/**
 * Re-applies the multi-ticket discount after an edit has written the pod's
 * type, price and spots onto `doc`, so it is judged on what will be saved.
 *
 * - Neither the discount nor type/price/spots in the input: nothing to do.
 * - Switched off, or the pod is now free / zero-priced: cleared.
 * - Tiers that differ from the stored ones (or a discount being switched on):
 *   full validation, including the admin's current max discount.
 * - Stored tiers left as they are: only re-checked against a resized pod. The
 *   max discount is NOT re-checked, so lowering it in Pod Settings never
 *   blocks an unrelated edit to a pod that already carries a bigger tier.
 */
export async function applyTicketDiscountForUpdate(doc: any, input: any) {
  const discountTouched =
    input.ticket_discount_enabled !== undefined || input.ticket_discount_tiers !== undefined;
  const priceTouched =
    input.pod_type !== undefined || input.pod_amount !== undefined || input.no_of_spots !== undefined;
  if (!discountTouched && !priceTouched) return;
  const enabled = input.ticket_discount_enabled ?? doc.ticket_discount_enabled;
  if (!enabled || !podHasTicketPrice(doc.pod_type, doc.pod_amount)) {
    doc.ticket_discount_enabled = false;
    doc.ticket_discount_tiers = [];
    return;
  }
  const stored: TicketDiscountTier[] = doc.ticket_discount_tiers ?? [];
  const next: TicketDiscountTier[] = input.ticket_discount_tiers ?? stored;
  if (doc.ticket_discount_enabled && sameTicketDiscountTiers(next, stored)) {
    if (input.no_of_spots !== undefined) assertStoredTiersFitSpots(stored, doc.no_of_spots ?? 0);
    return;
  }
  doc.ticket_discount_tiers = assertTicketDiscountTiers(next, {
    maxPct: await settingsService.getTicketDiscountMaxPct(),
    noOfSpots: doc.no_of_spots ?? 0,
  });
  doc.ticket_discount_enabled = true;
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

/** Shared full-edit core (admin/club-admin update + host resubmit): validates
 * and writes the incoming fields onto the loaded doc. The caller saves. */
export async function applyPodEditCore(doc: any, input: any) {
  const nextMode = normalizePodMode(input.pod_mode ?? doc.pod_mode ?? 'PHYSICAL');
  // A supplied pod_type must follow the FREE/PAID rules; when untouched, a
  // stored FREE pod still cannot be flipped to physical without becoming PAID.
  if (input.pod_type === undefined) {
    if (nextMode === 'PHYSICAL' && doc.pod_type === 'FREE') {
      throw new GraphQLError('Physical pods must be paid — free pods are only available for virtual pods', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
  } else {
    assertWritablePodType(input.pod_type, nextMode);
  }
  if (input.pod_type !== undefined || input.pod_amount !== undefined) {
    validateAmount(input.pod_type ?? doc.pod_type, input.pod_amount ?? doc.pod_amount);
  }
  validateMeetingDetails(nextMode, input, doc);
  validatePodDatesForUpdate(input, doc, nextMode);
  if (input.reel_url !== undefined) input.reel_url = normalizeReelUrl(input.reel_url);

  await applyPlaceForUpdate(doc, input, nextMode);

  // Resizing a pod (or moving it to a club in another sub-category) must still
  // clear that activity's minimum — applyProductsForUpdate below returns early
  // when products are untouched, so the check cannot live in there.
  if (input.no_of_spots !== undefined || input.club_id !== undefined) {
    await assertMeetsMinPax(
      await resolveClubCategory(input.club_id ?? doc.club_id),
      input.no_of_spots ?? doc.no_of_spots ?? 0
    );
  }

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
    'reel_url',
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
    if (input[f] !== undefined) doc[f] = input[f];
  }
  // After the loop: the discount is judged on the type, price and spots it wrote.
  await applyTicketDiscountForUpdate(doc, input);
  applyMeetingFieldsForUpdate(doc, input, nextMode);
  applyDatesForUpdate(doc, input);
}

/** Booking state, membership and club are server-managed on a host
 * resubmission — never taken from the form. */
export const HOST_RESUBMIT_BLOCKED_FIELDS = ['pod_hosts_id', 'pod_attendees', 'club_id', 'is_active'] as const;

/** The pod's booking + window, restored verbatim if a re-route cannot claim
 * its target slot. */
export function snapshotBooking(doc: any) {
  return {
    venue_slot_id: doc.venue_slot_id,
    venue_approval_status: doc.venue_approval_status,
    is_active: doc.is_active,
    venue_id: doc.venue_id,
    location_id: doc.location_id,
    zone_name: doc.zone_name,
    pod_date_time: doc.pod_date_time,
    pod_end_date_time: doc.pod_end_date_time,
  };
}

interface SlotReroute {
  slotDoc: any;
  needsVenueApproval: boolean;
  previousSlotId: string | null;
}

/**
 * Resolve the slot an Admin / Club Admin re-routed a pod onto — the lever that
 * rescues a venue-rejected pod from a portal without creating a new one.
 *
 * Runs BEFORE the content edit so the slot dictates the pod's window exactly
 * as it does on create and host resubmission: the resolved venue and date
 * range are written back onto `input`, so applyPodEditCore derives location,
 * zone and dates from them instead of leaving the pod advertising a time its
 * venue never booked. Returns null when no re-route was requested.
 */
export async function prepareSlotReroute(doc: any, input: any): Promise<SlotReroute | null> {
  if (input.venue_slot_id === undefined) return null;
  // Venue inventory is only ever held by a pod that can still release it. A
  // cancelled or settled pod would strand the slot forever.
  if (doc.deleted_at) {
    throw new GraphQLError('Restore this pod before changing its venue slot', {
      extensions: { code: 'BAD_REQUEST' },
    });
  }
  if (doc.completed_at) {
    throw new GraphQLError('A completed pod cannot be moved to another venue slot', {
      extensions: { code: 'BAD_REQUEST' },
    });
  }
  const nextMode = normalizePodMode(input.pod_mode ?? doc.pod_mode ?? 'PHYSICAL');
  const slotInput: any = {
    venue_slot_id: nextMode === 'PHYSICAL' ? input.venue_slot_id : undefined,
    venue_id: input.venue_id ?? (doc.venue_id ? String(doc.venue_id) : undefined),
    pod_hosts_id: (doc.pod_hosts_id ?? []).map(String),
  };
  const { slotDoc, needsVenueApproval } = await resolveSlotForCreate(slotInput, nextMode);
  if (slotDoc) {
    input.venue_id = slotInput.venue_id;
    input.pod_date_time = slotInput.pod_date_time;
    input.pod_end_date_time = slotInput.pod_end_date_time;
  }
  return {
    slotDoc,
    needsVenueApproval,
    previousSlotId: doc.venue_slot_id ? String(doc.venue_slot_id) : null,
  };
}

/** Booking state implied by a resolved re-route, applied after the content edit. */
export function applyRerouteState(doc: any, input: any, reroute: SlotReroute) {
  const pendingApproval = Boolean(reroute.slotDoc && reroute.needsVenueApproval);
  doc.venue_slot_id = reroute.slotDoc ? reroute.slotDoc._id : null;
  doc.venue_approval_status = pendingApproval ? 'PENDING' : 'NONE';
  // A pod waiting on the venue's answer is never live. Otherwise a settled
  // booking brings the pod back online — unless the portal said otherwise,
  // in which case its explicit Active choice wins.
  doc.is_active = pendingApproval ? false : input.is_active ?? true;
}

/**
 * Claim the new slot, and only once it is secured, free the old one — never
 * the reverse, or a lost race would leave the pod's seat sellable to someone
 * else while the pod still claimed it. A failed claim restores the previous
 * booking AND persists it, mirroring holdOrBookForResubmit.
 */
export async function claimRerouteSlot(
  doc: any,
  reroute: SlotReroute,
  previous: ReturnType<typeof snapshotBooking>,
  actorSource: PodAuditSource,
) {
  const { slotDoc, needsVenueApproval, previousSlotId } = reroute;
  try {
    if (slotDoc && needsVenueApproval) {
      await venueSlotService.holdForPod(String(slotDoc._id), String(slotDoc.venue_id), String(doc._id));
      await notifyVenueSlotRequested(doc, slotDoc);
      await emailVenueSlotRequested(doc, slotDoc);
    } else if (slotDoc) {
      await venueSlotService.bookForPod(String(slotDoc._id), String(slotDoc.venue_id), String(doc._id));
    }
  } catch (e) {
    Object.assign(doc, previous);
    await doc.save();
    logs.server.warn('pod', 'slotReroute', {
      error: e,
      msg: `Slot re-route (${actorSource}) failed — pod kept its previous booking`,
    });
    throw e;
  }
  if (previousSlotId && previousSlotId !== String(slotDoc?._id ?? '')) {
    await venueSlotService.releaseSlotForPod(previousSlotId, String(doc._id));
  }
}

/** Re-enter the booking cycle for a resubmitted slot: a partner slot is held
 * (PENDING approval, venue notified again); the host's own slot books
 * instantly. A concurrent snatch reverts the pod to its rejected state —
 * still fully editable — instead of deleting it. */
export async function holdOrBookForResubmit(doc: any, slotDoc: any, needsVenueApproval: boolean) {
  try {
    if (needsVenueApproval) {
      await venueSlotService.holdForPod(String(slotDoc._id), String(slotDoc.venue_id), String(doc._id));
      await notifyVenueSlotRequested(doc, slotDoc);
      await emailVenueSlotRequested(doc, slotDoc);
    } else {
      await venueSlotService.bookForPod(String(slotDoc._id), String(slotDoc.venue_id), String(doc._id));
    }
  } catch (e) {
    doc.venue_slot_id = null;
    doc.venue_approval_status = 'DECLINED';
    doc.is_active = false;
    await doc.save();
    throw e;
  }
}

/** Physical resubmission re-resolves the venue: a kept partner venue needs a
 * fresh slot, otherwise the host's own venue / a plain location applies.
 * assertPartnerVenue enforces that split and the resolved id is written back. */
export async function applyResubmitPhysicalVenue(
  doc: any,
  input: any,
  slotDoc: any,
  nextMode: string,
  userId: string,
) {
  if (nextMode !== 'PHYSICAL') return;
  const declaredVenueId = doc.venue_id ? String(doc.venue_id) : null;
  const finalVenueId = input.venue_id === undefined ? declaredVenueId : input.venue_id;
  if (!finalVenueId) return;
  await assertPartnerVenue(
    { venue_id: finalVenueId, venue_slot_id: slotDoc ? String(slotDoc._id) : undefined },
    new Types.ObjectId(userId),
  );
  input.venue_id = finalVenueId;
}
