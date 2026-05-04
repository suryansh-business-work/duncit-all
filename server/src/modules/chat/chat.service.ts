import { GraphQLError } from 'graphql';
import mongoose from 'mongoose';
import { PodMessageModel } from './chat.model';
import { PodModel } from '../pod/pod.model';
import { PodMemberModel } from '../podMember/podMember.model';
import { UserModel } from '../user/user.model';

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
    const text = (opts.text || '').trim();
    const type = opts.type || (opts.imageUrl ? 'IMAGE' : 'TEXT');
    if (type === 'TEXT' && !text) {
      throw new GraphQLError('Message text required', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    if (type === 'IMAGE' && !opts.imageUrl) {
      throw new GraphQLError('Image URL required', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const u = await UserModel.findById(opts.userId).select('first_name last_name profile_photo').lean();
    const doc = await PodMessageModel.create({
      pod_id: opts.podId,
      user_id: opts.userId,
      user_name: u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : '',
      user_photo: (u as any)?.profile_photo || '',
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
