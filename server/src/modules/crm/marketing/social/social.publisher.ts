import { isValidObjectId } from 'mongoose';
import { logs } from '@observability/log';
import { SocialAccountModel } from './social.model';
import { SocialScheduledPostModel } from './social.publish.model';
import { PUBLISHERS, READERS } from './providers';
import { SocialApiError } from './providers/http';
import { socialCredentials } from './social.credentials';
import { freshHandle, syncSocialAccount, type AccountWithTokens } from './social.sync';
import { GraphQLError } from 'graphql';
import { contentFor, publishContent, publishProblems } from './social.rules';
import { optionsOfDoc, type PostOptionsDoc } from './social.publish.options';
import type { PublishContent, PublishMedia, SocialMediaType, SocialPublishStatus, SocialTargetStatus } from './social.types';
import type { MarketingRunDecision, MarketingRunDoc } from '../runs/marketingRun.model';
import { continueRun, finishRun, registerRunHandlers, userActor, withRun, type RunActor, type RunContext } from '../runs/marketingRun.service';

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
 * retried from there under the same row. A post that needed approval was
 * parked PENDING_APPROVAL by the composer under an approval run; the
 * reviewer's decision (handled here too) puts it in the queue, and its
 * publish run then hangs under that approval run.
 *
 * A passing failure (the network rate-limiting, answering 5xx, or not
 * answering at all) is tried again on its own: that target goes back in the
 * queue 5, then 15 minutes later, and fails for good only after MAX_ATTEMPTS.
 * A refusal (bad media, a lapsed token, a rule) fails at once, since trying
 * again would only be refused again.
 */
const MAX_PER_TICK = 20;
/** Longer than the slowest publish (an Instagram Reel waits up to five minutes). */
const STUCK_AFTER_MS = 30 * 60_000;
const INTERRUPTED = 'Interrupted — the server stopped while this was going out. Check the network before retrying.';
export const MAX_ATTEMPTS = 3;
/** How long a target waits before its next try, by how many it has had. */
const RETRY_AFTER_MS = [5 * 60_000, 15 * 60_000];

interface Target {
  account_id: string;
  platform: string;
  status: SocialTargetStatus;
  external_id: string;
  permalink: string;
  error: string;
  published_at: Date | null;
  /** Sends tried so far; absent before the first. */
  attempts?: number;
  first_comment_error?: string;
}

interface ClaimedPost extends PostOptionsDoc {
  _id: unknown;
  text: string;
  /** Absent on a post stored before carousels came; its one piece is in media_url then. */
  media?: PublishMedia[];
  media_url: string;
  media_type: SocialMediaType | null;
  /** Absent on a post stored before collaborations. */
  collaborators?: string[];
  published_at: Date | null;
  targets: Target[];
  /** The approval run this post waited on, '' when it needed none. */
  approval_run_id?: string;
}

/** What a decision handler needs of the post a run waited on. */
interface WaitingPost {
  _id: unknown;
  status: SocialPublishStatus;
  scheduled_at: Date | null;
  approval_run_id?: string;
}

type Outcome = Pick<Target, 'status' | 'external_id' | 'permalink' | 'error' | 'published_at' | 'first_comment_error'> & {
  /** A passing failure, worth another try; never stored. */
  retryable?: boolean;
};

const failed = (error: string, retryable = false): Outcome => ({
  status: 'FAILED',
  external_id: '',
  permalink: '',
  error,
  published_at: null,
  ...(retryable ? { retryable } : {}),
});

/** Rate-limited, a 5xx, or no answer at all: the same send may well work in a few minutes. */
export function isPassingFailure(error: unknown): boolean {
  if (error instanceof SocialApiError) return !error.expired && (error.status === 429 || error.status >= 500);
  return error instanceof GraphQLError && error.extensions?.code === 'BAD_GATEWAY';
}

/** The first sixty characters of a post on one line, as a run names it; a post of media alone is "Media post". */
export const postTitle = (text: string) => text.replaceAll(/\s+/g, ' ').trim().slice(0, 60) || 'Media post';

