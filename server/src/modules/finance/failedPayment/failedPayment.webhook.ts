import crypto from 'node:crypto';
import express, { Router, type Request, type Response } from 'express';
import { logs } from '@observability/log';
import { razorpayWebhookSecrets, verifyRazorpayWebhookSignature } from '@modules/finance/payment/razorpay.gateway';
import { RazorpayWebhookEventModel } from './razorpayWebhookEvent.model';
import { applyRazorpayEvent, summarize } from './failedPayment.webhookEvents';

/**
 * Razorpay's webhook: `POST /webhooks/razorpay`.
 *
 * Subscribe (Razorpay Dashboard → Webhooks) to payment.failed, payment.captured,
 * refund.processed and refund.failed, with the secret saved in the Tech portal
 * (RAZORPAY → Webhook secret) on the account that sends them.

 *
 *  - The signature is HMAC-SHA256 over the RAW body, so this route reads the
 *    body itself (express.raw) — it is mounted before any JSON parser on
 *    /webhooks, which would otherwise consume it.
 *  - No secret configured: 503 and a warning — an unsigned call is never trusted.
 *  - A bad signature: 400.
 *  - Otherwise the delivery is recorded under Razorpay's event id FIRST (a
 *    redelivery of a handled event is answered 200 and changes nothing), then
 *    applied, and always answered 200 — Razorpay retries anything else and
 *    disables a webhook that keeps failing; a failure is kept on the record.
 */
export const RAZORPAY_WEBHOOK_PATH = '/razorpay';

const isDuplicate = (error: unknown) => (error as { code?: number } | null)?.code === 11000;

type Body = Record<string, unknown>;

function parse(raw: Buffer): Body | null {
  try {
    const body = JSON.parse(raw.toString('utf8')) as unknown;
    return body && typeof body === 'object' ? (body as Body) : null;
  } catch {
    return null;
  }
}

/** Record the delivery; answers false when this event was already handled. */
async function recordDelivery(eventId: string, body: Body): Promise<boolean> {
  try {
    await RazorpayWebhookEventModel.create({ event_id: eventId, event: String(body.event ?? ''), summary: summarize(body) });
    return true;
  } catch (error) {
    if (!isDuplicate(error)) throw error;
    // Seen before — re-apply only if the first attempt never finished.
    const prior = await RazorpayWebhookEventModel.findOne({ event_id: eventId }).select('processed_at').lean();
    return !prior?.processed_at;
  }
}

async function handle(req: Request, res: Response) {
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  const secrets = await razorpayWebhookSecrets();
  if (secrets.length === 0) {
    logs.server.warn('razorpay', 'webhook', { msg: 'no Razorpay webhook secret configured in the Tech portal; delivery refused' });
    return res.status(503).json({ ok: false });
  }
  if (!verifyRazorpayWebhookSignature(raw, String(req.header('x-razorpay-signature') ?? ''), secrets)) {
    logs.server.warn('razorpay', 'webhook', { msg: 'bad signature' });
    return res.status(400).json({ ok: false });
  }
  const body = parse(raw);
  if (!body) return res.status(400).json({ ok: false });
  const eventId =
    String(req.header('x-razorpay-event-id') ?? '').trim() || `sha256:${crypto.createHash('sha256').update(raw).digest('hex')}`;

  const fresh = await recordDelivery(eventId, body);
  if (!fresh) return res.status(200).json({ ok: true, duplicate: true });
  try {
    const outcome = await applyRazorpayEvent(body, eventId);
    await RazorpayWebhookEventModel.updateOne({ event_id: eventId }, { $set: { processed_at: new Date(), outcome, error: '' } });
  } catch (error) {
    logs.server.error('razorpay', 'webhook', { error, event_id: eventId, event: String(body.event ?? '') });
    await RazorpayWebhookEventModel.updateOne(
      { event_id: eventId },
      { $set: { error: (error as Error).message?.slice(0, 1000) ?? 'failed' } }
    ).catch((saveError: unknown) => logs.server.warn('razorpay', 'webhook', { error: saveError, event_id: eventId }));
  }
  return res.status(200).json({ ok: true });
}

export function buildRazorpayWebhookRouter(): Router {
  const router = Router();
  // Raw body on THIS route only, so the other /webhooks routers keep their own parsers.
  router.post(RAZORPAY_WEBHOOK_PATH, express.raw({ type: '*/*', limit: '1mb' }), (req, res) => {
    handle(req, res).catch((error: unknown) => {
      logs.server.error('razorpay', 'webhook', { error, msg: 'could not record the delivery' });
      // Not recorded: let Razorpay retry it.
      if (!res.headersSent) res.status(500).json({ ok: false });
    });
  });
  return router;
}
