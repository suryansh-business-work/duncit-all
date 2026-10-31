import { isValidObjectId } from 'mongoose';
import { logs } from '@observability/log';
import { SocialAccountModel } from './social.model';
import { SocialScheduledPostModel } from './social.publish.model';
import { PUBLISHERS, READERS } from './providers';
import { SocialApiError } from './providers/http';
import { socialCredentials } from './social.credentials';
import { freshHandle, syncSocialAccount, type AccountWithTokens } from './social.sync';
import { publishProblems } from './social.rules';
import type { PublishContent, SocialMediaType, SocialPublishStatus, SocialTargetStatus } from './social.types';
import { continueRun, registerRunHandlers, userActor, withRun, type RunActor, type RunContext } from '../runs/marketingRun.service';

/**
 * Sending a Duncit post out — the half of Buffer that runs on a clock.
 *
 * A post is CLAIMED before anything is sent: the SCHEDULED → PUBLISHING flip
 * is one atomic update, so two ticks (or a tick and a "Share now") can never
 * send the same post twice. Each target is then published on its own; one
 * network refusing does not stop the others, and the post ends PUBLISHED,
 * PARTIAL or FAILED by what its targets did.
 *
 * Every send is one run in the marketing run log, one step per network, so
 * the Activity page shows what went out where, and a failed run can be
 * retried from there under the same row.
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
  const creds = await socialCredentials(doc.provider);
  if (!creds) return failed('This network’s app is not set up yet — add it under Marketing › Settings › Integrations.');
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

/** The names the steps are labelled with; an account gone since the post was written keeps its id. */
async function accountLabels(targets: readonly Target[]): Promise<Map<string, string>> {
  const ids = [...new Set(targets.map((t) => t.account_id))].filter((id) => isValidObjectId(id));
  const docs = await SocialAccountModel.find({ _id: { $in: ids } }).select('name handle').lean();
  return new Map(docs.map((doc) => [String(doc._id), doc.name || doc.handle || String(doc._id)]));
}

/** One target as one recorded step. A refusal — or a crash — fails the step and the target, never the post. */
function publishStep(run: RunContext, target: Target, content: PublishContent, name: string): Promise<Outcome> {
  const platform = target.platform.toLowerCase();
  return run
    .step(
      `${platform}:${target.account_id}`,
      `${target.platform} · ${name}`,
      async () => {
        const outcome = await publishTarget(target, content);
        if (outcome.status === 'FAILED') throw new Error(outcome.error);
        return outcome;
      },
      { tool: `${platform}.publish`, input_summary: content.text.slice(0, 200), summarize: (o) => o.permalink || o.external_id }
    )
    .catch((error: unknown) => failed((error instanceof Error ? error.message : String(error)).slice(0, 500)));
}

async function publishClaimed(post: ClaimedPost, run: RunContext): Promise<void> {
  const content: PublishContent = { text: post.text, media_url: post.media_url, media_type: post.media_type };
  const names = await accountLabels(post.targets);
  const targets: Target[] = [];
  for (const target of post.targets) {
    const name = names.get(target.account_id) ?? target.account_id;
    targets.push(target.status === 'PENDING' ? { ...target, ...(await publishStep(run, target, content, name)) } : target);
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

const runName = (post: ClaimedPost) => {
  const pending = post.targets.filter((t) => t.status === 'PENDING').length;
  const text = post.text.replaceAll(/\s+/g, ' ').trim().slice(0, 60) || 'Media post';
  return `Publish "${text}" to ${pending} network${pending === 1 ? '' : 's'}`;
};

/** A claimed post goes out under a new run; a crash fails the run and whatever had not been sent. */
async function publishAsRun(post: ClaimedPost, trigger: 'SCHEDULE' | 'USER', actor?: RunActor): Promise<void> {
  await withRun(
    { workflow: 'SOCIAL_PUBLISH', name: runName(post), trigger, actor, links: { post_id: String(post._id) } },
    (run) => publishClaimed(post, run)
  ).catch((error: unknown) => recordCrash(post, error));
}

/** The scheduler's pass: every post whose time has come, oldest first. */
export async function publishDue(): Promise<void> {
  for (let sent = 0; sent < MAX_PER_TICK; sent += 1) {
    const post = await claim({ scheduled_at: { $lte: new Date() } });
    if (!post) return;
    await publishAsRun(post, 'SCHEDULE');
  }
}

/** Send one post now, if it is still waiting, on behalf of whoever asked. Never throws. */
export async function publishNow(id: string, userId?: string): Promise<void> {
  const post = await claim({ _id: id });
  if (!post) return;
  await publishAsRun(post, 'USER', userId ? await userActor({ id: userId }) : undefined);
}

/**
 * Queue a post's failed targets again; the ones already out are left alone.
 * False when the post has nothing failed to send again.
 */
export async function requeueFailed(id: string): Promise<boolean> {
  if (!isValidObjectId(id)) return false;
  const result = await SocialScheduledPostModel.updateOne(
    { _id: id, status: { $in: ['FAILED', 'PARTIAL'] } },
    { $set: { status: 'SCHEDULED', scheduled_at: new Date(), 'targets.$[t].status': 'PENDING', 'targets.$[t].error': '' } },
    { arrayFilters: [{ 't.status': 'FAILED' }] }
  );
  return result.matchedCount === 1;
}

// Retry from the Activity page: the same run carries on, so its history stays in one row.
registerRunHandlers('SOCIAL_PUBLISH', {
  retry: async (run) => {
    const id = run.links?.post_id ?? '';
    if (!(await requeueFailed(id))) throw new Error('The post has nothing left to retry.');
    const post = await claim({ _id: id });
    if (!post) throw new Error('The post is already going out.');
    await continueRun(String(run._id), (ctx) => publishClaimed(post, ctx)).catch((error: unknown) => recordCrash(post, error));
  },
});

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
