import { GraphQLError } from 'graphql';
import mongoose from 'mongoose';
import { PodMessageModel } from './chat.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { UserModel } from '@modules/access/user/user.model';

// A pod with no explicit end time is treated as live for this long after start.
const POD_LIVE_TAIL_MS = 4 * 60 * 60 * 1000;

/** Mirrors the clients' podStatus/isPodActive util: a pod has "ended" once it is
 * past its end time, or 4h after start when no end time is set. Chat is closed
 * for ended pods. */
function isPodEnded(start?: Date | null, end?: Date | null): boolean {
  if (!start) return false;
  const startMs = start.getTime();
  if (Number.isNaN(startMs)) return false;
  const endMs = end ? end.getTime() : startMs + POD_LIVE_TAIL_MS;
  return Date.now() > endMs;
}

async function isMember(podId: string, userId: string): Promise<boolean> {
  const pod = await PodModel.findById(podId).select('pod_hosts_id pod_attendees').lean();
  if (!pod) return false;
  const uid = String(userId);
  if ((pod.pod_hosts_id || []).map(String).includes(uid)) return true;
  if ((pod.pod_attendees || []).map(String).includes(uid)) return true;
  const m = await PodMemberModel.findOne({
    pod_id: podId,
    user_id: userId,
    status: 'JOINED',
  }).lean();
  return !!m;
}

export const chatService = {
  isMember,

  async listMessages(podId: string, userId: string, limit = 50, before?: string) {
    if (!(await isMember(podId, userId))) {
      throw new GraphQLError('Not a pod member', { extensions: { code: 'FORBIDDEN' } });
    }
    const q: any = { pod_id: podId, deleted: false };
    if (before) q.createdAt = { $lt: new Date(before) };
    const docs = await PodMessageModel.find(q)
      .sort({ createdAt: -1 })
      .limit(Math.min(200, Math.max(1, limit)))
      .lean();
    return docs.reverse();
  },

  async postMessage(opts: {
    podId: string;
    userId: string;
    type?: 'TEXT' | 'IMAGE' | 'STICKER';
    text?: string;
    imageUrl?: string;
  }) {
    if (!(await isMember(opts.podId, opts.userId))) {
      throw new GraphQLError('Not a pod member', { extensions: { code: 'FORBIDDEN' } });
    }
    const pod = await PodModel.findById(opts.podId)
      .select('pod_date_time pod_end_date_time')
      .lean();
    if (isPodEnded(pod?.pod_date_time, pod?.pod_end_date_time)) {
      throw new GraphQLError('This pod has ended — chat is closed.', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }
    const text = (opts.text || '').trim();
    const type = opts.type || (opts.imageUrl ? 'IMAGE' : 'TEXT');
    if (type === 'TEXT' && !text) {
      throw new GraphQLError('Message text required', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    if (type === 'IMAGE' && !opts.imageUrl) {
      throw new GraphQLError('Image URL required', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const u: any = await UserModel.findById(opts.userId)
      .select('profile.first_name profile.last_name profile.profile_photo')
      .lean();
    const doc = await PodMessageModel.create({
      pod_id: opts.podId,
      user_id: opts.userId,
      user_name: u ? `${u.profile?.first_name || ''} ${u.profile?.last_name || ''}`.trim() : '',
      user_photo: u?.profile?.profile_photo || '',
      type,
      text: type === 'TEXT' || type === 'STICKER' ? text : '',
      image_url: type === 'IMAGE' ? opts.imageUrl : '',
    });
    return doc.toObject();
  },

  async toggleReaction(opts: { messageId: string; userId: string; emoji: string }) {
    const msg = await PodMessageModel.findById(opts.messageId);
    if (!msg) throw new GraphQLError('Message not found', { extensions: { code: 'NOT_FOUND' } });
    if (!(await isMember(msg.pod_id, opts.userId))) {
      throw new GraphQLError('Not a pod member', { extensions: { code: 'FORBIDDEN' } });
    }
    const idx = msg.reactions.findIndex(
      (r: any) => String(r.user_id) === String(opts.userId) && r.emoji === opts.emoji
    );
    if (idx >= 0) msg.reactions.splice(idx, 1);
    else msg.reactions.push({ user_id: opts.userId, emoji: opts.emoji } as any);
    await msg.save();
    return msg.toObject();
  },

  async deleteMessage(messageId: string, userId: string) {
    const msg = await PodMessageModel.findById(messageId);
    if (!msg) return null;
    if (String(msg.user_id) !== String(userId)) {
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
    // Pods I host or attend or am a podMember of
    const uid = new mongoose.Types.ObjectId(userId);
    const pods = await PodModel.find({
      $or: [{ pod_hosts_id: uid }, { pod_attendees: uid }],
      is_active: true,
    })
      .select('pod_title pod_date_time pod_attendees no_of_spots club_id pod_images_and_videos')
      .sort({ pod_date_time: 1 })
      .lean();
    return pods;
  },
};
