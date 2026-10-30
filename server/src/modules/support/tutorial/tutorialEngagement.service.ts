import { GraphQLError } from 'graphql';
import type { Types } from 'mongoose';
import { escapedSearchRegex } from '@utils/table-query';
import { TutorialModel, type TutorialLanguage } from './tutorial.model';
import { TutorialCommentModel, TutorialLikeModel, TutorialViewModel, type ITutorialComment } from './tutorialEngagement.model';
import { clampPaging, isDuplicateKey, notFound, toObjectId, toTutorialPub } from './tutorial.mappers';
import { TUTORIAL_COMMENT_MAX } from './tutorial.validator';

const FEED_PAGE_SIZE = 10;
const FEED_MAX_PAGE_SIZE = 30;
const COMMENT_PAGE_SIZE = 20;
const COMMENT_MAX_PAGE_SIZE = 50;

export interface TutorialFeedArgs {
  search?: string | null;
  topic?: string | null;
  language?: TutorialLanguage | null;
  page?: number | null;
  page_size?: number | null;
}

/** The ids among `ids` this member has a row for — one `$in` read per page. */
async function idsWithRow(kind: 'like' | 'view', userId: Types.ObjectId, ids: Types.ObjectId[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const filter = { user_id: userId, tutorial_id: { $in: ids } };
  const rows: { tutorial_id: Types.ObjectId }[] =
    kind === 'like'
      ? await TutorialLikeModel.find(filter).select('tutorial_id').lean()
      : await TutorialViewModel.find(filter).select('tutorial_id').lean();
  return new Set(rows.map((row) => String(row.tutorial_id)));
}

/** Only a PUBLISHED tutorial can be liked, commented on or watched. */
async function requirePublished(id: string) {
  const _id = toObjectId(id, 'tutorial_id');
  const exists = await TutorialModel.exists({ _id, status: 'PUBLISHED' });
  if (!exists) throw notFound('Tutorial');
  return _id;
}

async function countOf(_id: Types.ObjectId, field: 'like_count' | 'view_count') {
  const doc = await TutorialModel.findById(_id).select(field).lean<Record<string, number>>();
  return Math.max(0, doc?.[field] ?? 0);
}

const toCommentPub = (doc: ITutorialComment, viewerId: string) => ({
  id: String(doc._id),
  tutorial_id: String(doc.tutorial_id),
  author_id: String(doc.user_id),
  text: doc.text,
  is_mine: String(doc.user_id) === viewerId,
  created_at: doc.created_at.toISOString(),
});

/** Member side: the feed, likes, comments and "watched". */
export const tutorialEngagementService = {
  async feed(viewerId: string, args: TutorialFeedArgs) {
    const { page, pageSize, skip } = clampPaging(args.page, args.page_size, FEED_PAGE_SIZE, FEED_MAX_PAGE_SIZE);
    const filter: Record<string, unknown> = { status: 'PUBLISHED' };
    if (args.language) filter.language = args.language;
    if (args.topic?.trim()) filter.topic = args.topic.trim();
    const search = args.search?.trim();
    if (search) {
      const regex = escapedSearchRegex(search);
      filter.$or = [{ title: regex }, { description: regex }];
    }
    const [docs, total] = await Promise.all([
      TutorialModel.find(filter).sort({ sort_order: 1, created_at: -1, _id: 1 }).skip(skip).limit(pageSize),
      TutorialModel.countDocuments(filter),
    ]);
    const viewer = toObjectId(viewerId, 'user');
    const ids = docs.map((doc) => doc._id as Types.ObjectId);
    const [liked, watched] = await Promise.all([
      idsWithRow('like', viewer, ids),
      idsWithRow('view', viewer, ids),
    ]);
    return {
      rows: docs.map((doc) => toTutorialPub(doc, { liked, watched })),
      total,
      page,
      page_size: pageSize,
      has_more: skip + docs.length < total,
    };
  },

  /**
   * Unlike if a like row exists, otherwise like. The counter moves only by the
   * row this call actually removed or inserted, so a double tap or a retry can
   * never drift it.
   */
  async toggleLike(viewerId: string, tutorialId: string) {
    const _id = await requirePublished(tutorialId);
    const user_id = toObjectId(viewerId, 'user');
    const removed = await TutorialLikeModel.deleteOne({ tutorial_id: _id, user_id });
    if (removed.deletedCount > 0) {
      await TutorialModel.updateOne({ _id, like_count: { $gt: 0 } }, { $inc: { like_count: -1 } });
      return { tutorial_id: String(_id), liked: false, like_count: await countOf(_id, 'like_count') };
    }
    try {
      await TutorialLikeModel.create({ tutorial_id: _id, user_id });
      await TutorialModel.updateOne({ _id }, { $inc: { like_count: 1 } });
    } catch (error) {
      // A parallel tap inserted the same like first: it is liked, and that tap counted it.
      if (!isDuplicateKey(error)) throw error;
    }
    return { tutorial_id: String(_id), liked: true, like_count: await countOf(_id, 'like_count') };
  },

  /** Idempotent: the first call per member inserts the view and counts it; later calls change nothing. */
  async markWatched(viewerId: string, tutorialId: string) {
    const _id = await requirePublished(tutorialId);
    const user_id = toObjectId(viewerId, 'user');
    try {
      const result = await TutorialViewModel.updateOne(
        { tutorial_id: _id, user_id },
        { $setOnInsert: { watched_at: new Date(), completed: true } },
        { upsert: true }
      );
      if (result.upsertedCount > 0) {
        await TutorialModel.updateOne({ _id }, { $inc: { view_count: 1 } });
      }
    } catch (error) {
      // Two upserts raced on the unique pair: the other one inserted and counted it.
      if (!isDuplicateKey(error)) throw error;
    }
    return { tutorial_id: String(_id), watched: true, view_count: await countOf(_id, 'view_count') };
  },

  async comments(viewerId: string, tutorialId: string, pageArg?: number | null, pageSizeArg?: number | null) {
    const _id = await requirePublished(tutorialId);
    const { page, pageSize, skip } = clampPaging(pageArg, pageSizeArg, COMMENT_PAGE_SIZE, COMMENT_MAX_PAGE_SIZE);
    const filter = { tutorial_id: _id, deleted_at: null };
    const [docs, total] = await Promise.all([
      TutorialCommentModel.find(filter).sort({ created_at: -1, _id: -1 }).skip(skip).limit(pageSize),
      TutorialCommentModel.countDocuments(filter),
    ]);
    return {
      rows: docs.map((doc) => toCommentPub(doc, viewerId)),
      total,
      page,
      page_size: pageSize,
      has_more: skip + docs.length < total,
    };
  },

  async addComment(viewerId: string, tutorialId: string, rawText: string) {
    const text = (rawText ?? '').trim();
    if (!text) throw new GraphQLError('Write a comment first', { extensions: { code: 'BAD_USER_INPUT' } });
    if (text.length > TUTORIAL_COMMENT_MAX) {
      throw new GraphQLError(`Keep comments under ${TUTORIAL_COMMENT_MAX} characters`, {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const _id = await requirePublished(tutorialId);
    const doc = await TutorialCommentModel.create({ tutorial_id: _id, user_id: toObjectId(viewerId, 'user'), text });
    await TutorialModel.updateOne({ _id }, { $inc: { comment_count: 1 } });
    return toCommentPub(doc, viewerId);
  },

  /** Soft-deletes the member's own live comment; the count drops only when one was stamped. */
  async deleteMyComment(viewerId: string, commentId: string) {
    const _id = toObjectId(commentId, 'comment_id');
    const doc = await TutorialCommentModel.findOneAndUpdate(
      { _id, user_id: toObjectId(viewerId, 'user'), deleted_at: null },
      { $set: { deleted_at: new Date() } },
      { new: true }
    );
    if (!doc) return false;
    await TutorialModel.updateOne(
      { _id: doc.tutorial_id, comment_count: { $gt: 0 } },
      { $inc: { comment_count: -1 } }
    );
    return true;
  },
};
