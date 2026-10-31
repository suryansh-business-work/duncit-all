import { GraphQLError } from 'graphql';
import { isValidObjectId } from 'mongoose';
import { logs } from '@observability/log';
import { isTrustedMediaUrl } from '@utils/url';
import { SocialAccountModel, SocialPostModel } from './social.model';
import { SocialIdeaModel, SocialScheduledPostModel } from './social.publish.model';
import { publishContent, publishProblems } from './social.rules';
import { postTitle, publishNow, requeueFailed } from './social.publisher';
import type { PublishContent, PublishMedia, SocialMediaType, SocialPublishStatus } from './social.types';
import { cancelRun, startRun, userActor } from '../runs/marketingRun.service';
import { normalizeCollaborators } from './social.collaborators';

/**
 * The composer's side of publishing: create, edit, delete, retry, and the
 * Queue / Drafts / Sent / Approvals lists and the calendar that show them.
 *
 * A draft is allowed to be wrong — half-written, no accounts yet, media a
 * network would refuse. Anything scheduled or sent now is checked against
 * every target's rules first, so a post does not fail at 9am for a reason
 * that was knowable when it was written. A post that needs approval passes
 * the same checks, then waits as PENDING_APPROVAL under a run in the
 * marketing run log until a reviewer decides (see social.publisher).
 */
export type SocialPublishMode = 'DRAFT' | 'SCHEDULE' | 'NOW';
export type SocialQueueView = 'QUEUE' | 'DRAFTS' | 'SENT' | 'APPROVALS';

export interface ScheduledPostInput {
  text: string;
  /** Every piece of media in order; when given it replaces media_url / media_type. */
  media?: { url: string; type: SocialMediaType }[] | null;
  media_url?: string | null;
  media_type?: SocialMediaType | null;
  account_ids: string[];
  mode: SocialPublishMode;
  scheduled_at?: string | null;
  idea_id?: string | null;
  /** The Reel Studio project this reel was cut in; the studio reads the post's numbers back through it. */
  reel_project_id?: string | null;
  /** The pod a Pod promotion made this post for. */
  pod_id?: string | null;
  /** Instagram usernames to invite; dropped when no Instagram account is picked. */
  collaborators?: string[] | null;
  /** With SCHEDULE or NOW, parks the post as PENDING_APPROVAL and opens an approval run. */
  needs_approval?: boolean | null;
}

type PostDoc = InstanceType<typeof SocialScheduledPostModel>;

/** A minute of grace, so "schedule for now" typed a few seconds late is not refused. */
const PAST_GRACE_MS = 60_000;
const LIST_LIMIT = 200;
const CALENDAR_LIMIT = 1000;
const EDITABLE = new Set<string>(['DRAFT', 'PENDING_APPROVAL', 'SCHEDULED']);
const RETRYABLE = new Set<string>(['FAILED', 'PARTIAL']);

const VIEWS: Record<SocialQueueView, { filter: Record<string, unknown>; sort: Record<string, 1 | -1> }> = {
  QUEUE: { filter: { status: { $in: ['SCHEDULED', 'PUBLISHING'] } }, sort: { scheduled_at: 1 } },
  DRAFTS: { filter: { status: 'DRAFT' }, sort: { updated_at: -1 } },
  SENT: { filter: { status: { $in: ['PUBLISHED', 'PARTIAL', 'FAILED'] } }, sort: { updated_at: -1 } },
  APPROVALS: { filter: { status: 'PENDING_APPROVAL' }, sort: { scheduled_at: 1 } },
};

const iso = (value: unknown) => (value instanceof Date ? value.toISOString() : null);

function badInput(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

function notFound(): never {
  throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } });
}

/** The media as given: the list when there is one, else the one piece older callers send. */
function mediaOf(input: ScheduledPostInput): PublishMedia[] {
  if (input.media) return input.media.map((item) => ({ url: item.url.trim(), type: item.type })).filter((item) => item.url);
  const media_url = (input.media_url ?? '').trim();
  return media_url ? [{ url: media_url, type: input.media_type ?? 'IMAGE' }] : [];
}

const toContent = (input: ScheduledPostInput): PublishContent => publishContent(input.text.trim(), mediaOf(input));

