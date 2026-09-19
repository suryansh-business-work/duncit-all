jest.mock('@config/redis', () => ({
  ...jest.requireActual('@config/redis'),
  cacheGet: jest.fn(async () => null),
  cacheSet: jest.fn(async () => undefined),
}));
jest.mock('@modules/commerce/store/store.emails', () => ({
  ...jest.requireActual('@modules/commerce/store/store.emails'),
  mailOrderUpdate: jest.fn(async () => undefined),
  mailReturnUpdate: jest.fn(async () => undefined),
}));
jest.mock('@modules/commerce/store/store.whatsapp', () => ({ whatsappOrderUpdate: jest.fn(async () => undefined) }));

import express from 'express';
import request from 'supertest';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { storeOrderService } from '@modules/commerce/store/store.order.service';
import { buildShiprocketWebhookRouter } from '../../shiprocket.webhook';
import { installFakeShiprocket, seedShiprocketAccount, WAREHOUSE, type FakeShiprocket } from './fake-shiprocket';
import { opsCtx, reloadOrder, seedPaidOrder, seedProduct, stockOf } from './order-fixtures';

/**
 * A pet-store order's forward journey against a fake ShipRocket: the real
 * client, shipment pipeline, webhook and store reactions all run; only the
 * HTTP answers are canned. Each test is one thing an operator (or the
 * courier) does on the order page.
 */
const app = express();
app.use('/webhooks', buildShiprocketWebhookRouter());

let sr: FakeShiprocket;

beforeEach(() => {
  sr = installFakeShiprocket();
});

afterEach(() => {
  sr.restore();
});

/** The order page's Create shipment / Retry button. */
const createShipment = (id: unknown) => storeOrderService.createShipment(String(id));

