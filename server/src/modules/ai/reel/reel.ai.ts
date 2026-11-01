import { GraphQLError } from 'graphql';
import { openaiChat } from '@services/openai/openai.client';
import type { OpenAiTaskKey } from '@modules/ai/openaiUsage/openaiUsage.tasks';
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { stringList, text } from '@modules/crm/marketing/social/social.llm';
import { SocialPostModel } from '@modules/crm/marketing/social/social.model';
import { PUBLISH_RULES, textLength } from '@modules/crm/marketing/social/social.rules';
import { SOCIAL_PLATFORMS, type SocialPlatform } from '@modules/crm/marketing/social/social.types';
import { recordPlanCost } from '@modules/crm/marketing/agents/agent.cost';
import type { RunContext } from '@modules/crm/marketing/runs/marketingRun.service';
import { parseAnswer } from './reel.director';
import { REEL_LIMITS, sanitizeSpec, specDurationMs, type ReelSpec } from './reel.edit';
import { ReelProjectModel, type ReelAsset, type ReelVariant } from './reel.model';
import { analyticsOf } from './reel.analytics';
import { badInput, load, notFound, reelRun, shortId, str, toPub, type ReelActor } from './reel.shared';
import { sanitizeScript } from './reel.storyboard';

/**
 * The AI half of the production line: ideas → script, then the captions per
 * network once the reel is cut, and what to make next once it has been
 * posted. Every call is one step of a REEL marketing run — the Activity
 * timeline shows what was asked, what came back and what it cost — and every
 * answer is strict JSON that is sanitized before anything trusts it.
 */

export interface ReelConcept {
  id: string;
  title: string;
  hook: string;
  angle: string;
  why: string;
}

export interface ReelConceptInput {
  title: string;
  hook: string;
  angle: string;
}

export interface ReelRecommendation {
  title: string;
  why: string;
  evidence: string;
}

const MAX_BRIEF = 2000;
const MAX_IDEAS = 10;
const DEFAULT_IDEAS = 5;
const MAX_RECOMMENDATIONS = 5;
const MAX_HASHTAGS = 30;
const MAX_TITLE = 100;
/** The recent posts the recommendation reads — enough to see a pattern, few enough to fit. */
const RECENT_POSTS = 20;
const SCRIPT_LENGTH_S = { min: 5, max: REEL_LIMITS.maxTotalMs / 1000 } as const;

const unavailable = (message: string) => new GraphQLError(message, { extensions: { code: 'AI_UNAVAILABLE' } });
const unreadable = () =>
  new GraphQLError('The AI answered in a form that could not be read — try again.', { extensions: { code: 'AI_UNREADABLE' } });

const seconds = (ms: number): string => (ms > 0 ? `${(ms / 1000).toFixed(1)}s` : 'length unknown');

/** The footage as a prompt lists it — one line per asset, or a note that there is none. */
export function assetLines(assets: readonly ReelAsset[]): string {
  if (assets.length === 0) return '(no footage added yet)';
  return assets
    .map((asset) => `- ${asset.kind} ${JSON.stringify(asset.name)}${asset.kind === 'IMAGE' ? '' : ` ${seconds(asset.duration_ms)}`}`)
    .join('\n');
}

/** Every line the reel shows, in order. */
export function specLines(spec: ReelSpec): string {
  const lines = spec.scenes.flatMap((scene) => scene.texts.map((item) => item.text));
  return lines.length > 0 ? lines.join('\n') : '(no text on screen yet)';
}

interface AskInput {
  run: RunContext;
  step: string;
  label: string;
  task: OpenAiTaskKey;
  /** The SYSTEM prompt's key; the USER turn is `${prompt}.user`. */
  prompt: string;
  variables: Record<string, string>;
  projectId: string;
  userId: string;
  maxTokens: number;
  inputSummary: string;
}

/**
 * One AI call as one recorded step. The tokens the funnel reports are written
 * onto the run as its cost; a refused call or an unreadable answer fails the
 * step, and the run with it.
 */
export async function askReel(input: AskInput): Promise<Record<string, unknown>> {
  return input.run.step(
    input.step,
    input.label,
    async () => {
      const [system, user] = await Promise.all([resolvePrompt(input.prompt), resolvePrompt(`${input.prompt}.user`, input.variables)]);
      const res = await openaiChat({
        task: input.task,
        detail: `reel:${input.projectId}`,
        model: system.model || undefined,
        temperature: 0.5,
        max_tokens: input.maxTokens,
        json: true,
        messages: [
          { role: 'system', content: system.content },
          { role: 'user', content: user.content },
        ],
        user_id: input.userId,
      });
      if (!res.ok) throw unavailable(res.message);
      await recordPlanCost(input.run, res.model, res.usage);
      const answer = parseAnswer(res.content);
      if (!answer) throw unreadable();
      return answer;
    },
    { tool: input.task, input_summary: input.inputSummary, summarize: (answer) => JSON.stringify(answer).slice(0, 300) }
  );
}

