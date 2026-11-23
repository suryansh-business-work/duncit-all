import { describeFetchFailure } from '@utils/outboundFetch';
import { isAiFeatureEnabled } from '@modules/ai/aiFeature/aiFeature.guard';
import type { OpenAiTaskKey } from '@modules/ai/openaiUsage/openaiUsage.tasks';
import { readError, record, resolveConfig, type OpenAiFailureCode } from './openai.client';

/**
 * Embeddings through the ONE OpenAI funnel: same credentials (or a named Tech
 * portal entry), same AI Features switch, one usage row per request so the
 * spend shows in OpenAI Logs and the cost dashboard like every other call.
 */

export interface EmbedRequest {
  task: OpenAiTaskKey;
  inputs: string[];
  model: string;
  dimensions?: number;
  detail?: string;
  user_id?: string;
  /** A specific Tech portal OpenAI entry; unset = the active default. */
  credentials?: { apiKey: string; base: string } | null;
}

export type EmbedResult =
  | { ok: true; vectors: number[][]; tokens: number; model: string }
  | { ok: false; code: OpenAiFailureCode; status: number; message: string };

/** OpenAI accepts up to 2048 inputs per request; smaller batches keep one failure cheap. */
export const EMBED_BATCH = 64;

export async function openaiEmbed(req: EmbedRequest): Promise<EmbedResult> {
  const startedAt = Date.now();
  const config = await resolveConfig(req.model);
  const apiKey = req.credentials?.apiKey || config.apiKey;
  const base = req.credentials?.base || config.base;
  const recordReq = { task: req.task, messages: [{ role: 'user' as const, content: `${req.inputs.length} text(s) to embed` }], detail: req.detail, user_id: req.user_id };
  const fail = (code: OpenAiFailureCode, status: number, message: string): EmbedResult => {
    record({ req: recordReq, model: req.model, status: code === 'DISABLED' || code === 'NOT_CONFIGURED' ? 'SKIPPED' : 'FAILED', httpStatus: status, error: message, startedAt });
    return { ok: false, code, status, message };
  };
  if (req.inputs.length === 0) return { ok: true, vectors: [], tokens: 0, model: req.model };
  if (!(await isAiFeatureEnabled(req.task))) return fail('DISABLED', 0, 'This AI feature is switched off in the AI portal (AI Features).');
  if (config.provider !== 'OpenAI') return fail('UPSTREAM', 0, 'Embeddings need an OpenAI model.');
  if (!apiKey) return fail('NOT_CONFIGURED', 0, 'OpenAI is not configured. Set the OpenAI API key in the Tech portal.');

  let res: Response;
  try {
    res = await fetch(`${base}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: req.model, input: req.inputs, ...(req.dimensions ? { dimensions: req.dimensions } : {}) }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    const detail = describeFetchFailure(err);
    return fail('NETWORK', 0, detail ? `OpenAI is unreachable (${detail})` : 'OpenAI request failed');
  }
  if (!res.ok) return fail('UPSTREAM', res.status, await readError(res));
  const body = (await res.json().catch(() => ({}))) as { data?: Array<{ index: number; embedding: number[] }>; usage?: { prompt_tokens?: number; total_tokens?: number } };
  const vectors = (body.data ?? []).sort((a, b) => a.index - b.index).map((d) => d.embedding);
  if (vectors.length !== req.inputs.length) return fail('EMPTY', res.status, 'The embedding response did not match the inputs');
  const tokens = body.usage?.total_tokens ?? 0;
  record({
    req: recordReq,
    model: req.model,
    status: 'SUCCESS',
    httpStatus: res.status,
    usage: { prompt_tokens: body.usage?.prompt_tokens ?? tokens, completion_tokens: 0, total_tokens: tokens },
    response: `${vectors.length} vector(s)`,
    startedAt,
  });
  return { ok: true, vectors, tokens, model: req.model };
}