describe('create → AWB → pickup → delivered', () => {
  it('books the order, assigns the recommended courier, schedules the pickup and settles COD on delivery', async () => {
    const { config } = await seedShiprocketAccount();
    const product = await seedProduct();
    const { order, payment } = await seedPaidOrder({ product, cod: true });

    await createShipment(order._id);

    const booked = await reloadOrder(order._id);
    expect(booked.fulfilment_status).toBe('PICKUP_SCHEDULED');
    expect(booked.last_error).toBe('');
    expect(booked.shiprocket).toMatchObject({
      order_id: '7300001',
      shipment_id: '6300001',
      awb: '14336300001',
      courier_name: 'Delhivery Surface',
      courier_company_id: '12',
      etd: 'Sep 23, 2026',
      pickup_token: 'Reference No: 19461',
      pickup_scheduled_date: '2026-09-20 11:00:00',
      alert: '',
    });
    // Two 250 g packs stacked: 20 × 14 × 10 cm, 0.56 kg volumetric.
    expect(booked.parcel).toMatchObject({
      source: 'AUTO',
      weight_kg: 0.5,
      length_cm: 20,
      breadth_cm: 14,
      height_cm: 10,
      chargeable_weight_kg: 0.56,
    });
    expect(booked.parcel?.sent_at).toBeInstanceOf(Date);

    const sent = sr.last('POST', '/orders/create/adhoc')?.body;
    expect(sent).toMatchObject({
      order_id: order.order_no,
      pickup_location: WAREHOUSE,
      billing_customer_name: 'Asha',
      billing_last_name: 'Rani Verma',
      billing_city: 'Gurugram',
      billing_pincode: '122002',
      billing_phone: '9876543210',
      payment_method: 'COD',
      sub_total: order.total,
      weight: 0.5,
      length: 20,
      breadth: 14,
      height: 10,
    });
    expect(sent?.order_items).toEqual([
      { name: 'Drools Chicken Jerky 200g', sku: product.sku, units: 2, selling_price: 349, hsn: '2309' },
    ]);
    expect(sr.last('POST', '/courier/assign/awb')?.body).toEqual({ shipment_id: '6300001', courier_id: '12' });
    expect(sr.last('POST', '/courier/generate/pickup')?.body).toEqual({ shipment_id: [6300001] });
    // Logged in once; every API call carried the token.
    expect(sr.count('POST', '/auth/login')).toBe(1);
    expect(sr.calls.filter((c) => c.path !== '/auth/login').every((c) => c.auth.startsWith('Bearer e30.'))).toBe(true);

    const res = await request(app)
      .post('/webhooks/courier-updates')
      .set('x-api-key', config.webhook_secret)
      .send({
        awb: '14336300001',
        order_id: order.order_no,
        current_status: 'DELIVERED',
        current_status_id: 7,
        scans: [
          { date: '2026-09-22 16:42:10', status: 'DLVD', activity: 'Delivered to consignee', location: 'Gurugram_Sec57_DC', 'sr-status-label': 'DELIVERED' },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    const delivered = await reloadOrder(order._id);
    expect(delivered.fulfilment_status).toBe('DELIVERED');
    expect(delivered.shiprocket.status_code).toBe(7);
    expect(delivered.tracking_events.map((e) => e.status)).toContain('DELIVERED');
    // Cash in the courier's hand is the COD payment captured.
    expect(delivered.cod_collected_at).toBeInstanceOf(Date);
    expect((await PaymentModel.findById(payment._id).orFail()).status).toBe('SUCCESS');
  });
});

describe('a wallet too low to pay for the AWB', () => {
  it('parks the order in AWAITING_SHIPMENT with a LOW_WALLET alert, and a retry resumes without re-booking', async () => {
    await seedShiprocketAccount();
    const { order } = await seedPaidOrder({ product: await seedProduct() });
    sr.state.wallet = 20;

    await createShipment(order._id);

    const parked = await reloadOrder(order._id);
    expect(parked.fulfilment_status).toBe('AWAITING_SHIPMENT');
    expect(parked.last_error).toBe('');
    expect(parked.shiprocket.alert).toBe('LOW_WALLET');
    expect(parked.shiprocket.alert_message).toBe(
      'The ShipRocket wallet has ₹20; Delhivery Surface costs about ₹68. Recharge the wallet, then retry.'
    );
    expect(parked.shiprocket.order_id).toBe('7300001');
    expect(parked.shiprocket.awb).toBe('');
    expect(sr.count('POST', '/courier/assign/awb')).toBe(0);

    sr.state.wallet = 1500;
    await createShipment(order._id);

    const resumed = await reloadOrder(order._id);
    expect(resumed.fulfilment_status).toBe('PICKUP_SCHEDULED');
    expect(resumed.shiprocket).toMatchObject({ order_id: '7300001', awb: '14336300001', alert: '', alert_message: '' });
    // The ShipRocket order from the first attempt is the one that shipped.
    expect(sr.count('POST', '/orders/create/adhoc')).toBe(1);
    expect(sr.count('GET', '/orders')).toBe(1);
  });
});

describe('idempotent booking', () => {
  it('re-uses the ShipRocket order a lost answer already created instead of booking a second parcel', async () => {
    await seedShiprocketAccount();
    const { order } = await seedPaidOrder({ product: await seedProduct() });
    sr.state.existing = { id: 7300555, channel_order_id: order.order_no, status: 'NEW', shipments: [{ id: 6300555 }] };

    await createShipment(order._id);

    const booked = await reloadOrder(order._id);
    expect(sr.count('POST', '/orders/create/adhoc')).toBe(0);
    expect(sr.last('GET', '/orders')?.query.get('search')).toBe(order.order_no);
    expect(booked.shiprocket).toMatchObject({ order_id: '7300555', shipment_id: '6300555', awb: '14336300555' });
    expect(booked.fulfilment_status).toBe('PICKUP_SCHEDULED');
  });

  it('books a new order when the search only finds a near-miss', async () => {
    await seedShiprocketAccount();
    const { order } = await seedPaidOrder({ product: await seedProduct() });
    sr.state.existing = { id: 7300556, channel_order_id: `${order.order_no}-B`, shipments: [{ id: 6300556 }] };

    await createShipment(order._id);

    expect(sr.count('POST', '/orders/create/adhoc')).toBe(1);
    expect((await reloadOrder(order._id)).shiprocket.order_id).toBe('7300001');
  });

  it('never books twice across retries once the ShipRocket order exists', async () => {
    await seedShiprocketAccount();
    const { order } = await seedPaidOrder({ product: await seedProduct() });
    sr.failNext('POST', '/courier/assign/awb', 500);

    await createShipment(order._id);
    const failed = await reloadOrder(order._id);
    expect(failed.fulfilment_status).toBe('FAILED');
    expect(failed.last_error).toBe('ShipRocket: ShipRocket answered 500');
    expect(failed.shiprocket.order_id).toBe('7300001');

    await createShipment(order._id);
    expect((await reloadOrder(order._id)).fulfilment_status).toBe('PICKUP_SCHEDULED');
    expect(sr.count('POST', '/orders/create/adhoc')).toBe(1);
  });
});

describe('cancel before pickup', () => {
  it('cancels the ShipRocket order, puts the stock back and refunds the prepaid payment', async () => {
    await seedShiprocketAccount();
    const product = await seedProduct();
    const { order, payment } = await seedPaidOrder({ product });
    await createShipment(order._id);
    const before = await stockOf(product._id);

    await storeOrderService.adminCancel(opsCtx, String(order._id), 'Buyer changed their mind', 'ORIGINAL');

    expect(sr.last('POST', '/orders/cancel')?.body).toEqual({ ids: [7300001] });
    const cancelled = await reloadOrder(order._id);
    expect(cancelled.fulfilment_status).toBe('CANCELLED');
    expect(cancelled.cancelled_at).toBeInstanceOf(Date);
    expect(cancelled.cancel_reason).toBe('Buyer changed their mind');
    expect(cancelled.cancelled_by).toBe('ADMIN:ops@duncit.com');
    expect(await stockOf(product._id)).toBe(before + 2);
    const refunded = await PaymentModel.findById(payment._id).orFail();
    expect(refunded.status).toBe('REFUNDED');
    expect(refunded.metadata).toMatchObject({ refunded_amount: order.total, refund_initiated_by: 'STORE_ADMIN_CANCEL' });
  });

  it('keeps the order when ShipRocket will not cancel the shipment', async () => {
    await seedShiprocketAccount();
    const product = await seedProduct();
    const { order } = await seedPaidOrder({ product });
    await createShipment(order._id);
    sr.failNext('POST', '/orders/cancel', 400);

    await expect(
      storeOrderService.adminCancel(opsCtx, String(order._id), 'Buyer changed their mind', 'ORIGINAL')
    ).rejects.toThrow('The courier could not cancel this shipment — please contact support');

    const kept = await reloadOrder(order._id);
    expect(kept.fulfilment_status).toBe('PICKUP_SCHEDULED');
    expect(kept.cancelled_at).toBeNull();
    expect(await stockOf(product._id)).toBe(40);
  });
});