/* --------------------------------- ideas -------------------------------- */

function toConcept(raw: unknown): ReelConcept[] {
  const item = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : null;
  const title = text(item?.title).slice(0, 120);
  const hook = text(item?.hook).slice(0, REEL_LIMITS.maxTextLength);
  if (!title || !hook) return [];
  return [{ id: shortId(), title, hook, angle: text(item?.angle).slice(0, 600), why: text(item?.why).slice(0, 400) }];
}

export async function generateReelIdeas(projectId: string, briefInput: string, countInput: number | null | undefined, actor: ReelActor) {
  const brief = str(briefInput);
  if (!brief) throw badInput('Say what the reel should do.');
  if (brief.length > MAX_BRIEF) throw badInput(`A brief is at most ${MAX_BRIEF} characters.`);
  const count = Math.min(MAX_IDEAS, Math.max(1, Math.round(countInput ?? DEFAULT_IDEAS)));
  const doc = await load(projectId);
  return reelRun(doc, `Reel ideas for "${doc.name}"`, actor, async (run) => {
    const answer = await askReel({
      run,
      step: 'ideas',
      label: `${count} concepts`,
      task: 'reels.ideas',
      prompt: 'reels.ideas',
      variables: { brief, count: String(count), project: doc.name, assets: assetLines(doc.assets) },
      projectId,
      userId: actor.id,
      maxTokens: 3000,
      inputSummary: brief.slice(0, 200),
    });
    const concepts = (Array.isArray(answer.concepts) ? answer.concepts : []).flatMap(toConcept).slice(0, count);
    if (concepts.length === 0) throw unreadable();
    return { run_id: run.id, concepts };
  });
}

/* --------------------------------- script ------------------------------- */

export async function generateReelScript(projectId: string, concept: ReelConceptInput, lengthS: number, tone: string | null | undefined, actor: ReelActor) {
  const title = str(concept.title);
  const hook = str(concept.hook);
  if (!title || !hook) throw badInput('A concept needs a title and a hook.');
  if (!Number.isFinite(lengthS) || lengthS < SCRIPT_LENGTH_S.min || lengthS > SCRIPT_LENGTH_S.max) {
    throw badInput(`A reel runs ${SCRIPT_LENGTH_S.min} to ${SCRIPT_LENGTH_S.max} seconds.`);
  }
  const doc = await load(projectId);
  return reelRun(doc, `Script "${title}"`, actor, async (run) => {
    const answer = await askReel({
      run,
      step: 'script',
      label: `${lengthS}s script`,
      task: 'reels.script',
      prompt: 'reels.script',
      variables: {
        title: title.slice(0, 120),
        hook: hook.slice(0, REEL_LIMITS.maxTextLength),
        angle: str(concept.angle).slice(0, 600),
        length_s: String(Math.round(lengthS)),
        tone: str(tone).slice(0, 80) || 'the brand’s usual',
        assets: assetLines(doc.assets),
      },
      projectId,
      userId: actor.id,
      maxTokens: 4000,
      inputSummary: `${title} — ${hook}`.slice(0, 200),
    });
    const script = sanitizeScript(answer);
    if (script.scenes.length === 0) throw unreadable();
    return { run_id: run.id, ...script };
  });
}

/* -------------------------------- variants ------------------------------ */

const isPlatform = (value: unknown): value is SocialPlatform => typeof value === 'string' && (SOCIAL_PLATFORMS as readonly string[]).includes(value);

/** Hashtags as the networks read them: one word each, led by #, no repeats. */
function cleanHashtags(raw: unknown): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const item of stringList(raw, MAX_HASHTAGS)) {
    const tag = `#${item.trim().replace(/^#+/, '').replaceAll(/\s+/g, '')}`.slice(0, 50);
    if (tag.length < 2 || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    tags.push(tag);
  }
  return tags;
}

/** The caption and tags together inside the network's ceiling: the caption is cut first, then tags are dropped from the end. */
function withinCeiling(platform: SocialPlatform, caption: string, hashtags: string[]): { caption: string; hashtags: string[] } {
  const max = PUBLISH_RULES[platform].maxText;
  const cut = [...caption].slice(0, max).join('');
  const tags = [...hashtags];
  while (tags.length > 0 && textLength(`${cut} ${tags.join(' ')}`) > max) tags.pop();
  return { caption: cut, hashtags: tags };
}

function toVariant(raw: unknown, wanted: ReadonlySet<SocialPlatform>): ReelVariant[] {
  const item = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : null;
  const platform = text(item?.platform).toUpperCase();
  if (!isPlatform(platform) || !wanted.has(platform)) return [];
  const caption = text(item?.caption);
  if (!caption) return [];
  return [{ platform, ...withinCeiling(platform, caption, cleanHashtags(item?.hashtags)), title: text(item?.title).slice(0, MAX_TITLE) }];
}

