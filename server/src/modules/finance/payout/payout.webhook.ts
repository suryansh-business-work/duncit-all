import express, { Router, type Request, type Response } from 'express';
import { logs } from '@observability/log';
import { payoutWebhookSecrets, verifyPayoutWebhookSignature } from './razorpayX.gateway';
import { settlePayout, subjectOfReference, type SettleOutcome } from './payout.settle';
import type { PayoutSubjectKind } from './payout.model';

/**
 * RazorpayX payout webhook: `POST /webhooks/razorpay-payouts`.
 *
 * Razorpay Dashboard → Webhooks → add this URL with the events payout.processed,
 * payout.failed, payout.rejected and payout.reversed, and save the same webhook
 * secret in the Tech portal (RAZORPAY → Webhook secret).
 *
 *  - The signature is HMAC-SHA256 over the RAW body, so the route reads the body
 *    itself (express.raw) and is mounted before any JSON parser on /webhooks.
 *  - No secret configured: 503 and a warning — an unsigned call is never trusted.
 *  - A bad signature: 400.
 *  - A valid delivery is applied through {@link settlePayout}, which is
 *    idempotent (only a PROCESSING payout can settle, and the audit row is keyed
 *    by the event id), so a redelivery changes nothing and needs no ledger of
 *    its own. If applying it throws, the answer is 500 so Razorpay retries.
 *  - Events this system does not act on are acknowledged with 200 and ignored.
 *
 * Only `payout.processed` can make a withdrawal or a transfer PAID.
 */
export const PAYOUT_WEBHOOK_PATH = '/razorpay-payouts';

type Body = Record<string, unknown>;
type Entity = Record<string, unknown>;

const text = (value: unknown): string => (typeof value === 'string' || typeof value === 'number' ? String(value) : '');

const OUTCOME_BY_EVENT: Record<string, SettleOutcome> = {
  'payout.processed': 'PAID',
  'payout.failed': 'FAILED',
  'payout.rejected': 'FAILED',
  'payout.reversed': 'FAILED',
};

export interface PayoutEvent {
  kind: PayoutSubjectKind;
  recordId: string;
  outcome: SettleOutcome;
  razorpayPayoutId: string;
  utr: string;
  failureReason: string;
}

/**
 * The settle request one delivery asks for, or null when it is not a payout
 * outcome of ours (another event, another reference, no payout id). Pure.
 */
export function payoutEventOf(body: Body): PayoutEvent | null {
  const outcome = OUTCOME_BY_EVENT[text(body.event)];
  if (!outcome) return null;
  const payload = (body.payload ?? {}) as Record<string, { entity?: Entity } | undefined>;
  const entity = payload.payout?.entity ?? {};
  const subject = subjectOfReference(text(entity.reference_id));
  const razorpayPayoutId = text(entity.id);
  if (!subject || !razorpayPayoutId) return null;
  const details = (entity.status_details ?? {}) as Entity;
  return {
    ...subject,
    outcome,
    razorpayPayoutId,
    utr: text(entity.utr),
    failureReason:
      text(entity.failure_reason) || text(details.description) || `Razorpay reported the payout as ${text(entity.status)}.`,
  };
}

function parse(raw: Buffer): Body | null {
  try {
    const body = JSON.parse(raw.toString('utf8')) as unknown;
    return body && typeof body === 'object' ? (body as Body) : null;
  } catch {
    return null;
  }
}

async function handle(req: Request, res: Response) {
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  const secrets = await payoutWebhookSecrets();
  if (secrets.length === 0) {
    logs.server.warn('payout', 'webhook', { msg: 'no Razorpay webhook secret configured in the Tech portal; delivery refused' });
    return res.status(503).json({ ok: false });
  }
  if (!verifyPayoutWebhookSignature(raw, String(req.header('x-razorpay-signature') ?? ''), secrets)) {
    logs.server.warn('payout', 'webhook', { msg: 'bad signature' });
    return res.status(400).json({ ok: false });
  }
  const body = parse(raw);
  if (!body) return res.status(400).json({ ok: false });

  const event = payoutEventOf(body);
  if (!event) return res.status(200).json({ ok: true, ignored: true });
  const eventId = String(req.header('x-razorpay-event-id') ?? '').trim() || `${event.razorpayPayoutId}:${event.outcome}`;
  const result = await settlePayout({
    kind: event.kind,
    recordId: event.recordId,
    outcome: event.outcome,
    razorpayPayoutId: event.razorpayPayoutId,
    utr: event.utr,
    failureReason: event.failureReason,
    dedupeKey: `evt:${eventId}`,
  });
  if (result === 'IGNORED' && event.outcome === 'FAILED') {
    // A failure for a payout that already settled (or is not the current attempt):
    // nothing changes, but a REVERSAL of money we marked paid needs a person.
    logs.server.warn('payout', 'webhook', { msg: 'failure event did not apply', record_id: event.recordId, event_id: eventId });
  }
  return res.status(200).json({ ok: true, applied: result === 'APPLIED' });
}

export function buildPayoutWebhookRouter(): Router {
  const router = Router();
  // Raw body on THIS route only, so the other /webhooks routers keep their own parsers.
  router.post(PAYOUT_WEBHOOK_PATH, express.raw({ type: '*/*', limit: '1mb' }), (req, res) => {
    handle(req, res).catch((error: unknown) => {
      logs.server.error('payout', 'webhook', { error, msg: 'could not apply the delivery' });
      // Not applied: let Razorpay retry it.
      if (!res.headersSent) res.status(500).json({ ok: false });
    });
  });
  return router;
}
