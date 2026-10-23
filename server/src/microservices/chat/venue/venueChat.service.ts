import { GraphQLError } from 'graphql';
import { getIo } from '@realtime/io';
import { displayFrom, userDisplayMap } from '@modules/access/user/user.display';
import { shapeMessage } from '../rooms/chat.shape';
import { assertCleanText } from '../rooms/chat.service';
import { blockedPeerIds } from '../rooms/chat.access';
import { VenueChatMessageModel } from './venueChat.model';
import { assertVenueChatMember, venueChatRoomOf, venueChatThread, type VenueChatThread } from './venueChat.access';
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
  deleted?: boolean | null;
  createdAt?: Date | null;
}

const MAX_TEXT = 2000;

/** A photo line carries an uploaded https URL, nothing else. */
function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
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
    return shapeMessage({ ...d, club_id: null }, signed);
  });
}

function emitLine(podId: string, payload: unknown) {
  try {
    getIo().to(venueChatRoomOf(podId)).emit('venue_chat_message', payload);
  } catch {
    // Socket server not initialised (scripts, tests). The reply still lands on the next read.
  }
}

export const venueChatService = {
  /** The thread for this member, with their side. */
  async room(podId: string, userId: string) {
    return assertVenueChatMember(podId, userId);
  },

  /** One page, newest `limit` before `before`, oldest first — without anyone
   * either side has blocked. Opening the newest page marks the thread read for
   * the caller (every client, installed builds included, reads it on open). */
  async messages(podId: string, userId: string, limit = 50, before?: string | null) {
    const { thread } = await assertVenueChatMember(podId, userId);
    const q: Record<string, unknown> = { pod_id: thread.podId, deleted: false };
    const blocked = await blockedPeerIds(userId);
    if (blocked.size > 0) q.user_id = { $nin: [...blocked] };
    if (before) q.createdAt = { $lt: new Date(before) };
    const docs = await VenueChatMessageModel.find(q)
      .sort({ createdAt: -1 })
      .limit(Math.min(200, Math.max(1, limit)))
      .lean<StoredVenueLine[]>();
    if (!before) await markVenueChatRead(userId, thread.podId);
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

  /** Posts a line, broadcasts it to the thread, and pushes the other members. */
  async send(podId: string, userId: string, args: { type?: 'TEXT' | 'IMAGE' | null; text?: string | null; image_url?: string | null }) {
    const { thread, side } = await assertVenueChatMember(podId, userId);
    const type = args.type === 'IMAGE' ? 'IMAGE' : 'TEXT';
    const text = (args.text ?? '').trim();
    const imageUrl = (args.image_url ?? '').trim();
    if (type === 'TEXT' && !text) throw new GraphQLError('Write a message first', { extensions: { code: 'BAD_USER_INPUT' } });
    if (type === 'IMAGE' && !isHttpsUrl(imageUrl)) throw new GraphQLError('Attach a photo first', { extensions: { code: 'BAD_USER_INPUT' } });
    if (text.length > MAX_TEXT) throw new GraphQLError('This message is too long', { extensions: { code: 'BAD_USER_INPUT' } });
    if (text) assertCleanText(text);

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
    emitLine(thread.podId, shaped);
    notifyVenueChat({
      thread,
      messageId: shaped.id,
      senderId: String(userId),
      senderName: shaped.user_name || '',
      preview: type === 'IMAGE' ? 'Photo' : text.slice(0, 120),
    }).catch(() => undefined);
    return shaped;
  },
};
