import { GraphQLError } from 'graphql';
import { UserModel } from '@modules/access/user/user.model';
import { escapedSearchRegex } from '@utils/table-query';
import { StaffCallModel, type CallKind, type CallOutcome } from './staffCall.model';
import {
  STAFF_ROLES,
  StaffMessageModel,
  threadKey,
  type StaffReactionKind,
} from './staffChat.model';

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
  read_at: doc.read_at?.toISOString() ?? null,
  edited_at: doc.edited_at?.toISOString() ?? null,
  // A deleted message keeps no reactions either — there is nothing left to
  // have reacted to.
  reactions: doc.deleted_at
    ? []
    : (doc.reactions ?? []).map((r: any) => ({
        user_id: r.user_id,
        kind: r.kind,
        at: r.at?.toISOString?.() ?? null,
      })),
  deleted_at: doc.deleted_at?.toISOString() ?? null,
  created_at: doc.created_at?.toISOString() ?? null,
});

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
  async messages(meId: string, peerId: string, limit = 50) {
    const docs = await StaffMessageModel.find({ thread_key: threadKey(meId, peerId) })
      .sort({ created_at: -1 })
      .limit(Math.min(200, Math.max(1, limit)))
      .lean();
    return docs.reverse().map(pubMessage);
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
    attachment?: { url?: string | null; name?: string | null; type?: string | null } | null
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
    });
    return pubMessage(doc);
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
  async react(meId: string, messageId: string, kind: StaffReactionKind) {
    const doc = await StaffMessageModel.findById(messageId);
    if (!doc) throw new GraphQLError('Message not found', { extensions: { code: 'NOT_FOUND' } });
    if (doc.from_user_id !== meId && doc.to_user_id !== meId) {
      throw new GraphQLError('That conversation is not yours', { extensions: { code: 'FORBIDDEN' } });
    }
    if (doc.deleted_at) {
      throw new GraphQLError('That message was deleted', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const mine = (doc.reactions ?? []).find((r) => r.user_id === meId);
    const rest = (doc.reactions ?? []).filter((r) => r.user_id !== meId);
    doc.reactions = mine?.kind === kind ? rest : [...rest, { user_id: meId, kind, at: new Date() }];
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
    }));
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
    const res = await StaffMessageModel.updateMany(
      { thread_key: threadKey(meId, peerId), to_user_id: meId, read_at: null },
      { $set: { read_at: new Date() } }
    );
    return res.modifiedCount ?? 0;
  },

  /** The number on the header badge. */
  async unreadCount(meId: string): Promise<number> {
    return StaffMessageModel.countDocuments({ to_user_id: meId, read_at: null });
  },
};
