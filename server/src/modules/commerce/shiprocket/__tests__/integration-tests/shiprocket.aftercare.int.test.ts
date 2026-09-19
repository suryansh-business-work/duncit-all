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

import { PaymentModel } from '@modules/finance/payment/payment.model';
import { StoreReturnModel } from '@modules/commerce/store/storeReturn.model';
import { storeReturnService } from '@modules/commerce/store/store.return.service';
import { mailReturnUpdate } from '@modules/commerce/store/store.emails';
import { answerNdr } from '../../shiprocket.ops';
import { refreshTracking, STALE_AFTER_MS, sweepStaleTracking } from '../../shiprocket.tracking';
import { installFakeShiprocket, seedShiprocketAccount, type FakeShiprocket } from './fake-shiprocket';
import { BUYER, opsCtx, reloadOrder, seedPaidOrder, seedProduct, seedWarehouse, stockOf } from './order-fixtures';

/**
 * What happens after a parcel leaves: a buyer's return (reverse pickup back
 * to the warehouse) and a failed delivery that the operator sends back to
 * origin. The real tracking, returns and store settlement code run against a
 * fake ShipRocket.
 */
let sr: FakeShiprocket;

beforeEach(() => {
  sr = installFakeShiprocket();
});

afterEach(() => {
  sr.restore();
});

const FORWARD_AWB = '14336300001';

/** An order ShipRocket already carries, with its AWB. */
async function shippedOrder(status: 'DELIVERED' | 'OUT_FOR_DELIVERY') {
  const product = await seedProduct();
  const { order, payment } = await seedPaidOrder({
    product,
    over: {
      fulfilment_status: status,
      shiprocket: { order_id: '7300001', shipment_id: '6300001', awb: FORWARD_AWB, courier_name: 'Delhivery Surface' },
    },
  });
  return { product, order, payment };
}

