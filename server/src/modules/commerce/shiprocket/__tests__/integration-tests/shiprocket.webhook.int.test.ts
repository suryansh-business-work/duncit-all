import express from 'express';
import request from 'supertest';
import { Types } from 'mongoose';
import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';
import { buildShiprocketWebhookRouter, COURIER_WEBHOOK_PATH } from '../../shiprocket.webhook';
import { runtimeSecret, seedShiprocketAccount } from './fake-shiprocket';

/**
 * ShipRocket's tracking push, mounted at /webhooks/courier-updates. A courier
 * status is what marks a COD order paid, so an unauthenticated body must never
 * move an order; and once authenticated ShipRocket must always get a 200 —
 * anything else makes it retry and eventually disable the webhook.
 */
const app = express();
app.use('/webhooks', buildShiprocketWebhookRouter());
const HOOK = `/webhooks${COURIER_WEBHOOK_PATH}`;

let seq = 0;
const seedOrder = (awb: string, status: 'AWB_ASSIGNED' | 'DELIVERED' = 'AWB_ASSIGNED') =>
  ProductOrderModel.create({
    order_no: `DUN-ORD-HOOK-${++seq}`,
    payment_id: new Types.ObjectId(),
    items_total: 698,
    total: 747,
    fulfilment_method: 'SHIP',
    fulfilment_status: status,
    shiprocket: { order_id: '7300001', shipment_id: '6300001', awb },
  });

const newAwb = () => `1433${6300000 + ++seq}`;
const statusOf = async (awb: string) => (await ProductOrderModel.findOne({ 'shiprocket.awb': awb }).orFail()).fulfilment_status;

