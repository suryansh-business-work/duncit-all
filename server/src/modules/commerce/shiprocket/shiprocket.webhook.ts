import { Router, type Request, type Response } from 'express';
import express from 'express';
import { timingSafeEqual } from 'node:crypto';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { logs } from '@observability/log';
import { shiprocketService } from './shiprocket.service';

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * ShipRocket status webhook, mounted under `/shiprocket`. ShipRocket posts JSON
 * and authenticates with an `x-api-key` header equal to the configured
 * SHIPROCKET_WEBHOOK_SECRET. Always answers 200 (even on error) so ShipRocket
 * doesn't retry-storm; the payload is applied best-effort to the matching order.
 */
export function buildShiprocketWebhookRouter(): Router {
  const router = Router();
  router.use(express.json({ limit: '256kb' }));

  router.post('/webhook', async (req: Request, res: Response) => {
    try {
      const secret = (await getRuntimeEnvValue('SHIPROCKET_WEBHOOK_SECRET')).trim();
      const provided = String(req.header('x-api-key') ?? '').trim();
      if (secret && (!provided || !safeEqual(secret, provided))) {
        return res.status(401).json({ ok: false });
      }
      await shiprocketService.applyWebhookEvent((req.body ?? {}) as Record<string, any>);
    } catch (e) {
      logs.server.warn('shiprocket', 'webhook', { error: e, msg: 'webhook error' });
    }
    return res.status(200).json({ ok: true });
  });

  return router;
}
