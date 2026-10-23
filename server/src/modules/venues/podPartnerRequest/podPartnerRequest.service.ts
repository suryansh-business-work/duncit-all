import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { assertActiveHost } from '@modules/pods/pod/pod.validation';
import { moderationService } from '@modules/moderation/moderation.service';
import { releasePartnerRequestSlot } from '@modules/venues/venueSlot/venueSlot.partnerHold';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { holdWindow, freezeAgreedTerms } from '@modules/venues/venueOffer/venueOffer.hold';
import { checkAndPrice, loadBookableVenue, venueOfferService } from '@modules/venues/venueOffer/venueOffer.service';
import type { VenueOfferRequest } from '@modules/venues/venueOffer/venueOffer.types';
import type { HoldRef } from '@modules/venues/venuePricing/venuePricing.service';
import { logs } from '@observability/log';
import {
  PodPartnerRequestModel,
  type IPodPartnerRequest,
  type PartnerRequestDirection,
} from './podPartnerRequest.model';
import { notifyPartner } from './podPartnerRequest.notify';
import { quotaStatus, reserveMonthlyRequest } from './podPartnerRequest.quota';
import { pairDistanceKm } from './podPartnerRequest.search';
import { toViews, type PartnerSide } from './podPartnerRequest.view';

/** The note is read by one partner; keep it a short pitch. */
export const PARTNER_REQUEST_NOTE_MAX = 500;
const LIST_LIMIT = 100;
const DUPLICATE_KEY = 11000;

const fail = (code: string, message: string): never => {
  throw new GraphQLError(message, { extensions: { code } });
};
const oid = (id: string, label: string) => {
  if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', `Invalid ${label}`);
  return new Types.ObjectId(id);
};

/** Who sent it. The OTHER side accepts it and picks the slot; the sender confirms the slot. */
const senderOf = (d: PartnerRequestDirection): PartnerSide => (d === 'VENUE_TO_HOST' ? 'VENUE' : 'HOST');
const receiverOf = (d: PartnerRequestDirection): PartnerSide => (d === 'VENUE_TO_HOST' ? 'HOST' : 'VENUE');

/** Which side of `doc` the caller is on — or FORBIDDEN, so nobody else can read or move it. */
function sideOf(doc: IPodPartnerRequest, userId: string): PartnerSide {
  if (String(doc.host_user_id) === userId) return 'HOST';
  if (String(doc.venue_owner_user_id) === userId) return 'VENUE';
  return fail('FORBIDDEN', 'This request is not yours');
}

async function loadFor(userId: string, id: string) {
  const doc = await PodPartnerRequestModel.findById(oid(id, 'request id'));
  if (!doc) return fail('NOT_FOUND', 'Request not found');
  return { doc, side: sideOf(doc, userId) };
}

/** One conditional write per transition: a stale tap or a race lands on CONFLICT, never a double move. */
async function transition(id: Types.ObjectId, from: string, set: Record<string, unknown>) {
  const doc = await PodPartnerRequestModel.findOneAndUpdate({ _id: id, status: from }, { $set: set }, { new: true });
  if (!doc) fail('CONFLICT', 'This request has moved on — refresh to see where it is.');
  return doc as IPodPartnerRequest;
}

/** Pod Requests agree a window and a price now; an app that still picks a published slot is told to update. */
export const UPDATE_APP_FOR_POD_REQUEST = 'Pod Requests now agree a time and a price. Please update the app to continue.';

const holdOf = (id: Types.ObjectId | string): HoldRef => ({ field: 'booked_by_partner_request_id', id: String(id) });

/** The proposal the confirming side agrees to: its terms become the booking's price. */
async function freezeProposal(doc: IPodPartnerRequest, by: PartnerSide) {
  if (!doc.slot_id) return;
  const slot = await VenueSlotModel.findOne({ _id: doc.slot_id, booked_by_partner_request_id: doc._id });
  // A slot picked before proposals (legacy) carries no offer and settles as it always did.
  if (!slot?.offer) return;
  freezeAgreedTerms(slot, by);
  await slot.save();
}

export interface SendPartnerRequestInput {
  direction: PartnerRequestDirection;
  venue_id: string;
  host_user_id?: string | null;
  note?: string | null;
}

