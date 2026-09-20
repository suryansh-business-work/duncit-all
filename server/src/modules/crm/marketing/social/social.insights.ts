import { GraphQLError } from 'graphql';
import { appFormat, getAppTimeZone } from '@utils/app-time';
import { SocialAccountModel, SocialPostModel } from './social.model';
import { askForJson, stringList, text } from './social.llm';
import { periodScope, sentimentCounts, type SocialAnalyticsInput } from './social.analytics';
import { hourAverages, platformSplit, sumOf, weekdayAverages, type PostNumbers } from './social.breakdowns';
import { firstLine } from './providers/http';

/**
 * The AI's read of the numbers, on request: one post against its own
 * account's average, or a whole period against itself. The facts are
 * computed here and handed over as plain lines — the model is asked to
 * explain them, never to count.
 */
const PEER_POSTS = 50;
const EXAMPLE_POSTS = 5;
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const round1 = (value: number) => Math.round(value * 10) / 10;
const average = (values: number[]) => (values.length > 0 ? round1(values.reduce((a, b) => a + b, 0) / values.length) : 0);

function badInput(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

interface PostDoc {
  _id: unknown;
  account_id: string;
  platform: string;
  text: string;
  media_url: string;
  published_at: Date;
  likes: number;
  comments: number;
  shares: number;
  views: number | null;
  engagement: number;
}

/** The account's usual numbers — its other recent posts, averaged. */
export async function accountAverage(post: PostDoc) {
  const peers = await SocialPostModel.find({ account_id: post.account_id, _id: { $ne: post._id } })
    .sort({ published_at: -1 })
    .limit(PEER_POSTS)
    .select('likes comments shares views engagement')
    .lean();
  const withViews = peers.filter((peer) => typeof peer.views === 'number');
  return {
    posts: peers.length,
    likes: average(peers.map((peer) => peer.likes ?? 0)),
    comments: average(peers.map((peer) => peer.comments ?? 0)),
    shares: average(peers.map((peer) => peer.shares ?? 0)),
    views: average(withViews.map((peer) => peer.views ?? 0)),
    engagement: average(peers.map((peer) => peer.engagement ?? 0)),
  };
}

type Average = Awaited<ReturnType<typeof accountAverage>>;

function postFacts(post: PostDoc, account: { name?: string; followers?: number }, avg: Average, sentiment: Record<string, number>) {
  const followers = account.followers ?? 0;
  const rate = followers > 0 ? round1((post.engagement / followers) * 100) : 0;
  const lines = [
    `Network: ${post.platform} (${account.name ?? ''}, ${followers} followers)`,
    `Published: ${appFormat(post.published_at, 'EEEE HH:mm')} (${getAppTimeZone()})`,
    `Media: ${post.media_url ? 'yes' : 'none'}`,
    `Text: """${post.text}"""`,
    `Likes: ${post.likes} (account average ${avg.likes})`,
    `Comments: ${post.comments} (account average ${avg.comments})`,
    `Shares: ${post.shares} (account average ${avg.shares})`,
    `Engagement rate: ${rate}% of followers`,
    `Comments as the AI read them: ${sentiment.positive} positive, ${sentiment.neutral} neutral, ${sentiment.negative} negative, ${sentiment.flagged} flagged`,
    `The account average is over its last ${avg.posts} other posts.`,
  ];
  if (post.views !== null) lines.splice(7, 0, `Views: ${post.views} (account average ${avg.views})`);
  return lines.join('\n');
}

/** Ask the AI about one post and keep its answer on the post. */
export async function analyzePost(postId: string): Promise<void> {
  const post = await SocialPostModel.findById(postId).lean<PostDoc>();
  if (!post) badInput('Post not found.');
  const [account, avg, sentiment] = await Promise.all([
    SocialAccountModel.findById(post.account_id).select('name followers').lean(),
    accountAverage(post),
    sentimentCounts({ post_id: postId }),
  ]);
  const answer = await askForJson({
    task: 'marketing.social_post_analysis',
    systemKey: 'social.post_analysis',
    userKey: 'social.post_analysis.user',
    variables: { post: postFacts(post, account ?? {}, avg, sentiment) },
    detail: `${post.platform} ${String(post._id)}`,
    maxTokens: 900,
  });
  const score = Math.max(0, Math.min(100, Math.round(Number(answer.score) || 0)));
  await SocialPostModel.updateOne(
    { _id: post._id },
    {
      $set: {
        ai_analysis: {
          score,
          summary: text(answer.summary),
          strengths: stringList(answer.strengths),
          improvements: stringList(answer.improvements),
          next_idea: text(answer.next_idea),
          analyzed_at: new Date(),
        },
      },
    }
  );
}

const exampleLine = (post: PostNumbers) =>
  `- ${post.platform} · ${appFormat(post.published_at, 'EEE HH:mm')} · ${post.engagement} engagement · "${firstLine(post.text, 160)}"`;

function periodFacts(scope: Awaited<ReturnType<typeof periodScope>>, sentiment: Record<string, number>): string {
  const { period, accounts, posts } = scope;
  const ranked = [...posts];
  ranked.sort((a, b) => b.engagement - a.engagement);
  const weekdays = weekdayAverages(posts).map((value, i) => `${WEEKDAYS[i]} ${value}`).join(', ');
  const hours = hourAverages(posts)
    .map((value, hour) => ({ value, hour }))
    .filter((slot) => slot.value > 0)
    .map((slot) => `${String(slot.hour).padStart(2, '0')}:00 ${slot.value}`)
    .join(', ');
  const networks = platformSplit(posts).map((row) => `${row.platform} ${row.posts} posts / ${row.engagement} engagement`);
  const lines = [
    `Period: the last ${period} days, ${accounts.length} accounts, ${posts.length} posts`,
    `Followers now: ${accounts.reduce((total, account) => total + (account.followers ?? 0), 0)}`,
    `Totals: ${sumOf(posts, (p) => p.likes)} likes, ${sumOf(posts, (p) => p.comments)} comments, ${sumOf(posts, (p) => p.shares)} shares`,
    `By network: ${networks.join('; ')}`,
    `Average engagement per post by weekday: ${weekdays}`,
    `Average engagement per post by hour (${getAppTimeZone()}): ${hours || 'none'}`,
    `Comments as the AI read them: ${sentiment.positive} positive, ${sentiment.neutral} neutral, ${sentiment.negative} negative, ${sentiment.flagged} flagged`,
    'Best posts:',
    ...ranked.slice(0, EXAMPLE_POSTS).map(exampleLine),
  ];
  if (ranked.length > EXAMPLE_POSTS * 2) lines.push('Weakest posts:', ...ranked.slice(-EXAMPLE_POSTS).map(exampleLine));
  return lines.join('\n');
}

/** What a period says, in the AI's words. Not stored — the numbers under it move every sync. */
export async function periodInsights(input: SocialAnalyticsInput) {
  const scope = await periodScope(input);
  if (scope.posts.length === 0) badInput('There are no posts in this period to learn from yet.');
  const sentiment = await sentimentCounts({ account_id: { $in: scope.ids }, published_at: { $gte: scope.since } });
  const answer = await askForJson({
    task: 'marketing.social_insights',
    systemKey: 'social.insights',
    userKey: 'social.insights.user',
    variables: { period: periodFacts(scope, sentiment) },
    detail: `${scope.period} days, ${scope.posts.length} posts`,
    maxTokens: 1200,
  });
  return {
    summary: text(answer.summary),
    what_works: stringList(answer.what_works),
    what_to_avoid: stringList(answer.what_to_avoid),
    best_times: stringList(answer.best_times),
    recommendations: stringList(answer.recommendations),
  };
}
