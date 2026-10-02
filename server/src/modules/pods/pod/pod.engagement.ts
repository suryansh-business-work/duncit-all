/**
 * `podService` — pod engagement: hit counter, likes and comments. Composed
 * into `podService` in pod.service.ts.
 */
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PodModel } from './pod.model';
import { UserModel } from '@modules/access/user/user.model';
import { notifySocialActivity } from '@modules/engagement/notification/social-notify';
import { logs } from '@observability/log';
import { loadClubSlugMap, notFound, podNotificationLink, podOwnerId, toPub } from './pod.shared';

export const podEngagementMethods = {
  async incrementHits(id: string) {
    const doc = await PodModel.findByIdAndUpdate(
      id,
      { $inc: { pod_hits: 1 } },
      { new: true }
    );
    if (!doc) return null;
    const slugMap = await loadClubSlugMap([doc]);
    return toPub(doc, slugMap);
  },

  async toggleLike(id: string, viewerId: string) {
    if (!Types.ObjectId.isValid(id))
      throw new GraphQLError('Invalid pod id', { extensions: { code: 'BAD_USER_INPUT' } });
    const doc = await PodModel.findById(id);
    if (!doc) notFound();
    const idx = (doc!.liked_user_ids || []).findIndex((x: any) => String(x) === viewerId);
    const nowLiked = idx < 0;
    if (idx >= 0) doc!.liked_user_ids.splice(idx, 1);
    else doc!.liked_user_ids.push(new Types.ObjectId(viewerId) as any);
    await doc!.save();
    const slugMap = await loadClubSlugMap([doc!]);
    // Ping the host only when transitioning to liked — an unlike is not news.
    if (nowLiked) {
      notifySocialActivity({
        ownerId: podOwnerId(doc),
        actorId: viewerId,
        subject: 'pod',
        action: 'liked',
        link: podNotificationLink(doc, slugMap),
      }).catch((err) =>
        logs.server.error('pod', 'toggleLike', {
          error: err,
          msg: 'notifySocialActivity (like) failed',
          podId: id,
        })
      );
    }
    return toPub(doc, slugMap);
  },

  async addComment(id: string, viewerId: string, text: string) {
    if (!Types.ObjectId.isValid(id))
      throw new GraphQLError('Invalid pod id', { extensions: { code: 'BAD_USER_INPUT' } });
    const trimmed = (text || '').trim();
    if (!trimmed)
      throw new GraphQLError('Comment cannot be empty', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    if (trimmed.length > 1000)
      throw new GraphQLError('Comment too long (max 1000 chars)', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    const doc = await PodModel.findById(id);
    if (!doc) notFound();
    const created_at = new Date();
    doc!.comments.push({
      author_id: new Types.ObjectId(viewerId) as any,
      text: trimmed,
      created_at,
    } as any);
    await doc!.save();
    const slugMap = await loadClubSlugMap([doc!]);
    notifySocialActivity({
      ownerId: podOwnerId(doc),
      actorId: viewerId,
      subject: 'pod',
      action: 'commented on',
      link: podNotificationLink(doc, slugMap),
    }).catch((err) =>
      logs.server.error('pod', 'addComment', {
        error: err,
        msg: 'notifySocialActivity (comment) failed',
        podId: id,
      })
    );
    const c = doc!.comments[doc!.comments.length - 1] as any;
    const u: any = await UserModel.findById(viewerId).select(
      'profile.first_name profile.last_name profile.profile_photo'
    );
    return {
      id: String(c._id),
      author_id: viewerId,
      author_name: u ? `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim() : null,
      author_photo: u?.profile?.profile_photo ?? null,
      text: trimmed,
      likes: [],
      created_at: created_at.toISOString(),
    };
  },

  /** Like/unlike a single pod comment (explore item 4). Returns the comment in
   * the same shape as listComments so the client can refresh it in place. */
  async toggleCommentLike(id: string, commentId: string, viewerId: string) {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(commentId))
      throw new GraphQLError('Invalid id', { extensions: { code: 'BAD_USER_INPUT' } });
    const doc = await PodModel.findById(id);
    if (!doc) notFound();
    const c: any = (doc!.comments as any).find((x: any) => String(x._id) === commentId);
    if (!c) throw new GraphQLError('Comment not found', { extensions: { code: 'NOT_FOUND' } });
    c.likes = c.likes ?? [];
    const idx = c.likes.findIndex((x: any) => String(x) === viewerId);
    const nowLiked = idx < 0;
    if (idx >= 0) c.likes.splice(idx, 1);
    else c.likes.push(new Types.ObjectId(viewerId));
    await doc!.save();
    // The comment's author is the one being liked here, not the pod's host.
    if (nowLiked) {
      const slugMap = await loadClubSlugMap([doc!]);
      notifySocialActivity({
        ownerId: String(c.author_id),
        actorId: viewerId,
        subject: 'pod comment',
        action: 'liked',
        link: podNotificationLink(doc, slugMap),
      }).catch((err) =>
        logs.server.error('pod', 'toggleCommentLike', {
          error: err,
          msg: 'notifySocialActivity (comment like) failed',
          podId: id,
          commentId,
        })
      );
    }
    const u: any = await UserModel.findById(c.author_id).select(
      'profile.first_name profile.last_name profile.profile_photo'
    );
    return {
      id: String(c._id),
      author_id: String(c.author_id),
      author_name: u ? `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim() : null,
      author_photo: u?.profile?.profile_photo ?? null,
      text: c.text,
      likes: (c.likes ?? []).map(String),
      created_at: new Date(c.created_at).toISOString(),
    };
  },

  async deleteComment(id: string, commentId: string, viewerId: string, isAdmin: boolean) {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(commentId))
      throw new GraphQLError('Invalid id', { extensions: { code: 'BAD_USER_INPUT' } });
    const doc = await PodModel.findById(id);
    if (!doc) notFound();
    const c: any = (doc!.comments as any).find((x: any) => String(x._id) === commentId);
    if (!c) throw new GraphQLError('Comment not found', { extensions: { code: 'NOT_FOUND' } });
    if (!isAdmin && String(c.author_id) !== viewerId)
      throw new GraphQLError('Not allowed', { extensions: { code: 'FORBIDDEN' } });
    doc!.comments = (doc!.comments as any).filter(
      (x: any) => String(x._id) !== commentId
    );
    await doc!.save();
    return true;
  },

  async listComments(id: string) {
    if (!Types.ObjectId.isValid(id))
      throw new GraphQLError('Invalid pod id', { extensions: { code: 'BAD_USER_INPUT' } });
    const doc = await PodModel.findById(id);
    if (!doc) notFound();
    const comments = (doc!.comments ?? []).slice().sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const ids = Array.from(new Set(comments.map((c: any) => String(c.author_id))));
    const users: any[] = await UserModel.find({ _id: { $in: ids } }).select(
      'profile.first_name profile.last_name profile.profile_photo'
    );
    const byId = new Map<string, any>();
    users.forEach((u) => byId.set(String(u._id), u));
    return comments.map((c: any) => {
      const u = byId.get(String(c.author_id));
      return {
        id: String(c._id),
        author_id: String(c.author_id),
        author_name: u ? `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim() : null,
        author_photo: u?.profile?.profile_photo ?? null,
        text: c.text,
        likes: (c.likes ?? []).map(String),
        created_at: new Date(c.created_at).toISOString(),
      };
    });
  },
};
