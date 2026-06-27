import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PostModel, type IPost } from './post.model';

const STORY_TTL_MS = 24 * 60 * 60 * 1000;

const toPub = (p: IPost, viewerId?: string | null) => ({
  id: String(p._id),
  author_id: String(p.author_id),
  club_id: p.club_id ? String(p.club_id) : null,
  image_url: p.image_url,
  media_type: p.media_type || 'IMAGE',
  kind: p.kind || 'POST',
  expires_at: p.expires_at ? p.expires_at.toISOString() : null,
  caption: p.caption || '',
  likes: (p.likes || []).map((x) => String(x)),
  likes_count: p.likes?.length || 0,
  liked_by_me: viewerId
    ? (p.likes || []).some((x) => String(x) === viewerId)
    : false,
  comments: (p.comments || [])
    .slice()
    .sort((a, b) => a.created_at.getTime() - b.created_at.getTime())
    .map((c) => ({
      id: String(c._id),
      author_id: String(c.author_id),
      text: c.text,
      created_at: c.created_at.toISOString(),
    })),
  comments_count: p.comments?.length || 0,
  created_at: p.created_at.toISOString(),
  updated_at: p.updated_at.toISOString(),
});

function assertId(id: string, label = 'id') {
  if (!Types.ObjectId.isValid(id))
    throw new GraphQLError(`Invalid ${label}`, { extensions: { code: 'BAD_USER_INPUT' } });
}

