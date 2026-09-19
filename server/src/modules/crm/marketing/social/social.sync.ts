import { logs } from '@observability/log';
import { appFormat } from '@utils/app-time';
import {
  SocialAccountModel,
  SocialAccountSnapshotModel,
  SocialCommentModel,
  SocialPostModel,
  type SocialAccountDoc,
} from './social.model';
import { READERS } from './providers';
import { SocialApiError } from './providers/http';
import { PROVIDER_OF, socialCredentials } from './social.credentials';
import { analyzePendingComments } from './social.ai';
import type {
  FetchedComment,
  FetchedPost,
  SocialAccountHandle,
  SocialAppCredentials,
  SocialPlatform,
  SocialReader,
} from './social.types';

/**
 * One account's pass: renew the token if it is about to lapse, then refresh
 * the profile, the latest posts and the comments on the recent ones, and hand
 * any new comment to the AI. Every failure lands on the account row, where the
 * Marketing page shows it, instead of anywhere a marketer cannot see.
 */
const DAY_MS = 86_400_000;
/** Comments are read for posts this recent… */
const COMMENT_WINDOW_DAYS = 30;
/** …and for at most this many of them, newest first — each is one API call. */
const COMMENT_POSTS = 10;
const REFRESH_MARGIN_MS = 5 * 60_000;
/** How long an account waits between scheduled syncs. */
export const SYNC_EVERY_MS = 3 * 60 * 60_000;

export type AccountWithTokens = SocialAccountDoc & { access_token: string; refresh_token: string };

const handleOf = (doc: AccountWithTokens): SocialAccountHandle => ({
  platform: doc.platform,
  external_id: doc.external_id,
  handle: doc.handle ?? '',
  access_token: doc.access_token ?? '',
  refresh_token: doc.refresh_token ?? '',
  meta: (doc.meta ?? {}) as Record<string, string>,
});

/** The account's handle with a token good for the next few minutes. */
export async function freshHandle(doc: AccountWithTokens, reader: SocialReader, creds: SocialAppCredentials) {
  const handle = handleOf(doc);
  const expires = doc.token_expires_at ? new Date(doc.token_expires_at).getTime() : 0;
  if (!expires || expires - REFRESH_MARGIN_MS > Date.now()) return handle;
  if (!reader.refresh || !handle.refresh_token) {
    throw new SocialApiError(doc.platform, 401, 'the access token has expired — reconnect this account', true);
  }
  const tokens = await reader.refresh(handle, creds);
  await SocialAccountModel.updateOne(
    { _id: doc._id },
    {
      $set: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: tokens.expires_at,
      },
    }
  );
  return { ...handle, access_token: tokens.access_token, refresh_token: tokens.refresh_token };
}

/** Upsert the posts and return each one's stored id by its network id. */
async function savePosts(accountId: string, platform: SocialPlatform, posts: FetchedPost[]): Promise<Map<string, string>> {
  if (posts.length === 0) return new Map();
  await SocialPostModel.bulkWrite(
    posts.map((post) => ({
      updateOne: {
        filter: { account_id: accountId, external_id: post.external_id },
        update: { $set: { ...post, platform, engagement: post.likes + post.comments + post.shares } },
        upsert: true,
      },
    }))
  );
  const stored = await SocialPostModel.find({ account_id: accountId, external_id: { $in: posts.map((p) => p.external_id) } })
    .select('_id external_id')
    .lean();
  return new Map(stored.map((post) => [post.external_id, String(post._id)]));
}

/**
 * Upsert comments. A new one arrives PENDING (the schema default); an existing
 * one gets its text and likes refreshed and keeps its verdict and review.
 */
