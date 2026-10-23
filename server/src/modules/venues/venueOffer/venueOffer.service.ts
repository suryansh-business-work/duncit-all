/**
 * Venue booking by offer. The host names the window, the guests and the price
 * terms; the server prices them with the venue's own charges and holds the
 * time for the pod as a PENDING VenueSlot carrying the offer. The venue
 * accepts (venueSlot.approveRequest), rejects (declineRequest) or counters
 * (here); a counter is accepted or rejected by the host (here). Accepting
 * freezes the agreed quote as the booking's price_snapshot, which is all
 * settlement reads. A host booking their own venue confirms at once.
 */
import { GraphQLError } from 'graphql';
import { Types, type ClientSession } from 'mongoose';
import { VenueSlotModel, type IVenueSlot } from '@modules/venues/venueSlot/venueSlot.model';
import { applyApproval, applyDecline } from '@modules/venues/venueSlot/venueSlot.service';
import { PodModel } from '@modules/pods/pod/pod.model';
import { withTransaction } from '@utils/mongoTransaction';
import { getAppTimeZone, appDateTime } from '@utils/app-time';
import { logs } from '@observability/log';
import {
  busyWindows,
  fail,
  loadVenue,
  moneyRates,
  parseWindow,
  pricingOf,
  spaceCapacity,
} from '@modules/venues/venuePricing/venuePricing.service';
import { checkBookable } from '@modules/venues/venuePricing/venuePricing.availability';
import { VenueBookingLockModel } from '@modules/venues/venuePricing/venueBookingLock.model';
import { quoteOffer, termsProblem } from './venueOffer.quote';
import { offerView } from './venueOffer.view';
import type { OfferQuote, VenueOfferHistoryEntry, VenueOfferRequest, VenueOfferTerms } from './venueOffer.types';

const DAY_MS = 86_400_000;
const NOTE_MAX = 280;

type Venue = Awaited<ReturnType<typeof loadVenue>>;

function assertTerms(terms: Partial<VenueOfferTerms>) {
  const problem = termsProblem(terms);
  if (problem) fail('BAD_USER_INPUT', problem);
}

const guestsOf = (req: Pick<VenueOfferRequest, 'pax'>) => Math.max(0, Math.floor(Number(req.pax) || 0));

/** The pod's spots ARE the booking's guests: at least one, and no more than the space holds. */
function assertGuestsFit(venue: Venue, space: string, pax: number) {
  if (pax < 1) fail('BAD_USER_INPUT', 'Pick how many guests are coming');
  const capacity = spaceCapacity(venue, space);
  if (capacity > 0 && pax > capacity) fail('BAD_USER_INPUT', `This space holds ${capacity} people — pick ${capacity} spots or fewer`);
}

/** The window must be open at the venue and free of other bookings (the pod's own excepted). */
async function assertWindowFree(
  venue: Venue,
  venueId: string,
  space: string,
  window: { start: Date; end: Date },
  opts: { session?: ClientSession; ignorePodId?: string } = {}
) {
  const busy = await busyWindows(
    venueId,
    space,
    new Date(window.start.getTime() - DAY_MS),
    new Date(window.end.getTime() + DAY_MS),
    opts.session,
    opts.ignorePodId
  );
  const check = checkBookable(
    { pricing: pricingOf(venue), settings: venue.settings, busy, now: new Date(), timeZone: getAppTimeZone() },
    window.start,
    window.end
  );
  if (!check.ok) fail('CONFLICT', check.message);
}

async function priced(
  venue: Venue,
  venueId: string,
  terms: VenueOfferTerms,
  window: { start: Date; end: Date },
  guests: { pax: number; pets: boolean }
): Promise<OfferQuote> {
  const rates = await moneyRates(venueId);
  const result = quoteOffer(pricingOf(venue), terms, {
    start: window.start,
    end: window.end,
    pax: guests.pax,
    pets: guests.pets,
    commissionPct: rates.commissionPct,
    gstPct: rates.gstPct,
    timeZone: getAppTimeZone(),
  });
  if (!result.ok) fail('BAD_USER_INPUT', result.message);
  return { ...(result as Extract<typeof result, { ok: true }>).breakdown, confirmed_at: new Date() };
}

/** In-app note to the pod's hosts. Best-effort: never fails the move. */
async function tellHosts(podId: unknown, title: string, body: string) {
  try {
    const pod = await PodModel.findById(podId).select('pod_hosts_id').lean();
    if (!pod) return;
    const { notificationService } = await import('@modules/engagement/notification/notification.service');
    await notificationService.create({ title, body, scope: 'USER', target_user_ids: (pod.pod_hosts_id ?? []).map(String), silent: false });
  } catch (error) {
    logs.server.error('venueOffer', 'tellHosts', { error, pod_id: String(podId) });
  }
}

