import express from 'express';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import { buildShiprocketWebhookRouter } from '../../shiprocket.webhook';
import { shiprocketService } from '../../shiprocket.service';
import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';
import { EnvEntryModel } from '@modules/platform/envEntry/envEntry.model';

/**
 * The inbound ShipRocket status hook. Two things matter here and neither is the
 * happy path: an unauthenticated caller must not be able to move an order's
 * fulfilment state, and ShipRocket must always get a 200 — anything else makes
 * it retry-storm the endpoint.
 */
const app = express();
app.use('/shiprocket', buildShiprocketWebhookRouter());

/** Generated per run — a credential is never a literal in source (rule 26f). */
const secret = () => randomUUID();

let seq = 0;
const seedOrder = (awb: string) =>
  ProductOrderModel.create({
    order_no: `DUN-ORD-HOOK-${++seq}`,
    buyer_id: new Types.ObjectId(),
    payment_id: new Types.ObjectId(),
    items_total: 100,
    total: 100,
    fulfilment_method: 'SHIP',
    fulfilment_status: 'AWB_ASSIGNED',
    shiprocket: { awb },
  });

const configureSecret = (value: string) =>
  EnvEntryModel.create({
    name: 'ShipRocket',
    category: 'SHIPROCKET',
    is_active: true,
    is_default: true,
    config: { webhook_secret: value },
  });

afterEach(async () => {
  await EnvEntryModel.deleteMany({});
  jest.restoreAllMocks();
});

describe('ShipRocket webhook', () => {
  it('applies the event when no secret is configured', async () => {
    const awb = `AWB-${randomUUID()}`;
    await seedOrder(awb);
    const res = await request(app)
      .post('/shiprocket/webhook')
      .send({ awb, current_status: 'DELIVERED' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    const order = await ProductOrderModel.findOne({ 'shiprocket.awb': awb });
    expect(order?.fulfilment_status).toBe('DELIVERED');
  });

  it('applies the event when the x-api-key matches the configured secret', async () => {
    const key = secret();
    await configureSecret(key);
    const awb = `AWB-${randomUUID()}`;
    await seedOrder(awb);
    const res = await request(app)
      .post('/shiprocket/webhook')
      .set('x-api-key', key)
      .send({ awb, current_status: 'OUT FOR DELIVERY' });
    expect(res.status).toBe(200);
    const order = await ProductOrderModel.findOne({ 'shiprocket.awb': awb });
    expect(order?.fulfilment_status).toBe('OUT_FOR_DELIVERY');
  });

  it('refuses a caller that sends no key at all and leaves the order alone', async () => {
    await configureSecret(secret());
    const awb = `AWB-${randomUUID()}`;
    await seedOrder(awb);
    const res = await request(app)
      .post('/shiprocket/webhook')
      .send({ awb, current_status: 'DELIVERED' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ ok: false });
    const order = await ProductOrderModel.findOne({ 'shiprocket.awb': awb });
    expect(order?.fulfilment_status).toBe('AWB_ASSIGNED');
  });

  it('refuses a key of the wrong length', async () => {
    await configureSecret(secret());
    const res = await request(app)
      .post('/shiprocket/webhook')
      .set('x-api-key', 'short')
      .send({ current_status: 'DELIVERED' });
    expect(res.status).toBe(401);
  });

  // Same length, different bytes — the comparison is constant-time, so this is
  // the case that actually exercises it rather than the length short-circuit.
  it('refuses a key of the right length but the wrong value', async () => {
    const key = secret();
    await configureSecret(key);
    const res = await request(app)
      .post('/shiprocket/webhook')
      .set('x-api-key', secret())
      .send({ current_status: 'DELIVERED' });
    expect(res.status).toBe(401);
    expect(key).toHaveLength(36);
  });

  // ShipRocket retries anything that is not a 200, so a failure on our side has
  // to be swallowed and logged rather than answered with a 500.
  it('still answers 200 when applying the event throws', async () => {
    jest
      .spyOn(shiprocketService, 'applyWebhookEvent')
      .mockRejectedValue(new Error('mongo down'));
    const res = await request(app)
      .post('/shiprocket/webhook')
      .send({ awb: 'AWB-BOOM', current_status: 'DELIVERED' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('accepts a request with no body at all', async () => {
    const applied = jest.spyOn(shiprocketService, 'applyWebhookEvent');
    const res = await request(app).post('/shiprocket/webhook');
    expect(res.status).toBe(200);
    expect(applied).toHaveBeenCalledWith({});
  });
});