async function saveComments(accountId: string, platform: SocialPlatform, postId: string, comments: FetchedComment[]) {
  const usable = comments.filter((comment) => comment.external_id);
  if (usable.length === 0) return;
  await SocialCommentModel.bulkWrite(
    usable.map((comment) => ({
      updateOne: {
        filter: { account_id: accountId, external_id: comment.external_id },
        update: { $set: { ...comment, platform, post_id: postId } },
        upsert: true,
      },
    }))
  );
}

/** Comments for the most recent posts that have any, inside the reader's window. */
async function syncComments(
  reader: SocialReader,
  handle: SocialAccountHandle,
  creds: SocialAppCredentials,
  accountId: string,
  posts: FetchedPost[],
  postIds: Map<string, string>
) {
  const since = Date.now() - (reader.commentWindowDays ?? COMMENT_WINDOW_DAYS) * DAY_MS;
  // `filter` already made a copy, so sorting it in place touches nothing else.
  const recent = posts.filter((post) => post.comments > 0 && post.published_at.getTime() >= since);
  recent.sort((a, b) => b.published_at.getTime() - a.published_at.getTime());
  for (const post of recent.slice(0, COMMENT_POSTS)) {
    const postId = postIds.get(post.external_id);
    if (!postId) continue;
    const comments = await reader.comments(handle, post, creds);
    await saveComments(accountId, handle.platform, postId, comments);
  }
}

async function recordFailure(accountId: string, error: unknown) {
  const expired = error instanceof SocialApiError && error.expired;
  const message = error instanceof Error ? error.message : String(error);
  await SocialAccountModel.updateOne(
    { _id: accountId },
    { $set: { status: expired ? 'EXPIRED' : 'ERROR', last_error: message.slice(0, 500), last_synced_at: new Date() } }
  );
  logs.server.warn('social-accounts', 'sync', { error, account_id: accountId, msg: 'social account sync failed' });
}

/** Sync one account. Never throws: a failure is recorded on the account. */
export async function syncSocialAccount(accountId: string): Promise<void> {
  const doc = await SocialAccountModel.findById(accountId).select('+access_token +refresh_token').lean<AccountWithTokens>();
  if (!doc) return;
  try {
    const creds = await socialCredentials(PROVIDER_OF[doc.platform]);
    if (!creds) {
      throw new Error('This network’s app is not set up yet — Tech adds it under Environment Variables › Social apps.');
    }
    const reader = READERS[doc.platform];
    const handle = await freshHandle(doc, reader, creds);
    const profile = await reader.profile(handle, creds);
    const posts = await reader.posts(handle, creds);
    const postIds = await savePosts(accountId, doc.platform, posts);
    await syncComments(reader, handle, creds, accountId, posts, postIds);
    await Promise.all([
      SocialAccountModel.updateOne(
        { _id: accountId },
        { $set: { ...profile, status: 'CONNECTED', last_error: '', last_synced_at: new Date() } }
      ),
      SocialAccountSnapshotModel.updateOne(
        { account_id: accountId, day: appFormat(new Date(), 'yyyy-MM-dd') },
        { $set: { followers: profile.followers } },
        { upsert: true }
      ),
    ]);
  } catch (error) {
    await recordFailure(accountId, error);
    return;
  }
  const analysis = await analyzePendingComments(accountId).catch((error: unknown) => {
    logs.server.error('social-accounts', 'analyze', { error, account_id: accountId, msg: 'comment analysis failed' });
    return null;
  });
  if (analysis?.error) {
    logs.server.warn('social-accounts', 'analyze', { account_id: accountId, msg: analysis.error });
  }
}

/** The scheduler's pass: every account not synced for a while, one at a time. */
export async function syncDueAccounts(): Promise<void> {
  const due = await SocialAccountModel.find({
    status: { $ne: 'EXPIRED' },
    $or: [{ last_synced_at: null }, { last_synced_at: { $lt: new Date(Date.now() - SYNC_EVERY_MS) } }],
  })
    .select('_id')
    .limit(20)
    .lean();
  for (const account of due) await syncSocialAccount(String(account._id));
}
