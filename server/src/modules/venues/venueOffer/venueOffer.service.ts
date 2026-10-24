/**
 * Venue booking by offer. The host names the window, the guests (the venue's
 * minimum up to the pod's spots), the price terms and what the venue should
 * provide; the server prices them with the venue's own charges and holds the
 * time for the pod as a PENDING VenueSlot carrying the offer. Then the two
 * sides bargain in the pod's venue chat: whoever's move it is accepts
 * (venueSlot.approveRequest / hostAccept), rejects (declineRequest /
 * hostReject) or counters (counter / hostCounter) — until one side accepts,
 * one rejects or the answer runs past the venue's response time. Accepting
 * freezes the agreed quote as the booking's price_snapshot (and, per guest, the
 * basis it is priced again on at completion). A host booking their own venue
 * confirms at once.
 *
 * Every move is written against the offer as the mover read it (venueOffer.cas)
 * so two answers can never both land; every move is posted to the chat and
 * told to the other side.
 */
import { GraphQLError } from 'graphql';
import { Types, type ClientSession } from 'mongoose';
import { VenueSlotModel, type IVenueSlot } from '@modules/venues/venueSlot/venueSlot.model';
import { applyApproval, applyDecline } from '@modules/venues/venueSlot/venueSlot.service';
import { PodModel } from '@modules/pods/pod/pod.model';
import { venueOfferSettingsOf } from '@modules/venues/venue/venue.offerSettings';
import { getAppTimeZone } from '@utils/app-time';
import { logs } from '@observability/log';
import {
  busyWindows,
  fail,
  loadVenue,
  moneyRates,
  parseWindow,
  pricingOf,
  spaceCapacity,
  type HoldRef,
} from '@modules/venues/venuePricing/venuePricing.service';
import { checkBookable } from '@modules/venues/venuePricing/venuePricing.availability';
import { cleanMinGuests, cleanOfferNote, cleanOfferings } from './venueOffer.ask';
import { asRead, assertRound, nextMove, staleOffer } from './venueOffer.cas';
import { postOfferLine } from './venueOffer.chat';
import { answerDeadline, holdWindow, type PricedOffer } from './venueOffer.hold';
import { inAppOfferNote, tellHostsOfCounter, tellVenueOfOffer } from './venueOffer.notify';
import { frozenCharges, quoteProposal, termsProblem } from './venueOffer.quote';
import { currentTerms, offerView } from './venueOffer.view';
import type {
  OfferCharges,
  OfferQuote,
  VenueOffer,
  VenueOfferProposal,
  VenueOfferRequest,
  VenueOfferTerms,
} from './venueOffer.types';

const DAY_MS = 86_400_000;

type Venue = Awaited<ReturnType<typeof loadVenue>>;

/** A counter's terms: the price, and optionally a new minimum and new points (omitted = unchanged). */
export interface VenueOfferMoveTerms extends VenueOfferTerms {
  min_guests?: number | null;
  offerings?: string[] | null;
}

function assertTerms(terms: Partial<VenueOfferTerms>) {
  const problem = termsProblem(terms);
  if (problem) fail('BAD_USER_INPUT', problem);
}

const guestsOf = (req: Pick<VenueOfferRequest, 'pax'>) => Math.max(0, Math.floor(Number(req.pax) || 0));

/** The pod's spots ARE the booking's most guests: at least one, and no more than the space holds. */
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
  opts: { session?: ClientSession; ignore?: string | HoldRef } = {}
) {
  const busy = await busyWindows(
    venueId,
    space,
    new Date(window.start.getTime() - DAY_MS),
    new Date(window.end.getTime() + DAY_MS),
    opts.session,
    opts.ignore
  );
  const check = checkBookable(
    { pricing: pricingOf(venue), settings: venue.settings, busy, now: new Date(), timeZone: getAppTimeZone() },
    window.start,
    window.end
  );
  if (!check.ok) fail('CONFLICT', check.message);
}

