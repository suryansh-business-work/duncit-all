/**
 * A venue's minimum business for one pod booking, read from the venue.
 *
 * The amounts themselves are the venue's own (Partners > Fees & Minimum Spend):
 * `venueBookingMinimum` in venue.offerSettings turns them into one booking
 * total. This module only works out the booking's shape — how it pays the venue
 * (the basis) and how long it holds the space — from whichever source the
 * booking has, so every caller (the create/edit guard, the projections, the
 * cancellation sweep) asks the same question the same way.
 */
import { Types } from 'mongoose';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { venueBookingMinimum } from '@modules/venues/venue/venue.offerSettings';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';

const HOUR_MS = 3_600_000;

/** A slot's pricing mode as the offer basis the venue's amounts are keyed on. */
const BASIS_OF_MODE: Record<string, string> = { PER_PAX: 'PER_GUEST', HOURLY: 'PER_HOUR', FLAT: 'FLAT' };

/** The basis a slot pays the venue on: its agreed basis when it has one, else its pricing mode. */
export function slotBasisOf(
  slot: { price_basis?: { model?: string | null } | null; pricing_mode?: string | null } | null | undefined
): string | null {
  if (!slot) return null;
  return slot.price_basis?.model ?? BASIS_OF_MODE[slot.pricing_mode ?? ''] ?? null;
}

/** Whole and part hours between two instants; 0 when either is missing or they are out of order. */
export function hoursBetween(start: unknown, end: unknown): number {
  if (!start || !end) return 0;
  const ms = new Date(end as string | Date).getTime() - new Date(start as string | Date).getTime();
  return Number.isFinite(ms) && ms > 0 ? Math.round((ms / HOUR_MS) * 100) / 100 : 0;
}

/**
 * The venue's minimum business for a pod whose booking already stands, at
 * `guests` people — the pod's capacity when an edit is judged, the people booked
 * so far when the cancellation sweep checks it. 0 for a window the venue itself
 * named and priced (an Auto Pod's, or a Pod Request's), which the venue's
 * minimums do not apply to — exactly as at creation.
 */
export async function bookedPodMinimum(
  pod: {
    venue_id?: Types.ObjectId | string | null;
    venue_slot_id?: Types.ObjectId | string | null;
    source_auto_pod_id?: Types.ObjectId | string | null;
    pod_date_time?: unknown;
    pod_end_date_time?: unknown;
  },
  guests: number
): Promise<number> {
  if (!pod.venue_id || pod.source_auto_pod_id) return 0;
  const slot = pod.venue_slot_id
    ? await VenueSlotModel.findById(pod.venue_slot_id)
        .select('price_basis pricing_mode start_at end_at booked_by_partner_request_id')
        .lean()
    : null;
  if (slot?.booked_by_partner_request_id) return 0;
  return venueMinimumFor(pod.venue_id, {
    model: slotBasisOf(slot),
    guests,
    hours: hoursBetween(slot?.start_at ?? pod.pod_date_time, slot?.end_at ?? pod.pod_end_date_time),
  });
}

/** The venue's minimum business for a booking of this shape, in rupees; 0 when
 * there is no venue, it is not found, or it set no minimum. */
export async function venueMinimumFor(
  venueId: string | Types.ObjectId | null | undefined,
  shape: { model?: string | null; guests: number; hours: number }
): Promise<number> {
  if (!venueId || !Types.ObjectId.isValid(String(venueId))) return 0;
  const venue = await VenueModel.findById(venueId).select('settings.offers').lean();
  return venue ? venueBookingMinimum(venue.settings?.offers, shape) : 0;
}
