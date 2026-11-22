jest.mock('@modules/commerce/shiprocket/shiprocket.gateway', () => ({
  createOrderAdhoc: jest.fn(),
  findOrderByChannelId: jest.fn(),
  couriersForOrder: jest.fn(),
  assignAwb: jest.fn(),
  walletBalance: jest.fn(),
  generatePickup: jest.fn(),
  generateLabel: jest.fn(),
  fetchDocumentPdf: jest.fn(),
  trackByAwb: jest.fn(),
  trackByShipment: jest.fn(),
  parseShiprocketDate: (raw: string) => (raw ? new Date(raw) : null),
}));
jest.mock('@modules/commerce/shiprocket/shiprocket.client', () => ({
  ...jest.requireActual('@modules/commerce/shiprocket/shiprocket.client'),
  withShiprocketAccount: (_account: unknown, fn: () => Promise<unknown>) => fn(),
  hasShiprocketAccount: jest.fn().mockResolvedValue(true),
  isSandboxCall: jest.fn().mockResolvedValue(false),
}));
jest.mock('@modules/commerce/shiprocket/shiprocket.account', () => ({
  ...jest.requireActual('@modules/commerce/shiprocket/shiprocket.account'),
  getShiprocketAccount: jest.fn().mockResolvedValue({ pickupLocation: 'Duncit HQ' }),
}));
jest.mock('@services/notify/notify.service', () => ({
  notifyEvent: jest.fn().mockResolvedValue({ wa: { status: 'SENT' }, mail: null }),
}));
jest.mock('@config/url-configs', () => ({
  getUrlConfigs: jest.fn().mockResolvedValue({ appUrl: 'https://app.example.test' }),
}));

import { Types } from 'mongoose';
import * as gateway from '@modules/commerce/shiprocket/shiprocket.gateway';
import { applyWebhookEvent } from '@modules/commerce/shiprocket/shiprocket.tracking';
import { notifyEvent } from '@services/notify/notify.service';
import { GiftCardOrderModel, type IGiftCardOrder } from '../../giftCardOrder.model';
import { GiftCardActivityModel } from '../../giftCardActivity.model';
import {
  applyGiftCardTracking,
  bookGiftCardShipment,
  giftCardOrderTracking,
} from '../../giftCardOrder.shipment';

/**
 * A printed gift card order's courier leg: booked by hand once printed, resumed
 * without double-booking, held (not failed) on a low wallet, and tracked
 * forward-only from ShipRocket's webhook and the stale sweep.
 */

const sr = jest.mocked(gateway);
const mockNotify = jest.mocked(notifyEvent);
const admin = new Types.ObjectId().toHexString();
let seq = 0;

const COURIERS = [
  { courier_company_id: '10', courier_name: 'BlueDart', rate: 120, etd: '2 days', cod: true, rating: 4, recommended: true },
  { courier_company_id: '20', courier_name: 'Delhivery', rate: 80, etd: '3 days', cod: true, rating: 4, recommended: false },
];

const seedOrder = (over: Partial<Record<keyof IGiftCardOrder, unknown>> = {}) =>
  GiftCardOrderModel.create({
    order_no: `GC-TEST${String(++seq).padStart(5, '0')}`,
    user_id: new Types.ObjectId(),
    buyer_name: 'Aarav Shah',
    buyer_email: 'aarav@x.com',
    payment_id: `pay_ship_${seq}`,
    payment_doc_id: new Types.ObjectId(),
    delivery_mode: 'PHYSICAL',
    design_name: 'Classic',
    amount: 500,
    quantity: 2,
    cards_value: 1000,
    shipping_fee: 99,
    total: 1099,
    currency_symbol: '₹',
    payment_status: 'PAID',
    fulfilment_status: 'PRINTED',
    shipping_address: {
      name: 'Priya Nair',
      phone: '+91 98765 43210',
      line1: '12 MG Road, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038',
      country: 'India',
    },
    ...over,
  });

const track = (current_status: string, activities: { status: string; date: string; note?: string }[] = []) => ({
  current_status,
  status_id: 0,
  etd: '',
  activities: activities.map((a) => ({ location: 'Bengaluru', note: a.note ?? '', ...a })),
});

beforeAll(async () => {
  await GiftCardOrderModel.init();
});

