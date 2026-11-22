/**
 * POST /webhooks/razorpay: an unsigned or mis-signed body is refused, a missing
 * secret refuses everything, each Razorpay event id is applied once, and an
 * accepted delivery is always answered 200 — even when applying it fails.
 */
jest.mock('@observability/log', () => ({ logs: { server: { error: jest.fn(), info: jest.fn(), warn: jest.fn() } } }));
jest.mock('@modules/finance/payment/razorpay.gateway', () => ({
  ...jest.requireActual('@modules/finance/payment/razorpay.gateway'),
  razorpayWebhookSecrets: jest.fn(),
}));
jest.mock('../../razorpayWebhookEvent.model', () => ({
  RazorpayWebhookEventModel: { create: jest.fn(), findOne: jest.fn(), updateOne: jest.fn() },
}));
// The handlers have their own suite; here only the route's contract is under test.
jest.mock('../../failedPayment.webhookEvents', () => ({
  applyRazorpayEvent: jest.fn(),
  summarize: jest.fn(() => ({ event: 'payment.failed' })),
}));

import crypto from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { razorpayWebhookSecrets, verifyRazorpayWebhookSignature } from '@modules/finance/payment/razorpay.gateway';
import { RazorpayWebhookEventModel } from '../../razorpayWebhookEvent.model';
import { applyRazorpayEvent } from '../../failedPayment.webhookEvents';
import { buildRazorpayWebhookRouter } from '../../failedPayment.webhook';

const m = (fn: unknown) => fn as jest.Mock;
const SECRET = 'whsec_test_value';

const app = () => {
  const a = express();
  a.use('/webhooks', buildRazorpayWebhookRouter());
  return a;
};

const body = JSON.stringify({
  event: 'payment.failed',
  payload: {
    payment: {
      entity: {
        id: 'pay_1',
        order_id: 'order_1',
        status: 'failed',
        amount: 49900,
        error_code: 'BAD_REQUEST_ERROR',
        error_description: 'Payment declined by bank',
        email: 'buyer@example.com',
        contact: '+919999999999',
        card: { last4: '4242' },
      },
    },
  },
});
const sign = (raw: string, secret = SECRET) => crypto.createHmac('sha256', secret).update(raw).digest('hex');

const post = (raw: string, headers: Record<string, string>) =>
  request(app()).post('/webhooks/razorpay').set('Content-Type', 'application/json').set(headers).send(raw);

beforeEach(() => {
  jest.clearAllMocks();
  m(razorpayWebhookSecrets).mockResolvedValue([SECRET]);
  m(RazorpayWebhookEventModel.create).mockResolvedValue({});
  m(RazorpayWebhookEventModel.updateOne).mockResolvedValue({ modifiedCount: 1 });
  m(applyRazorpayEvent).mockResolvedValue('APPLIED');
});

describe('verifyRazorpayWebhookSignature', () => {
  it('accepts the HMAC of the raw body under any configured secret', () => {
    const raw = Buffer.from(body);
    expect(verifyRazorpayWebhookSignature(raw, sign(body), [SECRET])).toBe(true);
    expect(verifyRazorpayWebhookSignature(raw, sign(body, 'second'), ['first', 'second'])).toBe(true);
  });

  it('refuses a wrong, empty or truncated signature, or no secret at all', () => {
    const raw = Buffer.from(body);
    expect(verifyRazorpayWebhookSignature(raw, sign(body, 'other'), [SECRET])).toBe(false);
    expect(verifyRazorpayWebhookSignature(raw, '', [SECRET])).toBe(false);
    expect(verifyRazorpayWebhookSignature(raw, sign(body).slice(0, 10), [SECRET])).toBe(false);
    expect(verifyRazorpayWebhookSignature(raw, sign(body), [])).toBe(false);
  });

  it('refuses a body changed after signing', () => {
    expect(verifyRazorpayWebhookSignature(Buffer.from(`${body} `), sign(body), [SECRET])).toBe(false);
  });
});

describe('POST /webhooks/razorpay', () => {
  it('refuses a bad signature with 400 and records nothing', async () => {
    const res = await post(body, { 'x-razorpay-signature': sign(body, 'wrong'), 'x-razorpay-event-id': 'evt_1' });
    expect(res.status).toBe(400);
    expect(RazorpayWebhookEventModel.create).not.toHaveBeenCalled();
    expect(applyRazorpayEvent).not.toHaveBeenCalled();
  });

  it('answers 503 when no webhook secret is configured', async () => {
    m(razorpayWebhookSecrets).mockResolvedValue([]);
    const res = await post(body, { 'x-razorpay-signature': sign(body), 'x-razorpay-event-id': 'evt_1' });
    expect(res.status).toBe(503);
    expect(applyRazorpayEvent).not.toHaveBeenCalled();
  });

  it('records the delivery under its event id, applies it and answers 200', async () => {
    const res = await post(body, { 'x-razorpay-signature': sign(body), 'x-razorpay-event-id': 'evt_1' });
    expect(res.status).toBe(200);
    expect(RazorpayWebhookEventModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ event_id: 'evt_1', event: 'payment.failed' })
    );
    expect(applyRazorpayEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'payment.failed' }), 'evt_1');
    expect(RazorpayWebhookEventModel.updateOne).toHaveBeenCalledWith(
      { event_id: 'evt_1' },
      { $set: expect.objectContaining({ outcome: 'APPLIED', processed_at: expect.any(Date) }) }
    );
  });

  it('does not apply a redelivered event that was already processed', async () => {
    m(RazorpayWebhookEventModel.create).mockRejectedValue(Object.assign(new Error('dup'), { code: 11000 }));
    m(RazorpayWebhookEventModel.findOne).mockReturnValue({
      select: () => ({ lean: async () => ({ processed_at: new Date() }) }),
    });
    const res = await post(body, { 'x-razorpay-signature': sign(body), 'x-razorpay-event-id': 'evt_1' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, duplicate: true });
    expect(applyRazorpayEvent).not.toHaveBeenCalled();
  });

  it('re-applies a redelivery whose first attempt never finished', async () => {
    m(RazorpayWebhookEventModel.create).mockRejectedValue(Object.assign(new Error('dup'), { code: 11000 }));
    m(RazorpayWebhookEventModel.findOne).mockReturnValue({ select: () => ({ lean: async () => ({ processed_at: null }) }) });
    await post(body, { 'x-razorpay-signature': sign(body), 'x-razorpay-event-id': 'evt_1' });
    expect(applyRazorpayEvent).toHaveBeenCalledTimes(1);
  });

  it('still answers 200 when applying fails, and keeps the error on the record', async () => {
    m(applyRazorpayEvent).mockRejectedValue(new Error('handler blew up'));
    const res = await post(body, { 'x-razorpay-signature': sign(body), 'x-razorpay-event-id': 'evt_2' });
    expect(res.status).toBe(200);
    expect(RazorpayWebhookEventModel.updateOne).toHaveBeenCalledWith({ event_id: 'evt_2' }, { $set: { error: 'handler blew up' } });
  });

  it('answers 500 (so Razorpay retries) when the delivery could not be recorded', async () => {
    m(RazorpayWebhookEventModel.create).mockRejectedValue(new Error('db down'));
    const res = await post(body, { 'x-razorpay-signature': sign(body), 'x-razorpay-event-id': 'evt_3' });
    expect(res.status).toBe(500);
    expect(applyRazorpayEvent).not.toHaveBeenCalled();
  });
});