async function loadSlot(slotId: string) {
  if (!Types.ObjectId.isValid(slotId)) fail('BAD_USER_INPUT', 'Invalid booking');
  const slot = await VenueSlotModel.findById(slotId);
  if (!slot) fail('NOT_FOUND', 'Booking not found');
  return slot!;
}

/** A pending offer its venue's owner is countering, priced at their terms for its own window. */
async function pricedCounter(userId: string, slotId: string, terms: VenueOfferTerms) {
  const slot = await loadSlot(slotId);
  if (String(slot.owner_user_id) !== String(userId)) fail('FORBIDDEN', 'Not your venue');
  if (slot.status !== 'PENDING' || !slot.offer || !['SENT', 'COUNTERED'].includes(slot.offer.status)) {
    fail('BAD_REQUEST', 'This booking has no offer to answer');
  }
  if (slot.start_at.getTime() <= Date.now()) fail('BAD_REQUEST', 'This booking has already started and can no longer be answered');
  assertTerms(terms);
  const offer = slot.offer!;
  const venue = await loadVenue(String(slot.venue_id));
  const quote = await priced(venue, String(slot.venue_id), terms, { start: slot.start_at, end: slot.end_at }, { pax: offer.pax, pets: offer.pets });
  return { slot, offer, quote };
}

/** The pending offer of a pod its host is answering, checked to be theirs and countered. */
async function countered(userId: string, podId: string) {
  if (!Types.ObjectId.isValid(podId)) fail('BAD_USER_INPUT', 'Invalid pod');
  const pod = await PodModel.findById(podId).select('pod_hosts_id pod_title');
  if (!pod) fail('NOT_FOUND', 'Pod not found');
  if (!(pod!.pod_hosts_id ?? []).map(String).includes(String(userId))) fail('FORBIDDEN', 'Only the pod host can answer this offer');
  const slot = await VenueSlotModel.findOne({ booked_by_pod_id: new Types.ObjectId(podId), status: 'PENDING', 'offer.status': 'COUNTERED' });
  if (!slot) fail('BAD_REQUEST', 'There is no counter offer waiting for you on this pod');
  if (slot!.start_at.getTime() <= Date.now()) fail('BAD_REQUEST', 'This booking has already started and can no longer be answered');
  return slot!;
}

