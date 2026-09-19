import { GraphQLError } from 'graphql';
import { isValidObjectId } from 'mongoose';
import { logs } from '@observability/log';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import {
  SocialAccountModel,
  SocialAccountSnapshotModel,
  SocialCommentModel,
  SocialPostModel,
} from './social.model';
import { CONNECTORS } from './providers';
import { providerReadiness, socialCredentials } from './social.credentials';
import { readConnectState, startConnect } from './social.oauth';
import { syncSocialAccount } from './social.sync';
import { analyzePendingComments } from './social.ai';
import { sentimentCounts, socialAnalytics } from './social.analytics';
import { accountAverage, analyzePost, periodInsights } from './social.insights';

/** The latest comments the post detail lists under the post. */
const RECENT_COMMENTS = 20;
import type { DiscoveredAccount, SocialProvider, SocialReviewStatus } from './social.types';

const iso = (value: unknown) => (value instanceof Date ? value.toISOString() : null);

function notFound(what: string): never {
  throw new GraphQLError(`${what} not found`, { extensions: { code: 'NOT_FOUND' } });
}

/** Allowlists for the shared table engine (DUNCIT TABLE CONTRACT v1). */
const POST_TABLE: TableEntityConfig = {
  searchFields: ['text'],
  sortFields: {
    published_at: 'published_at',
    likes: 'likes',
    comments: 'comments',
    shares: 'shares',
    views: 'views',
    engagement: 'engagement',
    ai_score: 'ai_analysis.score',
  },
  filterFields: {
    account_id: { type: 'enum' },
    platform: { type: 'enum' },
    published_at: { type: 'date' },
    likes: { type: 'number' },
    comments: { type: 'number' },
    engagement: { type: 'number' },
  },
  defaultSort: { published_at: -1 },
};

const COMMENT_TABLE: TableEntityConfig = {
  searchFields: ['text', 'author_name', 'author_handle'],
  sortFields: { published_at: 'published_at', likes: 'likes' },
  filterFields: {
    account_id: { type: 'enum' },
    platform: { type: 'enum' },
    ai_status: { type: 'enum' },
    ai_sentiment: { type: 'enum' },
    ai_severity: { type: 'enum' },
    review_status: { type: 'enum' },
    published_at: { type: 'date' },
    // The post detail's own comment list.
    post_id: { type: 'enum' },
  },
  defaultSort: { published_at: -1 },
};

const pubAccount = (o: any, flaggedOpen: number) => ({
  id: String(o._id),
  provider: o.provider,
  platform: o.platform,
  name: o.name ?? '',
  handle: o.handle ?? '',
  avatar_url: o.avatar_url ?? '',
  profile_url: o.profile_url ?? '',
  followers: o.followers ?? 0,
  status: o.status,
  last_error: o.last_error ?? '',
  last_synced_at: iso(o.last_synced_at),
  token_expires_at: iso(o.token_expires_at),
  created_at: iso(o.created_at),
  flagged_open: flaggedOpen,
});

interface AccountFacts {
  name: string;
  followers: number;
}

/** Each account's name and audience, for the rows that point at it. */
async function accountFacts(ids: string[]): Promise<Map<string, AccountFacts>> {
  const accounts = await SocialAccountModel.find({ _id: { $in: [...new Set(ids)] } }).select('name followers').lean();
  return new Map(accounts.map((account) => [String(account._id), { name: account.name ?? '', followers: account.followers ?? 0 }]));
}

