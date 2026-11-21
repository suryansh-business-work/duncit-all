import express, { Router, type Request, type Response } from 'express';
import { recordPromptEvent } from './prompt.analytics';
import type { PromptEventType } from './prompt.analytics.model';
import { findSharedPrompt } from './prompt.share';

/**
 * The public side of an AI Library share link, read by the AI portal's
 * `/p/:token` page with no login:
 *
 *   GET  /ai-prompts/share/:token          the prompt, as a stranger may see it
 *   POST /ai-prompts/share/:token/events   { type, platform?, source?, referrer?, visitor? }
 *
 * The token is the gate. A switched-off, archived or inactive prompt answers
 * 404 exactly like a token that never existed, so the route cannot be used to
 * probe which prompts exist. The global rate limiter covers both routes.
 */

const NO_STORE = {
  // Edits and "turn sharing off" must take effect on the very next load.
  'Cache-Control': 'no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow',
} as const;

/** What the public page may report. Portal and feed hits come from their own paths. */
const PUBLIC_EVENTS: ReadonlySet<string> = new Set<PromptEventType>([
  'PUBLIC_VIEW',
  'COPY_PROMPT',
  'OPEN_IN_PLATFORM',
  'COPY_SCRIPT',
]);

const notFound = (res: Response) =>
  res.status(404).set(NO_STORE).json({ error: 'NOT_FOUND', message: 'This shared prompt is not available.' });

const unavailable = (res: Response) =>
  res.status(503).set(NO_STORE).json({ error: 'UNAVAILABLE', message: 'The prompt could not be read right now.' });

const text = (value: unknown, max: number): string | null =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;

const tokenOf = (req: Request): string => (typeof req.params.token === 'string' ? req.params.token : '');

export function buildAiPromptShareRouter(): Router {
  const router = Router();

  router.get('/:token', async (req, res) => {
    try {
      const prompt = await findSharedPrompt(tokenOf(req));
      if (!prompt) {
        notFound(res);
        return;
      }
      res.status(200).set(NO_STORE).json(prompt.view);
    } catch {
      unavailable(res);
    }
  });

  router.post('/:token/events', express.json({ limit: '4kb' }), async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const type = text(body.type, 40);
    if (!type || !PUBLIC_EVENTS.has(type)) {
      res.status(400).set(NO_STORE).json({ error: 'BAD_EVENT', message: 'Unknown event type.' });
      return;
    }
    try {
      const prompt = await findSharedPrompt(tokenOf(req));
      if (!prompt) {
        notFound(res);
        return;
      }
      await recordPromptEvent({
        promptId: prompt.id,
        type: type as PromptEventType,
        surface: 'PUBLIC',
        platform: text(body.platform, 20),
        source: text(body.source, 120),
        referrer: text(body.referrer, 2000),
        visitor: text(body.visitor, 120),
        userAgent: req.get('user-agent') ?? null,
      });
      res.status(204).set(NO_STORE).end();
    } catch {
      unavailable(res);
    }
  });

  return router;
}
