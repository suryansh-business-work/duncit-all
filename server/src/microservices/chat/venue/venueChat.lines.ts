/**
 * What a member may do to a line already in a venue thread: react to any line
 * (offer cards included), and change or remove their own text or photo. An
 * OFFER line is the negotiation's record: it changes only through the offer
 * itself — a counter edited or withdrawn before the other side saw it — which
 * is what `reviseOfferLine` / `withdrawOfferLine` are for.
 */
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { VenueChatMessageModel, type VenueChatOfferPayload } from './venueChat.model';
import { assertVenueChatMember, venueChatThread } from './venueChat.access';
import { emitToThread, VENUE_CHAT_EVENTS } from './venueChat.emit';
import { readThread } from './venueChat.marks';
import { cleanLineText, MAX_VENUE_CHAT_TEXT, shapeVenueLines, type StoredVenueLine } from './venueChat.service';

/** An emoji is a few code units; anything longer is not one. */
const MAX_EMOJI_LENGTH = 16;

const notFound = () => new GraphQLError('This message is no longer in the chat', { extensions: { code: 'NOT_FOUND' } });
const bad = (message: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

/** A line still in the thread, with the caller's thread and side — FORBIDDEN for anyone outside it. */
async function memberLine(messageId: string, userId: string) {
  if (!Types.ObjectId.isValid(messageId)) throw notFound();
  const doc = await VenueChatMessageModel.findById(messageId).lean<StoredVenueLine & { _id: Types.ObjectId }>();
  if (!doc || doc.deleted) throw notFound();
  const { thread, side } = await assertVenueChatMember(doc.pod_id, userId);
  return { doc, thread, side };
}

/** Only the line's author changes it, and never an offer line. */
function assertOwnLine(doc: StoredVenueLine, userId: string) {
  if (String(doc.user_id) !== String(userId) || doc.type === 'OFFER') {
    throw new GraphQLError('You can only change your own messages', { extensions: { code: 'FORBIDDEN' } });
  }
}

/** Shapes a changed line and tells the thread it changed. */
async function broadcastUpdate(doc: StoredVenueLine) {
  const thread = await venueChatThread(doc.pod_id);
  if (!thread) throw notFound();
  const [shaped] = await shapeVenueLines(thread, [doc]);
  emitToThread(thread.podId, VENUE_CHAT_EVENTS.update, shaped);
  return shaped;
}

export const venueChatLineService = {
  /** Adds the member's reaction, or takes it back when they had already reacted with it. */
  async react(messageId: string, userId: string, emoji: string) {
    const symbol = (emoji ?? '').trim();
    if (!symbol || symbol.length > MAX_EMOJI_LENGTH) throw bad('Pick a reaction');
    const { doc } = await memberLine(messageId, userId);
    const reaction = { user_id: String(userId), emoji: symbol };
    const had = (doc.reactions ?? []).some((r) => String(r.user_id) === reaction.user_id && r.emoji === symbol);
    const updated = await VenueChatMessageModel.findOneAndUpdate(
      { _id: doc._id, deleted: false },
      had ? { $pull: { reactions: reaction } } : { $addToSet: { reactions: reaction } },
      { new: true }
    ).lean<StoredVenueLine>();
    if (!updated) throw notFound();
    return broadcastUpdate(updated);
  },

  /** The author rewrites their text line; it is marked edited for everyone. */
  async edit(messageId: string, userId: string, text: string) {
    const { doc } = await memberLine(messageId, userId);
    assertOwnLine(doc, userId);
    if (doc.type !== 'TEXT') throw bad('Only a text message can be edited');
    const clean = cleanLineText(text);
    const updated = await VenueChatMessageModel.findOneAndUpdate(
      { _id: doc._id, deleted: false },
      { $set: { text: clean, edited_at: new Date() } },
      { new: true }
    ).lean<StoredVenueLine>();
    if (!updated) throw notFound();
    return broadcastUpdate(updated);
  },

  /** The author takes their text or photo out of the thread (kept on record, never shown). */
  async remove(messageId: string, userId: string) {
    const { doc, thread } = await memberLine(messageId, userId);
    assertOwnLine(doc, userId);
    await VenueChatMessageModel.updateOne({ _id: doc._id }, { $set: { deleted: true } });
    emitToThread(thread.podId, VENUE_CHAT_EVENTS.remove, { id: String(doc._id), pod_id: thread.podId });
    return true;
  },

  /** The member has the thread open and has read it to the end: their face moves to the newest line. */
  async markRead(podId: string, userId: string) {
    const { thread, side } = await assertVenueChatMember(podId, userId);
    await readThread(thread, String(userId), side);
    return true;
  },

  /** A counter edited before the other side saw it: its own line carries the new terms, marked edited. */
  async reviseOfferLine(lineId: unknown, offer: VenueChatOfferPayload, text: string) {
    const updated = await VenueChatMessageModel.findOneAndUpdate(
      { _id: lineId, deleted: false },
      { $set: { offer, text: text.slice(0, MAX_VENUE_CHAT_TEXT), edited_at: new Date() } },
      { new: true }
    ).lean<StoredVenueLine>();
    if (updated) await broadcastUpdate(updated);
  },

  /**
   * The move a withdrawal put back on the table is answered under a new round
   * (rounds are never reused): its line, the newest offer line again, carries it.
   */
  async renumberOfferLine(podId: string, slotId: string, fromRound: number, toRound: number) {
    const line = await VenueChatMessageModel.findOne({ pod_id: podId, type: 'OFFER', deleted: false, 'offer.slot_id': slotId, 'offer.round': fromRound })
      .sort({ createdAt: -1 })
      .select('_id')
      .lean<{ _id: Types.ObjectId }>();
    if (!line) return;
    const updated = await VenueChatMessageModel.findOneAndUpdate({ _id: line._id }, { $set: { 'offer.round': toRound } }, { new: true }).lean<StoredVenueLine>();
    if (updated) await broadcastUpdate(updated);
  },

  /** A counter withdrawn before the other side saw it: its line leaves the thread. */
  async withdrawOfferLine(lineId: unknown, podId: string) {
    await VenueChatMessageModel.updateOne({ _id: lineId }, { $set: { deleted: true } });
    emitToThread(podId, VENUE_CHAT_EVENTS.remove, { id: String(lineId), pod_id: podId });
  },
};
