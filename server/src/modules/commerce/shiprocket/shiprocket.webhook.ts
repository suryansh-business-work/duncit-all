import { Router, type Request, type Response } from 'express';
import express from 'express';
import { timingSafeEqual } from 'node:crypto';
import { logs } from '@observability/log';
import { getShiprocketAccount } from './shiprocket.account';
import { applyWebhookEvent } from './shiprocket.tracking';

/**
 * ShipRocket's tracking webhook: `POST /webhooks/courier-updates`.
 *
 * The path is deliberately neutral — ShipRocket refuses a webhook URL that
 * contains "shiprocket", "kartrocket", "sr" or "kr".
 *
 * ShipRocket signs nothing; it sends the `x-api-key` we gave it, which lives
 * in the Tech portal (SHIPROCKET → Webhook x-api-key). With no key configured
 * the body is IGNORED: a courier status is what marks a COD order paid, so an
 * unauthenticated "DELIVERED" must never be trusted.
 *
 * Always answers 200 once authenticated — ShipRocket retries anything else
 * and disables a webhook that keeps failing.
 */
export const COURIER_WEBHOOK_PATH = '/courier-updates';

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function buildShiprocketWebhookRouter(): Router {
  const router = Router();
  router.use(express.json({ limit: '256kb' }));

  router.post(COURIER_WEBHOOK_PATH, async (req: Request, res: Response) => {
    const secret = (await getShiprocketAccount())?.webhookSecret ?? '';
    if (!secret) {
      logs.server.warn('shiprocket', 'webhook', { msg: 'no webhook key configured in the Tech portal; update ignored' });
      return res.status(200).json({ ok: false });
    }
    const provided = String(req.header('x-api-key') ?? '').trim();
    if (!provided || !safeEqual(secret, provided)) return res.status(401).json({ ok: false });
    try {
      const applied = await applyWebhookEvent((req.body ?? {}) as Record<string, any>);
      logs.server.info('shiprocket', 'webhook', { applied, awb: String(req.body?.awb ?? ''), status: String(req.body?.current_status ?? '') });
    } catch (error) {
      logs.server.error('shiprocket', 'webhook', { error, msg: 'webhook could not be applied' });
    }
    return res.status(200).json({ ok: true });
  });

  return router;
}
