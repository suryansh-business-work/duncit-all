import { GraphQLError } from 'graphql';
import { isValidObjectId } from 'mongoose';
import { SocialAccountModel, SocialPostModel } from './social.model';
import { SocialIdeaModel } from './social.publish.model';
import { askForJson, stringList, text } from './social.llm';
import { firstLine } from './providers/http';
import {
  SOCIAL_IDEA_FORMATS,
  SOCIAL_PLATFORMS,
  type SocialIdeaStatus,
  type SocialPlatform,
} from './social.types';

/**
 * Post ideas from the AI, kept on a board the team picks from — Buffer's
 * Ideas. Each generation shows the model the best recent posts, so the ideas
 * lean towards what Duncit's audience already answers to.
 */
const DEFAULT_COUNT = 5;
const MAX_COUNT = 10;
const LOOKBACK_MS = 90 * 86_400_000;
const LIST_LIMIT = 200;
const FORMATS = new Set<string>(SOCIAL_IDEA_FORMATS);
const PLATFORMS = new Set<string>(SOCIAL_PLATFORMS);

export interface SocialIdeasInput {
  brief?: string | null;
  platforms?: SocialPlatform[] | null;
  count?: number | null;
}

const iso = (value: unknown) => (value instanceof Date ? value.toISOString() : null);

const pubIdea = (o: any) => ({
  id: String(o._id),
  title: o.title ?? '',
  caption: o.caption ?? '',
  hashtags: o.hashtags ?? [],
  platforms: o.platforms ?? [],
  format: o.format ?? 'TEXT',
  why: o.why ?? '',
  brief: o.brief ?? '',
  status: o.status,
  created_at: iso(o.created_at),
});

function notFound(): never {
  throw new GraphQLError('Idea not found', { extensions: { code: 'NOT_FOUND' } });
}

/** The networks asked for, else the ones Duncit has accounts on, else all of them. */
async function targetPlatforms(asked?: SocialPlatform[] | null): Promise<string[]> {
  if (asked?.length) return [...new Set(asked)];
  const connected: string[] = await SocialAccountModel.distinct('platform');
  return connected.length > 0 ? connected : [...SOCIAL_PLATFORMS];
}

async function bestRecentPosts(): Promise<string> {
  const best = await SocialPostModel.find({ published_at: { $gte: new Date(Date.now() - LOOKBACK_MS) } })
    .sort({ engagement: -1 })
    .limit(5)
    .select('platform text engagement')
    .lean();
  return best.map((post) => `${post.platform} · ${post.engagement} engagement · "${firstLine(post.text ?? '', 200)}"`).join('\n');
}

/** One idea from the answer, or nothing when it is missing its words. */
function toIdea(raw: unknown, allowed: string[]) {
  if (typeof raw !== 'object' || raw === null) return [];
  const item = raw as Record<string, unknown>;
  const title = text(item.title);
  const caption = text(item.caption);
  if (!title || !caption) return [];
  const platforms = stringList(item.platforms, 5).filter((p) => PLATFORMS.has(p) && allowed.includes(p));
  const format = text(item.format).toUpperCase();
  return [
    {
      title: title.slice(0, 120),
      caption,
      hashtags: stringList(item.hashtags, 8).map((tag) => tag.replace(/^#/, '').replaceAll(/\s+/g, '')),
      platforms: platforms.length > 0 ? platforms : allowed,
      format: FORMATS.has(format) ? format : 'TEXT',
      why: text(item.why),
    },
  ];
}

export const socialIdeasService = {
  async generate(input: SocialIdeasInput, userId: string) {
    const brief = (input.brief ?? '').trim().slice(0, 500);
    const platforms = await targetPlatforms(input.platforms);
    const count = Math.max(1, Math.min(MAX_COUNT, input.count ?? DEFAULT_COUNT));
    const answer = await askForJson({
      task: 'marketing.social_ideas',
      systemKey: 'social.ideas',
      userKey: 'social.ideas.user',
      variables: { brief: brief || 'Anything on-brand', platforms: platforms.join(', '), count: String(count), top_posts: await bestRecentPosts() },
      detail: brief || 'on-brand',
      maxTokens: 3000,
    });
    const ideas = (Array.isArray(answer.ideas) ? answer.ideas : []).slice(0, count).flatMap((raw) => toIdea(raw, platforms));
    if (ideas.length === 0) {
      throw new GraphQLError('The AI did not come back with any usable ideas — try again.', { extensions: { code: 'AI_UNREADABLE' } });
    }
    const docs = await SocialIdeaModel.insertMany(ideas.map((idea) => ({ ...idea, brief, created_by: userId })));
    return docs.map((doc) => pubIdea(doc.toObject()));
  },

  async list(status?: SocialIdeaStatus | null) {
    const docs = await SocialIdeaModel.find(status ? { status } : {}).sort({ created_at: -1 }).limit(LIST_LIMIT).lean();
    return docs.map(pubIdea);
  },

  async setStatus(id: string, status: SocialIdeaStatus) {
    const doc = isValidObjectId(id)
      ? await SocialIdeaModel.findByIdAndUpdate(id, { $set: { status } }, { returnDocument: 'after' }).lean()
      : null;
    if (!doc) notFound();
    return pubIdea(doc);
  },

  async remove(id: string): Promise<boolean> {
    const res = isValidObjectId(id) ? await SocialIdeaModel.deleteOne({ _id: id }) : { deletedCount: 0 };
    if (res.deletedCount === 0) notFound();
    return true;
  },
};