/** The reel this post carries, checked — a link to a reel that cannot exist would never read back. */
function reelLinkOf(input: ScheduledPostInput): string {
  const id = (input.reel_project_id ?? '').trim();
  if (id && !isValidObjectId(id)) badInput('That reel link is not valid.');
  return id;
}

/** The pod this post promotes, checked like the reel link. */
function podLinkOf(input: ScheduledPostInput): string {
  const id = (input.pod_id ?? '').trim();
  if (id && !isValidObjectId(id)) badInput('That pod link is not valid.');
  return id;
}

/** Collaborators only travel to Instagram; with no Instagram target they are dropped rather than kept unseen. */
function collaboratorsFor(input: ScheduledPostInput, targets: { platform: string }[]): string[] {
  const handles = normalizeCollaborators(input.collaborators);
  return targets.some((target) => target.platform === 'INSTAGRAM') ? handles : [];
}

/** The targets, checked — every account must exist, and (unless a draft) be able to take this post. */
async function buildTargets(input: ScheduledPostInput, content: PublishContent) {
  const ids = [...new Set(input.account_ids)];
  if (input.mode !== 'DRAFT' && ids.length === 0) badInput('Pick at least one account to post to.');
  // The server downloads the media for some networks, so it must come from our CDN or a stock library.
  if (content.media.some((item) => !isTrustedMediaUrl(item.url))) {
    badInput('Pick the image or video with the media picker — only Duncit’s own media can be posted.');
  }
  if (!ids.every((id) => isValidObjectId(id))) badInput('One of the chosen accounts is not valid.');
  const accounts = await SocialAccountModel.find({ _id: { $in: ids } }).select('platform status name').lean();
  if (accounts.length !== ids.length) badInput('One of the chosen accounts is no longer connected.');
  if (input.mode !== 'DRAFT') {
    const problems = [...new Set(accounts.flatMap((account) => publishProblems(account.platform, content)))];
    if (problems.length > 0) badInput(`${problems.join('. ')}.`);
    const expired = accounts.filter((account) => account.status === 'EXPIRED').map((account) => account.name);
    if (expired.length > 0) badInput(`Reconnect ${expired.join(', ')} before posting to it.`);
  }
  return accounts.map((account) => ({ account_id: String(account._id), platform: account.platform, status: 'PENDING' as const }));
}

function timingFor(input: ScheduledPostInput): { status: SocialPublishStatus; scheduled_at: Date | null } {
  const at = input.scheduled_at ? new Date(input.scheduled_at) : null;
  if (at && Number.isNaN(at.getTime())) badInput('That date and time could not be read.');
  if (input.mode === 'DRAFT') return { status: 'DRAFT', scheduled_at: at };
  // A post that must be approved waits, at the time it would otherwise go out.
  const status: SocialPublishStatus = input.needs_approval ? 'PENDING_APPROVAL' : 'SCHEDULED';
  if (input.mode === 'NOW') return { status, scheduled_at: new Date() };
  if (!at || at.getTime() < Date.now() - PAST_GRACE_MS) badInput('Pick a time in the future to schedule this post.');
  return { status, scheduled_at: at };
}

async function accountNames(ids: string[]): Promise<Map<string, string>> {
  const accounts = await SocialAccountModel.find({ _id: { $in: [...new Set(ids)] } }).select('name').lean();
  return new Map(accounts.map((account) => [String(account._id), account.name ?? '']));
}

const pub = (o: any, names: Map<string, string>) => ({
  id: String(o._id),
  text: o.text ?? '',
  media: (o.media ?? []).map((m: PublishMedia) => ({ url: m.url, type: m.type })),
  media_url: o.media_url ?? '',
  media_type: o.media_type ?? null,
  status: o.status,
  scheduled_at: iso(o.scheduled_at),
  published_at: iso(o.published_at),
  idea_id: o.idea_id ?? '',
  reel_project_id: o.reel_project_id ?? '',
  pod_id: o.pod_id ?? '',
  collaborators: o.collaborators ?? [],
  needs_approval: !!o.needs_approval,
  review_note: o.review_note ?? '',
  approval_run_id: o.approval_run_id ?? '',
  created_at: iso(o.created_at),
  updated_at: iso(o.updated_at),
  targets: (o.targets ?? []).map((t: any) => ({
    account_id: t.account_id,
    account_name: names.get(t.account_id) ?? '',
    platform: t.platform,
    status: t.status,
    permalink: t.permalink ?? '',
    error: t.error ?? '',
    published_at: iso(t.published_at),
  })),
});

