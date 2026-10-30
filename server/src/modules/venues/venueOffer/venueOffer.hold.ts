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
import { venueOfferSettingsOf } from '@modules/venues/venue/venue.offerSettings';
import { currentTerms } from './venueOffer.view';
import type {
  FreeJustification,
  OfferCharges,
  OfferQuote,
  VenueOffer,
  VenueOfferAsk,
  VenueOfferHistoryEntry,
  VenueOfferParty,
  VenueOfferRequest,
  VenueOfferStatus,
} from './venueOffer.types';

type Venue = Awaited<ReturnType<typeof loadVenue>>;

/** An offer checked and priced inside the lock: the window, the guests, the ask and both ends of its price. */
export interface PricedOffer extends VenueOfferAsk {
  quote: OfferQuote;
  quote_min: OfferQuote;
  charges: OfferCharges;
  start: Date;
  end: Date;
  space: string;
  pax: number;
}

/** What the caller checks and prices inside the lock, before the hold is written. */
export type PriceInLock = (venue: Venue, session: ClientSession | undefined) => Promise<PricedOffer>;

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
  /** The pod is free: the venue accepts or declines the offer, nobody counters it. */
  freePod?: boolean;
  /** Why a FREE offer is free (checked by the caller); null on a priced offer. */
  freeJustification?: FreeJustification | null;
  priceInLock: PriceInLock;
}

const HOUR_MS = 3_600_000;

/** Makes sure the venue's lock row exists, outside the transaction (an upsert race lands on 11000). */
async function ensureLockRow(venueOid: Types.ObjectId) {
  await VenueBookingLockModel.updateOne({ venue_id: venueOid }, { $setOnInsert: { version: 0 } }, { upsert: true }).catch(
    (error: { code?: number }) => {
      if (error?.code !== 11000) throw error;
    }
  );
}

function historyFor(opts: WindowHoldOptions, priced: PricedOffer, at: Date): VenueOfferHistoryEntry[] {
  const { model, rate } = opts.req;
  const terms = { model, rate, total: priced.quote.total, min_guests: priced.min_guests || null };
  const offered: VenueOfferHistoryEntry = { by: opts.proposedBy, action: 'OFFER', ...terms, note: priced.note, at };
  if (!opts.agreed) return [offered];
  const closer: VenueOfferParty = opts.closedBy ?? (opts.proposedBy === 'HOST' ? 'VENUE' : 'HOST');
  return [offered, { by: closer, action: 'ACCEPT', ...terms, note: '', at }];
}

/**
 * When the other side must have answered a pod's pending offer: the venue's
 * response time from now, but never past the booking's own start — an answer
 * after that could not have run the pod anyway.
 */
export function answerDeadline(responseHours: number, startAt: Date, from = new Date()): Date {
  return new Date(Math.min(from.getTime() + Math.max(1, responseHours) * HOUR_MS, startAt.getTime()));
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
    const priced = await opts.priceInLock(venue, session);
    const { quote, start, end, space, pax } = priced;
    const now = new Date();
    const holderOid = new Types.ObjectId(opts.holder.id);
    const agreedForPod = opts.agreed && opts.holder.field === 'booked_by_pod_id';
    // Only a pod's pending offer runs on the venue's response clock; Auto Pods
    // and Pod Requests keep their own deadlines.
    const timed = !opts.agreed && opts.status === 'PENDING' && opts.holder.field === 'booked_by_pod_id';
    const expiresAt = timed ? answerDeadline((await venueOfferSettingsOf(venue)).response_hours, start, now) : null;
    const offer: VenueOffer = {
      model: opts.req.model,
      rate: opts.req.rate,
      pax,
      pets: !!opts.req.pets,
      quote,
      quote_min: priced.quote_min,
      charges: priced.charges,
      min_guests: priced.min_guests,
      offerings: priced.offerings,
      note: priced.note,
      status: opts.offerStatus,
      round: 1,
      counter: null,
      history: historyFor(opts, priced, now),
      expires_at: expiresAt,
      move: 0,
      free_pod: !!opts.freePod,
      free_justification: opts.freeJustification ?? null,
    };
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
          price_basis: opts.agreed ? basisOf({ offer }) : null,
          offer,
        },
      ],
      { session }
    );
    return slot;
  });
}

/**
 * The per-guest basis an agreed booking settles on, or null: only a PER_GUEST
 * offer with a minimum is priced again for the people who came — every other
 * booking keeps the price it was agreed at, exactly as before.
 */
export function basisOf(slot: { offer: VenueOffer | null }): IVenueSlot['price_basis'] {
  const offer = slot.offer;
  if (!offer) return null;
  const terms = currentTerms(offer);
  if (terms.model !== 'PER_GUEST' || !(terms.min_guests > 0) || !terms.charges) return null;
  return { model: terms.model, rate: terms.rate, min_guests: terms.min_guests, pets: offer.pets, charges: terms.charges };
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
  offer.history.push({
    by,
    action: 'ACCEPT',
    model: terms.model,
    rate: terms.rate,
    total: terms.quote.total,
    min_guests: terms.min_guests || null,
    note: '',
    at,
  });
  slot.price_basis = basisOf(slot);
  offer.status = 'ACCEPTED';
  offer.expires_at = null;
  slot.price_snapshot = { ...terms.quote, confirmed_at: at };
  slot.price = terms.quote.venue_payout;
  slot.overtime_rate = terms.model === 'PER_HOUR' ? terms.rate : 0;
  slot.markModified('offer');
}