export const venueOfferService = {
  /**
   * The offer checked and priced, before anything is written: the venue is
   * approved and open then, the guests fit the space, the terms are sound.
   * `ignorePodId` lets a pod moving its booking ignore the booking it leaves.
   */
  async prepare(venueId: string, req: VenueOfferRequest, ignorePodId?: string) {
    const venue = await loadVenue(venueId);
    if (venue.status !== 'APPROVED' || !venue.is_active) fail('BAD_USER_INPUT', 'Select an approved venue');
    assertTerms(req);
    const space = (req.space_label ?? '').trim();
    const pax = guestsOf(req);
    assertGuestsFit(venue, space, pax);
    const window = parseWindow(req);
    await assertWindowFree(venue, venueId, space, window, { ignorePodId });
    const quote = await priced(venue, venueId, req, window, { pax, pets: !!req.pets });
    return { quote, ...window, space, pax, ownerUserId: String(venue.owner_user_id) };
  },

  /** Create Pod's live price: the breakdown, or why the offer cannot be sent (never throws for that). */
  async preview(venueId: string, req: VenueOfferRequest) {
    try {
      const { quote } = await this.prepare(venueId, req);
      return { ok: true, message: null, quote: { ...quote, confirmed_at: null } };
    } catch (error) {
      if (error instanceof GraphQLError) return { ok: false, message: error.message, quote: null };
      throw error;
    }
  },

  /**
   * Holds the window for the pod, atomically — the same lock-row transaction
   * the venue's calendar has always been guarded by, so two pods can never
   * hold one time. Another partner's venue gets a PENDING offer; the host's
   * own venue is confirmed at once with the quote frozen.
   */
  async place(podId: string, venueId: string, req: VenueOfferRequest, own: boolean): Promise<IVenueSlot> {
    const venueOid = new Types.ObjectId(venueId);
    await VenueBookingLockModel.updateOne({ venue_id: venueOid }, { $setOnInsert: { version: 0 } }, { upsert: true }).catch(
      (error: { code?: number }) => {
        // Two first bookings racing to create the row: the loser's row already exists.
        if (error?.code !== 11000) throw error;
      }
    );
    const space = (req.space_label ?? '').trim();
    const pax = guestsOf(req);
    return withTransaction(async (session) => {
      await VenueBookingLockModel.updateOne({ venue_id: venueOid }, { $inc: { version: 1 } }, { session });
      const venue = await loadVenue(venueId, session);
      assertTerms(req);
      assertGuestsFit(venue, space, pax);
      const window = parseWindow(req);
      await assertWindowFree(venue, venueId, space, window, { session, ignorePodId: podId });
      const quote = await priced(venue, venueId, req, window, { pax, pets: !!req.pets });
      const now = new Date();
      const history: VenueOfferHistoryEntry[] = [{ by: 'HOST', action: 'OFFER', model: req.model, rate: req.rate, total: quote.total, note: '', at: now }];
      if (own) history.push({ by: 'VENUE', action: 'ACCEPT', model: req.model, rate: req.rate, total: quote.total, note: '', at: now });
      const [slot] = await VenueSlotModel.create(
        [
          {
            venue_id: venueOid,
            owner_user_id: venue.owner_user_id,
            start_at: window.start,
            end_at: window.end,
            // Legacy readers (dashboards, slot cards) see the venue's money as a flat price.
            price: quote.venue_payout,
            pricing_mode: 'FLAT',
            overtime_rate: req.model === 'PER_HOUR' ? req.rate : 0,
            space_label: space,
            capacity: spaceCapacity(venue, space) || pax,
            status: own ? 'BOOKED' : 'PENDING',
            booked_by_pod_id: new Types.ObjectId(podId),
            // Made for this pod: a refusal, expiry or cancellation deletes it, never frees it.
            requested_by_host: true,
            decision: own ? 'APPROVED' : 'NONE',
            decided_at: own ? now : null,
            decided_pod_id: own ? new Types.ObjectId(podId) : null,
            price_snapshot: own ? quote : null,
            offer: {
              model: req.model,
              rate: req.rate,
              pax,
              pets: !!req.pets,
              quote,
              status: own ? 'ACCEPTED' : 'SENT',
              round: 1,
              counter: null,
              history,
            },
          },
        ],
        { session }
      );
      logs.server.info('venueOffer', 'place', { pod_id: podId, venue_id: venueId, own, total: quote.total });
      return slot;
    });
  },

  /** The venue answers an offer with its own terms; the host then accepts or rejects them. */
  /** The venue's counter priced before it is sent — exactly what `counter` would freeze. Never throws for a refusal. */
  async counterPreview(userId: string, slotId: string, terms: VenueOfferTerms) {
    try {
      const { quote } = await pricedCounter(userId, slotId, terms);
      return { ok: true, message: null, quote: { ...quote, confirmed_at: null } };
    } catch (error) {
      if (error instanceof GraphQLError) return { ok: false, message: error.message, quote: null };
      throw error;
    }
  },

  async counter(userId: string, slotId: string, terms: VenueOfferTerms, note?: string | null) {
    const text = String(note ?? '').trim();
    if (text.length > NOTE_MAX) fail('BAD_USER_INPUT', `Keep the note under ${NOTE_MAX} characters`);
    const { slot, offer, quote } = await pricedCounter(userId, slotId, terms);
    const at = new Date();
    offer.counter = { model: terms.model, rate: terms.rate, quote, note: text, at };
    offer.status = 'COUNTERED';
    offer.round += 1;
    offer.history.push({ by: 'VENUE', action: 'COUNTER', model: terms.model, rate: terms.rate, total: quote.total, note: text, at });
    slot.markModified('offer');
    await slot.save();
    await tellHosts(
      slot.booked_by_pod_id,
      'The venue sent a counter offer',
      `The venue proposed different terms for your booking on ${appDateTime(slot.start_at)}. Accept or decline them on your pod.`
    );
    logs.server.info('venueOffer', 'counter', { slot_id: slotId, total: quote.total });
    return offerView(slot)!;
  },

  /** The host takes the venue's counter: the booking is confirmed at those terms and the pod goes live. */
  async hostAccept(userId: string, podId: string) {
    const slot = await countered(userId, podId);
    await applyApproval(slot, { source: 'HOST', actorUserId: String(userId), note: "Host accepted the venue's counter offer" });
    return offerView(slot)!;
  },

  /** The host turns the venue's counter down: the hold goes and the pod is venue-declined (editable, resubmittable). */
  async hostReject(userId: string, podId: string, reason?: string | null) {
    const slot = await countered(userId, podId);
    await applyDecline(slot, String(reason ?? ''), {
      source: 'HOST',
      actorUserId: String(userId),
      fallbackNote: "Host declined the venue's counter offer",
    });
    return true;
  },

  /** A pod's venue offer, for its hosts and the venue's owner. Null when the pod has none. */
  async forPod(userId: string, podId: string) {
    if (!Types.ObjectId.isValid(podId)) fail('BAD_USER_INPUT', 'Invalid pod');
    const pod = await PodModel.findById(podId).select('pod_hosts_id venue_slot_id').lean();
    if (!pod) fail('NOT_FOUND', 'Pod not found');
    const slot = await VenueSlotModel.findOne({
      $or: [{ _id: pod!.venue_slot_id ?? null }, { booked_by_pod_id: new Types.ObjectId(podId) }],
      offer: { $ne: null },
    });
    if (!slot) return null;
    const isHost = (pod!.pod_hosts_id ?? []).map(String).includes(String(userId));
    if (!isHost && String(slot.owner_user_id) !== String(userId)) fail('FORBIDDEN', 'Not your pod');
    return offerView(slot);
  },
};