async function pubMany(docs: any[]) {
  const names = await accountNames(docs.flatMap((doc) => (doc.targets ?? []).map((t: any) => t.account_id)));
  return docs.map((doc) => pub(doc, names));
}

async function loadPost(id: string) {
  const doc = isValidObjectId(id) ? await SocialScheduledPostModel.findById(id) : null;
  if (!doc) notFound();
  return doc;
}

/** Off in the background: the marketer gets the post back as PUBLISHING and the list follows it. */
function sendInBackground(id: string, userId: string) {
  publishNow(id, userId).catch((error: unknown) => {
    logs.server.error('social-publish', 'publishNow', { error, post_id: id, msg: 'publish now failed' });
  });
}

/** Open the run a reviewer decides on, in the person's name; its id is kept on the post. */
async function openApproval(doc: PostDoc, userId: string): Promise<string> {
  const count = doc.targets.length;
  return startRun({
    workflow: 'SOCIAL_PUBLISH',
    name: `Approve "${postTitle(doc.text)}" for ${count} network${count === 1 ? '' : 's'}`,
    trigger: 'USER',
    actor: await userActor({ id: userId }),
    links: { post_id: String(doc._id) },
    approval_required: true,
  });
}

/**
 * Close the run a post was waiting on because the post moved on. A run
 * already decided or cancelled from the Approval Centre is left as it is —
 * the post's new state wins, and the decision handler ignores a run the post
 * no longer waits on.
 */
async function closeApproval(runId: string, postId: string): Promise<void> {
  if (!runId) return;
  try {
    await cancelRun(runId);
  } catch (error) {
    if (!(error instanceof GraphQLError)) throw error;
    logs.server.warn('social-publish', 'closeApproval', { error, run_id: runId, post_id: postId, msg: 'the approval run was already closed' });
  }
}

/** After a post is written: open its approval run, or send it now — never both. */
async function dispatch(doc: PostDoc, input: ScheduledPostInput, userId: string): Promise<void> {
  if (doc.status === 'PENDING_APPROVAL') {
    doc.approval_run_id = await openApproval(doc, userId);
    await doc.save();
    return;
  }
  if (input.mode === 'NOW') sendInBackground(doc.id, userId);
}

async function markIdeaUsed(ideaId?: string | null) {
  if (ideaId && isValidObjectId(ideaId)) await SocialIdeaModel.updateOne({ _id: ideaId }, { $set: { status: 'USED' } });
}

