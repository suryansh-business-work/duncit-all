import { appFormat } from '@utils/app-time';
import {
  SocialAccountModel,
  SocialAccountSnapshotModel,
  SocialCommentModel,
  SocialPostModel,
} from './social.model';
import {
  groupBy,
  hourAverages,
  platformSplit,
  sumOf,
  topPosts,
  weekdayAverages,
  type PostNumbers,
} from './social.breakdowns';

/**
 * What the Analytics tab draws: the period's totals, engagement by the day a
 * post went out, follower growth, the split by account and how comments read.
 *
 * Days are the admin's zone (Admin > Settings), so "today" on the chart is the
 * marketer's today, not the container's UTC one.
 */
const DAY_MS = 86_400_000;
const PERIODS = new Set([7, 30, 90]);
const DEFAULT_PERIOD = 30;

export interface SocialAnalyticsInput {
  account_ids?: string[] | null;
  days: number;
}

const dayKey = (date: Date) => appFormat(date, 'yyyy-MM-dd');

/** Every day of the period, oldest first, in the admin's zone. */
function dayKeys(days: number): string[] {
  const keys: string[] = [];
  const now = Date.now();
  for (let back = days - 1; back >= 0; back -= 1) {
    const key = dayKey(new Date(now - back * DAY_MS));
    if (keys.at(-1) !== key) keys.push(key);
  }
  return keys;
}

function engagementSeries(days: string[], posts: PostNumbers[]) {
  const index = new Map(days.map((day, i) => [day, i]));
  const likes = days.map(() => 0);
  const comments = days.map(() => 0);
  const shares = days.map(() => 0);
  for (const post of posts) {
    const i = index.get(dayKey(post.published_at));
    if (i === undefined) continue;
    likes[i] += post.likes;
    comments[i] += post.comments;
    shares[i] += post.shares;
  }
  return [
    { key: 'likes', values: likes },
    { key: 'comments', values: comments },
    { key: 'shares', values: shares },
  ];
}

/**
 * Total followers per day. Each account's count carries forward from its last
 * snapshot — including one taken before the period — so a day without a sync
 * is not a dip. Null until any account has a count.
 */
async function followerSeries(days: string[], accountIds: string[]): Promise<(number | null)[]> {
  const first = days[0];
  const [before, inside] = await Promise.all([
    SocialAccountSnapshotModel.aggregate<{ _id: string; followers: number }>([
      { $match: { account_id: { $in: accountIds }, day: { $lt: first } } },
      { $sort: { day: -1 } },
      { $group: { _id: '$account_id', followers: { $first: '$followers' } } },
    ]),
    SocialAccountSnapshotModel.find({ account_id: { $in: accountIds }, day: { $gte: first } })
      .select('account_id day followers')
      .lean(),
  ]);
  const current = new Map(before.map((row) => [row._id, row.followers]));
  const byDay = groupBy(inside, (snapshot) => snapshot.day);
  return days.map((day) => {
    for (const snapshot of byDay.get(day) ?? []) current.set(snapshot.account_id, snapshot.followers);
    return current.size > 0 ? [...current.values()].reduce((sum, n) => sum + n, 0) : null;
  });
}

const sentimentSummary = (accountIds: string[], since: Date) =>
  sentimentCounts({ account_id: { $in: accountIds }, published_at: { $gte: since } });

/** How the comments in a scope read — a period's, or one post's. */
export async function sentimentCounts(scope: Record<string, unknown>) {
  const [positive, neutral, negative, flagged, pending] = await Promise.all([
    SocialCommentModel.countDocuments({ ...scope, ai_sentiment: 'POSITIVE' }),
    SocialCommentModel.countDocuments({ ...scope, ai_sentiment: 'NEUTRAL' }),
    SocialCommentModel.countDocuments({ ...scope, ai_sentiment: 'NEGATIVE' }),
    SocialCommentModel.countDocuments({ ...scope, ai_status: 'FLAGGED' }),
    SocialCommentModel.countDocuments({ ...scope, ai_status: 'PENDING' }),
  ]);
  return { positive, neutral, negative, flagged, pending };
}

/** The accounts and posts a period covers — the one scope the charts and the AI insights both read. */
export async function periodScope(input: SocialAnalyticsInput) {
  const period = PERIODS.has(input.days) ? input.days : DEFAULT_PERIOD;
  const since = new Date(Date.now() - period * DAY_MS);
  const accountFilter = input.account_ids?.length ? { _id: { $in: input.account_ids } } : {};
  const accounts = await SocialAccountModel.find(accountFilter).select('name platform followers').lean();
  const ids = accounts.map((account) => String(account._id));
  const posts = await SocialPostModel.find({ account_id: { $in: ids }, published_at: { $gte: since } })
    .select('account_id platform text published_at likes comments shares views engagement')
    .lean<PostNumbers[]>();
  const names = new Map(accounts.map((account) => [String(account._id), account.name ?? '']));
  return { period, since, accounts, ids, posts, names };
}

export async function socialAnalytics(input: SocialAnalyticsInput) {
  const { period, since, accounts, ids, posts, names } = await periodScope(input);
  const days = dayKeys(period);
  const [followerTrend, sentiment] = await Promise.all([followerSeries(days, ids), sentimentSummary(ids, since)]);

  const followers = accounts.reduce((total, account) => total + (account.followers ?? 0), 0);
  const likes = sumOf(posts, (p) => p.likes);
  const comments = sumOf(posts, (p) => p.comments);
  const shares = sumOf(posts, (p) => p.shares);
  const engagement = likes + comments + shares;
  const perPost = posts.length > 0 ? engagement / posts.length : 0;
  const byAccount = groupBy(posts, (post) => post.account_id);

  return {
    days,
    followers,
    posts: posts.length,
    likes,
    comments,
    shares,
    views: sumOf(posts, (p) => p.views ?? 0),
    engagement,
    // Average engagement per post as a share of the audience — the number that
    // stays comparable between a 500-follower page and a 50,000-follower one.
    engagement_rate: followers > 0 ? Math.round((perPost / followers) * 10_000) / 100 : 0,
    engagement_series: engagementSeries(days, posts),
    follower_series: followerTrend,
    by_account: accounts.map((account) => {
      const own = byAccount.get(String(account._id)) ?? [];
      return {
        account_id: String(account._id),
        name: account.name ?? '',
        platform: account.platform,
        followers: account.followers ?? 0,
        posts: own.length,
        engagement: sumOf(own, (p) => p.engagement),
      };
    }),
    by_platform: platformSplit(posts),
    by_weekday: weekdayAverages(posts),
    by_hour: hourAverages(posts),
    top_posts: topPosts(posts, names),
    sentiment,
  };
}
