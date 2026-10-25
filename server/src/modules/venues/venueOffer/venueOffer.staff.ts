/**
 * A venue's bookings with their money terms, for Duncit staff on the Venues
 * console: what was agreed (or is still on the table), what the venue is paid,
 * Duncit's fee on top and what the host pays. Read-only; two reads per page.
 */
import { Types } from 'mongoose';
import { PodModel } from '@modules/pods/pod/pod.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { awaitingParty, currentTerms } from './venueOffer.view';
import type { VenueOffer } from './venueOffer.types';

const MAX_ROWS = 100;

interface Money {
  model: string;
  rate: number;
  venue_payout: number;
  platform_fee: number;
  total: number;
}

interface TermsSlot {
  status: string;
  offer: VenueOffer | null;
  price_snapshot: Money | null;
}

/** The frozen price once booked; otherwise the terms on the table (a pending offer). */
function moneyOf(slot: TermsSlot): Money | null {
  if (slot.status === 'BOOKED' && slot.price_snapshot) return slot.price_snapshot;
  if (!slot.offer) return slot.price_snapshot;
  const terms = currentTerms(slot.offer);
  // The offer's own option (per guest, per slot) — the quote names the calculator's model.
  return { ...terms.quote, model: terms.model, rate: terms.rate };
}

/** The negotiation's side of the row: the ask on the agreed (or current) terms and where it stands. */
function askOf(offer: VenueOffer | null) {
  if (!offer) {
    return { min_guests: 0, max_guests: 0, offerings: [], note: '', round: 0, awaiting: null, expires_at: null };
  }
  const terms = currentTerms(offer);
  return {
    min_guests: terms.min_guests || offer.pax || 0,
    max_guests: offer.pax || 0,
    offerings: [...(terms.offerings ?? [])],
    note: terms.note ?? '',
    round: offer.round,
    awaiting: awaitingParty(offer),
    expires_at: offer.expires_at ? new Date(offer.expires_at).toISOString() : null,
  };
}

export const venueOfferStaffService = {
  async bookingTerms(venueId: string, limit?: number | null) {
    if (!Types.ObjectId.isValid(venueId)) return [];
    const slots = await VenueSlotModel.find({
      venue_id: new Types.ObjectId(venueId),
      status: { $in: ['PENDING', 'BOOKED'] },
      $or: [{ offer: { $ne: null } }, { price_snapshot: { $ne: null } }],
    })
      .select('status start_at end_at booked_by_pod_id offer price_snapshot')
      .sort({ start_at: -1 })
      .limit(Math.min(Math.max(1, Math.floor(Number(limit) || MAX_ROWS)), MAX_ROWS))
      .lean();
    const podIds = slots.map((s) => s.booked_by_pod_id).filter(Boolean);
    const pods = await PodModel.find({ _id: { $in: podIds } }).select('pod_title').lean();
    const titles = new Map(pods.map((p) => [String(p._id), p.pod_title ?? '']));
    return slots.flatMap((slot) => {
      const money = moneyOf(slot);
      if (!money) return [];
      return [
        {
          slot_id: String(slot._id),
          pod_id: slot.booked_by_pod_id ? String(slot.booked_by_pod_id) : null,
          pod_title: titles.get(String(slot.booked_by_pod_id)) ?? '',
          start_at: slot.start_at.toISOString(),
          end_at: slot.end_at.toISOString(),
          status: slot.status,
          offer_status: slot.offer?.status ?? null,
          model: money.model,
          rate: money.rate,
          ...askOf(slot.offer),
          venue_payout: money.venue_payout,
          platform_fee: money.platform_fee,
          total: money.total,
        },
      ];
    });
  },
};
