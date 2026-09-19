import { GraphQLError } from 'graphql';
import { isValidObjectId } from 'mongoose';
import { logs } from '@observability/log';
import { isTrustedMediaUrl } from '@utils/url';
import { SocialAccountModel, SocialPostModel } from './social.model';
import { SocialIdeaModel, SocialScheduledPostModel } from './social.publish.model';
import { publishProblems } from './social.rules';
import { publishNow } from './social.publisher';
import type { PublishContent, SocialMediaType, SocialPublishStatus } from './social.types';

/**
 * The composer's side of publishing: create, edit, delete, retry, and the
 * Queue / Drafts / Sent lists and the calendar that show them.
 *
 * A draft is allowed to be wrong — half-written, no accounts yet, media a
 * network would refuse. Anything scheduled or sent now is checked against
 * every target's rules first, so a post does not fail at 9am for a reason
 * that was knowable when it was written.
 */
export type SocialPublishMode = 'DRAFT' | 'SCHEDULE' | 'NOW';
export type SocialQueueView = 'QUEUE' | 'DRAFTS' | 'SENT';

export interface ScheduledPostInput {
  text: string;
  media_url?: string | null;
  media_type?: SocialMediaType | null;
  account_ids: string[];
  mode: SocialPublishMode;
  scheduled_at?: string | null;
  idea_id?: string | null;
}

/** A minute of grace, so "schedule for now" typed a few seconds late is not refused. */
const PAST_GRACE_MS = 60_000;
const LIST_LIMIT = 200;
const CALENDAR_LIMIT = 1000;
const EDITABLE = new Set<string>(['DRAFT', 'SCHEDULED']);
const RETRYABLE = new Set<string>(['FAILED', 'PARTIAL']);

const VIEWS: Record<SocialQueueView, { filter: Record<string, unknown>; sort: Record<string, 1 | -1> }> = {
  QUEUE: { filter: { status: { $in: ['SCHEDULED', 'PUBLISHING'] } }, sort: { scheduled_at: 1 } },
  DRAFTS: { filter: { status: 'DRAFT' }, sort: { updated_at: -1 } },
  SENT: { filter: { status: { $in: ['PUBLISHED', 'PARTIAL', 'FAILED'] } }, sort: { updated_at: -1 } },
};

const iso = (value: unknown) => (value instanceof Date ? value.toISOString() : null);

function badInput(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

function notFound(): never {
  throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } });
}

function toContent(input: ScheduledPostInput): PublishContent {
  const media_url = (input.media_url ?? '').trim();
  return { text: input.text.trim(), media_url, media_type: media_url ? input.media_type ?? 'IMAGE' : null };
}

/** The targets, checked — every account must exist, and (unless a draft) be able to take this post. */
async function buildTargets(input: ScheduledPostInput, content: PublishContent) {
  const ids = [...new Set(input.account_ids)];
  if (input.mode !== 'DRAFT' && ids.length === 0) badInput('Pick at least one account to post to.');
  // The server downloads the media for some networks, so it must come from our CDN or a stock library.
  if (content.media_url && !isTrustedMediaUrl(content.media_url)) {
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
  if (input.mode === 'NOW') return { status: 'SCHEDULED', scheduled_at: new Date() };
  if (!at || at.getTime() < Date.now() - PAST_GRACE_MS) badInput('Pick a time in the future to schedule this post.');
  return { status: 'SCHEDULED', scheduled_at: at };
}

async function accountNames(ids: string[]): Promise<Map<string, string>> {
  const accounts = await SocialAccountModel.find({ _id: { $in: [...new Set(ids)] } }).select('name').lean();
  return new Map(accounts.map((account) => [String(account._id), account.name ?? '']));
}

const pub = (o: any, names: Map<string, string>) => ({
  id: String(o._id),
  text: o.text ?? '',
  media_url: o.media_url ?? '',
  media_type: o.media_type ?? null,
  status: o.status,
  scheduled_at: iso(o.scheduled_at),
  published_at: iso(o.published_at),
  idea_id: o.idea_id ?? '',
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
function sendInBackground(id: string) {
  publishNow(id).catch((error: unknown) => {
    logs.server.error('social-publish', 'publishNow', { error, post_id: id, msg: 'publish now failed' });
  });
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
    const targets = await buildTargets(input, content);
    const timing = timingFor(input);
    const doc = await SocialScheduledPostModel.create({
      ...content,
      ...timing,
      targets,
      idea_id: input.idea_id ?? '',
      created_by: userId,
      updated_by: userId,
    });
    await markIdeaUsed(input.idea_id);
    if (input.mode === 'NOW') sendInBackground(doc.id);
    return (await pubMany([doc.toObject()]))[0];
  },

  async update(id: string, input: ScheduledPostInput, userId: string) {
    const doc = await loadPost(id);
    if (!EDITABLE.has(doc.status)) badInput('Only a draft or a scheduled post can be edited.');
    const content = toContent(input);
    const targets = await buildTargets(input, content);
    doc.set({ ...content, ...timingFor(input), targets, updated_by: userId });
    await doc.save();
    if (input.mode === 'NOW') sendInBackground(id);
    return (await pubMany([doc.toObject()]))[0];
  },

  /** Removes it from Duncit only — a post already out stays on the network. */
  async remove(id: string): Promise<boolean> {
    const doc = await loadPost(id);
    if (doc.status === 'PUBLISHING') badInput('This post is going out right now — wait for it to finish.');
    await doc.deleteOne();
    return true;
  },

  /** Send a waiting post now instead of at its time. */
  async shareNow(id: string) {
    const doc = await loadPost(id);
    if (doc.status !== 'SCHEDULED') badInput('Only a scheduled post can be shared now.');
    doc.scheduled_at = new Date();
    await doc.save();
    sendInBackground(id);
    return (await pubMany([doc.toObject()]))[0];
  },

  /** Queue the failed targets again; the ones already out are left alone. */
  async retry(id: string) {
    const doc = await loadPost(id);
    if (!RETRYABLE.has(doc.status)) badInput('Only a post that failed somewhere can be retried.');
    for (const target of doc.targets) {
      if (target.status === 'FAILED') {
        target.status = 'PENDING';
        target.error = '';
      }
    }
    doc.status = 'SCHEDULED';
    doc.scheduled_at = new Date();
    await doc.save();
    sendInBackground(id);
    return (await pubMany([doc.toObject()]))[0];
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
        permalink: post.permalink ?? '',
        platforms: [post.platform],
        account_names: [names.get(post.account_id) ?? ''],
        engagement: post.engagement ?? 0,
      }));
    return [...plannedItems, ...syncedItems];
  },
};
