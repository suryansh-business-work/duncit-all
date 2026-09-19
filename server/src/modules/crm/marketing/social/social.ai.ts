import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { openaiChat } from '@services/openai/openai.client';
import { SocialCommentModel, SocialPostModel } from './social.model';
import { firstLine } from './providers/http';
import {
  SOCIAL_SENTIMENTS,
  SOCIAL_SEVERITIES,
  type SocialAiStatus,
  type SocialSentiment,
  type SocialSeverity,
} from './social.types';

/**
 * The AI read of every new comment: its sentiment, and whether a person needs
 * to act on it (abuse, spam, threats, a serious complaint …).
 *
 * Comments go to the model in batches, each with the start of the post it was
 * left on, because "this is a scam" means something different under a pod
 * announcement than under a scam warning. Both turns and the model come from
 * the AI Library, so the policy is tuned in the AI portal, not here.
 *
 * A comment keeps `PENDING` until a verdict for it actually comes back — an
 * OpenAI outage or a missing key leaves the queue to the next run rather than
 * marking unread comments as clean.
 */
const BATCH_SIZE = 20;
const MAX_PER_RUN = 200;
const SENTIMENTS = new Set<string>(SOCIAL_SENTIMENTS);
const SEVERITIES = new Set<string>(SOCIAL_SEVERITIES);

interface Verdict {
  sentiment: SocialSentiment;
  flagged: boolean;
  categories: string[];
  severity: SocialSeverity | null;
  reason: string;
}

interface PendingComment {
  _id: unknown;
  platform: string;
  text: string;
  post_id: string;
}

export interface SocialAnalysisResult {
  analyzed: number;
  flagged: number;
  /** Why the run stopped early — OpenAI missing or failing — or null. */
  error: string | null;
}

const isSentiment = (value: unknown): value is SocialSentiment => typeof value === 'string' && SENTIMENTS.has(value);
const isSeverity = (value: unknown): value is SocialSeverity => typeof value === 'string' && SEVERITIES.has(value);

function toVerdict(raw: Record<string, unknown>): Verdict {
  const flagged = raw.flagged === true;
  const categories = Array.isArray(raw.categories) ? raw.categories.filter((c): c is string => typeof c === 'string') : [];
  return {
    sentiment: isSentiment(raw.sentiment) ? raw.sentiment : 'NEUTRAL',
    flagged,
    categories: flagged ? categories : [],
    severity: flagged && isSeverity(raw.severity) ? raw.severity : null,
    reason: flagged && typeof raw.reason === 'string' ? raw.reason : '',
  };
}

/** The model's verdicts by comment id; anything unreadable is simply absent. */
function parseVerdicts(content: string): Map<string, Verdict> {
  try {
    const parsed = JSON.parse(content) as { results?: unknown };
    if (!Array.isArray(parsed.results)) return new Map();
    const entries = parsed.results
      .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null && typeof r.id === 'string')
      .map((r) => [String(r.id), toVerdict(r)] as const);
    return new Map(entries);
  } catch {
    return new Map();
  }
}

async function reviewBatch(
  batch: PendingComment[],
  postText: Map<string, string>
): Promise<{ verdicts: Map<string, Verdict>; error: string | null }> {
  const lines = batch.map((comment) =>
    JSON.stringify({
      id: String(comment._id),
      platform: comment.platform,
      post: firstLine(postText.get(comment.post_id) ?? ''),
      text: comment.text,
    })
  );
  const [system, user] = await Promise.all([
    resolvePrompt('moderation.social_comment'),
    resolvePrompt('moderation.social_comment.user', { comments: lines.join('\n') }),
  ]);
  const res = await openaiChat({
    task: 'moderation.social_comment',
    detail: `${batch.length} comments`,
    model: system.model,
    temperature: 0,
    max_tokens: 3000,
    json: true,
    messages: [
      { role: 'system', content: system.content },
      { role: 'user', content: user.content },
    ],
  });
  if (!res.ok) return { verdicts: new Map(), error: res.message };
  return { verdicts: parseVerdicts(res.content), error: null };
}

function verdictWrite(comment: PendingComment, verdict: Verdict) {
  const waiting: SocialAiStatus = 'PENDING';
  const status: SocialAiStatus = verdict.flagged ? 'FLAGGED' : 'CLEAN';
  return {
    updateOne: {
      // Only a comment still waiting: a second run that raced this one must
      // not overwrite a verdict (or a marketer's review) already recorded.
      filter: { _id: comment._id, ai_status: waiting },
      update: {
        $set: {
          ai_status: status,
          ai_sentiment: verdict.sentiment,
          ai_categories: verdict.categories,
          ai_severity: verdict.severity,
          ai_reason: verdict.reason,
          ai_analyzed_at: new Date(),
        },
      },
    },
  };
}

/** A comment with no words (a sticker, a lone tag) has nothing to judge. */
async function clearBlankComments(filter: Record<string, unknown>): Promise<void> {
  await SocialCommentModel.updateMany(
    { ...filter, text: { $not: /\S/ } },
    { $set: { ai_status: 'CLEAN', ai_sentiment: 'NEUTRAL', ai_analyzed_at: new Date() } }
  );
}

/** Analyse comments still waiting, newest first, optionally for one account. */
export async function analyzePendingComments(accountId?: string): Promise<SocialAnalysisResult> {
  const filter: Record<string, unknown> = { ai_status: 'PENDING' };
  if (accountId) filter.account_id = accountId;
  await clearBlankComments(filter);

  const pending = await SocialCommentModel.find(filter)
    .sort({ published_at: -1 })
    .limit(MAX_PER_RUN)
    .select('_id platform text post_id')
    .lean<PendingComment[]>();
  if (pending.length === 0) return { analyzed: 0, flagged: 0, error: null };

  const posts = await SocialPostModel.find({ _id: { $in: [...new Set(pending.map((c) => c.post_id))] } })
    .select('text')
    .lean();
  const postText = new Map(posts.map((post) => [String(post._id), post.text ?? '']));

  const result: SocialAnalysisResult = { analyzed: 0, flagged: 0, error: null };
  for (let start = 0; start < pending.length; start += BATCH_SIZE) {
    const batch = pending.slice(start, start + BATCH_SIZE);
    const { verdicts, error } = await reviewBatch(batch, postText);
    if (error) return { ...result, error };
    const judged = batch.flatMap((comment) => {
      const verdict = verdicts.get(String(comment._id));
      return verdict ? [{ comment, verdict }] : [];
    });
    if (judged.length > 0) await SocialCommentModel.bulkWrite(judged.map((j) => verdictWrite(j.comment, j.verdict)));
    result.analyzed += judged.length;
    result.flagged += judged.filter((j) => j.verdict.flagged).length;
  }
  return result;
}