/** Terms priced at both ends of the guests, with the venue charges they were priced on. */
async function pricedProposal(
  venue: Venue,
  venueId: string,
  terms: VenueOfferTerms,
  window: { start: Date; end: Date },
  guests: { pax: number; pets: boolean; min: number }
): Promise<{ quote: OfferQuote; quote_min: OfferQuote; charges: OfferCharges }> {
  const rates = await moneyRates(venueId);
  const charges = pricingOf(venue);
  const result = quoteProposal(
    charges,
    terms,
    {
      start: window.start,
      end: window.end,
      pax: guests.pax,
      pets: guests.pets,
      commissionPct: rates.commissionPct,
      gstPct: rates.gstPct,
      timeZone: getAppTimeZone(),
    },
    guests.min
  );
  if (!result.ok) fail('BAD_USER_INPUT', result.message);
  const ok = result as Extract<typeof result, { ok: true }>;
  const at = new Date();
  return { quote: { ...ok.quote, confirmed_at: at }, quote_min: { ...ok.quote_min, confirmed_at: at }, charges: frozenCharges(charges) };
}

/**
 * An offer for a window of this venue, checked against what is booked now and
 * priced: the terms are sound, the guests fit the space, the venue is open then
 * and the time is free (the holder's own hold excepted). Run it inside the lock
 * transaction to write a hold on it; outside, for a preview. A minimum, points
 * and a note ride along only when the request carries them (Create Pod and
 * resubmit do; Auto Pods, Pod Requests and change requests settle as before).
 */
export async function checkAndPrice(
  venue: Venue,
  venueId: string,
  req: VenueOfferRequest,
  opts: { session?: ClientSession; ignore?: string | HoldRef } = {}
): Promise<PricedOffer> {
  assertTerms(req);
  const space = (req.space_label ?? '').trim();
  const pax = guestsOf(req);
  assertGuestsFit(venue, space, pax);
  const window = parseWindow(req);
  await assertWindowFree(venue, venueId, space, window, opts);
  const min = Number(req.min_guests) > 0 ? cleanMinGuests(req.min_guests, pax) : 0;
  const offerings = cleanOfferings(req.offerings, false);
  const note = cleanOfferNote(req.note);
  const priced = await pricedProposal(venue, venueId, req, window, { pax, pets: !!req.pets, min });
  return { ...priced, start: window.start, end: window.end, space, pax, min_guests: min, offerings, note };
}

/** An approved, active venue, or BAD_USER_INPUT. */
export async function loadBookableVenue(venueId: string, session?: ClientSession) {
  const venue = await loadVenue(venueId, session);
  if (venue.status !== 'APPROVED' || !venue.is_active) fail('BAD_USER_INPUT', 'Select an approved venue');
  return venue;
}

const refuse = (code: string, message: string) => new GraphQLError(message, { extensions: { code } });

/** A booking with an offer on it — what every move below works on. */
type OfferSlot = IVenueSlot & { offer: VenueOffer };

async function loadSlot(slotId: string) {
  if (!Types.ObjectId.isValid(slotId)) throw refuse('BAD_USER_INPUT', 'Invalid booking');
  const slot = await VenueSlotModel.findById(slotId);
  if (!slot) throw refuse('NOT_FOUND', 'Booking not found');
  return slot;
}

/** The booking's offer, still waiting on an answer, or why it cannot be answered. */
function pendingOffer(slot: IVenueSlot, statuses: readonly VenueOffer['status'][]): OfferSlot {
  const offer = slot.offer;
  if (slot.status !== 'PENDING' || !offer || !statuses.includes(offer.status)) {
    throw refuse('BAD_REQUEST', 'This booking has no offer to answer');
  }
  if (slot.start_at.getTime() <= Date.now()) {
    throw refuse('BAD_REQUEST', 'This booking has already started and can no longer be answered');
  }
  return Object.assign(slot, { offer });
}

/** A pending offer its venue's owner is answering: theirs, still open, not yet started. */
async function venueAnswering(userId: string, slotId: string): Promise<OfferSlot> {
  const slot = await loadSlot(slotId);
  if (String(slot.owner_user_id) !== String(userId)) throw refuse('FORBIDDEN', 'Not your venue');
  // The venue answers the host's terms, and may revise its own counter while the host has not answered it.
  return pendingOffer(slot, ['SENT', 'COUNTERED']);
}

