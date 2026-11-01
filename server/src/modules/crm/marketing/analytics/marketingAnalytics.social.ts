import { SocialAccountModel, SocialAccountSnapshotModel, SocialPostModel } from '../social/social.model';
import { followerSeries } from '../social/social.analytics';
import type { SocialPlatform } from '../social/social.types';
import { dayOf, inWindow, platformMatch, round2, seriesOf, type AnalyticsWindow } from './marketingAnalytics.window';

/**
 * Marketing › Analytics › Social: what the networks reported for the posts
 * that went out in the window, by network and by day, and how each account's
 * audience moved. Every figure is an aggregation over the synced rows — the
 * same SocialPost and snapshot rows the Social Accounts analytics tab reads.
 */
const TOP_POSTS = 10;

interface AccountRow {
  _id: unknown;
  name?: string | null;
  platform: SocialPlatform;
  followers?: number | null;
}

interface Totals {
  posts: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagement: number;
}

const EMPTY_TOTALS: Totals = { posts: 0, views: 0, likes: 0, comments: 0, shares: 0, engagement: 0 };

const totalsGroup = {
  posts: { $sum: 1 },
  // Views are null where a network does not report them.
  views: { $sum: { $ifNull: ['$views', 0] } },
  likes: { $sum: '$likes' },
  comments: { $sum: '$comments' },
  shares: { $sum: '$shares' },
  engagement: { $sum: '$engagement' },
};

/**
 * Average engagement per post as a share of the audience — the Social
 * Accounts tab's definition, so the two pages never disagree. It stays
 * comparable between a 500-follower page and a 50,000-follower one.
 */
export const engagementRate = (engagement: number, posts: number, followers: number) =>
  posts > 0 && followers > 0 ? round2((engagement / posts / followers) * 100) : 0;

/** The accounts on the asked networks. */
export const accountsIn = (window: AnalyticsWindow) =>
  SocialAccountModel.find(platformMatch(window)).select('name platform followers').lean<AccountRow[]>();

const postsMatch = (window: AnalyticsWindow, ids: string[]) => ({ account_id: { $in: ids }, published_at: inWindow(window) });

/** Posts and what they earned, per network. */
export const totalsByNetwork = (window: AnalyticsWindow, ids: string[]) =>
  SocialPostModel.aggregate<Totals & { _id: SocialPlatform }>([
    { $match: postsMatch(window, ids) },
    { $group: { _id: '$platform', ...totalsGroup } },
    { $sort: { _id: 1 } },
  ]);

const dailyTotals = (window: AnalyticsWindow, ids: string[]) =>
  SocialPostModel.aggregate<{ _id: string; posts: number; views: number; engagement: number }>([
    { $match: postsMatch(window, ids) },
    {
      $group: {
        _id: dayOf(window, '$published_at'),
        posts: { $sum: 1 },
        views: { $sum: { $ifNull: ['$views', 0] } },
        engagement: { $sum: '$engagement' },
      },
    },
  ]);

/** The best posts of the window, by engagement, with what the reader needs to open them. */
const topPostsIn = (window: AnalyticsWindow, ids: string[]) =>
  SocialPostModel.aggregate<{
    _id: unknown;
    account_id: string;
    platform: SocialPlatform;
    text: string;
    permalink: string;
    published_at: Date;
    views: number | null;
    engagement: number;
  }>([
    { $match: postsMatch(window, ids) },
    { $sort: { engagement: -1, published_at: -1 } },
    { $limit: TOP_POSTS },
    { $project: { account_id: 1, platform: 1, text: { $substrCP: ['$text', 0, 160] }, permalink: 1, published_at: 1, views: 1, engagement: 1 } },
  ]);

/**
 * Each account's followers at the start and end of the window. The start is
 * the last count taken on or before the first day — so growth covers the whole
 * window — or, for an account first synced inside it, its first count there.
 */
