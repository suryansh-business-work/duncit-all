import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { displayFrom, userDisplayMap } from '@modules/access/user/user.display';
import { currentOfferModel } from '@modules/venues/venueOffer/venueOffer.types';
import { shapeMessage } from '../rooms/chat.shape';
import { assertCleanText } from '../rooms/chat.service';
import { blockedPeerIds } from '../rooms/chat.access';
import { VenueChatMessageModel, type VenueChatOfferPayload } from './venueChat.model';
import { assertVenueChatMember, venueChatThread, type VenueChatThread } from './venueChat.access';
import { emitToThread, VENUE_CHAT_EVENTS } from './venueChat.emit';
import { readThread } from './venueChat.marks';
import { notifyVenueChat } from './venueChat.notify';
import { markVenueChatRead } from './venueChat.read';

/** A stored line, as `lean()` or `toObject()` hands it back. */
export interface StoredVenueLine {
  _id?: unknown;
  pod_id: string;
  user_id: unknown;
  side: string;
  type?: string | null;
  text?: string | null;
  image_url?: string | null;
  offer?: VenueChatOfferPayload | null;
  reactions?: ReadonlyArray<{ user_id: unknown; emoji: string }> | null;
  edited_at?: Date | null;
  deleted?: boolean | null;
  createdAt?: Date | null;
}

const isoOrNull = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString() : null);

/** An OFFER line's payload as the API and the socket carry it (dates as ISO). */
function offerOut(offer: VenueChatOfferPayload | null | undefined) {
  if (!offer) return null;
  return {
    ...offer,
    model: currentOfferModel(offer.model),
    offerings: [...(offer.offerings ?? [])],
    images: [...(offer.images ?? [])],
    start_at: isoOrNull(offer.start_at),
    end_at: isoOrNull(offer.end_at),
    expires_at: isoOrNull(offer.expires_at),
  };
}

export const MAX_VENUE_CHAT_TEXT = 2000;

/** A photo line carries an uploaded https URL, nothing else. */
function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

/** A line's text, checked as a new line's is: present, within bounds, and clean. */
export function cleanLineText(raw: string | null | undefined): string {
  const text = (raw ?? '').trim();
  if (!text) throw new GraphQLError('Write a message first', { extensions: { code: 'BAD_USER_INPUT' } });
  if (text.length > MAX_VENUE_CHAT_TEXT) throw new GraphQLError('This message is too long', { extensions: { code: 'BAD_USER_INPUT' } });
  assertCleanText(text);
  return text;
}

/**
 * Lines shaped as the `PodMessage` every chat client already renders. A line
 * the venue wrote is signed with the venue's name and photo — the host is
 * talking to the venue, not to whoever holds its login.
 */
export async function shapeVenueLines(thread: VenueChatThread, docs: ReadonlyArray<StoredVenueLine>) {
  const display = await userDisplayMap(docs.map((d) => String(d.user_id)));
  return docs.map((d) => {
    const person = displayFrom(display, String(d.user_id));
    const signed = d.side === 'VENUE' ? { name: thread.venueName || person.name, photo: thread.venuePhoto || person.photo } : person;
    return { ...shapeMessage({ ...d, club_id: null }, signed), offer: offerOut(d.offer), edited_at: isoOrNull(d.edited_at) };
  });
}

const readMarkFailed = (error: unknown) => logs.server.warn('venueChat', 'readThread', { error });

