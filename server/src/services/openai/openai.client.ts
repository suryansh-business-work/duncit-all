import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { OPENAI_TASKS, type OpenAiTaskKey } from '@modules/ai/openaiUsage/openaiUsage.tasks';
import { openAiUsageService } from '@modules/ai/openaiUsage/openaiUsage.service';

/**
 * The ONE place the product talks to OpenAI.
 *
 * Every feature that used to `fetch` chat/completions itself now goes through
 * here, because usage and cost can only be attributed at the moment of the
 * call: the token counts come back on the response and nothing downstream can
 * reconstruct them. A call written around this funnel spends real money and
 * appears nowhere in the AI portal, which is the failure this exists to stop.
 *
 * Credentials come from the Tech-portal OPENAI env entry, as before. The result
 * is a discriminated union rather than a thrown error, because the call sites
 * disagree on what a failure means — moderation fails open, the admin tools
 * raise a GraphQL error, the changelog falls back to a mechanical one — and
 * that decision stays with them.
 */

export type OpenAiRole = 'system' | 'user' | 'assistant';

/** `content` is `unknown` because vision calls send an array of content parts. */
export interface OpenAiMessage {
  role: OpenAiRole;
  content: unknown;
}

export interface OpenAiChatRequest {
  /** Catalogue key — what the spend is attributed to. */
  task: OpenAiTaskKey;
  messages: OpenAiMessage[];
  temperature?: number;
  max_tokens?: number;
  /** Ask for `response_format: json_object`. */
  json?: boolean;
  /** Pin a model instead of the configured default (vision needs gpt-4o). */
  model?: string;
  /** Context for this one call — entity, template key, lead id … */
  detail?: string;
  user_id?: string;
}

export type OpenAiFailureCode = 'NOT_CONFIGURED' | 'NETWORK' | 'UPSTREAM' | 'EMPTY';

export type OpenAiChatResult =
  | { ok: true; content: string; model: string }
  | { ok: false; code: OpenAiFailureCode; status: number; message: string; model: string };

const DEFAULT_MODEL = 'gpt-4o-mini';
const PREVIEW_LIMIT = 2000;

interface OpenAiUsagePayload {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

interface OpenAiChatPayload {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: OpenAiUsagePayload;
  error?: { message?: string };
}

/* -------------------------------- previews ------------------------------ */

/** Flatten one message's content — a vision part list becomes its text plus an image count. */
function contentText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return JSON.stringify(content ?? '');
  const texts: string[] = [];
  let images = 0;
  for (const part of content as Array<Record<string, unknown>>) {
    if (part?.type === 'image_url') images += 1;
    else if (typeof part?.text === 'string') texts.push(part.text);
  }
  if (images > 0) texts.push(`[${images} image(s)]`);
  return texts.join('\n');
}

/**
 * The prompt as sent, minus the system prompt. The system half is the same for
 * every call of a task and is already readable in the Prompt Library; what
 * makes a row worth opening is the half that differed.
 */
function requestPreview(messages: OpenAiMessage[]): string {
  return messages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role}: ${contentText(m.content)}`)
    .join('\n\n')
    .slice(0, PREVIEW_LIMIT);
}

/* --------------------------------- config ------------------------------- */

async function resolveConfig(pinnedModel?: string) {
  const [apiKey, baseUrl, envModel] = await Promise.all([
    getRuntimeEnvValue('OPENAI_API_KEY'),
    getRuntimeEnvValue('OPENAI_BASE_URL'),
    getRuntimeEnvValue('OPENAI_MODEL'),
  ]);
  return {
    apiKey: apiKey.trim(),
    base: (baseUrl.trim() || 'https://api.openai.com/v1').replace(/\/$/, ''),
    model: pinnedModel || envModel.trim() || DEFAULT_MODEL,
  };
}

function buildBody(req: OpenAiChatRequest, model: string): string {
  const body: Record<string, unknown> = { model, messages: req.messages };
  if (req.temperature !== undefined) body.temperature = req.temperature;
  if (req.max_tokens !== undefined) body.max_tokens = req.max_tokens;
  if (req.json) body.response_format = { type: 'json_object' };
  return JSON.stringify(body);
}

/* -------------------------------- recording ----------------------------- */

interface RecordInput {
  req: OpenAiChatRequest;
  model: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  httpStatus: number;
  usage?: OpenAiUsagePayload;
  response?: string;
  error?: string;
  startedAt: number;
}

/**
 * Fire-and-forget on purpose: a feature must not fail because its accounting
 * row could not be written, and the row is worth having even when the call it
 * describes failed.
 */
function record(input: RecordInput): void {
  const meta = OPENAI_TASKS[input.req.task];
  openAiUsageService
    .recordUsage({
      task: input.req.task,
      task_label: meta.label,
      module: meta.module,
      detail: input.req.detail ?? '',
      model: input.model,
      status: input.status,
      http_status: input.httpStatus,
      prompt_tokens: input.usage?.prompt_tokens ?? 0,
      completion_tokens: input.usage?.completion_tokens ?? 0,
      total_tokens: input.usage?.total_tokens ?? 0,
      duration_ms: Date.now() - input.startedAt,
      request_preview: requestPreview(input.req.messages),
      response_preview: (input.response ?? '').slice(0, PREVIEW_LIMIT),
      error_message: input.error ?? '',
      user_id: input.req.user_id,
    })
    .catch(() => undefined);
}

/* ---------------------------------- call -------------------------------- */

async function readError(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  try {
    const parsed = JSON.parse(text) as OpenAiChatPayload;
    return parsed.error?.message ?? text.slice(0, 500);
  } catch {
    return text.slice(0, 500);
  }
}

/** POST the chat completion, or describe why it never happened. */
export async function openaiChat(req: OpenAiChatRequest): Promise<OpenAiChatResult> {
  const startedAt = Date.now();
  const { apiKey, base, model } = await resolveConfig(req.model);

  if (!apiKey) {
    const message = 'OpenAI is not configured. Set the OPENAI API key in the Tech portal.';
    record({ req, model, status: 'SKIPPED', httpStatus: 0, error: message, startedAt });
    return { ok: false, code: 'NOT_CONFIGURED', status: 0, message, model };
  }

  let res: Response;
  try {
    res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: buildBody(req, model),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OpenAI request failed';
    record({ req, model, status: 'FAILED', httpStatus: 0, error: message, startedAt });
    return { ok: false, code: 'NETWORK', status: 0, message, model };
  }

  if (!res.ok) {
    const message = await readError(res);
    record({ req, model, status: 'FAILED', httpStatus: res.status, error: message, startedAt });
    return { ok: false, code: 'UPSTREAM', status: res.status, message, model };
  }

  const json = (await res.json().catch(() => ({}))) as OpenAiChatPayload;
  const content = String(json.choices?.[0]?.message?.content ?? '');
  // A refusal still burned tokens, so the usage is recorded either way.
  const status = content ? 'SUCCESS' : 'FAILED';
  record({
    req,
    model,
    status,
    httpStatus: res.status,
    usage: json.usage,
    response: content,
    error: content ? '' : 'OpenAI returned an empty response',
    startedAt,
  });

  if (!content) {
    return {
      ok: false,
      code: 'EMPTY',
      status: res.status,
      message: 'OpenAI returned an empty response',
      model,
    };
  }
  return { ok: true, content, model };
}
