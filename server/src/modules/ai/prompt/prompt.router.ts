import { Router, type Request, type Response } from 'express';
import { aiPromptService, type PublicAiPrompt } from './prompt.service';
import { renderPrompt } from './prompt.render';
import type { PromptKind } from './prompt.types';

/**
 * The read-only JSON feed behind the AI portal's "Copy GET API" button.
 *
 *   GET /ai-prompts/prompts.json?kind=AI&category=Support
 *   GET /ai-prompts/prompt.json?key=moderation.pod&vars[city]=Pune
 *
 * There is NO auth here, by explicit product decision: the point of the copied
 * URL is that it opens in a browser tab, drops into a script, or works from
 * `curl` with nothing else set up.
 *
 * Say plainly what that trades away. This publishes the platform's prompts to
 * anyone who has the URL, and the CODE half of the library is the product's own
 * instructions to the model — `moderation.pod` names the evasion patterns it
 * screens for, and several rows carry the exact JSON contract their parser
 * depends on. Treat everything reachable here as public writing. Only ACTIVE
 * rows are served, so deactivating a prompt in the portal takes it off the feed.
 *
 * The feed never serves a prompt's usage sites or its `created_by` — those name
 * files and people, and neither is any of a reader's business.
 */

const NO_STORE = {
  // A prompt edited in the portal must be live on the feed immediately; that is
  // the same contract the call sites get, and a cached copy would break it.
  'Cache-Control': 'no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow',
} as const;

/** One query-string value, or undefined when it was absent or repeated oddly. */
function param(req: Request, name: string): string | undefined {
  const raw = req.query[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

/**
 * Pretty-printed rather than compact: the first reader of one of these URLs is
 * a person who pasted it into a browser tab. Machines do not care either way.
 */
function sendJson(res: Response, status: number, body: unknown): void {
  res
    .status(status)
    .set(NO_STORE)
    .type('application/json')
    .send(`${JSON.stringify(body, null, 2)}\n`);
}

function kindParam(req: Request): PromptKind | undefined {
  const raw = param(req, 'kind')?.toUpperCase();
  return raw === 'CODE' || raw === 'AI' ? raw : undefined;
}

/**
 * `?vars[name]=value` substitutions for the single-prompt route, so a caller
 * can fetch a prompt already filled in rather than reimplementing `{{ }}`.
 * Non-string members are dropped rather than coerced — `[object Object]` inside
 * a prompt body is worse than the placeholder it replaced.
 */
function varsParam(req: Request): Record<string, string> {
  const raw = req.query.vars;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'string') out[name] = value;
  }
  return out;
}

/** The feed's view of a row: what it is and what it says, nothing about who wrote it. */
function feedShape(prompt: PublicAiPrompt, variables: Record<string, string>) {
  return {
    key: prompt.key,
    kind: prompt.kind,
    role: prompt.role,
    name: prompt.name,
    description: prompt.description,
    category: prompt.category,
    target_model: prompt.target_model,
    content: renderPrompt(prompt.content, variables),
    variables: prompt.variables,
    token_count: prompt.token_count,
    updated_at: prompt.updated_at,
  };
}

export function buildAiPromptFeedRouter(): Router {
  const router = Router();

  router.get('/prompts.json', async (req, res) => {
    try {
      const prompts = await aiPromptService.list({
        is_active: true,
        kind: kindParam(req),
        category: param(req, 'category') ?? null,
        search: param(req, 'search') ?? null,
      });
      sendJson(res, 200, {
        count: prompts.length,
        prompts: prompts.map((p) => feedShape(p, {})),
      });
    } catch {
      sendJson(res, 503, {
        error: 'UNAVAILABLE',
        message: 'The prompt library could not be read right now.',
      });
    }
  });

  router.get('/prompt.json', async (req, res) => {
    const key = param(req, 'key');
    if (!key) {
      sendJson(res, 400, {
        error: 'KEY_REQUIRED',
        message: 'Pass ?key= — the prompt key, as listed by /ai-prompts/prompts.json.',
      });
      return;
    }
    try {
      const prompt = await aiPromptService.getByKey(key);
      // An inactive prompt is 404 rather than 403: whether a key exists at all
      // is not something an unauthenticated caller should be able to probe.
      if (!prompt || !prompt.is_active) {
        sendJson(res, 404, { error: 'NOT_FOUND', message: `No active prompt named "${key}".` });
        return;
      }
      sendJson(res, 200, feedShape(prompt, varsParam(req)));
    } catch {
      sendJson(res, 503, {
        error: 'UNAVAILABLE',
        message: 'The prompt library could not be read right now.',
      });
    }
  });

  return router;
}
