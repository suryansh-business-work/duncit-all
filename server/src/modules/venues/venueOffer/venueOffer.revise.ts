/**
 * A counter changed or taken back by the side that made it — only while it is
 * still the latest move and the other side has not opened the chat since it
 * was posted (they have not seen it). After that it is on the record, and the
 * only way on is the other side's answer.
 *
 * An edit is priced again like the counter itself and moves the round on, so an
 * answer written against the counter as it stood before can never land: the
 * other side always accepts exactly the terms on the table. Withdrawing puts
 * the offer back where it stood before the counter (`offer.prior`) — the terms,
 * whose move it was and until when — under a new round too (rounds are never
 * reused), and the counter no longer counts against its side's share. Both are
 * written against the offer as read (venueOffer.cas).
 */
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PodModel } from '@modules/pods/pod/pod.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { VenueChatMessageModel } from '@microservices/chat/venue/venueChat.model';
import { seenByAny } from '@microservices/chat/venue/venueChat.read';
import { logs } from '@observability/log';
import { asRead, assertRound, nextMove, staleOffer } from './venueOffer.cas';
import { removeOfferLine, rewriteOfferLine } from './venueOffer.chat';
import { inAppOfferNote } from './venueOffer.notify';
import {
  historyOf,
  hostTermsSet,
  pendingOffer,
  previewOf,
  pricedMove,
  refuse,
  viewOf,
  type OfferSlot,
  type VenueOfferMoveTerms,
} from './venueOffer.service';
import type { VenueOfferParty, VenueOfferPrior } from './venueOffer.types';

interface OwnCounter {
  slot: OfferSlot;
  side: VenueOfferParty;
  podId: string;
  /** Who is told of the change: the other side. */
  others: string[];
}

/** The pod's pending offer whose latest move is a counter by the caller's own side. */
async function ownCounter(userId: string, podId: string): Promise<OwnCounter> {
  if (!Types.ObjectId.isValid(podId)) throw refuse('BAD_USER_INPUT', 'Invalid pod');
  const pod = await PodModel.findById(podId).select('pod_hosts_id').lean();
  if (!pod) throw refuse('NOT_FOUND', 'Pod not found');
  const slot = await VenueSlotModel.findOne({ booked_by_pod_id: new Types.ObjectId(podId), status: 'PENDING', offer: { $ne: null } });
  const steps = slot?.offer?.history ?? [];
  const last = steps[steps.length - 1];
  if (!slot?.offer || last?.action !== 'COUNTER') throw refuse('BAD_REQUEST', 'There is no counter offer of yours to change');
  const hostIds = (pod.pod_hosts_id ?? []).map(String);
  const ownerId = String(slot.owner_user_id);
  const mine = last.by === 'VENUE' ? ownerId === String(userId) : hostIds.includes(String(userId));
  if (!mine) throw refuse('FORBIDDEN', 'Only the side that made a counter can change it');
  // The venue's counter waits on the host (COUNTERED); the host's counter-back waits on the venue (SENT).
  const waiting = last.by === 'VENUE' ? 'COUNTERED' : 'SENT';
  return { slot: pendingOffer(slot, [waiting]), side: last.by, podId, others: last.by === 'VENUE' ? hostIds : [ownerId] };
}

/** The counter's chat line, refusing once the other side has opened the thread since it was posted (OFFER_SEEN). */
async function unseenLine(own: OwnCounter) {
  const line = await VenueChatMessageModel.findOne({
    pod_id: own.podId,
    type: 'OFFER',
    deleted: false,
    'offer.slot_id': String(own.slot._id),
    'offer.round': own.slot.offer.round,
    'offer.event': 'COUNTER',
  })
    .sort({ createdAt: -1 })
    .select('_id createdAt')
    .lean<{ _id: Types.ObjectId; createdAt: Date }>();
  // No line (its post failed): nobody can have seen it in the chat.
  if (line && (await seenByAny(own.podId, own.others, line.createdAt))) {
    throw new GraphQLError('The other side has already seen this counter — it can no longer be changed', {
      extensions: { code: 'BAD_REQUEST', reason: 'OFFER_SEEN' },
    });
  }
  return line;
}

