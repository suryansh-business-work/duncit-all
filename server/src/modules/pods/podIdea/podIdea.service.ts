import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PodIdeaModel, type IPodIdea } from './podIdea.model';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';

const toPub = (p: IPodIdea, viewerId?: string | null) => ({
  id: String(p._id),
  author_id: String(p.author_id),
  title: p.title,
  description: p.description,
  likes: (p.likes || []).map(String),
  likes_count: p.likes?.length || 0,
  liked_by_me: viewerId
    ? (p.likes || []).some((x) => String(x) === viewerId)
    : false,
  shares_count: p.shares_count || 0,
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
  status: p.status,
  created_at: p.created_at.toISOString(),
  updated_at: p.updated_at.toISOString(),
});

/** Allowlists for the shared table engine (podIdeasTable — DUNCIT TABLE CONTRACT v1). */
const POD_IDEA_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['title', 'description'],
  sortFields: {
    title: 'title',
    status: 'status',
    shares_count: 'shares_count',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
  filterFields: {
    status: { type: 'enum' },
    author_id: { type: 'string' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

function assertId(id: string, label = 'id') {
  if (!Types.ObjectId.isValid(id))
    throw new GraphQLError(`Invalid ${label}`, { extensions: { code: 'BAD_USER_INPUT' } });
}

export const podIdeaService = {
  async list(
    filter?: { status?: string; author_id?: string; search?: string },
    viewerId?: string | null
  ) {
    const q: any = {};
    if (filter?.status) q.status = filter.status;
    if (filter?.author_id) {
      assertId(filter.author_id, 'author_id');
      q.author_id = new Types.ObjectId(filter.author_id);
    }
    if (filter?.search) {
      const r = new RegExp(filter.search.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`), 'i');
      q.$or = [{ title: r }, { description: r }];
    }
    const docs = await PodIdeaModel.find(q).sort({ created_at: -1 });
    return docs.map((d) => toPub(d, viewerId));
  },

  /** Server-side table page (search/filter/sort/paginate) for the podIdeasTable
   * query — same rows (and viewer-aware liked_by_me) as list(). */
  async table(input?: TableQueryInput | null, viewerId?: string | null) {
    const { docs, total, page, page_size } = await runTableQuery<IPodIdea>(
      PodIdeaModel,
      {},
      input,
      POD_IDEA_TABLE_CONFIG
    );
    return { rows: docs.map((d) => toPub(d, viewerId)), total, page, page_size };
  },

  async getById(id: string, viewerId?: string | null) {
    assertId(id);
    const doc = await PodIdeaModel.findById(id);
    return doc ? toPub(doc, viewerId) : null;
  },

  async create(authorId: string, input: { title: string; description: string }) {
    const title = (input.title || '').trim();
    const description = (input.description || '').trim();
    if (!title)
      throw new GraphQLError('Title is required', { extensions: { code: 'BAD_USER_INPUT' } });
    if (title.length > 160)
      throw new GraphQLError('Title too long (max 160 chars)', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    if (!description)
      throw new GraphQLError('Description is required', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    if (description.length > 2001)
      throw new GraphQLError('Description too long (max 2001 chars)', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    const doc = await PodIdeaModel.create({
      author_id: new Types.ObjectId(authorId),
      title,
      description,
      likes: [],
      comments: [],
      shares_count: 0,
      status: 'PENDING',
    });
    return toPub(doc, authorId);
  },

  async update(
    id: string,
    viewerId: string,
    isAdmin: boolean,
    input: { title?: string; description?: string }
  ) {
    assertId(id);
    const doc = await PodIdeaModel.findById(id);
    if (!doc) throw new GraphQLError('Idea not found', { extensions: { code: 'NOT_FOUND' } });
    if (!isAdmin && String(doc.author_id) !== viewerId)
      throw new GraphQLError('Not allowed', { extensions: { code: 'FORBIDDEN' } });
    if (input.title !== undefined) {
      const title = input.title.trim();
      if (!title)
        throw new GraphQLError('Title is required', { extensions: { code: 'BAD_USER_INPUT' } });
      doc.title = title;
    }
    if (input.description !== undefined) {
      const description = input.description.trim();
      if (!description)
        throw new GraphQLError('Description is required', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      doc.description = description;
    }
    await doc.save();
    return toPub(doc, viewerId);
  },

  async remove(id: string, viewerId: string, isAdmin: boolean) {
    assertId(id);
    const doc = await PodIdeaModel.findById(id);
    if (!doc) throw new GraphQLError('Idea not found', { extensions: { code: 'NOT_FOUND' } });
    if (!isAdmin && String(doc.author_id) !== viewerId)
      throw new GraphQLError('Not allowed', { extensions: { code: 'FORBIDDEN' } });
    await doc.deleteOne();
    return true;
  },

  async toggleLike(id: string, viewerId: string) {
    assertId(id);
    const doc = await PodIdeaModel.findById(id);
    if (!doc) throw new GraphQLError('Idea not found', { extensions: { code: 'NOT_FOUND' } });
    const idx = doc.likes.findIndex((x) => String(x) === viewerId);
    if (idx >= 0) doc.likes.splice(idx, 1);
    else doc.likes.push(new Types.ObjectId(viewerId));
    await doc.save();
    return toPub(doc, viewerId);
  },

  async share(id: string, viewerId?: string | null) {
    assertId(id);
    const doc = await PodIdeaModel.findById(id);
    if (!doc) throw new GraphQLError('Idea not found', { extensions: { code: 'NOT_FOUND' } });
    doc.shares_count = (doc.shares_count || 0) + 1;
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
    const doc = await PodIdeaModel.findById(id);
    if (!doc) throw new GraphQLError('Idea not found', { extensions: { code: 'NOT_FOUND' } });
    doc.comments.push({
      author_id: new Types.ObjectId(viewerId),
      text: trimmed,
      created_at: new Date(),
    } as any);
    await doc.save();
    return toPub(doc, viewerId);
  },

  async deleteComment(id: string, commentId: string, viewerId: string, isAdmin: boolean) {
    assertId(id);
    assertId(commentId, 'comment_id');
    const doc = await PodIdeaModel.findById(id);
    if (!doc) throw new GraphQLError('Idea not found', { extensions: { code: 'NOT_FOUND' } });
    const c = doc.comments.find((x) => String(x._id) === commentId);
    if (!c) throw new GraphQLError('Comment not found', { extensions: { code: 'NOT_FOUND' } });
    if (
      !isAdmin &&
      String(c.author_id) !== viewerId &&
      String(doc.author_id) !== viewerId
    )
      throw new GraphQLError('Not allowed', { extensions: { code: 'FORBIDDEN' } });
    doc.comments = doc.comments.filter((x) => String(x._id) !== commentId) as any;
    await doc.save();
    return toPub(doc, viewerId);
  },

  async setStatus(id: string, status: 'PENDING' | 'APPROVED' | 'REJECTED', viewerId?: string | null) {
    assertId(id);
    const doc = await PodIdeaModel.findById(id);
    if (!doc) throw new GraphQLError('Idea not found', { extensions: { code: 'NOT_FOUND' } });
    doc.status = status;
    await doc.save();
    return toPub(doc, viewerId);
  },
};