/** The pending offer of a pod its host is answering: theirs, and the venue's terms waiting on them. */
async function countered(userId: string, podId: string): Promise<OfferSlot> {
  if (!Types.ObjectId.isValid(podId)) throw refuse('BAD_USER_INPUT', 'Invalid pod');
  const pod = await PodModel.findById(podId).select('pod_hosts_id pod_title');
  if (!pod) throw refuse('NOT_FOUND', 'Pod not found');
  if (!(pod.pod_hosts_id ?? []).map(String).includes(String(userId))) throw refuse('FORBIDDEN', 'Only the pod host can answer this offer');
  const slot = await VenueSlotModel.findOne({ booked_by_pod_id: new Types.ObjectId(podId), status: 'PENDING', 'offer.status': 'COUNTERED' });
  if (!slot) throw refuse('BAD_REQUEST', 'There is no counter offer waiting for you on this pod');
  return pendingOffer(slot, ['COUNTERED']);
}

/** A move's terms priced: always with its fewest-guests price and the charges it was priced on. */
type PricedProposal = VenueOfferProposal & { quote_min: OfferQuote; charges: OfferCharges };

/**
 * A move's terms, priced for the booking's own window and guests with the
 * venue's charges as they are now. A minimum or points left out are carried
 * over from the terms being answered; the note is the mover's own.
 */
async function pricedMove(slot: OfferSlot, terms: VenueOfferMoveTerms, note: string | null | undefined): Promise<PricedProposal> {
  assertTerms(terms);
  const offer = slot.offer;
  const answering = currentTerms(offer);
  const min = cleanMinGuests(terms.min_guests ?? (answering.min_guests || offer.pax), offer.pax);
  const offerings = terms.offerings ? cleanOfferings(terms.offerings, false) : [...(answering.offerings ?? [])];
  const text = cleanOfferNote(note);
  const venue = await loadVenue(String(slot.venue_id));
  const priced = await pricedProposal(
    venue,
    String(slot.venue_id),
    terms,
    { start: slot.start_at, end: slot.end_at },
    { pax: offer.pax, pets: offer.pets, min }
  );
  return { model: terms.model, rate: terms.rate, ...priced, min_guests: min, offerings, note: text };
}

/** When the side being answered must reply by: the venue's response time, never past the start. */
async function deadlineFor(slot: IVenueSlot): Promise<Date> {
  const venue = await loadVenue(String(slot.venue_id));
  return answerDeadline((await venueOfferSettingsOf(venue)).response_hours, slot.start_at);
}

const historyOf = (by: 'HOST' | 'VENUE', p: VenueOfferProposal, at: Date) => ({
  by,
  action: 'COUNTER' as const,
  model: p.model,
  rate: p.rate,
  total: p.quote.total,
  min_guests: p.min_guests,
  note: p.note,
  at,
});

/** The pod a booking is for, and its lead host — who a host-side line is posted as by default. */
async function podOf(slot: IVenueSlot): Promise<{ podId: string; leadHostId: string; hostIds: string[] } | null> {
  const podId = slot.booked_by_pod_id ?? slot.decided_pod_id;
  if (!podId) return null;
  const pod = await PodModel.findById(podId).select('pod_hosts_id').lean();
  const hostIds = (pod?.pod_hosts_id ?? []).map(String);
  return { podId: String(podId), leadHostId: hostIds[0] ?? '', hostIds };
}

/**
 * After the venue's counter landed: the line in the chat, and every host told
 * in the app, by email and on WhatsApp. Fire-and-forget from the move.
 */
async function announceVenueCounter(slot: IVenueSlot, terms: VenueOfferProposal) {
  const pod = await podOf(slot);
  if (!pod || !slot.offer) return;
  const move = { event: 'COUNTER' as const, by: 'VENUE' as const, round: slot.offer.round, expiresAt: slot.offer.expires_at };
  const text = await postOfferLine({ podId: pod.podId, slot, terms, side: 'VENUE', hostId: pod.leadHostId, move });
  await inAppOfferNote(pod.hostIds, 'The venue sent a counter offer', text, pod.podId);
  await tellHostsOfCounter({ slot, podId: pod.podId, terms, round: slot.offer.round });
}

