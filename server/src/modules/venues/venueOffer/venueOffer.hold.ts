/**
 * Holding a window of a venue for someone who agreed (or is agreeing) a price
 * on it: a pod, an Auto Pod waiting for its host and club, or a Pod Request.
 * One locked write for all of them — the VenueBookingLock row is bumped inside
 * the transaction, so two holders can never take one time — and one way to
 * freeze the agreed terms as the booking's price_snapshot, which is all
 * settlement reads.
 */
import { Types, type ClientSession } from 'mongoose';
import { VenueSlotModel, type IVenueSlot } from '@modules/venues/venueSlot/venueSlot.model';
import { withTransaction } from '@utils/mongoTransaction';
import { VenueBookingLockModel } from '@modules/venues/venuePricing/venueBookingLock.model';
import { loadVenue, spaceCapacity, type HoldRef } from '@modules/venues/venuePricing/venuePricing.service';
import { currentTerms } from './venueOffer.view';
import type { OfferQuote, VenueOfferHistoryEntry, VenueOfferParty, VenueOfferRequest, VenueOfferStatus } from './venueOffer.types';

type Venue = Awaited<ReturnType<typeof loadVenue>>;

/** What the caller checks and prices inside the lock, before the hold is written. */
export type PriceInLock = (venue: Venue, session: ClientSession | undefined) => Promise<{ quote: OfferQuote; start: Date; end: Date; space: string; pax: number }>;

export interface WindowHoldOptions {
  venueId: string;
  req: VenueOfferRequest;
  holder: HoldRef;
  /** PENDING waits for an answer; BOOKED takes the time now. */
  status: 'PENDING' | 'BOOKED';
  offerStatus: VenueOfferStatus;
  /** Who put the terms forward (and, when `agreed`, who closed them). */
  proposedBy: VenueOfferParty;
  /** Both sides have agreed: the quote is frozen as the booking's price now. */
  agreed: boolean;
  /** Who closed agreed terms (default: the other party). A venue committing its own terms closes them itself. */
  closedBy?: VenueOfferParty;
  priceInLock: PriceInLock;
}

/** Makes sure the venue's lock row exists, outside the transaction (an upsert race lands on 11000). */
async function ensureLockRow(venueOid: Types.ObjectId) {
  await VenueBookingLockModel.updateOne({ venue_id: venueOid }, { $setOnInsert: { version: 0 } }, { upsert: true }).catch(
    (error: { code?: number }) => {
      if (error?.code !== 11000) throw error;
    }
  );
}

function historyFor(opts: WindowHoldOptions, quote: OfferQuote, at: Date): VenueOfferHistoryEntry[] {
  const { model, rate } = opts.req;
  const offered: VenueOfferHistoryEntry = { by: opts.proposedBy, action: 'OFFER', model, rate, total: quote.total, note: '', at };
  if (!opts.agreed) return [offered];
  const closer: VenueOfferParty = opts.closedBy ?? (opts.proposedBy === 'HOST' ? 'VENUE' : 'HOST');
  return [offered, { by: closer, action: 'ACCEPT', model, rate, total: quote.total, note: '', at }];
}

/**
 * Writes the hold inside the venue's lock transaction: `priceInLock` re-checks
 * the window and prices it against what is booked right now, then the
 * VenueSlot is created for the holder. Made for this holder (`requested_by_host`):
 * a refusal, expiry or cancellation deletes it, never frees it.
 */
export async function holdWindow(opts: WindowHoldOptions): Promise<IVenueSlot> {
  const venueOid = new Types.ObjectId(opts.venueId);
  await ensureLockRow(venueOid);
  return withTransaction(async (session) => {
    await VenueBookingLockModel.updateOne({ venue_id: venueOid }, { $inc: { version: 1 } }, { session });
    const venue = await loadVenue(opts.venueId, session);
    const { quote, start, end, space, pax } = await opts.priceInLock(venue, session);
    const now = new Date();
    const holderOid = new Types.ObjectId(opts.holder.id);
    const agreedForPod = opts.agreed && opts.holder.field === 'booked_by_pod_id';
    const [slot] = await VenueSlotModel.create(
      [
        {
          venue_id: venueOid,
          owner_user_id: venue.owner_user_id,
          start_at: start,
          end_at: end,
          // Legacy readers (dashboards, slot cards) see the venue's money as a flat price.
          price: quote.venue_payout,
          pricing_mode: 'FLAT',
          overtime_rate: opts.req.model === 'PER_HOUR' ? opts.req.rate : 0,
          space_label: space,
          capacity: spaceCapacity(venue, space) || pax,
          status: opts.status,
          [opts.holder.field]: holderOid,
          requested_by_host: true,
          decision: agreedForPod ? 'APPROVED' : 'NONE',
          decided_at: agreedForPod ? now : null,
          decided_pod_id: agreedForPod ? holderOid : null,
          price_snapshot: opts.agreed ? quote : null,
          offer: {
            model: opts.req.model,
            rate: opts.req.rate,
            pax,
            pets: !!opts.req.pets,
            quote,
            status: opts.offerStatus,
            round: 1,
            counter: null,
            history: historyFor(opts, quote, now),
          },
        },
      ],
      { session }
    );
    return slot;
  });
}

/**
 * Both sides agreed the terms on the table: freeze them as the booking's price
 * (what settlement reads), record who closed it, and price extra hours at the
 * agreed hourly rate. Saving is the caller's.
 */
export function freezeAgreedTerms(slot: IVenueSlot, by: VenueOfferParty, at = new Date()) {
  const offer = slot.offer;
  if (!offer) return;
  const terms = currentTerms(offer);
  offer.history.push({ by, action: 'ACCEPT', model: terms.model, rate: terms.rate, total: terms.quote.total, note: '', at });
  offer.status = 'ACCEPTED';
  slot.price_snapshot = { ...terms.quote, confirmed_at: at };
  slot.price = terms.quote.venue_payout;
  slot.overtime_rate = terms.model === 'PER_HOUR' ? terms.rate : 0;
  slot.markModified('offer');
}
