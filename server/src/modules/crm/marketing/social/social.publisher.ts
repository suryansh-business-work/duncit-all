import { logs } from '@observability/log';
import { SocialAccountModel } from './social.model';
import { SocialScheduledPostModel } from './social.publish.model';
import { PUBLISHERS, READERS } from './providers';
import { SocialApiError } from './providers/http';
import { PROVIDER_OF, socialCredentials } from './social.credentials';
import { freshHandle, syncSocialAccount, type AccountWithTokens } from './social.sync';
import { publishProblems } from './social.rules';
import type { PublishContent, SocialMediaType, SocialPublishStatus, SocialTargetStatus } from './social.types';

/**
 * Sending a Duncit post out — the half of Buffer that runs on a clock.
 *
 * A post is CLAIMED before anything is sent: the SCHEDULED → PUBLISHING flip
 * is one atomic update, so two ticks (or a tick and a "Share now") can never
 * send the same post twice. Each target is then published on its own; one
 * network refusing does not stop the others, and the post ends PUBLISHED,
 * PARTIAL or FAILED by what its targets did.
 */
const MAX_PER_TICK = 20;
/** Longer than the slowest publish (an Instagram Reel waits up to five minutes). */
const STUCK_AFTER_MS = 30 * 60_000;
const INTERRUPTED = 'Interrupted — the server stopped while this was going out. Check the network before retrying.';

interface Target {
  account_id: string;
  platform: string;
  status: SocialTargetStatus;
  external_id: string;
  permalink: string;
  error: string;
  published_at: Date | null;
}

interface ClaimedPost {
  _id: unknown;
  text: string;
  media_url: string;
  media_type: SocialMediaType | null;
  published_at: Date | null;
  targets: Target[];
}

type Outcome = Pick<Target, 'status' | 'external_id' | 'permalink' | 'error' | 'published_at'>;

const failed = (error: string): Outcome => ({ status: 'FAILED', external_id: '', permalink: '', error, published_at: null });

async function publishTarget(target: Target, content: PublishContent): Promise<Outcome> {
  const doc = await SocialAccountModel.findById(target.account_id).select('+access_token +refresh_token').lean<AccountWithTokens>();
  if (!doc) return failed('This account was disconnected before the post went out.');
  if (doc.status === 'EXPIRED') return failed('This account needs reconnecting in Social Accounts.');
  const problems = publishProblems(doc.platform, content);
  if (problems.length > 0) return failed(problems.join('; '));
  const creds = await socialCredentials(PROVIDER_OF[doc.platform]);
  if (!creds) return failed('This network’s app is not set up yet — Tech adds it under Environment Variables › Social apps.');
  try {
    const handle = await freshHandle(doc, READERS[doc.platform], creds);
    const result = await PUBLISHERS[doc.platform].publish(handle, content, creds);
    return { status: 'PUBLISHED', external_id: result.external_id, permalink: result.permalink, error: '', published_at: new Date() };
  } catch (error) {
    if (error instanceof SocialApiError && error.expired) {
      await SocialAccountModel.updateOne({ _id: doc._id }, { $set: { status: 'EXPIRED', last_error: error.message } });
    }
    return failed((error instanceof Error ? error.message : String(error)).slice(0, 500));
  }
}

/** The post's state from its targets'. */
function overallStatus(targets: readonly Target[]): SocialPublishStatus {
  const published = targets.filter((target) => target.status === 'PUBLISHED').length;
  if (published === targets.length) return 'PUBLISHED';
  return published === 0 ? 'FAILED' : 'PARTIAL';
}

async function finish(post: ClaimedPost, targets: Target[]) {
  const status = overallStatus(targets);
  const firstOut = status === 'FAILED' ? post.published_at : post.published_at ?? new Date();
  await SocialScheduledPostModel.updateOne({ _id: post._id }, { $set: { targets, status, published_at: firstOut } });
}

async function publishClaimed(post: ClaimedPost): Promise<void> {
  const content: PublishContent = { text: post.text, media_url: post.media_url, media_type: post.media_type };
  const targets: Target[] = [];
  for (const target of post.targets) {
    targets.push(target.status === 'PENDING' ? { ...target, ...(await publishTarget(target, content)) } : target);
  }
  await finish(post, targets);
  // Pull the new posts into Posts and Analytics now, not at the next sync.
  const published = new Set(targets.filter((t) => t.status === 'PUBLISHED').map((t) => t.account_id));
  for (const accountId of published) {
    syncSocialAccount(accountId).catch((error: unknown) => {
      logs.server.error('social-publisher', 'sync', { error, account_id: accountId, msg: 'post-publish sync failed' });
    });
  }
}

function claim(filter: Record<string, unknown>) {
  return SocialScheduledPostModel.findOneAndUpdate(
    { ...filter, status: 'SCHEDULED' },
    { $set: { status: 'PUBLISHING' } },
    { sort: { scheduled_at: 1 }, returnDocument: 'after' }
  ).lean<ClaimedPost>();
}

/** A publish that threw outright: whatever had not gone out is marked failed. */
async function recordCrash(post: ClaimedPost, error: unknown) {
  logs.server.error('social-publisher', 'publish', { error, msg: 'publishing a post crashed' });
  const reason = error instanceof Error ? error.message : String(error);
  const targets = post.targets.map((t) => (t.status === 'PENDING' ? { ...t, ...failed(reason.slice(0, 500)) } : t));
  await finish(post, targets);
}

/** The scheduler's pass: every post whose time has come, oldest first. */
export async function publishDue(): Promise<void> {
  for (let sent = 0; sent < MAX_PER_TICK; sent += 1) {
    const post = await claim({ scheduled_at: { $lte: new Date() } });
    if (!post) return;
    await publishClaimed(post).catch((error: unknown) => recordCrash(post, error));
  }
}

/** Send one post now, if it is still waiting. Never throws. */
export async function publishNow(id: string): Promise<void> {
  const post = await claim({ _id: id });
  if (!post) return;
  await publishClaimed(post).catch((error: unknown) => recordCrash(post, error));
}

/**
 * A post left PUBLISHING by a restart. Its unsent targets are marked failed —
 * never re-sent blindly, because the network may already have it; the
 * marketer checks and presses Retry.
 */
export async function recoverStuckPosts(): Promise<void> {
  const stuck = await SocialScheduledPostModel.find({
    status: 'PUBLISHING',
    updated_at: { $lt: new Date(Date.now() - STUCK_AFTER_MS) },
  }).lean<ClaimedPost[]>();
  for (const post of stuck) {
    const targets = post.targets.map((t) => (t.status === 'PENDING' ? { ...t, ...failed(INTERRUPTED) } : t));
    await finish(post, targets);
  }
}