export const podPartnerRequestService = {
  /** A venue asks a host, or a host asks a venue — within the sender's monthly allowance. */
  async send(callerId: string, input: SendPartnerRequestInput) {
    const note = (input.note ?? '').trim();
    if (note.length > PARTNER_REQUEST_NOTE_MAX) fail('BAD_USER_INPUT', `Note must be at most ${PARTNER_REQUEST_NOTE_MAX} characters`);
    if (note) moderationService.assertCleanOrThrow({ pod_title: '', pod_description: note });
    const venue = await VenueModel.findById(oid(input.venue_id, 'venue id')).select('owner_user_id status is_active').lean();
    if (venue?.status !== 'APPROVED' || !venue.is_active) return fail('NOT_FOUND', 'Venue not available');
    const ownerId = String(venue.owner_user_id);

    let hostUserId: string;
    if (input.direction === 'VENUE_TO_HOST') {
      if (ownerId !== callerId) fail('FORBIDDEN', 'Not your venue');
      hostUserId = String(oid(input.host_user_id ?? '', 'host'));
      await assertActiveHost(hostUserId);
    } else {
      await assertActiveHost(callerId);
      hostUserId = callerId;
    }
    if (hostUserId === ownerId) fail('BAD_USER_INPUT', 'A venue cannot send a Pod Request to its own owner');

    const release = await reserveMonthlyRequest(
      input.direction === 'VENUE_TO_HOST' ? 'VENUE' : 'HOST',
      input.direction === 'VENUE_TO_HOST' ? input.venue_id : callerId
    );
    let doc: IPodPartnerRequest;
    try {
      doc = await PodPartnerRequestModel.create({
        direction: input.direction,
        venue_id: venue._id,
        venue_owner_user_id: venue.owner_user_id,
        host_user_id: new Types.ObjectId(hostUserId),
        note,
        distance_km: await pairDistanceKm(String(venue._id), hostUserId),
      });
    } catch (err) {
      await release();
      if ((err as { code?: number }).code === DUPLICATE_KEY) fail('CONFLICT', 'You already have an open Pod Request with this partner');
      throw err;
    }
    await notifyPartner(doc, 'REQUESTED', receiverOf(doc.direction));
    logs.server.info('pod-partner-request', 'send', { request_id: String(doc._id), direction: doc.direction });
    return (await toViews([doc], senderOf(doc.direction)))[0];
  },

  /** The receiver accepts (→ ACCEPTED) or declines (→ REJECTED). */
  async respond(callerId: string, id: string, accept: boolean) {
    const { doc, side } = await loadFor(callerId, id);
    if (side !== receiverOf(doc.direction)) fail('FORBIDDEN', 'Only the receiver can answer this request');
    const next = await transition(doc._id as Types.ObjectId, 'REQUESTED', {
      status: accept ? 'ACCEPTED' : 'REJECTED',
      is_open: accept,
      responded_at: new Date(),
    });
    await notifyPartner(next, accept ? 'ACCEPTED' : 'REJECTED', senderOf(next.direction));
    return (await toViews([next], receiverOf(next.direction)))[0];
  },

  /** The sender withdraws a request nobody has answered yet. */
  async cancel(callerId: string, id: string) {
    const { doc, side } = await loadFor(callerId, id);
    if (side !== senderOf(doc.direction)) fail('FORBIDDEN', 'Only the sender can withdraw this request');
    const next = await transition(doc._id as Types.ObjectId, 'REQUESTED', { status: 'CANCELLED', is_open: false });
    return (await toViews([next], senderOf(next.direction)))[0];
  },

/** Deprecated: picking one of the venue's published slots. Proposals carry a window and a price now. */
  async requestSlot(_callerId: string, _id: string, _slotId: string): Promise<never> {
    return fail('BAD_USER_INPUT', UPDATE_APP_FOR_POD_REQUEST);
  },

  /** What a proposal would cost, before it is sent — the receiver's live price. Never throws for a refusal. */
  async windowQuote(callerId: string, id: string, input: VenueOfferRequest) {
    const { doc, side } = await loadFor(callerId, id);
    if (side !== receiverOf(doc.direction)) fail('FORBIDDEN', 'The other side proposes the time');
    return venueOfferService.preview(String(doc.venue_id), input, holdOf(doc._id as Types.ObjectId));
  },

  /**
   * The receiver proposes a window, the guests and the price terms; the time is
   * held for this request (a BOOKED hold made for it) until the sender answers.
   */
  async proposeWindow(callerId: string, id: string, input: VenueOfferRequest) {
    const { doc, side } = await loadFor(callerId, id);
    if (side !== receiverOf(doc.direction)) fail('FORBIDDEN', 'The other side proposes the time');
    if (doc.status !== 'ACCEPTED') fail('CONFLICT', 'A time can be proposed once the request is accepted');
    const venueId = String(doc.venue_id);
    await loadBookableVenue(venueId);
    const holder = holdOf(doc._id as Types.ObjectId);
    const slot = await holdWindow({
      venueId,
      req: input,
      holder,
      status: 'BOOKED',
      offerStatus: 'SENT',
      proposedBy: side,
      agreed: false,
      priceInLock: (venue, session) => checkAndPrice(venue, venueId, input, { session, ignore: holder }),
    });
    let next: IPodPartnerRequest;
    try {
      next = await transition(doc._id as Types.ObjectId, 'ACCEPTED', {
        status: 'SLOT_REQUESTED',
        slot_id: slot._id,
        slot_start_at: slot.start_at,
        slot_end_at: slot.end_at,
        slot_requested_at: new Date(),
      });
    } catch (err) {
      // Lost the race on the request: the hold was made for nothing and goes.
      await releasePartnerRequestSlot(String(slot._id), String(doc._id));
      throw err;
    }
    await notifyPartner(next, 'SLOT_REQUESTED', senderOf(next.direction));
    return (await toViews([next], receiverOf(next.direction)))[0];
  },

  /** The sender confirms the slot (→ SLOT_CONFIRMED) or declines it (hold freed, back to ACCEPTED). */
  async respondSlot(callerId: string, id: string, confirm: boolean) {
    const { doc, side } = await loadFor(callerId, id);
    if (side !== senderOf(doc.direction)) fail('FORBIDDEN', 'The other side confirms the slot');
    const reqId = doc._id as Types.ObjectId;
    if (confirm) {
      const next = await transition(reqId, 'SLOT_REQUESTED', { status: 'SLOT_CONFIRMED', slot_confirmed_at: new Date() });
      try {
        await freezeProposal(next, side);
      } catch (err) {
        // The price could not be frozen: the confirmation does not stand, so the pod cannot be built on it.
        await PodPartnerRequestModel.updateOne({ _id: reqId, status: 'SLOT_CONFIRMED' }, { $set: { status: 'SLOT_REQUESTED', slot_confirmed_at: null } });
        throw err;
      }
      await notifyPartner(next, 'SLOT_CONFIRMED', receiverOf(next.direction));
      return (await toViews([next], senderOf(next.direction)))[0];
    }
    const slotId = doc.slot_id ? String(doc.slot_id) : '';
    const declined = await transition(reqId, 'SLOT_REQUESTED', {
      status: 'ACCEPTED',
      slot_id: null,
      slot_start_at: null,
      slot_end_at: null,
      slot_requested_at: null,
    });
    if (slotId) await releasePartnerRequestSlot(slotId, String(reqId));
    // The notice names the slot that was turned down, so it reads from the pre-decline doc.
    await notifyPartner(doc, 'SLOT_DECLINED', receiverOf(doc.direction));
    return (await toViews([declined], senderOf(declined.direction)))[0];
  },

  /** One request, as its caller's side sees it. */
  async get(callerId: string, id: string) {
    const { doc, side } = await loadFor(callerId, id);
    return (await toViews([doc], side))[0];
  },

  /** The caller's requests on one side (as the host, or as owner of their venues). */
  async list(callerId: string, side: PartnerSide, direction?: PartnerRequestDirection | null, venueId?: string | null) {
    const me = new Types.ObjectId(callerId);
    const filter: Record<string, unknown> = side === 'HOST' ? { host_user_id: me } : { venue_owner_user_id: me };
    if (direction) filter.direction = direction;
    if (venueId) filter.venue_id = oid(venueId, 'venue id');
    const docs = await PodPartnerRequestModel.find(filter).sort({ updated_at: -1 }).limit(LIST_LIMIT);
    return toViews(docs, side);
  },

  /** This month's allowance for the caller: per venue they own, or as a host. */
  async quota(callerId: string, side: PartnerSide, venueId?: string | null) {
    if (side === 'HOST') {
      await assertActiveHost(callerId);
      return quotaStatus('HOST', callerId);
    }
    const venue = await VenueModel.exists({ _id: oid(venueId ?? '', 'venue id'), owner_user_id: new Types.ObjectId(callerId) });
    if (!venue) fail('FORBIDDEN', 'Not your venue');
    return quotaStatus('VENUE', String(venueId));
  },
};
