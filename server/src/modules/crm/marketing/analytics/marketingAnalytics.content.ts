import { Types, type PipelineStage } from 'mongoose';
import { SocialPostModel } from '../social/social.model';
import { SocialScheduledPostModel } from '../social/social.publish.model';
import { ReelProjectModel } from '@modules/ai/reel/reel.model';
import { syncedPostLookup } from '@modules/ai/reel/reel.analytics';
import { inWindow, platformMatch, type AnalyticsWindow } from './marketingAnalytics.window';

/**
 * Marketing › Analytics › Content & Reels: what was made here and how it did.
 *
 * A post written in Duncit is a SocialScheduledPost; once a network has it,
 * the account sync reads it back as a SocialPost. Figures about a Duncit post
 * are the join of the two (the same join the Reel Studio reads its reels'
 * numbers through), never a second copy of the network's numbers.
 */
export const POST_FORMATS = ['CAROUSEL', 'VIDEO', 'SINGLE', 'TEXT'] as const;
export type PostFormat = (typeof POST_FORMATS)[number];

const TOP_REELS = 10;
const OUT = ['PUBLISHED', 'PARTIAL'];

/** Two or more pieces make a carousel; one clip a video; one picture a single; nothing a text post. */
const formatOf = {
  $switch: {
    branches: [
      { case: { $gte: [{ $size: { $ifNull: ['$media', []] } }, 2] }, then: 'CAROUSEL' },
      { case: { $eq: ['$media_type', 'VIDEO'] }, then: 'VIDEO' },
      { case: { $eq: ['$media_type', 'IMAGE'] }, then: 'SINGLE' },
    ],
    default: 'TEXT',
  },
};

/** Duncit posts that went out in the window, to at least one of the asked networks. */
function duncitMatch(window: AnalyticsWindow, extra: Record<string, unknown> = {}) {
  const reached = window.platforms.length > 0 ? { targets: { $elemMatch: { status: 'PUBLISHED', platform: { $in: window.platforms } } } } : {};
  return { status: { $in: OUT }, published_at: inWindow(window), ...reached, ...extra };
}

/** From a Duncit post to each asked network it reached, with what that network reported. */
const reachedNetworks = (window: AnalyticsWindow): PipelineStage[] => [
  { $unwind: '$targets' },
  { $match: { 'targets.status': 'PUBLISHED', ...platformMatch(window, 'targets.platform') } },
  syncedPostLookup(['views', 'engagement']),
  {
    $addFields: {
      // Not synced yet, or a network that reports no views: 0, never missing.
      views: { $ifNull: [{ $arrayElemAt: ['$synced.views', 0] }, 0] },
      engagement: { $ifNull: [{ $arrayElemAt: ['$synced.engagement', 0] }, 0] },
    },
  },
];

interface Figures {
  networks: number;
  views: number;
  engagement: number;
}

const figuresGroup = { networks: { $sum: 1 }, views: { $sum: '$views' }, engagement: { $sum: '$engagement' } };

/** Posts per format, and what they earned everywhere they went. */
async function formatSplit(window: AnalyticsWindow) {
  const [counts, figures] = await Promise.all([
    SocialScheduledPostModel.aggregate<{ _id: PostFormat; posts: number }>([
      { $match: duncitMatch(window) },
      { $group: { _id: formatOf, posts: { $sum: 1 } } },
    ]),
    SocialScheduledPostModel.aggregate<Figures & { _id: PostFormat }>([
      { $match: duncitMatch(window) },
      { $addFields: { format: formatOf } },
      ...reachedNetworks(window),
      { $group: { _id: '$format', ...figuresGroup } },
    ]),
  ]);
  const posts = new Map(counts.map((row) => [row._id, row.posts]));
  const earned = new Map(figures.map((row) => [row._id, row]));
  return POST_FORMATS.map((format) => ({
    format,
    posts: posts.get(format) ?? 0,
    networks: earned.get(format)?.networks ?? 0,
    views: earned.get(format)?.views ?? 0,
    engagement: earned.get(format)?.engagement ?? 0,
  }));
}