export const socialPublishService = {
  async list(view: SocialQueueView) {
    const { filter, sort } = VIEWS[view];
    const docs = await SocialScheduledPostModel.find(filter).sort(sort).limit(LIST_LIMIT).lean();
    return pubMany(docs);
  },

  async get(id: string) {
    const doc = await loadPost(id);
    return (await pubMany([doc.toObject()]))[0];
  },

  async create(input: ScheduledPostInput, userId: string) {
    const content = toContent(input);
    const reel_project_id = reelLinkOf(input);
    const targets = await buildTargets(input, content);
    const timing = timingFor(input);
    const doc = await SocialScheduledPostModel.create({
      ...content,
      ...timing,
      targets,
      idea_id: input.idea_id ?? '',
      reel_project_id,
      pod_id: podLinkOf(input),
      collaborators: collaboratorsFor(input, targets),
      needs_approval: !!input.needs_approval,
      review_note: '',
      created_by: userId,
      updated_by: userId,
    });
    await markIdeaUsed(input.idea_id);
    await dispatch(doc, input, userId);
    return (await pubMany([doc.toObject()]))[0];
  },

  /**
   * Rewrite a post that has not gone out. One waiting for approval leaves
   * that run behind: it waits again under a fresh run if it still needs
   * approval, or becomes a plain scheduled post or draft if not. A reviewer's
   * note stays on a draft until the post is submitted again.
   */
  async update(id: string, input: ScheduledPostInput, userId: string) {
    const doc = await loadPost(id);
    if (!EDITABLE.has(doc.status)) badInput('Only a draft, a scheduled post or one waiting for approval can be edited.');
    const content = toContent(input);
    const reel_project_id = reelLinkOf(input);
    const targets = await buildTargets(input, content);
    const timing = timingFor(input);
    const waiting = doc.status === 'PENDING_APPROVAL';
    if (waiting) await closeApproval(doc.approval_run_id, id);
    doc.set({
      ...content,
      ...timing,
      targets,
      reel_project_id,
      // An edit from the composer does not carry the pod link; it keeps the one it had.
      pod_id: input.pod_id === undefined ? doc.pod_id : podLinkOf(input),
      collaborators: collaboratorsFor(input, targets),
      needs_approval: !!input.needs_approval,
      ...(input.mode === 'DRAFT' ? {} : { review_note: '' }),
      ...(waiting ? { approval_run_id: '' } : {}),
      updated_by: userId,
    });
    await doc.save();
    await dispatch(doc, input, userId);
    return (await pubMany([doc.toObject()]))[0];
  },

  /** Removes it from Duncit only — a post already out stays on the network. */
  async remove(id: string): Promise<boolean> {
    const doc = await loadPost(id);
    if (doc.status === 'PUBLISHING') badInput('This post is going out right now — wait for it to finish.');
    if (doc.status === 'PENDING_APPROVAL') await closeApproval(doc.approval_run_id, id);
    await doc.deleteOne();
    return true;
  },

  /** Send a waiting post now instead of at its time. */
  async shareNow(id: string, userId: string) {
    const doc = await loadPost(id);
    if (doc.status !== 'SCHEDULED') badInput('Only a scheduled post can be shared now.');
    doc.scheduled_at = new Date();
    await doc.save();
    sendInBackground(id, userId);
    return (await pubMany([doc.toObject()]))[0];
  },

  /** Queue the failed targets again; the ones already out are left alone. */
  async retry(id: string, userId: string) {
    const doc = await loadPost(id);
    if (!RETRYABLE.has(doc.status)) badInput('Only a post that failed somewhere can be retried.');
    await requeueFailed(id);
    sendInBackground(id, userId);
    return (await pubMany([(await loadPost(id)).toObject()]))[0];
  },

  /**
   * Everything with a date in the range: posts written here (drafts with a
   * date included) and posts read from the networks. A post sent from Duncit
   * shows once — as the Duncit post — not again as the copy the sync read back.
   */
  async calendar(from: string, to: string) {
    const start = new Date(from);
    const end = new Date(to);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) badInput('That date range could not be read.');
    const range = { $gte: start, $lt: end };
    const [planned, synced] = await Promise.all([
      SocialScheduledPostModel.find({ $or: [{ scheduled_at: range }, { published_at: range }] }).limit(CALENDAR_LIMIT).lean(),
      SocialPostModel.find({ published_at: range }).sort({ published_at: 1 }).limit(CALENDAR_LIMIT).lean(),
    ]);
    const sentFromHere = new Set(planned.flatMap((post) => post.targets.map((t) => t.external_id).filter(Boolean)));
    const names = await accountNames([...planned.flatMap((p) => p.targets.map((t) => t.account_id)), ...synced.map((p) => p.account_id)]);
    const plannedItems = planned.map((post) => ({
      id: String(post._id),
      kind: 'PLANNED',
      at: iso(post.published_at ?? post.scheduled_at),
      status: post.status,
      text: post.text ?? '',
      media_url: post.media_url ?? '',
      // A post stored before carousels has no list; its one piece is in media_url.
      media_count: (post.media ?? []).length || (post.media_url ? 1 : 0),
      permalink: post.targets.find((t) => t.permalink)?.permalink ?? '',
      platforms: post.targets.map((t) => t.platform),
      account_names: post.targets.map((t) => names.get(t.account_id) ?? ''),
      engagement: null,
    }));
    const syncedItems = synced
      .filter((post) => !sentFromHere.has(post.external_id))
      .map((post) => ({
        id: String(post._id),
        kind: 'PUBLISHED',
        at: iso(post.published_at),
        status: 'PUBLISHED',
        text: post.text ?? '',
        media_url: post.media_url ?? '',
        media_count: post.media_url ? 1 : 0,
        permalink: post.permalink ?? '',
        platforms: [post.platform],
        account_names: [names.get(post.account_id) ?? ''],
        engagement: post.engagement ?? 0,
      }));
    return [...plannedItems, ...syncedItems];
  },
};
