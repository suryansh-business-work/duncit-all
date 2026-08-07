import { GraphQLError } from 'graphql';
import { UserModel } from '@modules/access/user/user.model';
import { escapedSearchRegex } from '@utils/table-query';
import { StaffCallModel, type CallKind, type CallOutcome } from './staffCall.model';
import { STAFF_ROLES, StaffMessageModel, reactionEmoji, threadKey } from './staffChat.model';

/**
 * Staff-to-staff messaging.
 *
 * Everything here is scoped by the pair of people talking, and every read
 * proves the caller is one of them — a message is between two people and a
 * shared server is not a reason for a third to see it.
 */

export interface Coworker {
  id: string;
  name: string;
  email: string;
  photo: string;
  roles: string[];
}

const fullName = (user: any): string =>
  [user?.profile?.first_name, user?.profile?.last_name].filter(Boolean).join(' ').trim() ||
  user?.auth?.email ||
  'Someone';

const toCoworker = (user: any): Coworker => ({
  id: String(user._id),
  name: fullName(user),
  email: user?.auth?.email ?? '',
  photo: user?.profile?.photo ?? '',
  roles: (user?.metadata?.role_keys ?? []).filter((role: string) => STAFF_ROLES.includes(role as never)),
});


const pubMessage = (doc: any) => ({
  id: String(doc._id),
  from_user_id: doc.from_user_id,
  to_user_id: doc.to_user_id,
  // A deleted message keeps its place in the thread but not its words.
  text: doc.deleted_at ? '' : doc.text,
  attachment_url: doc.deleted_at ? '' : (doc.attachment_url ?? ''),
  attachment_name: doc.deleted_at ? '' : (doc.attachment_name ?? ''),
  attachment_type: doc.deleted_at ? '' : (doc.attachment_type ?? ''),
  attachment_size: doc.deleted_at ? 0 : (doc.attachment_size ?? 0),
  read_at: doc.read_at?.toISOString() ?? null,
  edited_at: doc.edited_at?.toISOString() ?? null,
  // A deleted message keeps no reactions either — there is nothing left to
  // have reacted to.
  reactions: doc.deleted_at
    ? []
    : (doc.reactions ?? []).map((r: any) => ({
        user_id: r.user_id,
        // Rows written before reactions could be any emoji still say THUMBS_UP.
        emoji: reactionEmoji(r.emoji ?? r.kind ?? ''),
        at: r.at?.toISOString?.() ?? null,
      })),
  delivered_at: doc.delivered_at?.toISOString() ?? null,
  reply_to_id: doc.reply_to_id ?? null,
  forwarded_from: doc.forwarded_from ?? null,
  pinned_at: doc.pinned_at?.toISOString() ?? null,
  pinned_by: doc.pinned_by ?? null,
  mentions: doc.mentions ?? [],
  deleted_at: doc.deleted_at?.toISOString() ?? null,
  created_at: doc.created_at?.toISOString() ?? null,
});

/** An @ at a word boundary — enough for a two-person thread. */
const MENTION_RE = /(^|\s)@\w/;

const SELECT = 'profile.first_name profile.last_name profile.photo auth.email metadata.role_keys';

