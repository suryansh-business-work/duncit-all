import type { PipelineStage } from 'mongoose';
import { SocialPostModel } from '@modules/crm/marketing/social/social.model';
import { SocialScheduledPostModel } from '@modules/crm/marketing/social/social.publish.model';
import type { SocialPlatform } from '@modules/crm/marketing/social/social.types';

/**
 * How a reel did once it left the studio.
 *
 * The composer stamps `reel_project_id` on the post it sends; each network
 * the post reached is a PUBLISHED target with the network's id for it. The
 * account sync later reads that post back as a SocialPost row keyed by
 * account and external id, with its likes, comments, shares and views — so
 * the reel's numbers are a join, never a second copy of them.
 */

export interface ReelPostLink {
  post_id: string;
  platform: SocialPlatform;
  permalink: string;
  published_at: string | null;
}

export interface ReelAnalyticsPost extends Omit<ReelPostLink, 'post_id'> {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagement: number;
}

export interface ReelAnalytics {
  posts: ReelAnalyticsPost[];
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagement: number;
}

interface PublishedTarget {
  post_id: string;
  account_id: string;
  external_id: string;
  platform: SocialPlatform;
  permalink: string;
  published_at: Date | null;
}

/** What the studio list shows per reel: networks reached and views read back. */
export interface ReelListFigures {
  posts_count: number;
  views: number;
}

const iso = (value: Date | null | undefined): string | null => (value ? value.toISOString() : null);
const count = (value: number | null | undefined): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

/**
 * An aggregation stage for a pipeline already unwound to `$targets`: the one
 * synced SocialPost that target became, as `synced` (empty until the account
 * sync has read it back), carrying only the asked fields.
 */
export const syncedPostLookup = (fields: readonly string[]): PipelineStage.Lookup => ({
  $lookup: {
    from: SocialPostModel.collection.name,
    let: { account: '$targets.account_id', external: '$targets.external_id' },
    pipeline: [
      { $match: { $expr: { $and: [{ $eq: ['$account_id', '$$account'] }, { $eq: ['$external_id', '$$external'] }] } } },
      { $limit: 1 },
      { $project: { _id: 0, ...Object.fromEntries(fields.map((field) => [field, 1])) } },
    ],
    as: 'synced',
  },
});

/**
 * The list's figures for every reel at once — one aggregation, however long
 * the list: the posts stamped with these reels, unwound to their PUBLISHED
 * targets, each joined to the synced post by account and network id, summed
 * per reel. A reel with no row here was never posted.
 */
export async function listFiguresOf(projectIds: readonly string[]): Promise<Map<string, ReelListFigures>> {
  if (projectIds.length === 0) return new Map();
  const rows = await SocialScheduledPostModel.aggregate<{ _id: string; posts_count: number; views: number }>([
    { $match: { reel_project_id: { $in: [...projectIds] } } },
    { $unwind: '$targets' },
    { $match: { 'targets.status': 'PUBLISHED' } },
    syncedPostLookup(['views']),
    {
      $group: {
        _id: '$reel_project_id',
        posts_count: { $sum: 1 },
        // No synced row, or a network that reports no views: 0, never missing.
        views: { $sum: { $ifNull: [{ $arrayElemAt: ['$synced.views', 0] }, 0] } },
      },
    },
  ]);
  return new Map(rows.map((row) => [row._id, { posts_count: count(row.posts_count), views: count(row.views) }]));
}

/** Every network a post carrying this reel reached, oldest post first. */
async function publishedTargets(projectId: string): Promise<PublishedTarget[]> {
  const posts = await SocialScheduledPostModel.find({ reel_project_id: projectId })
    .select('targets')
    .sort({ created_at: 1 })
    .lean();
  return posts.flatMap((post) =>
    (post.targets ?? [])
      .filter((target) => target.status === 'PUBLISHED')
      .map((target) => ({
        post_id: String(post._id),
        account_id: target.account_id,
        external_id: target.external_id ?? '',
        platform: target.platform as SocialPlatform,
        permalink: target.permalink ?? '',
        published_at: target.published_at ?? null,
      }))
  );
}

export async function postLinksOf(projectId: string): Promise<ReelPostLink[]> {
  const targets = await publishedTargets(projectId);
  return targets.map(({ post_id, platform, permalink, published_at }) => ({ post_id, platform, permalink, published_at: iso(published_at) }));
}

/** The reel's numbers everywhere it went, summed. A network not synced yet counts as zeros, not as absent. */
export async function analyticsOf(projectId: string): Promise<ReelAnalytics> {
  const targets = await publishedTargets(projectId);
  const keys = targets.filter((target) => target.external_id).map(({ account_id, external_id }) => ({ account_id, external_id }));
  const synced = keys.length > 0 ? await SocialPostModel.find({ $or: keys }).select('account_id external_id permalink published_at likes comments shares views engagement').lean() : [];
  const byKey = new Map(synced.map((post) => [`${post.account_id}:${post.external_id}`, post]));
  const posts: ReelAnalyticsPost[] = targets.map((target) => {
    const post = byKey.get(`${target.account_id}:${target.external_id}`);
    return {
      platform: target.platform,
      permalink: target.permalink || post?.permalink || '',
      published_at: iso(target.published_at ?? post?.published_at),
      views: count(post?.views),
      likes: count(post?.likes),
      comments: count(post?.comments),
      shares: count(post?.shares),
      engagement: count(post?.engagement),
    };
  });
  const sum = (field: 'views' | 'likes' | 'comments' | 'shares' | 'engagement') => posts.reduce((total, post) => total + post[field], 0);
  return { posts, views: sum('views'), likes: sum('likes'), comments: sum('comments'), shares: sum('shares'), engagement: sum('engagement') };
}
