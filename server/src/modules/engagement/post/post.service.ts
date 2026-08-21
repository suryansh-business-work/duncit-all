import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PostModel, type IPost } from './post.model';
import { ClubFollowerModel, UserRelationshipModel } from '@modules/access/user/relations';
import { ClubModel } from '@modules/clubs/club/club.model';
import {
  notifySocialActivity,
  type SocialAction,
} from '@modules/engagement/notification/social-notify';
import { logs } from '@observability/log';

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
  likes: (p.likes || []).map(String),
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
  seen_by_me: viewerId
    ? (p.views || []).some((v) => String(v.user_id) === viewerId)
    : false,
  views_count: p.views?.length || 0,
  created_at: p.created_at.toISOString(),
  updated_at: p.updated_at.toISOString(),
});

function assertId(id: string, label = 'id') {
  if (!Types.ObjectId.isValid(id))
    throw new GraphQLError(`Invalid ${label}`, { extensions: { code: 'BAD_USER_INPUT' } });
}

/**
 * An expired story is GONE by every route, not just the rails: the TTL monitor
 * only sweeps about once a minute, and during that lag a doc is still
 * findable by id. Every path that loads a post by id runs this, so a story
 * past its 24h can never be read, viewed, liked or commented on.
 */
function isExpiredStory(doc: Pick<IPost, 'kind' | 'expires_at'> | null): boolean {
  return !!doc && doc.kind === 'STORY' && !!doc.expires_at && doc.expires_at <= new Date();
}

/** Is `userId` one of the club's assigned admins? */
async function isClubAdmin(clubId: Types.ObjectId, userId: string): Promise<boolean> {
  const club = await ClubModel.findById(clubId).select('admin_user_ids').lean();
  if (!club) {
    throw new GraphQLError('Club not found', { extensions: { code: 'NOT_FOUND' } });
  }
  return ((club as any).admin_user_ids ?? []).some(
    (id: Types.ObjectId) => String(id) === userId,
  );
}

/**
 * A club story speaks FOR the club, so only the club's admins may post one.
 *
 * It used to be open to any follower, which made the club rail a place
 * strangers could publish under the club's name — and left the club's own
 * admins with no way to take it down. Followers still read the rail; they no
 * longer write to it.
 */
