/**
 * The venue side of the pod economics guard (breakdownService
 * .assertViablePodEconomics) for a booking being MADE — create, host resubmit
 * and a portal re-route — and for a pod whose booking stands.
 *
 * The guard judges a paid pod with every spot filled against what the venue
 * costs and against the venue's minimum business. This module says both, from
 * whichever source the booking has: an offer to a venue, a held or open slot,
 * or the booking a pod already has.
 */
import { Types } from 'mongoose';
import { breakdownService, type ViabilityGuardInput } from '@modules/finance/finance/breakdown.service';
import { venueCapacityCostForPod } from '@modules/finance/finance/settlement.service';
import { bookedPodMinimum, hoursBetween, slotBasisOf, venueMinimumFor } from '@modules/finance/finance/bookingMinimum';
import { slotVenueCharge } from '@modules/venues/venueSlot/slotCharge';
import { isFreePod } from './pod.model';

type CostSlot = Parameters<typeof slotVenueCharge>[0] & {
  price_snapshot?: { total: number } | null;
  price_basis?: { model?: string | null } | null;
  pricing_mode?: string | null;
};

/** An offer as the guard reads it: what it costs and how it pays the venue. */
interface GuardOffer {
  quote: { total: number };
  request: { model?: string | null };
}

/**
 * What the venue costs a booking being made, at full capacity: a venue offer,
 * or a held booking whose price was already agreed (an Auto Pod or Pod Request
 * window), its whole quote — venue price + Duncit's commission on top, both off
 * the host's side; any other slot by its pricing mode, a per-person slot at a
 * full pod.
 */
export function venueCostForCreate(offer: { quote: { total: number } } | null, slotDoc: CostSlot | null, spots: number): number {
  if (offer) return offer.quote.total;
  if (slotDoc?.price_snapshot) return slotDoc.price_snapshot.total;
  return slotDoc ? slotVenueCharge(slotDoc, { pax: spots }).total : 0;
}

/**
 * The venue's minimum business for a booking being made (Partners > Fees &
 * Minimum Spend), in rupees: keyed on how it pays the venue — the offer's
 * model, else the slot's basis — for the pod's spots and the hours it holds the
 * space (`start`/`end`, which create and edit have already taken from the slot
 * or the offer). 0 without a venue.
 */
export function minBusinessForBooking(
  venueId: string | Types.ObjectId | null | undefined,
  booking: { offer?: Pick<GuardOffer, 'request'> | null; slot?: CostSlot | null; start?: unknown; end?: unknown },
  spots: number
): Promise<number> {
  return venueMinimumFor(venueId, {
    model: booking.offer ? (booking.offer.request.model ?? null) : slotBasisOf(booking.slot),
    guests: spots,
    hours: hoursBetween(booking.start, booking.end),
  });
}

/** Edit inputs that can move a pod's money: its price, type, size and who hosts
 * it (the host's commission rate prices the waterfall). */
const MONEY_FIELDS = ['pod_amount', 'pod_type', 'no_of_spots', 'pod_hosts_id'] as const;
type MoneyField = (typeof MONEY_FIELDS)[number];

/** One money field as a comparable value: hosts as their ids in order, numbers as numbers. */
function moneyValue(field: MoneyField, value: unknown): string {
  if (field === 'pod_hosts_id') return (Array.isArray(value) ? value : []).map(String).join(',');
  if (field === 'pod_type') return String(value ?? '');
  return String(Number(value) || 0);
}

/**
 * Whether an edit CHANGES a money field — not merely sends it. The portal
 * editors send the price, spots, type and hosts on every save, so "present in
 * the input" would judge a title fix on a pod that was already unprofitable and
 * refuse it. Only a different value (or a moved booking) is judged.
 */
export function editChangesMoney(stored: Partial<Record<MoneyField, unknown>>, input: Record<string, unknown>): boolean {
  return MONEY_FIELDS.some(
    (field) => input[field] !== undefined && moneyValue(field, input[field]) !== moneyValue(field, stored[field])
  );
}

/** A portal re-route, as the guard needs it. */
export interface EditReroute {
  slotDoc: CostSlot | null;
  offer?: GuardOffer | null;
}

/** The pod as the portal-edit guard reads it, with the edit already applied. */
export interface EditedPod {
  completed_at?: Date | null;
  deleted_at?: Date | null;
  pod_type?: string | null;
  pod_amount?: number | null;
  no_of_spots?: number | null;
  pod_hosts_id?: readonly unknown[] | null;
  venue_id?: Types.ObjectId | null;
  venue_slot_id?: Types.ObjectId | null;
  pod_date_time?: Date | string | null;
  pod_end_date_time?: Date | string | null;
  /** Set on a pod an Auto Pod materialised — a venue-named window, exempt from its minimum business. */
  source_auto_pod_id?: Types.ObjectId | null;
}

/** What a stored pod would read after `input` is applied — the money fields,
 * computed without touching the document (input over stored values). A
 * re-route's venue and slot replace the booked ones; a move to VIRTUAL drops
 * the venue. */
