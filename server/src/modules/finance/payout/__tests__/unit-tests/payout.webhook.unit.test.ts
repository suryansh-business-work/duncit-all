const settle = jest.fn();
const secrets = jest.fn();

jest.mock('../../payout.settle', () => ({
  ...jest.requireActual('../../payout.settle'),
  settlePayout: (...a: unknown[]) => settle(...a),
}));
jest.mock('../../razorpayX.gateway', () => ({
  ...jest.requireActual('../../razorpayX.gateway'),
  payoutWebhookSecrets: () => secrets(),
}));

import crypto from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { subjectOfReference } from '../../payout.settle';
import { buildPayoutWebhookRouter, payoutEventOf } from '../../payout.webhook';
import { verifyPayoutWebhookSignature } from '../../razorpayX.gateway';

const SECRET = 'whsec_test_secret';
const sign = (raw: string, secret = SECRET) => crypto.createHmac('sha256', secret).update(raw).digest('hex');
const payoutEvent = (event: string, entity: Record<string, unknown>) => ({ event, payload: { payout: { entity } } });

const app = express();
app.use('/webhooks', buildPayoutWebhookRouter());

const post = (body: unknown, opts: { signature?: string; eventId?: string; raw?: string } = {}) => {
  const raw = opts.raw ?? JSON.stringify(body);
  let req = request(app).post('/webhooks/razorpay-payouts').set('Content-Type', 'application/json');
  req = req.set('x-razorpay-signature', opts.signature ?? sign(raw));
  if (opts.eventId) req = req.set('x-razorpay-event-id', opts.eventId);
  return req.send(raw);
};

beforeEach(() => {
  secrets.mockResolvedValue([SECRET]);
  settle.mockResolvedValue('APPLIED');
});

describe('subjectOfReference', () => {
  it('maps our reference prefixes to the record kind', () => {
    expect(subjectOfReference('wd_ab12cd')).toEqual({ kind: 'WITHDRAWAL', recordId: 'wd_ab12cd' });
    expect(subjectOfReference('sm_ab12cd')).toEqual({ kind: 'SEND_MONEY', recordId: 'sm_ab12cd' });
  });

  it('ignores a reference that is not ours', () => {
    expect(subjectOfReference('fpc_abc_1')).toBeNull();
    expect(subjectOfReference('')).toBeNull();
  });
});

describe('verifyPayoutWebhookSignature', () => {
  const raw = Buffer.from('{"event":"payout.processed"}');

  it('accepts the HMAC of the raw body under any known secret', () => {
    expect(verifyPayoutWebhookSignature(raw, sign(raw.toString()), ['other', SECRET])).toBe(true);
  });

  it('refuses a wrong secret, a tampered body, an empty signature, and a signature of the wrong length', () => {
    expect(verifyPayoutWebhookSignature(raw, sign(raw.toString(), 'wrong'), [SECRET])).toBe(false);
    expect(verifyPayoutWebhookSignature(Buffer.from('{"event":"payout.failed"}'), sign(raw.toString()), [SECRET])).toBe(false);
    expect(verifyPayoutWebhookSignature(raw, '', [SECRET])).toBe(false);
    expect(verifyPayoutWebhookSignature(raw, 'abc', [SECRET])).toBe(false);
    expect(verifyPayoutWebhookSignature(raw, sign(raw.toString()), [''])).toBe(false);
    expect(verifyPayoutWebhookSignature(raw, sign(raw.toString()), [])).toBe(false);
  });
});

