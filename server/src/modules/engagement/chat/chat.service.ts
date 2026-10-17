import { GraphQLError } from 'graphql';
import mongoose from 'mongoose';
import { PodMessageModel } from './chat.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { UserModel } from '@modules/access/user/user.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { ClubFollowerModel } from '@modules/access/user/relations/clubFollower.model';
import { podLiveEnd } from '@modules/pods/pod/pod.lifecycle';
import { moderateText } from '@modules/moderation/moderation.rules';
import {
  assertRoomMember,
  blockedPeerIds,
  canModerateRoom,
  isPodMember,
  isRoomMember,
  roomOfMessage,
  type ChatRoomRef,
} from './chat.access';
import type { ClubRoomDoc, PodRoomDoc } from './chat.shape';

/** Mirrors the clients' podStatus/isPodActive util: a pod has "ended" once it is
 * past its end time, or the live tail after start when no end time is set. A
 * pod's chat is closed once it has ended; a club's never closes. */
function isPodEnded(pod: { pod_date_time?: Date | null; pod_end_date_time?: Date | null } | null) {
  const end = pod ? podLiveEnd(pod) : null;
  return !!end && Date.now() > end.getTime();
}

async function assertRoomOpen(room: ChatRoomRef) {
  if (room.kind !== 'POD') return;
  const pod = await PodModel.findById(room.id).select('pod_date_time pod_end_date_time').lean();
  if (isPodEnded(pod)) {
    throw new GraphQLError('This pod has ended — chat is closed.', {
      extensions: { code: 'BAD_REQUEST' },
    });
  }
}

/** The same content rules a pod's own text is held to: no contact details,
 * outside links, payment asks, abuse or adult content. */
function assertCleanText(text: string) {
  const [first] = moderateText('message', text);
  if (first) {
    throw new GraphQLError(first.message, {
      extensions: { code: 'BAD_USER_INPUT', reason: 'MODERATION_BLOCKED', type: first.type },
    });
  }
}

const roomFilter = (room: ChatRoomRef) =>
  room.kind === 'POD' ? { pod_id: room.id } : { club_id: room.id };

/** The lines of a room this viewer may see: not removed, and from nobody they
 * have blocked or who has blocked them. */
async function visibleFilter(room: ChatRoomRef, userId: string) {
  const q: Record<string, unknown> = { ...roomFilter(room), deleted: false };
  const blocked = await blockedPeerIds(userId);
  if (blocked.size > 0) q.user_id = { $nin: [...blocked] };
  return q;
}

/** One page, newest `limit` before `before`, returned oldest first. */
async function pageOfRoom(filter: Record<string, unknown>, limit: number, before?: string) {
  const q = before ? { ...filter, createdAt: { $lt: new Date(before) } } : filter;
  const docs = await PodMessageModel.find(q)
    .sort({ createdAt: -1 })
    .limit(Math.min(200, Math.max(1, limit)))
    .lean();
  return docs.reverse();
}

/** Whether a room is closed to new messages, or null when its pod or (active)
 * club does not exist. A club's room never closes. */
async function roomClosedOrMissing(room: ChatRoomRef): Promise<boolean | null> {
  if (!mongoose.isValidObjectId(room.id)) return null;
  if (room.kind === 'CLUB') {
    return (await ClubModel.exists({ _id: room.id, is_active: true })) ? false : null;
  }
  const pod = await PodModel.findById(room.id).select('pod_date_time pod_end_date_time').lean();
  return pod ? isPodEnded(pod) : null;
}

