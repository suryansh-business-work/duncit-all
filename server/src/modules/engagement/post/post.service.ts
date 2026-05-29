import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PostModel, type IPost } from './post.model';

const toPub = (p: IPost, viewerId?: string | null) => ({
  id: String(p._id),
  author_id: String(p.author_id),
  image_url: p.image_url,
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

// Reject anything that isn't a sane image reference. Allow https URLs and
// inline image data URLs (the client uploads as base64 data URL).
function validateImage(url: string) {
  if (!url || typeof url !== 'string')
    throw new GraphQLError('image_url is required', { extensions: { code: 'BAD_USER_INPUT' } });
  if (!/^https?:\/\//i.test(url))
    throw new GraphQLError(
      'image_url must be an http(s) URL — please upload through the image picker',
      { extensions: { code: 'BAD_USER_INPUT' } }
    );
  // Reject inline data URLs — every image must go through ImageKit.
  if (/^data:/i.test(url))
    throw new GraphQLError('Inline data URLs are not allowed; upload via ImageKit', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
}

export const postService = {
  async list(authorId: string | null | undefined, viewerId?: string | null) {
    const q: any = {};
    if (authorId) {
      assertId(authorId, 'author_id');
      q.author_id = new Types.ObjectId(authorId);
    }
    const docs = await PostModel.find(q).sort({ created_at: -1 });
    return docs.map((d) => toPub(d, viewerId));
  },

  async getById(id: string, viewerId?: string | null) {
    assertId(id);
    const doc = await PostModel.findById(id);
    return doc ? toPub(doc, viewerId) : null;
  },

  async create(authorId: string, input: { image_url: string; caption?: string }) {
    validateImage(input.image_url);
    const doc = await PostModel.create({
      author_id: new Types.ObjectId(authorId),
      image_url: input.image_url,
      caption: (input.caption || '').trim(),
      likes: [],
      comments: [],
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
    if (idx >= 0) doc.likes.splice(idx, 1);
    else doc.likes.push(new Types.ObjectId(viewerId));
    await doc.save();
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