export async function generateReelVariants(projectId: string, platformsInput: readonly SocialPlatform[], actor: ReelActor) {
  const platforms = [...new Set(platformsInput)].filter(isPlatform);
  if (platforms.length === 0) throw badInput('Pick at least one network.');
  const doc = await load(projectId);
  const spec = sanitizeSpec(doc.spec, doc.assets);
  const written = await reelRun(doc, `Captions for "${doc.name}" on ${platforms.length} network${platforms.length === 1 ? '' : 's'}`, actor, async (run) => {
    const answer = await askReel({
      run,
      step: 'variants',
      label: platforms.join(', '),
      task: 'reels.variants',
      prompt: 'reels.variants',
      variables: {
        project: doc.name,
        lines: specLines(spec),
        duration_s: (specDurationMs(spec) / 1000).toFixed(1),
        platforms: platforms.map((platform) => `${platform} (max ${PUBLISH_RULES[platform].maxText} characters)`).join('\n'),
      },
      projectId,
      userId: actor.id,
      maxTokens: 3000,
      inputSummary: specLines(spec).slice(0, 200),
    });
    const wanted = new Set(platforms);
    const found = (Array.isArray(answer.variants) ? answer.variants : []).flatMap((raw) => toVariant(raw, wanted));
    if (found.length === 0) throw unreadable();
    // One per network: the first the model wrote for it.
    return platforms.flatMap((platform) => found.find((variant) => variant.platform === platform) ?? []);
  });
  const kept = (doc.variants ?? []).filter((variant) => !written.some((item) => item.platform === variant.platform));
  const updated = await ReelProjectModel.findByIdAndUpdate(
    doc._id,
    { $set: { variants: [...kept, ...written], updated_by: actor.email } },
    { new: true }
  );
  if (!updated) throw notFound();
  return toPub(updated);
}

/* ------------------------------- recommend ------------------------------ */

const figure = (value: number | null | undefined): string => (typeof value === 'number' ? value.toLocaleString('en-IN') : '—');

/** The account's recent posts with their numbers, best first — what a recommendation reads against. */
async function recentPostLines(): Promise<string> {
  const posts = await SocialPostModel.find().sort({ published_at: -1 }).limit(RECENT_POSTS).select('platform text published_at likes comments shares views engagement').lean();
  if (posts.length === 0) return '(no posts synced yet)';
  const ranked = [...posts];
  ranked.sort((a, b) => (b.engagement ?? 0) - (a.engagement ?? 0));
  return ranked
    .map(
      (post) =>
        `${post.platform} · ${post.published_at.toISOString().slice(0, 10)} · engagement ${figure(post.engagement)} · views ${figure(post.views)} · ${JSON.stringify((post.text ?? '').replaceAll(/\s+/g, ' ').slice(0, 80))}`
    )
    .join('\n');
}

function toRecommendation(raw: unknown): ReelRecommendation[] {
  const item = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : null;
  const title = text(item?.title).slice(0, 120);
  if (!title) return [];
  return [{ title, why: text(item?.why).slice(0, 600), evidence: text(item?.evidence).slice(0, 600) }];
}

export async function recommendNextReel(projectId: string, actor: ReelActor) {
  const doc = await load(projectId);
  const spec = sanitizeSpec(doc.spec, doc.assets);
  return reelRun(doc, `What to make after "${doc.name}"`, actor, async (run) => {
    const [analytics, recent_posts] = await run.step('numbers', 'Read the reel’s numbers and the account’s recent posts', () =>
      Promise.all([analyticsOf(projectId), recentPostLines()])
    );
    const performance =
      analytics.posts.length === 0
        ? '(not posted from the studio yet)'
        : analytics.posts
            .map((post) => `${post.platform}: ${figure(post.views)} views · ${figure(post.likes)} likes · ${figure(post.comments)} comments · ${figure(post.shares)} shares · engagement ${figure(post.engagement)}`)
            .join('\n');
    const variants = (doc.variants ?? []).map((variant) => `${variant.platform}: ${[variant.caption, ...variant.hashtags].join(' ').slice(0, 300)}`).join('\n');
    const answer = await askReel({
      run,
      step: 'recommend',
      label: 'Recommend the next reel',
      task: 'reels.recommend',
      prompt: 'reels.recommend',
      variables: { project: doc.name, lines: specLines(spec), variants: variants || '(no captions written)', performance, recent_posts },
      projectId,
      userId: actor.id,
      maxTokens: 2500,
      inputSummary: performance.slice(0, 200),
    });
    const recommendations = (Array.isArray(answer.recommendations) ? answer.recommendations : []).flatMap(toRecommendation).slice(0, MAX_RECOMMENDATIONS);
    if (recommendations.length === 0) throw unreadable();
    return { run_id: run.id, recommendations };
  });
}