export const chatService = {
  isMember: isPodMember,

  async listMessages(room: ChatRoomRef, userId: string, limit = 50, before?: string) {
    await assertRoomMember(room, userId);
    return pageOfRoom(await visibleFilter(room, userId), limit, before);
  },

  /**
   * A room's history, read-only, for anyone signed in looking at the pod or
   * club — the chat card on its details page. Same lines a member reads (no
   * removed messages, nobody either side has blocked), plus how many there are
   * in all and whether the viewer may open the room to post. It answers only
   * for a pod or an active club that exists; reading the room itself and
   * posting stay members-only.
   */
  async previewRoom(room: ChatRoomRef, userId: string, limit = 50, before?: string) {
    const closed = await roomClosedOrMissing(room);
    if (closed === null) {
      throw new GraphQLError(room.kind === 'POD' ? 'Pod not found' : 'Club not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }
    const filter = await visibleFilter(room, userId);
    const [docs, total, member] = await Promise.all([
      pageOfRoom(filter, limit, before),
      PodMessageModel.countDocuments(filter),
      isRoomMember(room, userId),
    ]);
    return { docs, total, isMember: member, closed };
  },

  async postMessage(opts: {
    room: ChatRoomRef;
    userId: string;
    type?: 'TEXT' | 'IMAGE' | 'STICKER';
    text?: string;
    imageUrl?: string;
  }) {
    await assertRoomMember(opts.room, opts.userId);
    await assertRoomOpen(opts.room);
    const text = (opts.text || '').trim();
    const type = opts.type || (opts.imageUrl ? 'IMAGE' : 'TEXT');
    if (type === 'TEXT' && !text) {
      throw new GraphQLError('Message text required', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    if (type === 'IMAGE' && !opts.imageUrl) {
      throw new GraphQLError('Image URL required', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    if (type === 'TEXT') assertCleanText(text);
    // Only the id is stored. The name and photo are resolved at read time by
    // `userDisplayMap`, so a user who renames themselves is renamed everywhere
    // they have ever posted rather than in nothing they have already sent.
    const doc = await PodMessageModel.create({
      ...roomFilter(opts.room),
      user_id: opts.userId,
      type,
      text: type === 'TEXT' || type === 'STICKER' ? text : '',
      image_url: type === 'IMAGE' ? opts.imageUrl : '',
    });
    return doc.toObject();
  },

  async toggleReaction(opts: { messageId: string; userId: string; emoji: string }) {
    const msg = await PodMessageModel.findById(opts.messageId);
    if (!msg) throw new GraphQLError('Message not found', { extensions: { code: 'NOT_FOUND' } });
    await assertRoomMember(roomOfMessage(msg), opts.userId);
    const idx = msg.reactions.findIndex(
      (r: any) => String(r.user_id) === String(opts.userId) && r.emoji === opts.emoji
    );
    if (idx >= 0) msg.reactions.splice(idx, 1);
    else msg.reactions.push({ user_id: opts.userId, emoji: opts.emoji } as any);
    await msg.save();
    return msg.toObject();
  },

  /** The author removes their own message; a club's admins (in a club room)
   * and a pod's hosts (in a pod room) may remove anyone's. */
  async deleteMessage(messageId: string, userId: string) {
    const msg = await PodMessageModel.findById(messageId);
    if (!msg) return null;
    const own = String(msg.user_id) === String(userId);
    if (!own && !(await canModerateRoom(roomOfMessage(msg), userId))) {
      throw new GraphQLError('Cannot delete others’ messages', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
    msg.deleted = true;
    msg.text = '';
    msg.image_url = '';
    await msg.save();
    return msg.toObject();
  },

  async listMyChatRooms(userId: string) {
    // Pods I host or attend or am a podMember of. The club is joined so each
    // room carries its Super-category (classification) and slug (pod-detail nav).
    const uid = new mongoose.Types.ObjectId(userId);
    const pods = await PodModel.find({
      $or: [{ pod_hosts_id: uid }, { pod_attendees: uid }],
      is_active: true,
    })
      .select(
        'pod_id pod_title pod_date_time pod_end_date_time pod_attendees no_of_spots club_id pod_images_and_videos'
      )
      .populate({ path: 'club_id', select: 'club_id super_category_id' })
      .sort({ pod_date_time: 1 })
      .lean<PodRoomDoc[]>();
    return pods;
  },

  /** Clubs whose chat I can open: the ones I joined, admin or host. */
  async listMyClubRooms(userId: string) {
    const uid = new mongoose.Types.ObjectId(userId);
    const followed = await ClubFollowerModel.find({ user_id: uid }).select('club_id').lean();
    const clubs = await ClubModel.find({
      is_active: true,
      $or: [
        { _id: { $in: followed.map((f) => f.club_id) } },
        { admin_user_ids: uid },
        { host_ids: uid },
      ],
    })
      .select('club_id club_name club_feature_images_and_videos super_category_id admin_user_ids')
      .sort({ club_name: 1 })
      .lean<ClubRoomDoc[]>();
    const lastByClub = await PodMessageModel.aggregate<{ _id: string; at: Date; text: string; type: string }>([
      { $match: { club_id: { $in: clubs.map((c) => String(c._id)) }, deleted: false } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$club_id', at: { $first: '$createdAt' }, text: { $first: '$text' }, type: { $first: '$type' } } },
    ]);
    const last = new Map(lastByClub.map((row) => [row._id, row]));
    return clubs.map((club) => ({ club, last: last.get(String(club._id)) ?? null }));
  },

  /** Host(s) + participants of a pod's chat, for the detail people panel.
   * Members only — mirrors the read gate on the messages. */
  async chatParticipants(podId: string, userId: string) {
    const pod = await PodModel.findById(podId).select('pod_hosts_id pod_attendees').lean();
    if (!pod) throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });
    const hostIds = (pod.pod_hosts_id || []).map(String);
    const attendeeIds = (pod.pod_attendees || []).map(String);
    const uid = String(userId);
    const member =
      hostIds.includes(uid) ||
      attendeeIds.includes(uid) ||
      !!(await PodMemberModel.findOne({ pod_id: podId, user_id: userId, status: 'JOINED' }).lean());
    if (!member) {
      throw new GraphQLError('Not a pod member', { extensions: { code: 'FORBIDDEN' } });
    }
    const users = await UserModel.find({ _id: { $in: [...hostIds, ...attendeeIds] } })
      .select('profile.first_name profile.last_name profile.profile_photo')
      .lean();
    const byId = new Map(users.map((u: any) => [String(u._id), u]));
    const toChatUser = (id: string) => {
      const u: any = byId.get(id);
      const first = u?.profile?.first_name || '';
      const last = u?.profile?.last_name || '';
      return {
        user_id: id,
        full_name: `${first} ${last}`.trim() || 'Member',
        profile_photo: u?.profile?.profile_photo || null,
      };
    };
    return {
      hosts: hostIds.map(toChatUser),
      // A host who booked their own pod is listed once, as the host.
      participants: attendeeIds.filter((id) => !hostIds.includes(id)).map(toChatUser),
      participant_count: attendeeIds.length,
    };
  },
};