/** After a host's offer or counter landed: the line in the chat and the venue told. */
async function announceHostTerms(slot: IVenueSlot, terms: VenueOfferProposal, event: 'OFFER' | 'COUNTER', hostId?: string | null) {
  const pod = await podOf(slot);
  if (!pod || !slot.offer) return;
  const mover = hostId || pod.leadHostId;
  const move = { event, by: 'HOST' as const, round: slot.offer.round, expiresAt: slot.offer.expires_at };
  const text = await postOfferLine({ podId: pod.podId, slot, terms, side: 'HOST', hostId: mover, move });
  const title = event === 'OFFER' ? 'New booking offer' : 'The host countered your terms';
  await inAppOfferNote([slot.owner_user_id], title, text, pod.podId);
  await tellVenueOfOffer({ slot, podId: pod.podId, terms, round: slot.offer.round, actorHostId: mover });
}

/** A move's announcement failed after the move itself landed: logged, never thrown. */
const announceFailed = (what: string) => (error: unknown) => logs.server.error('venueOffer', what, { error });

export const venueOfferService = {
  /**
   * The offer checked and priced, before anything is written: the venue is
   * approved and open then, the guests fit the space, the terms are sound.
   * `ignorePodId` lets a pod moving its booking ignore the booking it leaves.
   */
  async prepare(venueId: string, req: VenueOfferRequest, ignore?: string | HoldRef) {
    const venue = await loadBookableVenue(venueId);
    const priced = await checkAndPrice(venue, venueId, req, { ignore });
    return { ...priced, ownerUserId: String(venue.owner_user_id) };
  },

  /** Create Pod's live price: the breakdown at both ends of the guests, or why the offer cannot be sent (never throws for that). */
  async preview(venueId: string, req: VenueOfferRequest, ignore?: string | HoldRef) {
    try {
      const { quote, quote_min } = await this.prepare(venueId, req, ignore);
      return { ok: true, message: null, quote: { ...quote, confirmed_at: null }, quote_min: { ...quote_min, confirmed_at: null } };
    } catch (error) {
      if (error instanceof GraphQLError) return { ok: false, message: error.message, quote: null, quote_min: null };
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
    const slot = await holdWindow({
      venueId,
      req,
      holder: { field: 'booked_by_pod_id', id: podId },
      status: own ? 'BOOKED' : 'PENDING',
      offerStatus: own ? 'ACCEPTED' : 'SENT',
      proposedBy: 'HOST',
      agreed: own,
      priceInLock: (venue, session) => checkAndPrice(venue, venueId, req, { session, ignore: podId }),
    });
    logs.server.info('venueOffer', 'place', { pod_id: podId, venue_id: venueId, own, total: slot.offer?.quote.total ?? null });
    return slot;
  },

  /**
   * A new offer is on the venue's table: posted to the chat and told to the
   * venue. Called once the pod points at its hold; never throws.
   */
  announcePlaced(slot: IVenueSlot) {
    if (!slot.offer) return;
    announceHostTerms(slot, currentTerms(slot.offer), 'OFFER').catch(announceFailed('announcePlaced'));
  },

  /** The venue's counter priced before it is sent — exactly what `counter` would freeze. Never throws for a refusal. */
  async counterPreview(userId: string, slotId: string, terms: VenueOfferMoveTerms) {
    return previewOf(async () => pricedMove(await venueAnswering(userId, slotId), terms, ''));
  },

  /** A host's counter-back priced before it is sent. Never throws for a refusal. */
  async hostCounterPreview(userId: string, podId: string, terms: VenueOfferMoveTerms) {
    return previewOf(async () => pricedMove(await countered(userId, podId), terms, ''));
  },

  /** The venue answers the host's terms with its own; the host then accepts, rejects or counters back. */
  async counter(userId: string, slotId: string, terms: VenueOfferMoveTerms, note?: string | null, round?: number | null) {
    const slot = await venueAnswering(userId, slotId);
    const offer = slot.offer;
    assertRound(offer, round);
    const proposal = await pricedMove(slot, terms, note);
    const at = new Date();
    const updated = await VenueSlotModel.findOneAndUpdate(
      asRead(slot),
      {
        $set: {
          'offer.counter': { ...proposal, at },
          'offer.status': 'COUNTERED',
          'offer.expires_at': await deadlineFor(slot),
          'offer.move': nextMove(offer),
        },
        $inc: { 'offer.round': 1 },
        $push: { 'offer.history': historyOf('VENUE', proposal, at) },
      },
      { new: true }
    );
    if (!updated) throw staleOffer();
    announceVenueCounter(updated, proposal).catch(announceFailed('announceVenueCounter'));
    logs.server.info('venueOffer', 'counter', { slot_id: slotId, round: updated.offer?.round, total: proposal.quote.total });
    return viewOf(updated);
  },

  /** The host answers the venue's counter with terms of their own; the venue answers next. */
  async hostCounter(userId: string, podId: string, terms: VenueOfferMoveTerms, note?: string | null, round?: number | null) {
    const slot = await countered(userId, podId);
    const offer = slot.offer;
    assertRound(offer, round);
    const proposal = await pricedMove(slot, terms, note);
    const at = new Date();
    const updated = await VenueSlotModel.findOneAndUpdate(
      asRead(slot),
      {
        $set: {
          'offer.model': proposal.model,
          'offer.rate': proposal.rate,
          'offer.quote': proposal.quote,
          'offer.quote_min': proposal.quote_min,
          'offer.charges': proposal.charges,
          'offer.min_guests': proposal.min_guests,
          'offer.offerings': proposal.offerings,
          'offer.note': proposal.note,
          // The venue's counter has been answered: the host's terms are the ones on the table.
          'offer.counter': null,
          'offer.status': 'SENT',
          'offer.expires_at': await deadlineFor(slot),
          'offer.move': nextMove(offer),
        },
        $inc: { 'offer.round': 1 },
        $push: { 'offer.history': historyOf('HOST', proposal, at) },
      },
      { new: true }
    );
    if (!updated) throw staleOffer();
    announceHostTerms(updated, proposal, 'COUNTER', String(userId)).catch(announceFailed('announceHostCounter'));
    logs.server.info('venueOffer', 'hostCounter', { pod_id: podId, round: updated.offer?.round, total: proposal.quote.total });
    return viewOf(updated);
  },

  /** The host takes the venue's counter: the booking is confirmed at those terms and the pod goes live. */
  async hostAccept(userId: string, podId: string, round?: number | null) {
    const slot = await countered(userId, podId);
    assertRound(slot.offer, round);
    await applyApproval(slot, { source: 'HOST', actorUserId: String(userId), note: "Host accepted the venue's counter offer" });
    return viewOf(slot);
  },

  /** The host turns the venue's counter down: the hold goes and the pod is venue-declined (editable, resubmittable). */
  async hostReject(userId: string, podId: string, reason?: string | null, round?: number | null) {
    const slot = await countered(userId, podId);
    assertRound(slot.offer, round);
    await applyDecline(slot, String(reason ?? ''), {
      source: 'HOST',
      actorUserId: String(userId),
      fallbackNote: "Host declined the venue's counter offer",
    });
    return true;
  },

  /** A pod's venue offer, for its hosts and the venue's owner. Null when the pod has none. */
  async forPod(userId: string, podId: string) {
    if (!Types.ObjectId.isValid(podId)) throw refuse('BAD_USER_INPUT', 'Invalid pod');
    const pod = await PodModel.findById(podId).select('pod_hosts_id venue_slot_id').lean();
    if (!pod) throw refuse('NOT_FOUND', 'Pod not found');
    const slot = await VenueSlotModel.findOne({
      $or: [{ _id: pod.venue_slot_id ?? null }, { booked_by_pod_id: new Types.ObjectId(podId) }],
      offer: { $ne: null },
    });
    if (!slot) return null;
    const isHost = (pod.pod_hosts_id ?? []).map(String).includes(String(userId));
    if (!isHost && String(slot.owner_user_id) !== String(userId)) throw refuse('FORBIDDEN', 'Not your pod');
    return offerView(slot);
  },
};

/** A booking's offer view, for a mutation that promises one. */
function viewOf(slot: IVenueSlot) {
  const view = offerView(slot);
  if (!view) throw refuse('NOT_FOUND', 'Booking not found');
  return view;
}

/** A move priced for its preview: the breakdown at both ends, or why it cannot be sent. Never throws for a refusal. */
async function previewOf(price: () => Promise<PricedProposal>) {
  try {
    const priced = await price();
    return { ok: true, message: null, quote: { ...priced.quote, confirmed_at: null }, quote_min: { ...priced.quote_min, confirmed_at: null } };
  } catch (error) {
    if (error instanceof GraphQLError) return { ok: false, message: error.message, quote: null, quote_min: null };
    throw error;
  }
}