describe('payoutEventOf', () => {
  it('reads a processed payout as PAID with its bank reference', () => {
    expect(payoutEventOf(payoutEvent('payout.processed', { id: 'pout_1', reference_id: 'wd_a', utr: 'UTR7', status: 'processed' }))).toEqual({
      kind: 'WITHDRAWAL',
      recordId: 'wd_a',
      outcome: 'PAID',
      razorpayPayoutId: 'pout_1',
      utr: 'UTR7',
      failureReason: 'Razorpay reported the payout as processed.',
    });
  });

  it.each(['payout.failed', 'payout.rejected', 'payout.reversed'])('reads %s as FAILED', (event) => {
    expect(payoutEventOf(payoutEvent(event, { id: 'p', reference_id: 'sm_a', status: 'failed' }))?.outcome).toBe('FAILED');
  });

  it('prefers failure_reason, then the status description, then the status', () => {
    const reason = (entity: Record<string, unknown>) =>
      payoutEventOf(payoutEvent('payout.failed', { id: 'p', reference_id: 'wd_a', ...entity }))?.failureReason;
    expect(reason({ failure_reason: 'IMPS limit', status_details: { description: 'x' } })).toBe('IMPS limit');
    expect(reason({ status_details: { description: 'Account closed' } })).toBe('Account closed');
    expect(reason({ status: 'reversed' })).toBe('Razorpay reported the payout as reversed.');
  });

  it('is null for an event we do not act on, a foreign reference, or a payout with no id', () => {
    expect(payoutEventOf(payoutEvent('payout.initiated', { id: 'p', reference_id: 'wd_a' }))).toBeNull();
    expect(payoutEventOf(payoutEvent('payout.processed', { id: 'p', reference_id: 'other_1' }))).toBeNull();
    expect(payoutEventOf(payoutEvent('payout.processed', { reference_id: 'wd_a' }))).toBeNull();
    expect(payoutEventOf({ event: 'payout.processed' })).toBeNull();
  });
});

describe('POST /webhooks/razorpay-payouts', () => {
  const processed = payoutEvent('payout.processed', { id: 'pout_1', reference_id: 'wd_a', utr: 'UTR7', status: 'processed' });

  it('settles a signed processed payout as PAID, keyed by Razorpay’s event id', async () => {
    const res = await post(processed, { eventId: 'evt_1' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, applied: true });
    expect(settle).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'WITHDRAWAL', recordId: 'wd_a', outcome: 'PAID', razorpayPayoutId: 'pout_1', utr: 'UTR7', dedupeKey: 'evt:evt_1' })
    );
  });

  it('falls back to a key made of the payout and its outcome when no event id header is sent', async () => {
    await post(processed);
    expect(settle).toHaveBeenCalledWith(expect.objectContaining({ dedupeKey: 'evt:pout_1:PAID' }));
  });

  it('answers a redelivery 200 without applying anything new', async () => {
    settle.mockResolvedValue('IGNORED');
    const res = await post(processed, { eventId: 'evt_1' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, applied: false });
  });

  it('refuses a bad signature with 400 and settles nothing', async () => {
    const res = await post(processed, { signature: sign('{}', 'wrong') });
    expect(res.status).toBe(400);
    expect(settle).not.toHaveBeenCalled();
  });

  it('refuses a body that was changed after it was signed', async () => {
    const original = JSON.stringify(processed);
    const res = await post(null, { raw: original.replace('wd_a', 'wd_b'), signature: sign(original) });
    expect(res.status).toBe(400);
    expect(settle).not.toHaveBeenCalled();
  });

  it('refuses everything with 503 while no webhook secret is configured', async () => {
    secrets.mockResolvedValue([]);
    const res = await post(processed);
    expect(res.status).toBe(503);
    expect(settle).not.toHaveBeenCalled();
  });

  it('refuses a signed body that is not JSON', async () => {
    const res = await post(null, { raw: 'not json' });
    expect(res.status).toBe(400);
    expect(settle).not.toHaveBeenCalled();
  });

  it('acknowledges, and ignores, an event that is not a payout outcome of ours', async () => {
    const res = await post(payoutEvent('payout.initiated', { id: 'pout_1', reference_id: 'wd_a' }));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, ignored: true });
    expect(settle).not.toHaveBeenCalled();
  });

  it('answers 500 when applying throws, so Razorpay retries it', async () => {
    settle.mockRejectedValue(new Error('database down'));
    const res = await post(processed, { eventId: 'evt_2' });
    expect(res.status).toBe(500);
  });
});