async function assertMayPostToClub(clubId: Types.ObjectId, authorId: string) {
  if (await isClubAdmin(clubId, authorId)) return;
  throw new GraphQLError('Only this club’s admins can post a story to it', {
    extensions: { code: 'FORBIDDEN' },
  });
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
 * owner. Self-notifies, the wording and the `/post/:id` deep link all live in
 * the shared helper now — pods and pod ideas raise the same notification. A
 * failure here must never break the like/comment mutation, so the caller
 * fires-and-forgets.
 */
const notifyPostActivity = (
  ownerId: string,
  actorId: string,
  postId: string,
  action: SocialAction
) => notifySocialActivity({ ownerId, actorId, subject: 'post', action, link: `/post/${postId}` });

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

  /**
   * The Following feed: permanent posts + still-active stories from the people
   * (PEOPLE) or clubs (CLUBS) the viewer follows, newest first. Following a
   * private account implies approved access, so no extra privacy gate is needed.
   */
  async followingFeed(viewerId: string, source: 'PEOPLE' | 'CLUBS', limit = 60) {
    const oid = new Types.ObjectId(viewerId);
    // Permanent posts always qualify; stories only while their 24h window is open.
    const liveContent = { $or: [{ kind: { $ne: 'STORY' } }, { expires_at: { $gt: new Date() } }] };
    let q: Record<string, unknown>;
    if (source === 'CLUBS') {
      const follows = await ClubFollowerModel.find({ user_id: oid }).select('club_id').lean();
      const clubIds = follows.map((f: any) => f.club_id);
      if (clubIds.length === 0) return [];
      q = { club_id: { $in: clubIds }, ...liveContent };
    } else {
      const follows = await UserRelationshipModel.find({ follower_id: oid })
        .select('following_id')
        .lean();
      const userIds = follows.map((f: any) => f.following_id);
      if (userIds.length === 0) return [];
      // Club-scoped stories belong to the Clubs feed, not the People feed.
      q = { author_id: { $in: userIds }, club_id: null, ...liveContent };
    }
    const docs = await PostModel.find(q)
      .sort({ created_at: -1 })
      .limit(Math.min(Math.max(limit, 1), 100));
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
    if (isExpiredStory(doc)) return null;
    return doc ? toPub(doc, viewerId) : null;
  },

  /**
   * Field-resolver-safe club-admin check.
   *
   * `Post.can_delete` runs per row, so a club that has since been deleted must
   * read as "not an admin" rather than throw NOT_FOUND and fail the whole
   * story rail.
   */
  async viewerIsClubAdmin(clubId: unknown, viewerId: string | null | undefined) {
    if (!clubId || !viewerId || !Types.ObjectId.isValid(String(clubId))) return false;
    try {
      return await isClubAdmin(new Types.ObjectId(String(clubId)), viewerId);
    } catch {
      return false;
    }
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
      await assertMayPostToClub(clubId, authorId);
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

  /**
   * Delete a post or story.
   *
   * The author can always remove their own. A CLUB story additionally answers
   * to the club's admins: it was published under the club's name, so a club
   * admin who did not post it is still the person accountable for it being
   * there. Without this a co-admin's story was undeletable by anyone else —
   * the club had no way to take down its own rail.
   */
  async remove(id: string, viewerId: string) {
    assertId(id);
    const doc = await PostModel.findById(id);
    if (!doc) throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } });
    // An expired story is unreachable by id too — never viewable, likeable
    // or commentable during the TTL sweep lag.
    if (isExpiredStory(doc)) throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } });
    const isAuthor = String(doc.author_id) === viewerId;
    const mayDelete = isAuthor || (!!doc.club_id && (await isClubAdmin(doc.club_id, viewerId)));
    if (!mayDelete)
      throw new GraphQLError('Not allowed', { extensions: { code: 'FORBIDDEN' } });
    await doc.deleteOne();
    return true;
  },

  /**
   * The facts a report is filed against, read from the story itself.
   *
   * Taken server-side on purpose: a reporter must not be able to describe
   * media the story never showed. The media URL and caption are copied into
   * the report because a story is gone in 24 hours — by review time the row
   * would otherwise point at nothing.
   */
  async reportSnapshot(id: string) {
    assertId(id);
    const doc = await PostModel.findById(id);
    if (!doc) throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } });
    if (isExpiredStory(doc)) throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } });
    return {
      target_type: (doc.kind === 'STORY' ? 'STORY' : 'POST') as 'STORY' | 'POST',
      target_id: String(doc._id),
      target_owner_id: String(doc.author_id),
      club_id: doc.club_id ? String(doc.club_id) : null,
      target_preview_url: doc.image_url,
      target_caption: doc.caption || '',
    };
  },

  /**
   * Record that `viewerId` opened story `id`. Idempotent (a viewer is stored
   * once) and the author's own views never count — so `seen_by_me` stays false
   * for the owner and the viewers list excludes them (Bugs 2 & 4).
   */
  async recordView(id: string, viewerId: string) {
    assertId(id);
    const doc = await PostModel.findById(id);
    if (!doc) throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } });
    // An expired story is unreachable by id too — never viewable, likeable
    // or commentable during the TTL sweep lag.
    if (isExpiredStory(doc)) throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } });
    const isOwner = String(doc.author_id) === viewerId;
    const alreadyViewed = (doc.views || []).some((v) => String(v.user_id) === viewerId);
    if (!isOwner && !alreadyViewed) {
      doc.views.push({ user_id: new Types.ObjectId(viewerId), viewed_at: new Date() } as any);
      await doc.save();
    }
    return toPub(doc, viewerId);
  },

  /** Owner-only: who viewed a story, newest first (Bug 4). */
  async listViewers(id: string, viewerId: string) {
    assertId(id);
    const doc = await PostModel.findById(id);
    if (!doc) throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } });
    // An expired story is unreachable by id too — never viewable, likeable
    // or commentable during the TTL sweep lag.
    if (isExpiredStory(doc)) throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } });
    if (String(doc.author_id) !== viewerId)
      throw new GraphQLError('Not allowed', { extensions: { code: 'FORBIDDEN' } });
    return (doc.views || [])
      .slice()
      .sort((a, b) => b.viewed_at.getTime() - a.viewed_at.getTime())
      .map((v) => ({ user_id: String(v.user_id), viewed_at: v.viewed_at.toISOString() }));
  },

  async toggleLike(id: string, viewerId: string) {
    assertId(id);
    const doc = await PostModel.findById(id);
    if (!doc) throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } });
    // An expired story is unreachable by id too — never viewable, likeable
    // or commentable during the TTL sweep lag.
    if (isExpiredStory(doc)) throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } });
    const idx = doc.likes.findIndex((x) => String(x) === viewerId);
    const nowLiked = idx < 0;
    if (idx >= 0) doc.likes.splice(idx, 1);
    else doc.likes.push(new Types.ObjectId(viewerId));
    await doc.save();
    // Notify the owner only when transitioning to liked (never on unlike).
    if (nowLiked) {
      notifyPostActivity(String(doc.author_id), viewerId, String(doc._id), 'liked').catch((err) =>
        logs.server.error('post', 'toggleLike', {
          error: err,
          msg: 'notifyPostActivity (like) failed',
          postId: String(doc._id),
        })
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
    // An expired story is unreachable by id too — never viewable, likeable
    // or commentable during the TTL sweep lag.
    if (isExpiredStory(doc)) throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } });
    doc.comments.push({
      author_id: new Types.ObjectId(viewerId),
      text: trimmed,
      created_at: new Date(),
    } as any);
    await doc.save();
    notifyPostActivity(String(doc.author_id), viewerId, String(doc._id), 'commented on').catch(
      (err) =>
        logs.server.error('post', 'addComment', {
          error: err,
          msg: 'notifyPostActivity (comment) failed',
          postId: String(doc._id),
        })
    );
    return toPub(doc, viewerId);
  },

  async deleteComment(id: string, commentId: string, viewerId: string) {
    assertId(id);
    assertId(commentId, 'comment_id');
    const doc = await PostModel.findById(id);
    if (!doc) throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } });
    // An expired story is unreachable by id too — never viewable, likeable
    // or commentable during the TTL sweep lag.
    if (isExpiredStory(doc)) throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } });
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