/** Comments marked FLAGGED that nobody has reviewed yet, per account. */
async function flaggedOpenByAccount(): Promise<Map<string, number>> {
  const rows = await SocialCommentModel.aggregate<{ _id: string; open: number }>([
    { $match: { ai_status: 'FLAGGED', review_status: 'OPEN' } },
    { $group: { _id: '$account_id', open: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [row._id, row.open]));
}

const pubAnalysis = (a: any) =>
  a
    ? {
        score: a.score ?? 0,
        summary: a.summary ?? '',
        strengths: a.strengths ?? [],
        improvements: a.improvements ?? [],
        next_idea: a.next_idea ?? '',
        analyzed_at: iso(a.analyzed_at),
      }
    : null;

/** Engagement as a share of the account's followers, to two decimals. */
const rateOf = (engagement: number, followers: number) =>
  followers > 0 ? Math.round((engagement / followers) * 10_000) / 100 : 0;

const pubPost = (o: any, accounts: Map<string, AccountFacts>) => {
  const account = accounts.get(o.account_id);
  return {
    id: String(o._id),
    account_id: o.account_id,
    account_name: account?.name ?? '',
    platform: o.platform,
    text: o.text ?? '',
    media_url: o.media_url ?? '',
    permalink: o.permalink ?? '',
    published_at: iso(o.published_at),
    likes: o.likes ?? 0,
    comments: o.comments ?? 0,
    shares: o.shares ?? 0,
    views: o.views ?? null,
    engagement: o.engagement ?? 0,
    engagement_rate: rateOf(o.engagement ?? 0, account?.followers ?? 0),
    ai_score: o.ai_analysis?.score ?? null,
    ai_analysis: pubAnalysis(o.ai_analysis),
  };
};

const pubComment = (o: any, accounts: Map<string, AccountFacts>, posts: Map<string, { text: string; permalink: string }>) => ({
  id: String(o._id),
  account_id: o.account_id,
  account_name: accounts.get(o.account_id)?.name ?? '',
  platform: o.platform,
  post_id: o.post_id,
  post_text: posts.get(o.post_id)?.text ?? '',
  post_permalink: posts.get(o.post_id)?.permalink ?? '',
  permalink: o.permalink ?? '',
  author_name: o.author_name ?? '',
  author_handle: o.author_handle ?? '',
  text: o.text ?? '',
  published_at: iso(o.published_at),
  likes: o.likes ?? 0,
  ai_status: o.ai_status,
  ai_sentiment: o.ai_sentiment ?? null,
  ai_categories: o.ai_categories ?? [],
  ai_severity: o.ai_severity ?? null,
  ai_reason: o.ai_reason ?? '',
  ai_analyzed_at: iso(o.ai_analyzed_at),
  review_status: o.review_status,
  reviewed_at: iso(o.reviewed_at),
});

async function commentContext(docs: any[]) {
  const [names, posts] = await Promise.all([
    accountFacts(docs.map((doc) => doc.account_id)),
    SocialPostModel.find({ _id: { $in: [...new Set(docs.map((doc) => doc.post_id))] } })
      .select('text permalink')
      .lean(),
  ]);
  const postMap = new Map(posts.map((post) => [String(post._id), { text: post.text ?? '', permalink: post.permalink ?? '' }]));
  return { names, posts: postMap };
}

/** Store what a handshake found. Reconnecting an account refreshes its tokens in place. */
async function saveDiscovered(provider: SocialProvider, accounts: DiscoveredAccount[], userId: string): Promise<string[]> {
  const ids: string[] = [];
  for (const account of accounts) {
    const { tokens, ...profile } = account;
    const doc = await SocialAccountModel.findOneAndUpdate(
      { platform: account.platform, external_id: account.external_id },
      {
        $set: {
          ...profile,
          provider,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: tokens.expires_at,
          scopes: tokens.scopes,
          status: 'CONNECTED',
          last_error: '',
          connected_by: userId,
        },
      },
      { upsert: true, returnDocument: 'after', projection: { _id: 1 } }
    );
    if (doc) ids.push(String(doc._id));
  }
  return ids;
}

async function account(id: string) {
  const doc = await SocialAccountModel.findById(id).lean();
  if (!doc) notFound('Social account');
  const open = await SocialCommentModel.countDocuments({ account_id: id, ai_status: 'FLAGGED', review_status: 'OPEN' });
  return pubAccount(doc, open);
}

export const socialService = {
  providers: providerReadiness,

  async accounts() {
    const [docs, flagged] = await Promise.all([
      SocialAccountModel.find().sort({ platform: 1, name: 1 }).lean(),
      flaggedOpenByAccount(),
    ]);
    return docs.map((doc) => pubAccount(doc, flagged.get(String(doc._id)) ?? 0));
  },

  /** The provider's consent screen, for the button the marketer just pressed. */
  async connectUrl(provider: SocialProvider, userId: string): Promise<string> {
    const creds = await socialCredentials(provider);
    if (!creds) {
      throw new GraphQLError('This network is not set up yet — Tech adds it under Environment Variables › Social apps.', {
        extensions: { code: 'SOCIAL_APP_NOT_CONFIGURED' },
      });
    }
    const { state, challenge } = startConnect(provider, userId);
    return CONNECTORS[provider].authorizeUrl({ creds, state, challenge });
  },

  /** The callback's half: trade the code, store what came back, start the first read. */
  async completeConnect(code: string, state: string): Promise<{ provider: SocialProvider; count: number }> {
    const parsed = readConnectState(state);
    if (!parsed) throw new Error('This connect link has expired or did not start here. Press Connect again.');
    const creds = await socialCredentials(parsed.provider);
    if (!creds) throw new Error('This network is not set up yet — Tech adds it under Environment Variables › Social apps.');
    const found = await CONNECTORS[parsed.provider].connect({ code, creds, verifier: parsed.verifier });
    const ids = await saveDiscovered(parsed.provider, found, parsed.userId);
    // In the background: the marketer is being sent back to the page now, and
    // the first read is several API calls per account.
    for (const id of ids) {
      syncSocialAccount(id).catch((error: unknown) => {
        logs.server.error('social-accounts', 'firstSync', { error, account_id: id, msg: 'first sync failed' });
      });
    }
    return { provider: parsed.provider, count: ids.length };
  },

  async sync(id: string) {
    const exists = await SocialAccountModel.exists({ _id: id });
    if (!exists) notFound('Social account');
    await syncSocialAccount(id);
    return account(id);
  },

  /** Removes the account with everything read from it; the tokens go with the row. */
  async disconnect(id: string): Promise<boolean> {
    const doc = await SocialAccountModel.findByIdAndDelete(id);
    if (!doc) notFound('Social account');
    await Promise.all([
      SocialPostModel.deleteMany({ account_id: id }),
      SocialCommentModel.deleteMany({ account_id: id }),
      SocialAccountSnapshotModel.deleteMany({ account_id: id }),
    ]);
    return true;
  },

  analyze: () => analyzePendingComments(),

  analytics: socialAnalytics,

  async postsTable(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<any>(SocialPostModel, {}, input, POST_TABLE);
    const accounts = await accountFacts(docs.map((doc) => doc.account_id));
    return { rows: docs.map((doc) => pubPost(doc, accounts)), total, page, page_size };
  },

  /** One post with what it is judged against: the account's usual numbers and how its comments read. */
  async postDetail(id: string) {
    const doc = isValidObjectId(id) ? await SocialPostModel.findById(id).lean<any>() : null;
    if (!doc) notFound('Post');
    const [accounts, average, sentiment, comments] = await Promise.all([
      accountFacts([doc.account_id]),
      accountAverage(doc),
      sentimentCounts({ post_id: id }),
      SocialCommentModel.find({ post_id: id }).sort({ published_at: -1 }).limit(RECENT_COMMENTS).lean(),
    ]);
    const context = await commentContext(comments);
    return {
      post: pubPost(doc, accounts),
      average,
      sentiment,
      recent_comments: comments.map((comment) => pubComment(comment, context.names, context.posts)),
    };
  },

  /** Ask the AI about the post, then hand the refreshed detail back. */
  async analyzePost(id: string) {
    await analyzePost(id);
    return socialService.postDetail(id);
  },

  insights: periodInsights,

  async commentsTable(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<any>(SocialCommentModel, {}, input, COMMENT_TABLE);
    const { names, posts } = await commentContext(docs);
    return { rows: docs.map((doc) => pubComment(doc, names, posts)), total, page, page_size };
  },

  async review(id: string, status: SocialReviewStatus, userId: string) {
    const reviewed = status === 'REVIEWED';
    const doc = await SocialCommentModel.findByIdAndUpdate(
      id,
      { $set: { review_status: status, reviewed_by: reviewed ? userId : null, reviewed_at: reviewed ? new Date() : null } },
      { returnDocument: 'after' }
    ).lean();
    if (!doc) notFound('Comment');
    const { names, posts } = await commentContext([doc]);
    return pubComment(doc, names, posts);
  },
};