// Reject anything that isn't a sane media reference. The URL must be an
// http(s) ImageKit URL (image or video) — every file goes through the picker.
function validateMediaUrl(url: string) {
  if (!url || typeof url !== 'string')
    throw new GraphQLError('image_url is required', { extensions: { code: 'BAD_USER_INPUT' } });
  if (!/^https?:\/\//i.test(url))
    throw new GraphQLError(
      'image_url must be an http(s) URL — please upload through the media picker',
      { extensions: { code: 'BAD_USER_INPUT' } }
    );
  // Reject inline data URLs — every file must go through ImageKit.
  if (/^data:/i.test(url))
    throw new GraphQLError('Inline data URLs are not allowed; upload via ImageKit', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
}

function normalizeMediaType(value?: string | null): 'IMAGE' | 'VIDEO' {
  return String(value || '').toUpperCase() === 'VIDEO' ? 'VIDEO' : 'IMAGE';
}

/**
 * Best-effort "someone interacted with your post" notification to the post
 * owner. The post owner is skipped when they are the actor (no self-notifies),
 * and a single USER-scoped notification is created — notificationService.create
 * handles the inbox row + web-push + Expo fan-out. The link_url deep-links the
 * tap to the post (mWeb `/post/:id`, mobile PostDetail). A failure here must
 * never break the like/comment mutation, so the caller fires-and-forgets.
 */
async function notifyPostActivity(
  ownerId: string,
  actorId: string,
  postId: string,
  action: 'liked' | 'commented on'
) {
  if (ownerId === actorId) return;
  const { userService } = await import('@modules/access/user/user.service');
  const { notificationService } = await import(
    '@modules/engagement/notification/notification.service'
  );
  const actor = await userService.getById(actorId).catch(() => null);
  const name = actor?.full_name?.trim() || 'Someone';
  await notificationService.create({
    title: action === 'liked' ? 'New like on your post' : 'New comment on your post',
    body: `${name} ${action} your post`,
    image_url: actor?.profile_photo ?? null,
    link_url: `/post/${postId}`,
    scope: 'USER',
    target_user_ids: [ownerId],
  });
}

export const postService = {
  async list(authorId: string | null | undefined, viewerId?: string | null) {
    // Permanent profile posts only — stories never surface on the profile grid.
    const q: any = { kind: { $ne: 'STORY' } };
    if (authorId) {
      assertId(authorId, 'author_id');
      q.author_id = new Types.ObjectId(authorId);
    }
    const docs = await PostModel.find(q).sort({ created_at: -1 });
    return docs.map((d) => toPub(d, viewerId));
  },

  async listStories(authorId: string | null | undefined, viewerId?: string | null) {
    // Active stories only: kind STORY and not yet expired. The TTL monitor
    // purges old docs lazily, so we also filter by expires_at to hide them
    // immediately once the 24h window closes.
    const q: any = { kind: 'STORY', expires_at: { $gt: new Date() } };
    if (authorId) {
      assertId(authorId, 'author_id');
      q.author_id = new Types.ObjectId(authorId);
    }
    const docs = await PostModel.find(q).sort({ created_at: -1 });
    return docs.map((d) => toPub(d, viewerId));
  },

  async listClubStories(clubId: string, viewerId?: string | null) {
    assertId(clubId, 'club_id');
    const docs = await PostModel.find({
      kind: 'STORY',
      club_id: new Types.ObjectId(clubId),
      expires_at: { $gt: new Date() },
    }).sort({ created_at: -1 });
    return docs.map((d) => toPub(d, viewerId));
  },

  async getById(id: string, viewerId?: string | null) {
    assertId(id);
    const doc = await PostModel.findById(id);
    return doc ? toPub(doc, viewerId) : null;
  },

  async create(
    authorId: string,
    input: { image_url: string; caption?: string; media_type?: string; kind?: string; club_id?: string | null }
  ) {
    validateMediaUrl(input.image_url);
    const kind = String(input.kind || '').toUpperCase() === 'STORY' ? 'STORY' : 'POST';
    // A club can only be attached to a story (Bug 6), and the id must be valid.
    let clubId: Types.ObjectId | null = null;
    if (kind === 'STORY' && input.club_id) {
      assertId(input.club_id, 'club_id');
      clubId = new Types.ObjectId(input.club_id);
    }
    const doc = await PostModel.create({
      author_id: new Types.ObjectId(authorId),
      club_id: clubId,
      image_url: input.image_url,
      media_type: normalizeMediaType(input.media_type),
      kind,
      caption: (input.caption || '').trim(),
      likes: [],
      comments: [],
      // Stories live for 24h then the TTL index removes them.
      expires_at: kind === 'STORY' ? new Date(Date.now() + STORY_TTL_MS) : null,
    });
    return toPub(doc, authorId);
  },

  async remove(id: string, viewerId: string) {
    assertId(id);
    const doc = await PostModel.findById(id);
    if (!doc) throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } });
    if (String(doc.author_id) !== viewerId)
      throw new GraphQLError('Not allowed', { extensions: { code: 'FORBIDDEN' } });
    await doc.deleteOne();
    return true;
  },

  async toggleLike(id: string, viewerId: string) {
    assertId(id);
    const doc = await PostModel.findById(id);
    if (!doc) throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } });
    const idx = doc.likes.findIndex((x) => String(x) === viewerId);
    const nowLiked = idx < 0;
    if (idx >= 0) doc.likes.splice(idx, 1);
    else doc.likes.push(new Types.ObjectId(viewerId));
    await doc.save();
    // Notify the owner only when transitioning to liked (never on unlike).
    if (nowLiked) {
      notifyPostActivity(String(doc.author_id), viewerId, String(doc._id), 'liked').catch((err) =>

        console.error('notifyPostActivity (like) failed', err)
      );
    }
    return toPub(doc, viewerId);
  },

  async addComment(id: string, viewerId: string, text: string) {
    assertId(id);
    const trimmed = (text || '').trim();
    if (!trimmed)
      throw new GraphQLError('Comment cannot be empty', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    if (trimmed.length > 1000)
      throw new GraphQLError('Comment too long (max 1000 chars)', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    const doc = await PostModel.findById(id);
    if (!doc) throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } });
    doc.comments.push({
      author_id: new Types.ObjectId(viewerId),
      text: trimmed,
      created_at: new Date(),
    } as any);
    await doc.save();
    notifyPostActivity(String(doc.author_id), viewerId, String(doc._id), 'commented on').catch(
      (err) =>

        console.error('notifyPostActivity (comment) failed', err)
    );
    return toPub(doc, viewerId);
  },

  async deleteComment(id: string, commentId: string, viewerId: string) {
    assertId(id);
    assertId(commentId, 'comment_id');
    const doc = await PostModel.findById(id);
    if (!doc) throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } });
    const c = doc.comments.find((x) => String(x._id) === commentId);
    if (!c) throw new GraphQLError('Comment not found', { extensions: { code: 'NOT_FOUND' } });
    // Comment author OR post author may delete a comment
    if (String(c.author_id) !== viewerId && String(doc.author_id) !== viewerId)
      throw new GraphQLError('Not allowed', { extensions: { code: 'FORBIDDEN' } });
    doc.comments = doc.comments.filter((x) => String(x._id) !== commentId) as any;
    await doc.save();
    return toPub(doc, viewerId);
  },
};
