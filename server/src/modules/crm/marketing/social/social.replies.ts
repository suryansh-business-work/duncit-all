import { GraphQLError } from 'graphql';
import { isValidObjectId } from 'mongoose';
import { userActor, withRun, type RunActor } from '../runs/marketingRun.service';
import { READERS } from './providers';
import { SocialApiError } from './providers/http';
import { REPLIERS } from './providers/replies';
import { SocialAccountModel, SocialCommentModel, SocialPostModel } from './social.model';
import { socialCredentials } from './social.credentials';
import { inboxComment } from './social.inbox';
import { freshHandle, type AccountWithTokens } from './social.sync';
import {
  SOCIAL_PLATFORMS,
  type SocialAppCredentials,
  type SocialPlatform,
  type SocialProvider,
  type SocialReplier,
} from './social.types';

/**
 * Answering a comment from the Inbox, on the network it was left on.
 *
 * Whether a network can be answered is a matter of the permission its app
 * asks for at connect time. Every network below names the one replying needs;
 * a network with no replier (Facebook — its app does not ask for
 * `pages_manage_engagement`) and an account whose token lacks the permission
 * are refused with NOT_CONFIGURED naming it, before anything is sent. Every
 * reply that is sent is a MarketingRun (workflow INBOX_REPLY), so Activity
 * shows who answered what and what the network said.
 */
export const REPLY_PERMISSION: Readonly<Record<SocialPlatform, string>> = {
  INSTAGRAM: 'instagram_business_manage_comments',
  FACEBOOK: 'pages_manage_engagement',
  THREADS: 'threads_manage_replies',
  YOUTUBE: 'https://www.googleapis.com/auth/youtube.force-ssl',
  LINKEDIN: 'w_organization_social',
  X: 'tweet.write',
};

/** The longest reply each network takes. */
export const REPLY_LIMIT: Readonly<Record<SocialPlatform, number>> = {
  INSTAGRAM: 2200,
  FACEBOOK: 8000,
  THREADS: 500,
  YOUTUBE: 10_000,
  LINKEDIN: 1250,
  X: 280,
};

/** An Instagram account connected through the Facebook app holds a Page token; replying with it needs a scope that app never asks for. */
const PAGE_TOKEN_INSTAGRAM_PERMISSION = 'instagram_manage_comments';
/** A reply stuck longer than this (a crash mid-send) no longer blocks the next one. */
const LOCK_MS = 2 * 60_000;

interface ReplyAccount {
  platform: SocialPlatform;
  provider: SocialProvider;
  scopes?: string[] | null;
}

/** The permission this account is missing to reply, or null when it has what it needs. */
export function missingReplyPermission(account: ReplyAccount): string | null {
  const permission = REPLY_PERMISSION[account.platform];
  if (!REPLIERS[account.platform]) return permission;
  if (account.platform === 'INSTAGRAM' && account.provider === 'FACEBOOK') return PAGE_TOKEN_INSTAGRAM_PERMISSION;
  // An account connected before the scope was asked for has an older grant; an empty list says nothing either way.
  const scopes = account.scopes ?? [];
  if (scopes.length > 0 && !scopes.includes(permission)) return permission;
  return null;
}

/** Which networks this integration can answer on, and what the others would need. */
export const replyCapabilities = () =>
  SOCIAL_PLATFORMS.map((platform) => {
    const can = REPLIERS[platform] !== null;
    return { platform, can_reply: can, missing_permission: can ? null : REPLY_PERMISSION[platform], max_length: REPLY_LIMIT[platform] };
  });

function refuse(code: string, message: string, extensions: Record<string, unknown> = {}): never {
  throw new GraphQLError(message, { extensions: { code, ...extensions } });
}

interface Prepared {
  comment: { _id: unknown; platform: SocialPlatform; external_id: string; post_id: string; author_name?: string | null; author_handle?: string | null };
  account: AccountWithTokens;
  replier: SocialReplier;
  creds: SocialAppCredentials;
}

