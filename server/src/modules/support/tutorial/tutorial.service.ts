import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { TutorialModel, TutorialTopicModel, type ITutorial, type ITutorialTopic } from './tutorial.model';
import { TutorialCommentModel, TutorialLikeModel, TutorialViewModel } from './tutorialEngagement.model';
import { isDuplicateKey, notFound, toObjectId, toTopicPub, toTutorialPub } from './tutorial.mappers';
import type { TutorialInput, TutorialTopicInput } from './tutorial.validator';

/** Allowlists for the shared table engine (tutorialsTable — DUNCIT TABLE CONTRACT v1). */
const TUTORIAL_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['title', 'description'],
  sortFields: {
    title: 'title',
    topic: 'topic',
    language: 'language',
    status: 'status',
    sort_order: 'sort_order',
    duration_sec: 'duration_sec',
    view_count: 'view_count',
    like_count: 'like_count',
    comment_count: 'comment_count',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
  filterFields: {
    title: { type: 'string' },
    topic: { type: 'enum' },
    language: { type: 'enum' },
    status: { type: 'enum' },
    sort_order: { type: 'number' },
    view_count: { type: 'number' },
    like_count: { type: 'number' },
    comment_count: { type: 'number' },
    created_at: { type: 'date' },
  },
  defaultSort: { sort_order: 1, created_at: -1 },
};

/** Allowlists for tutorialTopicsTable. */
const TOPIC_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['label', 'key'],
  sortFields: { label: 'label', key: 'key', sort_order: 'sort_order', is_active: 'is_active', created_at: 'created_at' },
  filterFields: { is_active: { type: 'boolean' }, created_at: { type: 'date' } },
  defaultSort: { sort_order: 1, label: 1 },
};

const TOP_TUTORIALS = 10;

const topicTaken = () =>
  new GraphQLError('A topic with that key already exists', { extensions: { code: 'CONFLICT' } });

async function assertTopicExists(key: string) {
  const exists = await TutorialTopicModel.exists({ key });
  if (!exists) throw new GraphQLError('Pick a topic from the list', { extensions: { code: 'BAD_USER_INPUT' } });
}

const tutorialFields = (input: TutorialInput) => ({
  title: input.title,
  description: input.description ?? '',
  topic: input.topic,
  language: input.language,
  video_url: input.video_url,
  thumbnail_url: input.thumbnail_url ?? '',
  duration_sec: input.duration_sec ?? 0,
  status: input.status ?? 'DRAFT',
  sort_order: input.sort_order ?? 0,
});

/** Support-portal side: authoring tutorials and topics, the table and the dashboard. */
export const tutorialService = {
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<ITutorial>(TutorialModel, {}, input, TUTORIAL_TABLE_CONFIG);
    return { rows: docs.map((doc) => toTutorialPub(doc)), total, page, page_size };
  },

  async create(input: TutorialInput, actorId: string) {
    await assertTopicExists(input.topic);
    const doc = await TutorialModel.create({
      ...tutorialFields(input),
      created_by: Types.ObjectId.isValid(actorId) ? new Types.ObjectId(actorId) : null,
    });
    return toTutorialPub(doc);
  },

  async update(id: string, input: TutorialInput) {
    const _id = toObjectId(id, 'tutorial_id');
    await assertTopicExists(input.topic);
    const doc = await TutorialModel.findByIdAndUpdate(_id, { $set: tutorialFields(input) }, { new: true });
    if (!doc) throw notFound('Tutorial');
    return toTutorialPub(doc);
  },

  /** Removes the tutorial and every like, comment and view hanging off it. */
  async remove(id: string) {
    const _id = toObjectId(id, 'tutorial_id');
    const result = await TutorialModel.deleteOne({ _id });
    if (result.deletedCount === 0) return false;
    await Promise.all([
      TutorialLikeModel.deleteMany({ tutorial_id: _id }),
      TutorialCommentModel.deleteMany({ tutorial_id: _id }),
      TutorialViewModel.deleteMany({ tutorial_id: _id }),
    ]);
    return true;
  },

  async topics(includeInactive: boolean) {
    const filter = includeInactive ? {} : { is_active: { $ne: false } };
    const docs = await TutorialTopicModel.find(filter).sort({ sort_order: 1, label: 1 });
    return docs.map(toTopicPub);
  },

  async topicsTable(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<ITutorialTopic>(TutorialTopicModel, {}, input, TOPIC_TABLE_CONFIG);
    return { rows: docs.map(toTopicPub), total, page, page_size };
  },

  async createTopic(input: TutorialTopicInput) {
    try {
      const doc = await TutorialTopicModel.create(input);
      return toTopicPub(doc);
    } catch (error) {
      if (isDuplicateKey(error)) throw topicTaken();
      throw error;
    }
  },

  /**
   * Renaming a topic's KEY re-points the tutorials filed under it, so a key
   * change never strands a tutorial on a topic that no longer exists.
   */
  async updateTopic(id: string, input: TutorialTopicInput) {
    const _id = toObjectId(id, 'topic_id');
    const current = await TutorialTopicModel.findById(_id);
    if (!current) throw notFound('Topic');
    const previousKey = current.key;
    Object.assign(current, input);
    try {
      await current.save();
    } catch (error) {
      if (isDuplicateKey(error)) throw topicTaken();
      throw error;
    }
    if (previousKey !== current.key) {
      await TutorialModel.updateMany({ topic: previousKey }, { $set: { topic: current.key } });
    }
    return toTopicPub(current);
  },

  /** A topic still holding tutorials cannot go — move or delete them first. */
  async removeTopic(id: string) {
    const _id = toObjectId(id, 'topic_id');
    const topic = await TutorialTopicModel.findById(_id).select('key');
    if (!topic) return false;
    const inUse = await TutorialModel.exists({ topic: topic.key });
    if (inUse) {
      throw new GraphQLError('This topic still has tutorials. Move them to another topic first.', {
        extensions: { code: 'CONFLICT' },
      });
    }
    const result = await TutorialTopicModel.deleteOne({ _id });
    return result.deletedCount > 0;
  },

  async stats() {
    const [totals] = await TutorialModel.aggregate<{
      total: number;
      published: number;
      views: number;
      likes: number;
      comments: number;
    }>([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          published: { $sum: { $cond: [{ $eq: ['$status', 'PUBLISHED'] }, 1, 0] } },
          views: { $sum: '$view_count' },
          likes: { $sum: '$like_count' },
          comments: { $sum: '$comment_count' },
        },
      },
    ]);
    const [viewers] = await TutorialViewModel.aggregate<{ count: number }>([
      { $group: { _id: '$user_id' } },
      { $count: 'count' },
    ]);
    const top = await TutorialModel.find({ view_count: { $gt: 0 } })
      .sort({ view_count: -1, created_at: -1 })
      .limit(TOP_TUTORIALS)
      .select('title view_count like_count comment_count')
      .lean();
    return {
      total_tutorials: totals?.total ?? 0,
      published_tutorials: totals?.published ?? 0,
      total_views: totals?.views ?? 0,
      unique_viewers: viewers?.count ?? 0,
      total_likes: totals?.likes ?? 0,
      total_comments: totals?.comments ?? 0,
      top_tutorials: top.map((row) => ({
        tutorial_id: String(row._id),
        title: row.title,
        view_count: row.view_count ?? 0,
        like_count: row.like_count ?? 0,
        comment_count: row.comment_count ?? 0,
      })),
    };
  },
};
