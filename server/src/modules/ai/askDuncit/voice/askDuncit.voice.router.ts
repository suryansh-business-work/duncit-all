import express, { Router, type Request, type Response } from 'express';
import { decodeAuthUser } from '@context';
import { effectiveRoleKeys } from '@modules/access/user/effective-roles';
import { logs } from '@observability/log';
import { ASK_DUNCIT_FLAG, HARD_LIMITS } from '../askDuncit.constants';
import { isFeatureEnabled } from '@modules/platform/settings/featureFlag.gate';
import { resolveRoleKey } from '../rbac/askDuncit.role';
import { askDuncitSettingsService } from '../settings/askDuncitSettings.service';
import { unavailableReason } from '../turn/askDuncit.context';
import { isAcceptedAudio, speak, transcribe } from './askDuncit.voice';

/**
 * POST /ask-duncit/transcribe   raw audio body (audio/*) → { text }
 * POST /ask-duncit/speak        { text } → audio/mpeg
 *
 * Plain HTTP rather than GraphQL because the payload is binary. Authenticated
 * with the same bearer token and decode as the GraphQL context; refused when
 * Ask Duncit, the role or voice is off, and rate-limited per person.
 */

const WINDOW_MS = 60_000;
const PER_WINDOW = 12;
const hits = new Map<string, number[]>();

/** Sliding one-minute window per person. Exported for tests. */
export function allowVoiceCall(userId: string, now = Date.now()): boolean {
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= PER_WINDOW) {
    hits.set(userId, recent);
    return false;
  }
  recent.push(now);
  hits.set(userId, recent);
  return true;
}

async function gate(req: Request, res: Response) {
  const user = decodeAuthUser(req.get('authorization') ?? null);
  if (!user) {
    res.status(401).json({ error: 'UNAUTHENTICATED' });
    return null;
  }
  const settings = await askDuncitSettingsService.get();
  const role = resolveRoleKey(await effectiveRoleKeys(user.id), String(req.query.role ?? '') || null).role;
  const policy = settings.roles.find((r) => r.role_key === role);
  if (!policy || unavailableReason(settings, policy, await isFeatureEnabled(ASK_DUNCIT_FLAG)) || !settings.features.voice) {
    res.status(403).json({ error: 'VOICE_UNAVAILABLE' });
    return null;
  }
  if (!allowVoiceCall(user.id)) {
    res.status(429).json({ error: 'RATE_LIMIT' });
    return null;
  }
  return { user, settings };
}

/** Raw audio, or `{ audio_base64, mime }` JSON. Null when neither is acceptable audio. */
export function audioOf(req: Pick<Request, 'body' | 'get'>): { buffer: Buffer; mime: string } | null {
  const header = String(req.get('content-type') ?? '');
  if (Buffer.isBuffer(req.body)) return isAcceptedAudio(header) ? { buffer: req.body, mime: header } : null;
  const body = req.body as { audio_base64?: unknown; mime?: unknown } | undefined;
  const mime = typeof body?.mime === 'string' ? body.mime : '';
  if (typeof body?.audio_base64 !== 'string' || !isAcceptedAudio(mime)) return null;
  return { buffer: Buffer.from(body.audio_base64, 'base64'), mime };
}

const STATUS: Record<string, number> = { DISABLED: 403, NOT_CONFIGURED: 503, TOO_LARGE: 413, EMPTY: 422, UPSTREAM: 502 };

export function buildAskDuncitVoiceRouter(): Router {
  const router = Router();
  router.post(
    '/transcribe',
    express.raw({ type: (req) => isAcceptedAudio(String(req.headers['content-type'] ?? '')), limit: HARD_LIMITS.maxAudioBytes }),
    // The native app reads its recording as base64 (expo-file-system) and sends JSON.
    express.json({ limit: Math.ceil(HARD_LIMITS.maxAudioBytes * 1.4) }),
    async (req, res) => {
      try {
        const ok = await gate(req, res);
        if (!ok) return;
        const audio = audioOf(req);
        if (!audio) {
          res.status(415).json({ error: 'UNSUPPORTED_AUDIO' });
          return;
        }
        const language = typeof req.query.language === 'string' ? req.query.language.slice(0, 5) : undefined;
        const result = await transcribe(audio.buffer, audio.mime, { model: ok.settings.transcription_model, userId: ok.user.id, language });
        if (result.ok) res.json({ text: result.value });
        else res.status(STATUS[result.code] ?? 500).json({ error: result.code });
      } catch (error) {
        logs.server.error('askDuncit', 'transcribe', { error });
        res.status(500).json({ error: 'INTERNAL' });
      }
    }
  );
  router.post('/speak', express.json({ limit: '16kb' }), async (req, res) => {
    try {
      const ok = await gate(req, res);
      if (!ok) return;
      const text = typeof req.body?.text === 'string' ? req.body.text : '';
      const result = await speak(text, { model: ok.settings.speech_model, voice: ok.settings.speech_voice, userId: ok.user.id });
      if (!result.ok) {
        res.status(STATUS[result.code] ?? 500).json({ error: result.code });
        return;
      }
      res.set({ 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' }).send(result.value);
    } catch (error) {
      logs.server.error('askDuncit', 'speak', { error });
      res.status(500).json({ error: 'INTERNAL' });
    }
  });
  return router;
}