export const venueChatService = {
  /** The thread for this member, with their side. */
  async room(podId: string, userId: string) {
    return assertVenueChatMember(podId, userId);
  },

  /** One page, newest `limit` before `before`, oldest first — without anyone
   * either side has blocked. Opening the newest page marks the thread read for
   * the caller (every client, installed builds included, reads it on open);
   * `markRead: false` reads without it (a poll from a tab nobody is looking at). */
  async messages(podId: string, userId: string, limit = 50, before?: string | null, markRead = true) {
    const { thread } = await assertVenueChatMember(podId, userId);
    const q: Record<string, unknown> = { pod_id: thread.podId, deleted: false };
    const blocked = await blockedPeerIds(userId);
    if (blocked.size > 0) q.user_id = { $nin: [...blocked] };
    if (before) q.createdAt = { $lt: new Date(before) };
    const docs = await VenueChatMessageModel.find(q)
      .sort({ createdAt: -1 })
      .limit(Math.min(200, Math.max(1, limit)))
      .lean<StoredVenueLine[]>();
    if (!before && markRead) await markVenueChatRead(userId, thread.podId);
    return shapeVenueLines(thread, docs.reverse());
  },

  /** Duncit staff reading one thread (Venues console): read-only, no read mark. */
  async staffMessages(podId: string, limit = 50, before?: string | null) {
    const thread = await venueChatThread(podId);
    if (!thread) throw new GraphQLError('Chat not found', { extensions: { code: 'NOT_FOUND' } });
    const q: Record<string, unknown> = { pod_id: thread.podId, deleted: false };
    if (before) q.createdAt = { $lt: new Date(before) };
    const docs = await VenueChatMessageModel.find(q)
      .sort({ createdAt: -1 })
      .limit(Math.min(200, Math.max(1, limit)))
      .lean<StoredVenueLine[]>();
    return shapeVenueLines(thread, docs.reverse());
  },

  /** Posts a line, broadcasts it to the thread, and pushes the other members. Writing a line reads the thread. */
  async send(podId: string, userId: string, args: { type?: 'TEXT' | 'IMAGE' | null; text?: string | null; image_url?: string | null }) {
    const { thread, side } = await assertVenueChatMember(podId, userId);
    const type = args.type === 'IMAGE' ? 'IMAGE' : 'TEXT';
    const imageUrl = (args.image_url ?? '').trim();
    const text = type === 'TEXT' ? cleanLineText(args.text) : (args.text ?? '').trim();
    if (type === 'IMAGE' && !isHttpsUrl(imageUrl)) throw new GraphQLError('Attach a photo first', { extensions: { code: 'BAD_USER_INPUT' } });
    if (type === 'IMAGE' && text) cleanLineText(text);

    const doc = await VenueChatMessageModel.create({
      pod_id: thread.podId,
      venue_id: thread.venueId,
      user_id: String(userId),
      side,
      type,
      text,
      image_url: type === 'IMAGE' ? imageUrl : '',
    });
    const [shaped] = await shapeVenueLines(thread, [doc.toObject() as StoredVenueLine]);
    emitToThread(thread.podId, VENUE_CHAT_EVENTS.line, shaped);
    // Best-effort: the line is in, a failed read mark only leaves the face where it was.
    await readThread(thread, String(userId), side, { name: shaped.user_name, photo: shaped.user_photo }).catch(readMarkFailed);
    notifyVenueChat({
      thread,
      messageId: shaped.id,
      senderId: String(userId),
      senderName: shaped.user_name || '',
      preview: type === 'IMAGE' ? 'Photo' : text.slice(0, 120),
    }).catch(() => undefined);
    return shaped;
  },

  /**
   * Posts one move of a booking offer into the pod's venue chat, as `side`
   * (the venue's lines are signed as the venue). Server-written, so it skips
   * the content check the payload's own text already passed, and the chat push:
   * the offer's own notification tells the other side. Never throws — a move
   * that was made must not fail because its line could not be posted.
   */
  async postOffer(args: { podId: string; side: 'HOST' | 'VENUE'; userId: string; text: string; offer: VenueChatOfferPayload }) {
    try {
      const thread = await venueChatThread(args.podId);
      if (!thread) return null;
      const doc = await VenueChatMessageModel.create({
        pod_id: thread.podId,
        venue_id: thread.venueId,
        user_id: String(args.userId),
        side: args.side,
        type: 'OFFER',
        text: args.text.slice(0, MAX_VENUE_CHAT_TEXT),
        offer: args.offer,
      });
      const [shaped] = await shapeVenueLines(thread, [doc.toObject() as StoredVenueLine]);
      emitToThread(thread.podId, VENUE_CHAT_EVENTS.line, shaped);
      // The side that moved has read the thread up to its own move; a late answer moved nobody.
      if (args.offer.by !== 'SYSTEM') {
        await readThread(thread, String(args.userId), args.side, { name: shaped.user_name, photo: shaped.user_photo }).catch(readMarkFailed);
      }
      return shaped;
    } catch (error) {
      logs.server.error('venueChat', 'postOffer', { error, pod_id: args.podId, event: args.offer.event });
      return null;
    }
  },
};