beforeEach(() => {
  jest.clearAllMocks();
  sr.findOrderByChannelId.mockResolvedValue(null);
  sr.createOrderAdhoc.mockResolvedValue({ order_id: 'SR-1', shipment_id: 'SH-1', status: 'NEW' });
  sr.couriersForOrder.mockResolvedValue(COURIERS);
  sr.walletBalance.mockResolvedValue(5000);
  sr.assignAwb.mockResolvedValue({ awb: 'AWB123', courier_name: 'Delhivery', courier_company_id: '20', label_url: 'https://sr.example/label.pdf' });
  sr.generatePickup.mockResolvedValue({ token: 'PK-1', scheduled_date: '2026-11-25' });
});

describe('bookGiftCardShipment', () => {
  it('books a printed order end to end on the cheapest courier', async () => {
    const order = await seedOrder();
    await bookGiftCardShipment(order, admin);

    expect(sr.createOrderAdhoc).toHaveBeenCalledWith(
      expect.objectContaining({
        order_id: order.order_no,
        pickup_location: 'Duncit HQ',
        billing_phone: '9876543210',
        payment_method: 'Prepaid',
        sub_total: 1000,
        order_items: [expect.objectContaining({ name: 'Duncit Gift Card - Classic', units: 2, selling_price: 500 })],
      })
    );
    expect(sr.assignAwb).toHaveBeenCalledWith('SH-1', '20');
    const saved = await GiftCardOrderModel.findById(order._id).lean();
    expect(saved).toMatchObject({
      fulfilment_status: 'PICKUP_SCHEDULED',
      last_error: '',
      shipment: { order_id: 'SR-1', awb: 'AWB123', courier_name: 'Delhivery', pickup_token: 'PK-1', alert: '' },
    });
    expect(await GiftCardActivityModel.countDocuments({ entity_id: order._id, action: 'SHIPMENT_BOOKED' })).toBe(1);
  });

  it('reuses the ShipRocket order a lost answer already created instead of booking twice', async () => {
    const order = await seedOrder({ shipment: { create_attempted_at: new Date() } });
    sr.findOrderByChannelId.mockResolvedValue({ order_id: 'SR-9', shipment_id: 'SH-9', status: 'NEW' });
    await bookGiftCardShipment(order, admin);
    expect(sr.createOrderAdhoc).not.toHaveBeenCalled();
    expect((await GiftCardOrderModel.findById(order._id).lean())?.shipment.order_id).toBe('SR-9');
  });

  it('holds the order with a LOW_WALLET alert instead of failing it', async () => {
    const order = await seedOrder();
    sr.walletBalance.mockResolvedValue(50);
    await bookGiftCardShipment(order, admin);
    expect(sr.assignAwb).not.toHaveBeenCalled();
    const saved = await GiftCardOrderModel.findById(order._id).lean();
    expect(saved).toMatchObject({ fulfilment_status: 'AWAITING_SHIPMENT', shipment: { alert: 'LOW_WALLET', awb: '' } });
  });

  it('records a refusal on the order and in its history, and keeps the steps already done', async () => {
    const order = await seedOrder();
    sr.couriersForOrder.mockResolvedValue([]);
    await expect(bookGiftCardShipment(order, admin)).rejects.toThrow('No courier can carry this parcel right now');
    const saved = await GiftCardOrderModel.findById(order._id).lean();
    expect(saved?.shipment.order_id).toBe('SR-1');
    expect(saved?.last_error).toMatch(/No courier/);
    expect(await GiftCardActivityModel.countDocuments({ entity_id: order._id, action: 'SHIPMENT_FAILED' })).toBe(1);
  });

  it.each([
    [{ fulfilment_status: 'PROCESSING' }, 'Mark the cards printed before booking the courier'],
    [{ payment_status: 'PENDING' }, 'This order has not been paid'],
    [{ delivery_mode: 'DIGITAL' }, 'Only a physical order ships'],
    [{ fulfilment_status: 'SHIPPED' }, 'This order is already with the courier'],
  ])('refuses %j without calling ShipRocket', async (over, message) => {
    const order = await seedOrder(over);
    await expect(bookGiftCardShipment(order, admin)).rejects.toThrow(message);
    expect(sr.createOrderAdhoc).not.toHaveBeenCalled();
  });
});