export function editedPodView(
  doc: EditedPod & { pod_mode?: string | null },
  input: Record<string, unknown>,
  reroute: { slotDoc: { _id?: Types.ObjectId } | null } | null
): EditedPod {
  const pick = <T>(field: keyof EditedPod, stored: T): T => (input[field] === undefined ? stored : (input[field] as T));
  const virtual = (input.pod_mode ?? doc.pod_mode) === 'VIRTUAL';
  let venueId = doc.venue_id ?? null;
  let slotId = doc.venue_slot_id ?? null;
  if (reroute) {
    venueId = typeof input.venue_id === 'string' && input.venue_id ? new Types.ObjectId(input.venue_id) : venueId;
    slotId = reroute.slotDoc?._id ?? null;
  }
  return {
    completed_at: doc.completed_at ?? null,
    deleted_at: doc.deleted_at ?? null,
    pod_type: pick('pod_type', doc.pod_type ?? null),
    pod_amount: pick('pod_amount', doc.pod_amount ?? null),
    no_of_spots: pick('no_of_spots', doc.no_of_spots ?? null),
    pod_hosts_id: pick('pod_hosts_id', doc.pod_hosts_id ?? null),
    venue_id: virtual ? null : venueId,
    venue_slot_id: virtual ? null : slotId,
    pod_date_time: pick('pod_date_time', doc.pod_date_time ?? null),
    pod_end_date_time: pick('pod_end_date_time', doc.pod_end_date_time ?? null),
    source_auto_pod_id: doc.source_auto_pod_id ?? null,
  };
}

/**
 * The economics guard for a portal edit (Admin, Club Admin and the MCP tools,
 * all through podService.update) — the path a venue slot was changed on after
 * creation, leaving a paid pod at −₹15.89 for its host with nothing refusing it.
 *
 * Runs on `editedPodView` BEFORE the edit is applied or saved, so a refusal
 * leaves the stored pod, its product stock and its booked slot as they were
 * (the new slot is only claimed after the save). Completed pods are settled
 * history and cancelled ones sell nothing, so neither is judged; an edit that
 * changes no money field (`stored` is the pod as it was) and moves no booking
 * is not judged either.
 */
export async function assertPortalEditEconomics(
  pod: EditedPod,
  input: Record<string, unknown>,
  reroute: EditReroute | null,
  stored: Partial<Record<MoneyField, unknown>> = {}
): Promise<void> {
  if (pod.completed_at || pod.deleted_at) return;
  if (!reroute && !editChangesMoney(stored, input)) return;
  const spots = Math.max(0, Math.floor(Number(pod.no_of_spots) || 0));
  const hostId = pod.pod_hosts_id?.[0];
  const base = {
    hostUserId: hostId ? String(hostId) : null,
    podAmount: isFreePod({ pod_type: pod.pod_type }) ? 0 : Number(pod.pod_amount) || 0,
    noOfSpots: spots,
    venueId: pod.venue_id ? String(pod.venue_id) : null,
  };
  const window = { start: pod.pod_date_time, end: pod.pod_end_date_time };
  if (reroute?.offer) {
    await breakdownService.assertViablePodEconomics({
      ...base,
      venueAmount: venueCostForCreate(reroute.offer, null, spots),
      minBusiness: await minBusinessForBooking(base.venueId, { offer: reroute.offer, ...window }, spots),
    });
    return;
  }
  if (reroute?.slotDoc) {
    await breakdownService.assertViablePodEconomics({
      ...base,
      venueAmount: venueCostForCreate(null, reroute.slotDoc, spots),
      commissionOnTop: !reroute.slotDoc.price_snapshot,
      minBusiness: await minBusinessForBooking(base.venueId, { slot: reroute.slotDoc, ...window }, spots),
    });
    return;
  }
  await breakdownService.assertViablePodEconomics({ ...base, ...(await venueInputsForStandingBooking(pod)) });
}

/**
 * The guard's venue inputs for a pod whose booking already stands (a portal
 * edit that changes the price, spots or hosts without moving the booking):
 * what the booked venue costs at the pod's capacity, priced exactly as
 * completion would pay it, and the venue's minimum business for it.
 */
export async function venueInputsForStandingBooking(
  pod: Pick<
    EditedPod,
    'venue_id' | 'venue_slot_id' | 'pod_type' | 'no_of_spots' | 'pod_date_time' | 'pod_end_date_time' | 'source_auto_pod_id'
  >
): Promise<Pick<ViabilityGuardInput, 'venueAmount' | 'commissionOnTopAmount' | 'minBusiness'>> {
  if (!pod.venue_id) return { venueAmount: 0, minBusiness: 0 };
  const spots = pod.no_of_spots ?? 0;
  const [cost, minBusiness] = await Promise.all([
    venueCapacityCostForPod({
      venue_id: pod.venue_id,
      venue_slot_id: pod.venue_slot_id ?? null,
      pod_type: pod.pod_type ?? null,
      no_of_spots: spots,
    }),
    // Judged with every spot filled, like the rest of the guard.
    bookedPodMinimum(pod, spots),
  ]);
  return { venueAmount: cost.amount, commissionOnTopAmount: cost.commissionOnTop, minBusiness };
}