const WHO: Record<VenueOfferParty, string> = { HOST: 'The host', VENUE: 'The venue' };

export const venueOfferReviseService = {
  /** The edit priced before it is saved — exactly what `editCounter` would freeze. Never throws for a refusal. */
  async editPreview(userId: string, podId: string, terms: VenueOfferMoveTerms) {
    return previewOf(async () => pricedMove((await ownCounter(userId, podId)).slot, terms, ''));
  },

  /** The side's latest counter, changed before the other side saw it. The answer then waits on the new terms. */
  async editCounter(userId: string, podId: string, terms: VenueOfferMoveTerms, note: string | null | undefined, round: number) {
    const own = await ownCounter(userId, podId);
    const offer = own.slot.offer;
    assertRound(offer, round);
    const line = await unseenLine(own);
    const proposal = await pricedMove(own.slot, terms, note);
    const at = new Date();
    const terms$ = own.side === 'VENUE' ? { 'offer.counter': { ...proposal, at } } : hostTermsSet(proposal);
    const updated = await VenueSlotModel.findOneAndUpdate(
      asRead(own.slot),
      {
        $set: {
          ...terms$,
          [`offer.history.${offer.history.length - 1}`]: historyOf(own.side, proposal, at),
          'offer.move': nextMove(offer),
        },
        $inc: { 'offer.round': 1 },
      },
      { new: true }
    );
    if (!updated?.offer) throw staleOffer();
    const move = { event: 'COUNTER' as const, by: own.side, round: updated.offer.round, expiresAt: updated.offer.expires_at };
    const text = line ? await rewriteOfferLine({ lineId: line._id, slot: updated, terms: proposal, move }) : '';
    await inAppOfferNote(own.others, `${WHO[own.side]} updated their counter offer`, text, podId);
    logs.server.info('venueOffer', 'editCounter', { pod_id: podId, side: own.side, round: updated.offer.round, total: proposal.quote.total });
    return viewOf(updated);
  },

  /** The side's latest counter, taken back before the other side saw it: the offer stands as it did before it. */
  async withdrawCounter(userId: string, podId: string, round: number) {
    const own = await ownCounter(userId, podId);
    const offer = own.slot.offer;
    assertRound(offer, round);
    const line = await unseenLine(own);
    const prior = (own.slot.toObject() as { offer: { prior?: VenueOfferPrior | null } }).offer.prior;
    if (!prior) throw refuse('BAD_REQUEST', 'This counter was made before counters could be withdrawn — change it instead');
    if (prior.expires_at && new Date(prior.expires_at).getTime() <= Date.now()) {
      throw refuse('BAD_REQUEST', 'The answer time on the earlier terms has run out — change your counter instead');
    }
    const updated = await VenueSlotModel.findOneAndUpdate(
      asRead(own.slot),
      {
        $set: {
          ...hostTermsSet(prior.host),
          'offer.counter': prior.counter,
          'offer.status': prior.status,
          // Never a round used before: an answer written against the withdrawn counter must not land.
          'offer.round': offer.round + 1,
          'offer.expires_at': prior.expires_at,
          'offer.prior': null,
          'offer.move': nextMove(offer),
        },
        // The counter is the latest move, so its step is the last one.
        $pop: { 'offer.history': 1 },
      },
      { new: true }
    );
    if (!updated?.offer) throw staleOffer();
    if (line) {
      await removeOfferLine({ lineId: line._id, podId, slotId: String(own.slot._id), restored: { from: prior.round, to: updated.offer.round } });
    }
    await inAppOfferNote(own.others, `${WHO[own.side]} withdrew their counter offer`, 'The earlier terms are back on the table.', podId);
    logs.server.info('venueOffer', 'withdrawCounter', { pod_id: podId, side: own.side, round: updated.offer.round });
    return viewOf(updated);
  },
};
