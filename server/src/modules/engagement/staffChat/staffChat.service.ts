import { GraphQLError } from 'graphql';
import { UserModel } from '@modules/access/user/user.model';
import { escapedSearchRegex } from '@utils/table-query';
import { STAFF_ROLES, StaffMessageModel, threadKey } from './staffChat.model';

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
    return docs.reverse().map((doc: any) => ({
      id: String(doc._id),
      from_user_id: doc.from_user_id,
      to_user_id: doc.to_user_id,
      text: doc.text,
      read_at: doc.read_at?.toISOString() ?? null,
      created_at: doc.created_at?.toISOString() ?? null,
    }));
  },

  /**
   * Send one message.
   *
   * The recipient is checked against the same role list the directory uses, so
   * this cannot become a way to message a customer by knowing their id.
   */
  async send(meId: string, toUserId: string, text: string) {
    const body = text.trim();
    if (!body) throw new GraphQLError('Write something first', { extensions: { code: 'BAD_USER_INPUT' } });
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
    });

    return {
      id: String(doc._id),
      from_user_id: doc.from_user_id,
      to_user_id: doc.to_user_id,
      text: doc.text,
      read_at: null,
      created_at: doc.created_at.toISOString(),
    };
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