/** Every reel posted in the window, with its networks and numbers summed, most viewed first. */
async function reelsPosted(window: AnalyticsWindow) {
  const rows = await SocialScheduledPostModel.aggregate<Figures & { _id: string }>([
    { $match: duncitMatch(window, { reel_project_id: { $ne: '' } }) },
    ...reachedNetworks(window),
    { $group: { _id: '$reel_project_id', ...figuresGroup } },
    { $sort: { views: -1, engagement: -1, _id: 1 } },
  ]);
  const top = rows.slice(0, TOP_REELS);
  const projects = await ReelProjectModel.find({ _id: { $in: top.map((row) => row._id).filter((id) => Types.ObjectId.isValid(id)) } })
    .select('name')
    .lean<{ _id: unknown; name: string }[]>();
  const names = new Map(projects.map((project) => [String(project._id), project.name]));
  return {
    posted: rows.length,
    views: rows.reduce((sum, row) => sum + row.views, 0),
    engagement: rows.reduce((sum, row) => sum + row.engagement, 0),
    // A reel deleted since it was posted keeps its numbers; it just has no name.
    top: top.map((row) => ({ id: row._id, name: names.get(row._id) ?? '', networks: row.networks, views: row.views, engagement: row.engagement })),
  };
}

const round1 = (value: number) => Math.round(value * 10) / 10;

/** Average engagement per post in each slot; an empty slot is 0. Slots are 1-based from the aggregation. */
function slotAverages(slots: number, rows: readonly { _id: number; posts: number; engagement: number }[], offset: number) {
  const averages = new Array<number>(slots).fill(0);
  for (const row of rows) averages[row._id - offset] = round1(row.engagement / row.posts);
  return averages;
}

/** The slot with the best average, or null when nothing was posted. Ties go to the earlier slot. */
const bestOf = (averages: readonly number[], rows: readonly unknown[]) =>
  rows.length > 0 ? averages.indexOf(Math.max(...averages)) : null;

/**
 * When posts did best, from the window's own posts: the weekday (Monday first)
 * and hour of the day, in the admin's zone, by average engagement per post — an
 * average, so three posts on a Tuesday do not beat one great post on a Sunday.
 */
async function bestTimes(window: AnalyticsWindow) {
  const slot = (operator: '$isoDayOfWeek' | '$hour'): PipelineStage[] => [
    { $match: { published_at: inWindow(window), ...platformMatch(window) } },
    {
      $group: {
        _id: { [operator]: { date: '$published_at', timezone: window.zone } },
        posts: { $sum: 1 },
        engagement: { $sum: '$engagement' },
      },
    },
  ];
  type Slot = { _id: number; posts: number; engagement: number };
  const [days, hours] = await Promise.all([
    SocialPostModel.aggregate<Slot>(slot('$isoDayOfWeek')),
    SocialPostModel.aggregate<Slot>(slot('$hour')),
  ]);
  const byWeekday = slotAverages(7, days, 1);
  const byHour = slotAverages(24, hours, 0);
  return { by_weekday: byWeekday, by_hour: byHour, best_weekday: bestOf(byWeekday, days), best_hour: bestOf(byHour, hours) };
}

/** Posts published from Duncit and read from the networks — the networks' count includes the Duncit ones once synced. */
export async function postCounts(window: AnalyticsWindow) {
  const [fromDuncit, fromNetworks] = await Promise.all([
    SocialScheduledPostModel.countDocuments(duncitMatch(window)),
    SocialPostModel.countDocuments({ published_at: inWindow(window), ...platformMatch(window) }),
  ]);
  return { from_duncit: fromDuncit, from_networks: fromNetworks };
}

export async function reelFigures(window: AnalyticsWindow) {
  const [made, posted] = await Promise.all([ReelProjectModel.countDocuments({ created_at: inWindow(window) }), reelsPosted(window)]);
  return { made, ...posted };
}

export async function contentAnalytics(window: AnalyticsWindow) {
  const [counts, formats, reels, times] = await Promise.all([postCounts(window), formatSplit(window), reelFigures(window), bestTimes(window)]);
  return {
    window: { from: window.from, to: window.to, days: window.days },
    ...counts,
    formats,
    reels_made: reels.made,
    reels_posted: reels.posted,
    reel_views: reels.views,
    reel_engagement: reels.engagement,
    top_reels: reels.top,
    ...times,
  };
}