/** The post's media: its list, or — for a post stored before carousels — the one piece in media_url. */
function mediaOf(post: ClaimedPost): PublishMedia[] {
  if (post.media && post.media.length > 0) return post.media;
  if (!post.media_url) return [];
  return [{ url: post.media_url, type: post.media_type ?? 'IMAGE' }];
}

async function publishTarget(target: Target, content: PublishContent): Promise<Outcome> {
  const doc = await SocialAccountModel.findById(target.account_id).select('+access_token +refresh_token').lean<AccountWithTokens>();
  if (!doc) return failed('This account was disconnected before the post went out.');
  if (doc.status === 'EXPIRED') return failed('This account needs reconnecting in Social Accounts.');
  const problems = publishProblems(doc.platform, content);
  if (problems.length > 0) return failed(problems.join('; '));
  const creds = await socialCredentials(doc.provider, doc.env_entry_id);
  if (!creds) return failed('This network’s app is not set up yet — add it under Marketing › Settings › Integrations.');
  try {
    const handle = await freshHandle(doc, READERS[doc.platform], creds);
    const result = await PUBLISHERS[doc.platform].publish(handle, contentFor(doc.platform, content), creds);
    return {
      status: 'PUBLISHED',
      external_id: result.external_id,
      permalink: result.permalink,
      error: '',
      published_at: new Date(),
      ...(result.first_comment_error ? { first_comment_error: result.first_comment_error } : {}),
    };
  } catch (error) {
    if (error instanceof SocialApiError && error.expired) {
      await SocialAccountModel.updateOne({ _id: doc._id }, { $set: { status: 'EXPIRED', last_error: error.message } });
    }
    return failed((error instanceof Error ? error.message : String(error)).slice(0, 500), isPassingFailure(error));
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

type Tried = Target & { retryable?: boolean };

const triesAgain = (target: Tried) => target.status === 'FAILED' && target.retryable === true && (target.attempts ?? 0) < MAX_ATTEMPTS;

/** The wait before a target's next try: 5 minutes after its first, 15 after its second. */
const retryDelay = (target: Tried) => RETRY_AFTER_MS[Math.min((target.attempts ?? 1) - 1, RETRY_AFTER_MS.length - 1)];

/**
 * After a pass: a target that failed in passing and has tries left goes back
 * in the queue, keeping its reason so the card says why it waits, and the
 * post waits until the soonest retry. Otherwise the post ends as its targets did.
 */
async function finishOrRetry(post: ClaimedPost, tried: Tried[]) {
  const waiting = tried.filter(triesAgain);
  const targets: Target[] = tried.map((target) => {
    const { retryable, ...stored } = target;
    return retryable && triesAgain(target) ? { ...stored, status: 'PENDING' } : stored;
  });
  if (waiting.length === 0) return finish(post, targets);
  const soonest = Math.min(...waiting.map(retryDelay));
  const firstOut = targets.some((target) => target.status === 'PUBLISHED') ? post.published_at ?? new Date() : post.published_at;
  await SocialScheduledPostModel.updateOne(
    { _id: post._id },
    { $set: { targets, status: 'SCHEDULED', scheduled_at: new Date(Date.now() + soonest), published_at: firstOut } }
  );
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
  // The outcome itself, not just its message, so a passing failure keeps the mark that lets it be tried again.
  let outcome: Outcome | null = null;
  return run
    .step(
      `${platform}:${target.account_id}`,
      `${target.platform} · ${name}`,
      async () => {
        outcome = await publishTarget(target, content);
        if (outcome.status === 'FAILED') throw new Error(outcome.error);
        return outcome;
      },
      { tool: `${platform}.publish`, input_summary: content.text.slice(0, 200), summarize: (o) => o.permalink || o.external_id }
    )
    .catch((error: unknown) => outcome ?? failed((error instanceof Error ? error.message : String(error)).slice(0, 500)));
}

async function publishClaimed(post: ClaimedPost, run: RunContext): Promise<void> {
  const content = { ...publishContent(post.text, mediaOf(post)), collaborators: post.collaborators ?? [], ...optionsOfDoc(post) };
  const names = await accountLabels(post.targets);
  const targets: Tried[] = [];
  for (const target of post.targets) {
    const name = names.get(target.account_id) ?? target.account_id;
    const attempts = (target.attempts ?? 0) + 1;
    targets.push(target.status === 'PENDING' ? { ...target, attempts, ...(await publishStep(run, target, content, name)) } : target);
  }
  await finishOrRetry(post, targets);
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
  return `Publish "${postTitle(post.text)}" to ${pending} network${pending === 1 ? '' : 's'}`;
};

/**
 * A claimed post goes out under a new run — beneath its approval run, when it
 * had one — and a crash fails the run and whatever had not been sent.
 */
async function publishAsRun(post: ClaimedPost, trigger: 'SCHEDULE' | 'USER', actor?: RunActor): Promise<void> {
  await withRun(
    {
      workflow: 'SOCIAL_PUBLISH',
      name: runName(post),
      trigger,
      actor,
      links: { post_id: String(post._id) },
      parent_run_id: post.approval_run_id || undefined,
    },
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
    // A person's retry starts a fresh round of tries.
    { $set: { status: 'SCHEDULED', scheduled_at: new Date(), 'targets.$[t].status': 'PENDING', 'targets.$[t].error': '', 'targets.$[t].attempts': 0 } },
    { arrayFilters: [{ 't.status': 'FAILED' }] }
  );
  return result.matchedCount === 1;
}

/** Retry from the Activity page: the same run carries on, so its history stays in one row. */
async function retry(run: MarketingRunDoc): Promise<void> {
  const id = run.links?.post_id ?? '';
  if (!(await requeueFailed(id))) throw new Error('The post has nothing left to retry.');
  const post = await claim({ _id: id });
  if (!post) throw new Error('The post is already going out.');
  await continueRun(String(run._id), (ctx) => publishClaimed(post, ctx)).catch((error: unknown) => recordCrash(post, error));
}

/**
 * A reviewer's word on a post parked PENDING_APPROVAL. Yes puts it in the
 * queue under the same run — the scheduler sends it within a minute, or at
 * its time. No, or changes asked for, sends it back to Drafts with the
 * reviewer's note; decideRun has already closed that run. A post that has
 * moved on since (edited, deleted, re-submitted under a newer run) is left
 * alone — and a yes that finds one is closed as cancelled, since decideRun
 * had reopened the run for the work that will not happen.
 */
async function onDecision(run: MarketingRunDoc, decision: MarketingRunDecision): Promise<void> {
  const runId = String(run._id);
  const id = run.links?.post_id ?? '';
  const post = isValidObjectId(id)
    ? await SocialScheduledPostModel.findById(id).select('status scheduled_at approval_run_id').lean<WaitingPost>()
    : null;
  if (!post || post.status !== 'PENDING_APPROVAL' || post.approval_run_id !== runId) {
    logs.server.warn('social-publisher', 'onDecision', { run_id: runId, post_id: id, decision, msg: 'the decided post is no longer waiting on this run' });
    if (decision === 'APPROVED') await finishRun(runId, 'CANCELLED', 'The post is no longer waiting for this approval.');
    return;
  }
  const waiting = { _id: post._id, status: 'PENDING_APPROVAL' };
  if (decision !== 'APPROVED') {
    await SocialScheduledPostModel.updateOne(waiting, { $set: { status: 'DRAFT', review_note: run.approval?.note ?? '' } });
    return;
  }
  await continueRun(runId, (ctx) =>
    ctx.step(
      'approve',
      'Approved',
      async () => {
        const at = new Date(Math.max(post.scheduled_at?.getTime() ?? 0, Date.now()));
        await SocialScheduledPostModel.updateOne(waiting, { $set: { status: 'SCHEDULED', scheduled_at: at } });
        return `scheduled for ${at.toISOString()}`;
      },
      { summarize: (summary) => summary }
    )
  );
}

// One registration carries both: a later call would replace, not add to, the first.
registerRunHandlers('SOCIAL_PUBLISH', { retry, onDecision });

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
