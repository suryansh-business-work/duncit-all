import { createHash } from 'node:crypto';
import { GraphQLError } from 'graphql';
import { openaiChat } from '@services/openai/openai.client';
import { openAiGraphQLError, openAiInvalidJsonError } from '@services/openai/openai.errors';
import { AiPromptModel } from './prompt.model';
import { resolvePrompt } from './prompt.service';

/**
 * The AI Library's quality score: ChatGPT reviewing a prompt against the
 * `library.prompt_quality` rubric (itself a library row).
 *
 * A review is stored on the prompt with a hash of the body it judged. Opening
 * the detail view asks for a score; while the body is unchanged that is the
 * stored one, so a prompt costs one review per version however often it is
 * read. "Rescore" passes `force` for a second opinion on the same body.
 */

const MAX_ITEMS = 5;
const MAX_ITEM_CHARS = 200;
const MAX_SUMMARY_CHARS = 600;

export const contentHash = (content: string): string => createHash('sha256').update(content).digest('hex');

export interface StoredQuality {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  model: string;
  content_hash: string;
  scored_at: Date;
}

/** The GraphQL view: `stale` when the body has changed since this review. */
export function qualityView(quality: StoredQuality | null | undefined, currentContent: string) {
  if (!quality) return null;
  return {
    score: quality.score,
    summary: quality.summary ?? '',
    strengths: quality.strengths ?? [],
    improvements: quality.improvements ?? [],
    model: quality.model ?? '',
    scored_at: new Date(quality.scored_at).toISOString(),
    stale: quality.content_hash !== contentHash(currentContent),
  };
}

const textList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === 'string' && item.trim() !== '')
        .slice(0, MAX_ITEMS)
        .map((item) => item.trim().slice(0, MAX_ITEM_CHARS))
    : [];

/** The model's JSON, held to the shape the rubric asked for. Null when it is not that shape. */
export function parseQuality(raw: string): Omit<StoredQuality, 'model' | 'content_hash' | 'scored_at'> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const body = parsed as Record<string, unknown>;
  const score = Number(body.score);
  if (!Number.isFinite(score)) return null;
  return {
    score: Math.round(Math.min(100, Math.max(0, score))),
    summary: typeof body.summary === 'string' ? body.summary.trim().slice(0, MAX_SUMMARY_CHARS) : '',
    strengths: textList(body.strengths),
    improvements: textList(body.improvements),
  };
}

const detailLines = (description: string, targetModel: string): string =>
  [description.trim() && `Description: ${description.trim()}\n`, targetModel.trim() && `Target model: ${targetModel.trim()}\n`]
    .filter(Boolean)
    .join('');

export async function scorePrompt(id: string, force: boolean, userId?: string | null) {
  const doc = await AiPromptModel.findById(id).lean();
  if (!doc) throw new GraphQLError('Prompt not found', { extensions: { code: 'NOT_FOUND' } });
  const content = doc.content ?? '';
  const hash = contentHash(content);
  const stored = doc.quality as StoredQuality | null | undefined;
  if (!force && stored?.content_hash === hash) return qualityView(stored, content);

  const system = await resolvePrompt('library.prompt_quality');
  const user = await resolvePrompt('library.prompt_quality.user', {
    name: doc.name ?? '',
    details: detailLines(doc.description ?? '', doc.target_model ?? ''),
    prompt: content,
  });
  const res = await openaiChat({
    task: 'ai.prompt_quality',
    messages: [
      { role: 'system', content: system.content },
      { role: 'user', content: user.content },
    ],
    json: true,
    temperature: 0.2,
    model: system.model || undefined,
    detail: `prompt:${id}`,
    user_id: userId ?? undefined,
  });
  if (!res.ok) throw openAiGraphQLError(res);
  const review = parseQuality(res.content);
  if (!review) throw openAiInvalidJsonError();

  const quality: StoredQuality = { ...review, model: res.model, content_hash: hash, scored_at: new Date() };
  // Raw driver: a review is not an edit, so it must not move `updated_at`,
  // reach the change log, or write a version.
  await AiPromptModel.collection.updateOne({ _id: doc._id }, { $set: { quality } });
  return qualityView(quality, content);
}