export async function followerGrowth(window: AnalyticsWindow, ids: string[]) {
  const [before, inside] = await Promise.all([
    SocialAccountSnapshotModel.aggregate<{ _id: string; followers: number }>([
      { $match: { account_id: { $in: ids }, day: { $lte: window.from } } },
      { $sort: { day: -1 } },
      { $group: { _id: '$account_id', followers: { $first: '$followers' } } },
    ]),
    SocialAccountSnapshotModel.aggregate<{ _id: string; first: number; last: number }>([
      { $match: { account_id: { $in: ids }, day: { $gt: window.from, $lte: window.to } } },
      { $sort: { day: 1 } },
      { $group: { _id: '$account_id', first: { $first: '$followers' }, last: { $last: '$followers' } } },
    ]),
  ]);
  const start = new Map(before.map((row) => [row._id, row.followers]));
  const inWindowCounts = new Map(inside.map((row) => [row._id, row]));
  return new Map(
    ids.map((id) => {
      const opening = start.get(id) ?? inWindowCounts.get(id)?.first ?? null;
      const closing = inWindowCounts.get(id)?.last ?? opening;
      return [id, { start: opening ?? 0, end: closing ?? 0, growth: (closing ?? 0) - (opening ?? 0) }];
    })
  );
}

const sumTotals = (rows: readonly Totals[]): Totals =>
  rows.reduce(
    (sum, row) => ({
      posts: sum.posts + row.posts,
      views: sum.views + row.views,
      likes: sum.likes + row.likes,
      comments: sum.comments + row.comments,
      shares: sum.shares + row.shares,
      engagement: sum.engagement + row.engagement,
    }),
    EMPTY_TOTALS
  );

/** One row per network that has an account or a post, each with its audience and rate. */
function networkRows(accounts: readonly AccountRow[], byNetwork: readonly (Totals & { _id: SocialPlatform })[]) {
  const followers = new Map<SocialPlatform, number>();
  for (const account of accounts) followers.set(account.platform, (followers.get(account.platform) ?? 0) + (account.followers ?? 0));
  const totals = new Map(byNetwork.map(({ _id, ...figures }) => [_id, figures]));
  const platforms = [...new Set([...followers.keys(), ...totals.keys()])].sort((a, b) => a.localeCompare(b));
  return platforms.map((platform) => {
    const row = totals.get(platform) ?? EMPTY_TOTALS;
    const audience = followers.get(platform) ?? 0;
    return { platform, followers: audience, ...row, engagement_rate: engagementRate(row.engagement, row.posts, audience) };
  });
}

/** The day's engagement rate against that day's audience; a day before any count uses today's. */
function dailyRates(window: AnalyticsWindow, rows: Awaited<ReturnType<typeof dailyTotals>>, followers: (number | null)[], current: number) {
  const byDay = new Map(rows.map((row) => [row._id, row]));
  return window.days.map((day, i) => {
    const row = byDay.get(day);
    return row ? engagementRate(row.engagement, row.posts, followers[i] ?? current) : 0;
  });
}

export async function socialAnalytics(window: AnalyticsWindow) {
  const accounts = await accountsIn(window);
  const ids = accounts.map((account) => String(account._id));
  const [byNetwork, daily, top, growth, followers] = await Promise.all([
    totalsByNetwork(window, ids),
    dailyTotals(window, ids),
    topPostsIn(window, ids),
    followerGrowth(window, ids),
    followerSeries(window.days, ids),
  ]);
  const totals = sumTotals(byNetwork);
  const audience = accounts.reduce((sum, account) => sum + (account.followers ?? 0), 0);
  const names = new Map(accounts.map((account) => [String(account._id), account.name ?? '']));
  const pick = (field: 'posts' | 'views' | 'engagement') => seriesOf(window, daily.map((row) => ({ _id: row._id, value: row[field] })));

  return {
    window: { from: window.from, to: window.to, days: window.days },
    followers: audience,
    follower_growth: [...growth.values()].reduce((sum, row) => sum + row.growth, 0),
    ...totals,
    engagement_rate: engagementRate(totals.engagement, totals.posts, audience),
    daily: {
      followers,
      posts: pick('posts'),
      views: pick('views'),
      engagement: pick('engagement'),
      engagement_rate: dailyRates(window, daily, followers, audience),
    },
    networks: networkRows(accounts, byNetwork),
    accounts: accounts.map((account) => {
      const own = growth.get(String(account._id));
      return {
        account_id: String(account._id),
        name: account.name ?? '',
        platform: account.platform,
        followers: account.followers ?? 0,
        followers_start: own?.start ?? 0,
        followers_end: own?.end ?? 0,
        growth: own?.growth ?? 0,
      };
    }),
    top_posts: top.map((post) => ({
      id: String(post._id),
      text: post.text,
      platform: post.platform,
      account_name: names.get(post.account_id) ?? '',
      permalink: post.permalink ?? '',
      published_at: post.published_at.toISOString(),
      views: post.views ?? 0,
      engagement: post.engagement,
    })),
  };
}
