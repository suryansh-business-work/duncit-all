import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { logs } from '@observability/log';
import { inboundWhatsapp, parseWhatsappInbound } from './automation.inbound';

/**
 * The door an incoming WhatsApp message comes through.
 *
 * AiSensy posts every message a contact sends to the webhook configured in its
 * console. That webhook carries no signature, so the address itself has to be
 * the secret: the URL is `/automation/whatsapp/inbound?secret=…` and the value
 * is the Webhook Secret on the AiSensy entry in Tech > Environment. No secret
 * configured means the door is shut — a webhook anyone can post to would be a
 * way to start flows, and their paid messages, at any number.
 *
 * It answers 200 the moment the message is accepted and does the work after:
 * AiSensy retries a slow webhook, and a retry is a duplicate message.
 */
function secretMatches(given: string, expected: string): boolean {
  if (!given || !expected || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export function buildAutomationRouter(): Router {
  const router = Router();

  router.post('/whatsapp/inbound', async (req, res) => {
    const expected = await getRuntimeEnvValue('AISENSY_WEBHOOK_SECRET');
    const header = req.get('x-webhook-secret') ?? '';
    const given = typeof req.query.secret === 'string' ? req.query.secret : header;
    if (!secretMatches(given, expected)) {
      res.status(403).json({ ok: false, error: 'Webhook secret missing or wrong' });
      return;
    }
    const message = parseWhatsappInbound(req.body);
    if (!message) {
      // Delivery receipts and read events arrive on the same webhook; they carry no text.
      res.status(200).json({ ok: true, ignored: true });
      return;
    }
    res.status(200).json({ ok: true });
    inboundWhatsapp(message).catch((error) =>
      logs.server.error('automation', 'inbound', { error, from: message.from })
    );
  });

  return router;
}