describe('a buyer return', () => {
  async function requestedReturn() {
    await seedShiprocketAccount();
    await seedWarehouse();
    const { product, order, payment } = await shippedOrder('DELIVERED');
    const ret = await StoreReturnModel.create({
      return_no: 'RET-4F2A9C',
      order_id: order._id,
      order_no: order.order_no,
      payment_id: payment._id,
      buyer_name: BUYER.name,
      buyer_email: BUYER.email,
      items: [{ product_id: product._id, name: product.product_name, qty: 1, unit_cost: 349 }],
      reason: 'Pack arrived torn',
      refund_amount: 349,
    });
    return { product, order, ret };
  }

  it('books a reverse pickup on approval, and the parcel reaching the warehouse marks the return RECEIVED', async () => {
    const { product, ret } = await requestedReturn();

    await storeReturnService.update(opsCtx, String(ret._id), { status: 'APPROVED', note: 'Approved — photos show the tear' });

    const booked = await StoreReturnModel.findById(ret._id).orFail();
    expect(booked.status).toBe('PICKUP_SCHEDULED');
    expect(booked.pickup).toMatchObject({
      sr_order_id: '7400001',
      shipment_id: '6400001',
      awb: '59236400001',
      courier_name: 'Delhivery Surface',
      status: 'PICKUP_SCHEDULED',
      last_error: '',
    });
    const payload = sr.last('POST', '/orders/create/return')?.body;
    expect(payload).toMatchObject({
      order_id: 'RET-4F2A9C',
      pickup_customer_name: 'Asha',
      pickup_last_name: 'Rani Verma',
      pickup_address: 'Flat 402, Tower C, DLF Park Place',
      pickup_city: 'Gurugram',
      pickup_pincode: '122002',
      pickup_phone: '9876543210',
      shipping_customer_name: 'Duncit Warehouse Noida',
      shipping_address: 'B-14, Sector 63',
      shipping_city: 'Noida',
      shipping_pincode: '201301',
      shipping_phone: '9811022334',
      payment_method: 'Prepaid',
      sub_total: 349,
      weight: 0.25,
      length: 20,
      breadth: 14,
      height: 5,
    });
    expect(payload?.order_items).toEqual([
      { name: 'Drools Chicken Jerky 200g', sku: product.sku, units: 1, selling_price: 349, hsn: '2309' },
    ]);
    expect(sr.last('POST', '/courier/assign/awb')?.body).toEqual({ shipment_id: '6400001', is_return: 1 });

    // The webhook never came: the sweep pulls tracking for the quiet return.
    await StoreReturnModel.updateOne(
      { _id: ret._id },
      { $set: { 'pickup.last_synced_at': new Date(Date.now() - STALE_AFTER_MS - 60_000) } }
    );
    sr.state.trackStatus = 'DELIVERED';
    sr.state.trackActivities = [
      { date: '2026-09-26 15:20:00', activity: 'Delivered to warehouse', location: 'Noida_Sec63_Hub', 'sr-status-label': 'DELIVERED' },
    ];

    expect(await sweepStaleTracking()).toBe(1);

    const received = await StoreReturnModel.findById(ret._id).orFail();
    expect(sr.last('GET', /^\/courier\/track\/awb\//)?.path).toBe('/courier/track/awb/59236400001');
    expect(received.status).toBe('RECEIVED');
    expect(received.pickup.status).toBe('DELIVERED');
    expect(received.pickup.events.map((e) => e.status)).toEqual(['BOOKED', 'PICKUP_SCHEDULED', 'DELIVERED']);
    expect(received.events.map((e) => e.status)).toEqual(['APPROVED', 'PICKUP_SCHEDULED', 'RECEIVED']);
    expect(jest.mocked(mailReturnUpdate)).toHaveBeenLastCalledWith(
      expect.objectContaining({ return_no: 'RET-4F2A9C', status: 'RECEIVED' }),
      expect.objectContaining({ order_no: expect.any(String) }),
      '₹349.00'
    );
  });

  it('leaves an approved return FAILED with the courier’s reason when the pickup cannot be booked', async () => {
    const { ret } = await requestedReturn();
    sr.failNext('POST', '/orders/create/return', 422);

    await storeReturnService.update(opsCtx, String(ret._id), { status: 'APPROVED' });

    const failed = await StoreReturnModel.findById(ret._id).orFail();
    expect(failed.status).toBe('APPROVED');
    expect(failed.pickup.status).toBe('FAILED');
    expect(failed.pickup.last_error).toBe('ShipRocket: ShipRocket answered 422');
    expect(sr.count('POST', '/courier/assign/awb')).toBe(0);
  });
});

describe('a failed delivery sent back to origin', () => {
  const scan = (label: string, activity: string, date: string) => ({
    date,
    activity,
    location: 'Gurugram_Sec57_DC',
    'sr-status-label': label,
  });

  it('raises an NDR, answers it with a return, and settles the order when it is back at the warehouse', async () => {
    await seedShiprocketAccount();
    const { product, order, payment } = await shippedOrder('OUT_FOR_DELIVERY');

    sr.state.trackStatus = 'UNDELIVERED';
    sr.state.trackActivities = [scan('UNDELIVERED', 'Consignee unavailable, door locked', '2026-09-22 19:10:00')];
    await refreshTracking(await reloadOrder(order._id));

    const ndr = await reloadOrder(order._id);
    expect(ndr.fulfilment_status).toBe('NDR');
    expect(ndr.shiprocket.alert).toBe('NDR');
    expect(ndr.shiprocket.alert_message).toBe('Consignee unavailable, door locked');

    await answerNdr(ndr, 'return', '');

    expect(sr.last('POST', `/ndr/${FORWARD_AWB}/action`)?.body).toEqual({ action: 'return', comments: 'Return to origin' });
    const answered = await reloadOrder(order._id);
    expect(answered.shiprocket).toMatchObject({ ndr_action: 'return', alert: '', alert_message: '' });
    expect(answered.shiprocket.ndr_actioned_at).toBeInstanceOf(Date);

    sr.state.trackStatus = 'RTO INITIATED';
    sr.state.trackActivities = [scan('RTO INITIATED', 'Return to origin initiated', '2026-09-23 10:00:00')];
    await refreshTracking(answered);
    expect((await reloadOrder(order._id)).fulfilment_status).toBe('RTO');

    sr.state.trackStatus = 'RTO DELIVERED';
    sr.state.trackActivities = [scan('RTO DELIVERED', 'Returned to shipper', '2026-09-26 12:30:00')];
    await refreshTracking(await reloadOrder(order._id));

    const back = await reloadOrder(order._id);
    expect(back.fulfilment_status).toBe('RTO_DELIVERED');
    expect(back.cancelled_at).toBeInstanceOf(Date);
    expect(back.cancelled_by).toBe('COURIER_RTO');
    expect(await stockOf(product._id)).toBe(42);
    const refunded = await PaymentModel.findById(payment._id).orFail();
    expect(refunded.status).toBe('REFUNDED');
    expect(refunded.metadata).toMatchObject({ refunded_amount: order.total });
    // A late scan cannot pull the settled order back into transit.
    sr.state.trackStatus = 'IN TRANSIT';
    await refreshTracking(back);
    expect((await reloadOrder(order._id)).fulfilment_status).toBe('RTO_DELIVERED');
  });

  it('asks the courier to try again and keeps the parcel moving', async () => {
    await seedShiprocketAccount();
    const { order } = await shippedOrder('OUT_FOR_DELIVERY');
    sr.state.trackStatus = 'UNDELIVERED';
    sr.state.trackActivities = [scan('UNDELIVERED', 'Customer asked to deliver tomorrow', '2026-09-22 19:10:00')];
    await refreshTracking(await reloadOrder(order._id));

    await answerNdr(await reloadOrder(order._id), 're-attempt', 'Buyer confirmed: deliver after 6 pm');

    expect(sr.last('POST', `/ndr/${FORWARD_AWB}/action`)?.body).toEqual({
      action: 're-attempt',
      comments: 'Buyer confirmed: deliver after 6 pm',
    });
    sr.state.trackStatus = 'OUT FOR DELIVERY';
    sr.state.trackActivities = [scan('OUT FOR DELIVERY', 'Out for delivery', '2026-09-23 09:00:00')];
    await refreshTracking(await reloadOrder(order._id));
    expect((await reloadOrder(order._id)).fulfilment_status).toBe('OUT_FOR_DELIVERY');
  });

  it('refuses to answer an order that has no failed delivery', async () => {
    await seedShiprocketAccount();
    const { order } = await shippedOrder('OUT_FOR_DELIVERY');
    await expect(answerNdr(order, 'return', '')).rejects.toThrow('This order has no failed delivery to answer');
    expect(sr.count('POST', /^\/ndr\//)).toBe(0);
  });
});