export const staffChatService = {
  /**
   * Everyone who can sign in to a staff console, minus you.
   *
   * Filtered by role rather than by a directory anyone maintains: a person who
   * is granted the finance console is a coworker from that moment, and one who
   * loses it stops being listed without anybody remembering to remove them.
   */
  async coworkers(meId: string, search?: string | null, role?: string | null): Promise<Coworker[]> {
    const filter: Record<string, unknown> = {
      _id: { $ne: meId },
      'metadata.role_keys': role ? role : { $in: STAFF_ROLES },
    };
    const term = search?.trim();
    if (term) {
      const rx = escapedSearchRegex(term);
      filter.$or = [
        { 'profile.first_name': rx },
        { 'profile.last_name': rx },
        { 'auth.email': rx },
      ];
    }
    const docs = await UserModel.find(filter).select(SELECT).limit(200).lean();
    return docs
      .map(toCoworker)
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  /**
   * The conversations you already have, most recent first, with the last line
   * and how many of them you have not read.
   *
   * One aggregation rather than a query per peer: a directory of forty people
   * would otherwise be forty round trips to draw one list.
   */
  async threads(meId: string) {
    const rows = await StaffMessageModel.aggregate([
      { $match: { $or: [{ from_user_id: meId }, { to_user_id: meId }] } },
      { $sort: { created_at: -1 } },
      {
        $group: {
          _id: '$thread_key',
          last_text: { $first: '$text' },
          last_at: { $first: '$created_at' },
          last_from: { $first: '$from_user_id' },
          peer_id: {
            $first: {
              $cond: [{ $eq: ['$from_user_id', meId] }, '$to_user_id', '$from_user_id'],
            },
          },
          unread: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$to_user_id', meId] }, { $eq: ['$read_at', null] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { last_at: -1 } },
      { $limit: 50 },
    ]);

    const peers = await UserModel.find({ _id: { $in: rows.map((r) => r.peer_id) } })
      .select(SELECT)
      .lean();
    const byId = new Map(peers.map((p: any) => [String(p._id), toCoworker(p)]));

    return rows
      .filter((row) => byId.has(row.peer_id))
      .map((row) => ({
        peer: byId.get(row.peer_id)!,
        last_text: row.last_text,
        last_at: row.last_at?.toISOString() ?? null,
        last_from_me: row.last_from === meId,
        unread: row.unread,
      }));
  },

  /** One conversation, oldest last — the order a chat window renders in. */
  /**
   * A page of the conversation, newest last.
   *
   * `before` is a created_at cursor rather than an offset: a long thread gains
   * messages while it is being scrolled, and an offset would show the same one
   * twice or skip one entirely every time that happened.
   */
  async messages(meId: string, peerId: string, limit = 50, before?: string | null) {
    const where: Record<string, unknown> = { thread_key: threadKey(meId, peerId) };
    if (before) where.created_at = { $lt: new Date(before) };
    const docs = await StaffMessageModel.find(where)
      .sort({ created_at: -1 })
      .limit(Math.min(200, Math.max(1, limit)))
      .lean();
    // Queried newest-first so the cursor works; rendered oldest-first.
    docs.reverse();
    return docs.map(pubMessage);
  },

  /**
   * Mark what they sent as DELIVERED — reached a tab, not yet read.
   *
   * The two ticks mean different things and a reader deserves the difference:
   * delivered says the message is on their machine, read says they looked at
   * it. Called when a socket carries one in, whether or not the thread is open.
   */
  async markDelivered(meId: string, peerId: string): Promise<number> {
    const res = await StaffMessageModel.updateMany(
      { thread_key: threadKey(meId, peerId), to_user_id: meId, delivered_at: null },
      { $set: { delivered_at: new Date() } }
    );
    return res.modifiedCount ?? 0;
  },

  /**
   * Send one message.
   *
   * The recipient is checked against the same role list the directory uses, so
   * this cannot become a way to message a customer by knowing their id.
   */
  async send(
    meId: string,
    toUserId: string,
    text: string,
    attachment?: {
      url?: string | null;
      name?: string | null;
      type?: string | null;
      size?: number | null;
    } | null,
    extra?: { replyToId?: string | null; forwardedFrom?: string | null } | null
  ) {
    const body = text.trim();
    const url = attachment?.url?.trim() ?? '';
    // A file with no caption is a message; nothing at all is not.
    if (!body && !url) {
      throw new GraphQLError('Write something, or attach a file', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    if (toUserId === meId) {
      throw new GraphQLError('You cannot message yourself', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const peer = await UserModel.findOne({
      _id: toUserId,
      'metadata.role_keys': { $in: STAFF_ROLES },
    })
      .select(SELECT)
      .lean();
    if (!peer) {
      throw new GraphQLError('That person is not a coworker', { extensions: { code: 'NOT_FOUND' } });
    }

    const doc = await StaffMessageModel.create({
      thread_key: threadKey(meId, toUserId),
      from_user_id: meId,
      to_user_id: toUserId,
      text: body,
      attachment_url: url,
      attachment_name: attachment?.name?.trim() ?? '',
      attachment_type: attachment?.type?.trim() ?? '',
      attachment_size: Math.max(0, Math.floor(Number(attachment?.size) || 0)),
      reply_to_id: extra?.replyToId ?? null,
      forwarded_from: extra?.forwardedFrom ?? null,
      // Only the person on the other end can be mentioned in a one-to-one
      // thread, so resolving @ against the whole directory would be theatre.
      mentions: MENTION_RE.test(body) ? [toUserId] : [],
    });
    return pubMessage(doc);
  },

  /**
   * Send an existing message on to somebody else.
   *
   * A copy, not a pointer: the original can be edited or taken back afterwards,
   * and a forward that changed underneath the person who received it would be
   * worse than one that is plainly a snapshot. `forwarded_from` says whose words
   * they were.
   */
  async forward(meId: string, messageId: string, toUserId: string) {
    const source = await StaffMessageModel.findById(messageId);
    if (!source) throw new GraphQLError('Message not found', { extensions: { code: 'NOT_FOUND' } });
    if (source.from_user_id !== meId && source.to_user_id !== meId) {
      throw new GraphQLError('That conversation is not yours', { extensions: { code: 'FORBIDDEN' } });
    }
    if (source.deleted_at) {
      throw new GraphQLError('That message was deleted', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    return this.send(
      meId,
      toUserId,
      source.text,
      {
        url: source.attachment_url,
        name: source.attachment_name,
        type: source.attachment_type,
        size: source.attachment_size,
      },
      { forwardedFrom: source.from_user_id }
    );
  },

  /**
   * Pin a message, or take the pin off.
   *
   * Pins belong to the THREAD, not to the person who set them — "the address is
   * pinned" has to mean the same thing to both people or it is useless.
   */
  async pin(meId: string, messageId: string) {
    const doc = await StaffMessageModel.findById(messageId);
    if (!doc) throw new GraphQLError('Message not found', { extensions: { code: 'NOT_FOUND' } });
    if (doc.from_user_id !== meId && doc.to_user_id !== meId) {
      throw new GraphQLError('That conversation is not yours', { extensions: { code: 'FORBIDDEN' } });
    }
    const pinning = !doc.pinned_at;
    doc.pinned_at = pinning ? new Date() : null;
    doc.pinned_by = pinning ? meId : null;
    await doc.save();
    return pubMessage(doc);
  },

  /** Everything pinned on this line, newest pin first. */
  async pinned(meId: string, peerId: string) {
    const docs = await StaffMessageModel.find({
      thread_key: threadKey(meId, peerId),
      pinned_at: { $ne: null },
    })
      .sort({ pinned_at: -1 })
      .limit(50);
    return docs.map(pubMessage);
  },

  /**
   * Find something that was said.
   *
   * Scoped to one thread on purpose — "search my chats" across everyone is a
   * different feature with a different privacy question, and this is the one
   * people actually reach for ("what was that link Priya sent").
   */
  async search(
    meId: string,
    peerId: string,
    input: {
      text?: string | null;
      fromUserId?: string | null;
      after?: string | null;
      before?: string | null;
      onlyFiles?: boolean | null;
      onlyLinks?: boolean | null;
    }
  ) {
    const where: Record<string, unknown> = {
      thread_key: threadKey(meId, peerId),
      deleted_at: null,
    };
    const term = (input.text ?? '').trim();
    // Escaped through the shared helper: a search for "c++" must not be
    // compiled as a quantifier, and there is no reason for this to hold its own
    // copy of that rule.
    if (term) where.text = escapedSearchRegex(term);
    if (input.fromUserId) where.from_user_id = input.fromUserId;
    if (input.onlyFiles) where.attachment_url = { $ne: '' };
    // A link filter narrows the SAME field, so it goes in as an $and rather
    // than overwriting whatever the text term put there.
    if (input.onlyLinks) {
      where.$and = [...((where.$and as unknown[]) ?? []), { text: /https?:\/\//i }];
    }
    const range: Record<string, Date> = {};
    if (input.after) range.$gte = new Date(input.after);
    if (input.before) range.$lte = new Date(input.before);
    if (Object.keys(range).length > 0) where.created_at = range;

    const docs = await StaffMessageModel.find(where).sort({ created_at: -1 }).limit(100);
    return docs.map(pubMessage);
  },

  /**
   * Change what you said.
   *
   * Only your own, and only the words — an edit that could rewrite the
   * attachment would let a link be swapped under someone who already clicked it.
   */
  async edit(meId: string, messageId: string, text: string) {
    const body = text.trim();
    if (!body) throw new GraphQLError('An edit cannot be empty', { extensions: { code: 'BAD_USER_INPUT' } });
    const doc = await StaffMessageModel.findOne({ _id: messageId, from_user_id: meId });
    if (!doc) throw new GraphQLError('That is not your message', { extensions: { code: 'FORBIDDEN' } });
    if (doc.deleted_at) {
      throw new GraphQLError('That message was deleted', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    // The previous wording is kept: an edit can change what a conversation
    // appears to have agreed, and only admins are shown the history.
    doc.edits = [...(doc.edits ?? []), { text: doc.text, at: new Date() }];
    doc.text = body;
    doc.edited_at = new Date();
    await doc.save();
    return pubMessage(doc);
  },

  /**
   * React to a message, or take the reaction back.
   *
   * Anyone in the conversation may react — including the author, which is
   * ordinary in a two-person thread ("yes, that one"). One reaction per person:
   * the same kind again removes it, a different kind replaces it, so the row of
   * counts always answers "who felt what" rather than "how many times did
   * somebody click".
   */
  async react(meId: string, messageId: string, emoji: string) {
    const doc = await StaffMessageModel.findById(messageId);
    if (!doc) throw new GraphQLError('Message not found', { extensions: { code: 'NOT_FOUND' } });
    if (doc.from_user_id !== meId && doc.to_user_id !== meId) {
      throw new GraphQLError('That conversation is not yours', { extensions: { code: 'FORBIDDEN' } });
    }
    if (doc.deleted_at) {
      throw new GraphQLError('That message was deleted', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const wanted = emoji.trim().slice(0, 16);
    if (!wanted) {
      throw new GraphQLError('Pick an emoji', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    // One per person: the same emoji again takes it back, a different one
    // replaces it, so the row answers "who felt what" and not "how many clicks".
    const mine = (doc.reactions ?? []).find((r) => r.user_id === meId);
    const rest = (doc.reactions ?? []).filter((r) => r.user_id !== meId);
    doc.reactions =
      reactionEmoji(mine?.emoji ?? '') === wanted
        ? rest
        : [...rest, { user_id: meId, emoji: wanted, at: new Date() }];
    await doc.save();
    return pubMessage(doc);
  },

  /** Take back your own message. The row stays; the words go. */
  async remove(meId: string, messageId: string) {
    const doc = await StaffMessageModel.findOne({ _id: messageId, from_user_id: meId });
    if (!doc) throw new GraphQLError('That is not your message', { extensions: { code: 'FORBIDDEN' } });
    doc.deleted_at = doc.deleted_at ?? new Date();
    doc.text = '';
    doc.attachment_url = '';
    doc.attachment_name = '';
    doc.attachment_type = '';
    await doc.save();
    return pubMessage(doc);
  },

  /**
   * Every call on this line, newest first.
   *
   * The media went browser to browser, so this row is the only record that the
   * call happened at all.
   */
  async calls(meId: string, peerId: string, limit = 50) {
    const docs = await StaffCallModel.find({ thread_key: threadKey(meId, peerId) })
      .sort({ started_at: -1 })
      .limit(Math.min(200, Math.max(1, limit)))
      .lean();
    return docs.map((doc: any) => ({
      id: String(doc._id),
      from_user_id: doc.from_user_id,
      to_user_id: doc.to_user_id,
      kind: doc.kind,
      outcome: doc.outcome,
      duration_seconds: doc.duration_seconds,
      started_at: doc.started_at?.toISOString() ?? null,
      ended_at: doc.ended_at?.toISOString() ?? null,
      recording_url: doc.recording_url ?? null,
    }));
  },

  /**
   * Hang the finished mp4 on the call it came from.
   *
   * Scoped to a call the caller was actually on — a call id is guessable, and
   * without this check anyone could staple a URL of their choosing to somebody
   * else's conversation.
   */
  async attachRecording(meId: string, callId: string, url: string) {
    const doc = await StaffCallModel.findOneAndUpdate(
      {
        _id: callId,
        $or: [{ from_user_id: meId }, { to_user_id: meId }],
      },
      { $set: { recording_url: url } },
      { new: true }
    ).lean();
    if (!doc) {
      throw new GraphQLError('That call is not yours', { extensions: { code: 'NOT_FOUND' } });
    }
    return true;
  },

  /** Write the call down once it is over. */
  async recordCall(input: {
    meId: string;
    peerId: string;
    kind: CallKind;
    outcome: CallOutcome;
    durationSeconds: number;
    startedAt: Date;
  }) {
    const doc = await StaffCallModel.create({
      thread_key: threadKey(input.meId, input.peerId),
      from_user_id: input.meId,
      to_user_id: input.peerId,
      kind: input.kind,
      outcome: input.outcome,
      duration_seconds: Math.max(0, Math.round(input.durationSeconds)),
      started_at: input.startedAt,
      ended_at: new Date(),
    });
    return String(doc._id);
  },

  /** Mark everything they sent you as read. Returns how many that was. */
  async markRead(meId: string, peerId: string): Promise<number> {
    const now = new Date();
    // Read implies delivered. Without this a message opened on a tab that was
    // offline when it arrived would show one tick forever, having plainly been
    // read — the ticks have to be able to go forwards only.
    await StaffMessageModel.updateMany(
      { thread_key: threadKey(meId, peerId), to_user_id: meId, delivered_at: null },
      { $set: { delivered_at: now } }
    );
    const res = await StaffMessageModel.updateMany(
      { thread_key: threadKey(meId, peerId), to_user_id: meId, read_at: null },
      { $set: { read_at: now } }
    );
    return res.modifiedCount ?? 0;
  },

  /** The number on the header badge. */
  async unreadCount(meId: string): Promise<number> {
    return StaffMessageModel.countDocuments({ to_user_id: meId, read_at: null });
  },
};