const scan = (label: string, date: string) => ({
  date,
  status: label,
  activity: `${label} at hub`,
  location: 'Gurugram_Sec57_DC',
  'sr-status-label': label,
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('POST /webhooks/courier-updates', () => {
  it('uses a path ShipRocket accepts — no "shiprocket", "sr" or "kr" in it', () => {
    expect(COURIER_WEBHOOK_PATH).toBe('/courier-updates');
    expect(HOOK).not.toMatch(/shiprocket|kartrocket|sr|kr/i);
  });

  it('applies the update when the x-api-key matches the Tech portal key', async () => {
    const { config } = await seedShiprocketAccount();
    const awb = newAwb();
    await seedOrder(awb);
    const res = await request(app)
      .post(HOOK)
      .set('x-api-key', config.webhook_secret)
      .send({ awb, current_status: 'OUT FOR DELIVERY', current_status_id: 17, scans: [scan('OUT FOR DELIVERY', '2026-09-22 08:10:00')] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    const order = await ProductOrderModel.findOne({ 'shiprocket.awb': awb }).orFail();
    expect(order.fulfilment_status).toBe('OUT_FOR_DELIVERY');
    expect(order.shiprocket).toMatchObject({ tracking_status: 'OUT FOR DELIVERY', status_code: 17 });
    expect(order.tracking_events.map((e) => e.status)).toEqual(['OUT FOR DELIVERY']);
  });

  // With no key there is nothing to check a caller against: the body is
  // ignored, but still answered 200 so ShipRocket does not disable the hook.
  it('ignores the update when no webhook key is configured', async () => {
    await seedShiprocketAccount({ webhook_secret: '' });
    const awb = newAwb();
    await seedOrder(awb);
    const res = await request(app).post(HOOK).send({ awb, current_status: 'DELIVERED' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: false });
    expect(await statusOf(awb)).toBe('AWB_ASSIGNED');
  });

  it('ignores the update when ShipRocket is not configured at all', async () => {
    const awb = newAwb();
    await seedOrder(awb);
    const res = await request(app).post(HOOK).set('x-api-key', runtimeSecret('hook')).send({ awb, current_status: 'DELIVERED' });
    expect(res.body).toEqual({ ok: false });
    expect(await statusOf(awb)).toBe('AWB_ASSIGNED');
  });

  it('refuses a caller with no key and leaves the order alone', async () => {
    await seedShiprocketAccount();
    const awb = newAwb();
    await seedOrder(awb);
    const res = await request(app).post(HOOK).send({ awb, current_status: 'DELIVERED' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ ok: false });
    expect(await statusOf(awb)).toBe('AWB_ASSIGNED');
  });

  it('refuses a key of the wrong length', async () => {
    await seedShiprocketAccount();
    const res = await request(app).post(HOOK).set('x-api-key', 'short').send({ current_status: 'DELIVERED' });
    expect(res.status).toBe(401);
  });

  // Same length, different bytes: the comparison is constant-time, so this is
  // the case that exercises it rather than the length short-circuit.
  it('refuses a key of the right length but the wrong value', async () => {
    const { config } = await seedShiprocketAccount();
    const wrong = runtimeSecret('hook');
    expect(wrong).toHaveLength(config.webhook_secret.length);
    const res = await request(app).post(HOOK).set('x-api-key', wrong).send({ current_status: 'DELIVERED' });
    expect(res.status).toBe(401);
  });

  it('adds nothing twice when ShipRocket replays the same scans', async () => {
    const { config } = await seedShiprocketAccount();
    const awb = newAwb();
    await seedOrder(awb);
    const body = {
      awb,
      current_status: 'IN TRANSIT',
      scans: [scan('PICKED UP', '2026-09-20 12:05:00'), scan('IN TRANSIT', '2026-09-21 02:40:00')],
    };
    await request(app).post(HOOK).set('x-api-key', config.webhook_secret).send(body);
    await request(app).post(HOOK).set('x-api-key', config.webhook_secret).send(body);
    const order = await ProductOrderModel.findOne({ 'shiprocket.awb': awb }).orFail();
    expect(order.fulfilment_status).toBe('SHIPPED');
    expect(order.tracking_events.map((e) => e.status)).toEqual(['PICKED UP', 'IN TRANSIT']);
  });

  it('never pulls a delivered order back on a late in-transit update', async () => {
    const { config } = await seedShiprocketAccount();
    const awb = newAwb();
    await seedOrder(awb, 'DELIVERED');
    await request(app).post(HOOK).set('x-api-key', config.webhook_secret).send({ awb, current_status: 'IN TRANSIT' });
    expect(await statusOf(awb)).toBe('DELIVERED');
  });

  it('finds the order by our order number when the body has no AWB yet', async () => {
    const { config } = await seedShiprocketAccount();
    const awb = newAwb();
    const order = await seedOrder(awb);
    await request(app)
      .post(HOOK)
      .set('x-api-key', config.webhook_secret)
      .send({ order_id: order.order_no, current_status: 'PICKUP SCHEDULED' });
    expect(await statusOf(awb)).toBe('PICKUP_SCHEDULED');
  });

  it('answers 200 for a shipment we do not have', async () => {
    const { config } = await seedShiprocketAccount();
    const res = await request(app)
      .post(HOOK)
      .set('x-api-key', config.webhook_secret)
      .send({ awb: newAwb(), current_status: 'DELIVERED' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('still answers 200 when applying the update fails on our side', async () => {
    const { config } = await seedShiprocketAccount();
    jest.spyOn(ProductOrderModel, 'findOne').mockImplementation(() => {
      throw new Error('mongo down');
    });
    const res = await request(app)
      .post(HOOK)
      .set('x-api-key', config.webhook_secret)
      .send({ awb: newAwb(), current_status: 'DELIVERED' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('no longer answers the old /webhook route', async () => {
    const { config } = await seedShiprocketAccount();
    const res = await request(app).post('/webhooks/webhook').set('x-api-key', config.webhook_secret).send({ current_status: 'DELIVERED' });
    expect(res.status).toBe(404);
  });
});