describe('applyGiftCardTracking', () => {
  it('moves forward only, and stamps the delivery', async () => {
    const order = await seedOrder({ fulfilment_status: 'AWB_ASSIGNED' });
    expect(applyGiftCardTracking(order, track('SHIPPED', [{ status: 'Picked up', date: '2026-11-24T10:00:00Z' }]))).toBe(true);
    expect(applyGiftCardTracking(order, track('PICKUP SCHEDULED'))).toBe(false);
    expect(order.fulfilment_status).toBe('SHIPPED');
    expect(applyGiftCardTracking(order, track('DELIVERED', [{ status: 'Delivered', date: '2026-11-26T09:00:00Z' }]))).toBe(true);
    expect(order.delivered_at).toBeInstanceOf(Date);
    expect(order.tracking_events.map((e) => e.status)).toEqual(['Picked up', 'Delivered']);
  });

  it('raises an NDR alert for a failed attempt and clears it when the parcel moves on', async () => {
    const order = await seedOrder({ fulfilment_status: 'SHIPPED' });
    applyGiftCardTracking(order, track('UNDELIVERED', [{ status: 'Undelivered', date: '2026-11-25T18:00:00Z', note: 'Customer unavailable' }]));
    expect(order.fulfilment_status).toBe('NDR');
    expect(order.shipment.alert).toBe('NDR');
    applyGiftCardTracking(order, track('OUT FOR DELIVERY'));
    expect(order.fulfilment_status).toBe('OUT_FOR_DELIVERY');
    expect(order.shipment.alert).toBe('');
  });

  it('keeps the same scan once when the courier sends its whole history again', async () => {
    const order = await seedOrder({ fulfilment_status: 'SHIPPED' });
    const scans = [{ status: 'In transit', date: '2026-11-24T12:00:00Z' }];
    applyGiftCardTracking(order, track('IN TRANSIT', scans));
    applyGiftCardTracking(order, track('IN TRANSIT', scans));
    expect(order.tracking_events).toHaveLength(1);
  });
});

describe('the courier feed', () => {
  it('routes a webhook to the gift card order by AWB and tells the buyer it shipped', async () => {
    const order = await seedOrder({ fulfilment_status: 'PICKUP_SCHEDULED', shipment: { awb: 'AWB777', order_id: 'SR-7', courier_name: 'Delhivery' } });
    expect(await applyWebhookEvent({ awb: 'AWB777', current_status: 'SHIPPED', scans: [] })).toBe(`gift card order ${order.order_no}`);
    expect((await GiftCardOrderModel.findById(order._id).lean())?.fulfilment_status).toBe('SHIPPED');
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'GIFT_CARD_ORDER_SHIPPED',
        // No account behind this order in the test: the name comes off the order itself.
        params: ['Aarav Shah', order.order_no, 'Delhivery', 'AWB777', `https://app.example.test/gift-cards/orders/${order.order_no}`],
      })
    );
    expect(await GiftCardActivityModel.countDocuments({ entity_id: order._id, action: 'STATUS_CHANGED' })).toBe(1);
  });

  it('finds the order by its GC number when the webhook carries no AWB yet', async () => {
    const order = await seedOrder({ fulfilment_status: 'AWAITING_SHIPMENT', shipment: { order_id: 'SR-8' } });
    expect(await giftCardOrderTracking.webhook('', order.order_no, track('AWB ASSIGNED'))).toBe(`gift card order ${order.order_no}`);
    expect(await giftCardOrderTracking.webhook('NOPE', 'ord_x1', track('SHIPPED'))).toBe('');
  });

  it('sweeps only booked, open shipments the webhook has been quiet on', async () => {
    const stale = await seedOrder({ fulfilment_status: 'SHIPPED', shipment: { awb: 'AWB-STALE', last_synced_at: new Date(Date.now() - 7 * 3_600_000) } });
    await seedOrder({ fulfilment_status: 'SHIPPED', shipment: { awb: 'AWB-FRESH', last_synced_at: new Date() } });
    await seedOrder({ fulfilment_status: 'DELIVERED', shipment: { awb: 'AWB-DONE', last_synced_at: null } });
    sr.trackByAwb.mockResolvedValue(track('OUT FOR DELIVERY'));

    const pulled = await giftCardOrderTracking.sweep(new Date(Date.now() - 6 * 3_600_000), 50);

    expect(pulled).toBe(1);
    expect(sr.trackByAwb).toHaveBeenCalledWith('AWB-STALE');
    expect((await GiftCardOrderModel.findById(stale._id).lean())?.fulfilment_status).toBe('OUT_FOR_DELIVERY');
  });
});