/** Everything a reply needs, or the reason it cannot be sent — nothing is locked or sent yet. */
async function prepare(id: string, text: string): Promise<Prepared> {
  const comment = isValidObjectId(id) ? await SocialCommentModel.findById(id).lean() : null;
  if (!comment) refuse('NOT_FOUND', 'Comment not found');
  if (!text) refuse('BAD_USER_INPUT', 'Write the reply first.');
  const limit = REPLY_LIMIT[comment.platform];
  if (text.length > limit) refuse('BAD_USER_INPUT', `A reply on ${comment.platform} is at most ${limit} characters.`);
  const account = await SocialAccountModel.findById(comment.account_id).select('+access_token +refresh_token').lean<AccountWithTokens>();
  if (!account) refuse('NOT_FOUND', 'Social account not found');
  const replier = REPLIERS[account.platform];
  const missing = missingReplyPermission(account);
  if (!replier || missing) {
    const permission = missing ?? REPLY_PERMISSION[account.platform];
    refuse('NOT_CONFIGURED', `Replying on ${account.platform} needs the ${permission} permission, which this connection does not have.`, {
      missing_permission: permission,
    });
  }
  if (account.status === 'EXPIRED') refuse('BAD_USER_INPUT', 'This account needs reconnecting in Social Accounts before it can reply.');
  const creds = await socialCredentials(account.provider);
  if (!creds) refuse('NOT_CONFIGURED', 'This network’s app is not set up yet — add it under Marketing › Settings › Integrations.');
  return { comment, account, replier, creds };
}

/** Take the comment's send lock; false when another reply to it is still going out. */
async function lock(id: string): Promise<boolean> {
  const stale = new Date(Date.now() - LOCK_MS);
  const taken = await SocialCommentModel.updateOne(
    { _id: id, $or: [{ reply_lock_at: null }, { reply_lock_at: { $lt: stale } }] },
    { $set: { reply_lock_at: new Date() } }
  );
  return taken.modifiedCount > 0;
}

const reasonOf = (error: unknown) => (error instanceof Error ? error.message : String(error)).slice(0, 500);

/** The reply, kept on the comment whichever way it went; a sent one marks the comment REPLIED. */
async function record(id: string, actor: RunActor, text: string, outcome: { external_id: string; ok: boolean; error: string }) {
  const now = new Date();
  const entry = { at: now, by_user_id: actor.id ?? '', by_name: actor.name ?? '', text, ...outcome };
  const answered = outcome.ok
    ? { status: 'REPLIED', review_status: 'REVIEWED', reviewed_by: actor.id ?? null, reviewed_at: now }
    : {};
  await SocialCommentModel.updateOne({ _id: id }, { $push: { replies: entry }, $set: { ...answered, last_activity_at: now } });
}

async function send(prepared: Prepared, text: string, actor: RunActor) {
  const { comment, account, replier, creds } = prepared;
  const post = await SocialPostModel.findById(comment.post_id).select('external_id').lean();
  const who = comment.author_name || comment.author_handle || 'a comment';
  const platform = account.platform.toLowerCase();
  return withRun(
    {
      workflow: 'INBOX_REPLY',
      name: `Reply to ${who} on ${account.platform}`,
      actor,
      links: { account_id: String(account._id), post_id: comment.post_id },
    },
    (run) =>
      run.step(
        'reply',
        `Reply on ${account.platform} · ${account.name || account.handle || String(account._id)}`,
        async () => {
          const handle = await freshHandle(account, READERS[account.platform], creds);
          return replier.reply(handle, { comment_id: comment.external_id, post_id: post?.external_id ?? '' }, text, creds);
        },
        { tool: `${platform}.reply`, input_summary: text.slice(0, 200), summarize: (result) => result.external_id }
      )
  );
}

/** Answer the comment on its network as the signed-in person; the comment comes back with the reply on its thread. */
export async function replyToComment(id: string, rawText: string, user: { id: string; email?: string | null }) {
  const text = rawText.trim();
  const prepared = await prepare(id, text);
  if (!(await lock(id))) refuse('CONFLICT', 'A reply to this comment is already being sent.');
  const actor = await userActor(user);
  try {
    const result = await send(prepared, text, actor);
    await record(id, actor, text, { external_id: result.external_id, ok: true, error: '' });
  } catch (error) {
    if (error instanceof SocialApiError && error.expired) {
      await SocialAccountModel.updateOne({ _id: prepared.account._id }, { $set: { status: 'EXPIRED', last_error: error.message } });
    }
    await record(id, actor, text, { external_id: '', ok: false, error: reasonOf(error) });
    refuse('REPLY_FAILED', `The reply was not sent — ${reasonOf(error)}`);
  } finally {
    await SocialCommentModel.updateOne({ _id: id }, { $set: { reply_lock_at: null } });
  }
  return inboxComment(id);
}
