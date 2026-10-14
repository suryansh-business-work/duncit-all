jest.mock('@modules/commerce/shiprocket/shiprocket.returns', () => ({ bookReturnPickup: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../store.emails', () => ({ mailReturnUpdate: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@modules/finance/payment/payment.refundRecord', () => ({
  creditCoinsBack: jest.fn().mockResolvedValue(undefined),
  recordPaymentRefund: jest.fn().mockResolvedValue(undefined),
}));

import { Types } from 'mongoose';
import type { GraphQLContext } from '@context';
import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { bookReturnPickup } from '@modules/commerce/shiprocket/shiprocket.returns';
import { creditCoinsBack, recordPaymentRefund } from '@modules/finance/payment/payment.refundRecord';
import { mailReturnUpdate } from '../../store.emails';
import { StoreReturnModel } from '../../storeReturn.model';
import { StoreProductModel } from '../../storeProduct.model';
import { StoreSettingsModel } from '../../storeSettings.model';
import { storeReturnService as svc } from '../../store.return.service';

/**
 * Pet-store returns: only the buyer (or a guest holding the order's key) may
 * ask, only inside the window and only for what is still returnable; staff
 * move it along a fixed path and the refund is recorded exactly once.
 */

const DAY = 86_400_000;
let seq = 0;
const buyerId = new Types.ObjectId();
const buyer = { user: { id: String(buyerId), email: 'buyer@x.com', roles: [] } } as unknown as GraphQLContext;
const staff = { user: { id: 'staff-1', email: 'staff@x.com', roles: ['ECOMM_STORE_MANAGER'] } } as unknown as GraphQLContext;
const guest = { user: null } as unknown as GraphQLContext;
const KEY = 'guest-access-key-1234567890';

async function seedPayment(userId: Types.ObjectId | null) {
  seq += 1;
  return PaymentModel.create({
    payment_id: `pay-ret-${seq}`,
    user_id: userId,
    user_name: 'Buyer',
    user_email: 'buyer@x.com',
    subtotal: 500,
    total: 500,
    target_type: 'PRODUCT',
    gateway: 'COD',
  });
}

async function seedOrder(over: Record<string, unknown> = {}, productId = new Types.ObjectId()) {
  seq += 1;
  const payment = await seedPayment((over.buyer_id as Types.ObjectId | null | undefined) === null ? null : buyerId);
  const order = await ProductOrderModel.create({
    order_no: `PET-${seq}`,
    channel: 'PET_STORE',
    payment_id: payment._id,
    buyer_id: buyerId,
    buyer_name: 'Buyer',
    buyer_email: 'buyer@x.com',
    items_total: 500,
    discount_total: 50,
    total: 450,
    fulfilment_method: 'SHIP',
    fulfilment_status: 'DELIVERED',
    access_key: KEY,
    line_items: [{ product_id: productId, name: 'Leash', qty: 3, unit_cost: 100, gross: 300 }, { product_id: new Types.ObjectId(), variant_id: 'L', name: 'Bowl', qty: 1, unit_cost: 200, gross: 200 }],
    ...over,
  });
  return { order, payment };
}

const line = (order: { line_items: { product_id: unknown; variant_id?: string }[] }, i: number, qty: number) => ({
  product_id: String(order.line_items[i].product_id),
  variant_id: order.line_items[i].variant_id ?? '',
  qty,
});

beforeEach(async () => {
  await StoreSettingsModel.create({ singleton_key: 'store', returns_enabled: true, return_window_days: 7 });
});

describe('request', () => {
  it('estimates the refund as the goods less their share of the order discount', async () => {
    const { order } = await seedOrder();
    const out = await svc.request(buyer, { order_no: order.order_no, items: [line(order, 0, 2)], reason: ' Too small ', comments: ' fit ', images: ['https://cdn.test/a.jpg', 'javascript:x', 'ftp://x'] });

    // 2 x 100 = 200 goods; discount 50 of 500 items => 10% => 20 off.
    expect(out).toMatchObject({ status: 'REQUESTED', refund_amount: 180, reason: 'Too small', comments: 'fit', is_guest: false, refund_mode: 'ORIGINAL' });
    expect(out.images).toEqual(['https://cdn.test/a.jpg']);
    expect(out.items[0]).toMatchObject({ name: 'Leash', qty: 2, unit_price: 100 });
    expect(out.events[0]).toMatchObject({ status: 'REQUESTED', by: 'CUSTOMER' });
    expect(out.next_statuses).toEqual(['APPROVED', 'REJECTED']);
  });

  it('lets a guest return with the order’s key, and nobody else', async () => {
    const { order } = await seedOrder({ buyer_id: null });
    const items = [line(order, 0, 1)];
    const out = await svc.request(guest, { order_no: order.order_no, access_key: KEY, items, reason: 'x' });
    expect(out.is_guest).toBe(true);

    await expect(svc.request(guest, { order_no: order.order_no, access_key: 'wrong-key-wrong-key-wrong', items, reason: 'x' })).rejects.toMatchObject({
      extensions: { code: 'FORBIDDEN' },
    });
    await expect(svc.request(guest, { order_no: order.order_no, items, reason: 'x' })).rejects.toThrow('not yours to return');
    await expect(svc.request(buyer, { order_no: order.order_no, items, reason: 'x' })).rejects.toThrow('not yours to return');
  });

  it('refuses when returns are off, the order is unknown, not delivered, or past its window', async () => {
    const { order } = await seedOrder();
    const items = [line(order, 0, 1)];
    await expect(svc.request(buyer, { order_no: 'NOPE', items, reason: 'x' })).rejects.toThrow('Order not found');

    const pending = await seedOrder({ fulfilment_status: 'AWAITING_SHIPMENT' });
    await expect(svc.request(buyer, { order_no: pending.order.order_no, items, reason: 'x' })).rejects.toThrow('once the order is delivered');

    await ProductOrderModel.updateOne(
      { _id: order._id },
      { tracking_events: [{ status: 'Delivered', code: 7, location: '', note: '', at: new Date(Date.now() - 30 * DAY) }] }
    );
    await expect(svc.request(buyer, { order_no: order.order_no, items, reason: 'x' })).rejects.toThrow('return window for this order has closed');

    await StoreSettingsModel.updateOne({ singleton_key: 'store' }, { returns_enabled: false });
    await expect(svc.request(buyer, { order_no: order.order_no, items, reason: 'x' })).rejects.toThrow('Returns are not accepted right now');
  });

  it('refuses a blank reason, no items, unknown items, too many units and a non-returnable product', async () => {
    const productId = new Types.ObjectId();
    const { order } = await seedOrder({}, productId);
    await StoreProductModel.create({ _id: productId, product_name: 'Leash', sku: 'RET-L', store: { returnable: false } });
    const ask = (items: unknown[], reason = 'x') => svc.request(buyer, { order_no: order.order_no, items: items as never, reason });

    await expect(ask([line(order, 1, 1)], '  ')).rejects.toThrow('Choose why you are returning it');
    await expect(ask([line(order, 1, 0)])).rejects.toThrow('Choose at least one item to return');
    await expect(ask([{ product_id: String(new Types.ObjectId()), qty: 1 }])).rejects.toThrow('An item is not part of this order');
    await expect(ask([line(order, 1, 2)])).rejects.toThrow('Only 1 of Bowl can still be returned');
    await expect(ask([line(order, 0, 1)])).rejects.toThrow('Leash cannot be returned');
    expect(await StoreReturnModel.countDocuments()).toBe(0);
  });

  it('counts units already on a live return, but not a rejected one', async () => {
    const { order } = await seedOrder();
    const first = await svc.request(buyer, { order_no: order.order_no, items: [line(order, 0, 3)], reason: 'x' });
    await expect(svc.request(buyer, { order_no: order.order_no, items: [line(order, 0, 1)], reason: 'x' })).rejects.toThrow('Only 0 of Leash');

    await svc.update(staff, first.id, { status: 'REJECTED' });
    const again = await svc.request(buyer, { order_no: order.order_no, items: [line(order, 0, 3)], reason: 'x' });
    expect(again.items[0].qty).toBe(3);
  });

  it('estimates no discount when the order carried none or had no goods value', async () => {
    const { order } = await seedOrder({ items_total: 0, discount_total: 0 });
    const out = await svc.request(buyer, { order_no: order.order_no, items: [line(order, 0, 1)], reason: 'x' });
    expect(out.refund_amount).toBe(100);
  });
});

describe('reading', () => {
  it('lists the buyer’s own returns, one order’s returns, a page for staff and a single one', async () => {
    const { order } = await seedOrder();
    const other = await seedOrder();
    const mine = await svc.request(buyer, { order_no: order.order_no, items: [line(order, 0, 1)], reason: 'x' });
    await svc.request(buyer, { order_no: other.order.order_no, items: [line(other.order, 0, 1)], reason: 'y' });

    expect(await svc.mine(buyer)).toHaveLength(2);
    expect((await svc.mine({ user: { id: String(new Types.ObjectId()), roles: [] } } as never))).toEqual([]);
    expect((await svc.forOrder(String(order._id))).map((r) => r.id)).toEqual([mine.id]);
    const page = await svc.table({ search: mine.return_no });
    expect(page.rows.map((r) => r.id)).toEqual([mine.id]);
    expect((await svc.get(mine.id)).return_no).toBe(mine.return_no);
    await expect(svc.get(String(new Types.ObjectId()))).rejects.toThrow('Return not found');
    await expect(svc.table()).resolves.toMatchObject({ total: 2 });
  });
});

describe('update', () => {
  const requested = async () => {
    const { order, payment } = await seedOrder();
    const ret = await svc.request(buyer, { order_no: order.order_no, items: [line(order, 0, 2)], reason: 'x' });
    return { order, payment, ret };
  };
  const walk = async (id: string, ...steps: Parameters<typeof svc.update>[2][]) => {
    for (const s of steps) await svc.update(staff, id, s);
  };

  it('shows the courier leg’s tracking events with the return', async () => {
    const { ret } = await requested();
    const at = new Date('2026-09-01T10:00:00.000Z');
    await StoreReturnModel.updateOne(
      { _id: ret.id },
      { 'pickup.awb': 'AWB1', 'pickup.events': [{ status: 'PICKED', location: 'Pune', note: 'ok', at }] }
    );
    const out = await svc.get(ret.id);
    expect(out.pickup.awb).toBe('AWB1');
    expect(out.pickup.events).toEqual([{ status: 'PICKED', location: 'Pune', note: 'ok', at: at.toISOString() }]);
  });

  it('refuses an unknown return, an unknown status and a move off the path', async () => {
    const { ret } = await requested();
    await expect(svc.update(staff, String(new Types.ObjectId()), { status: 'APPROVED' })).rejects.toThrow('Return not found');
    await expect(svc.update(staff, ret.id, { status: 'DONE' as never })).rejects.toThrow('Unknown return status');
    await expect(svc.update(staff, ret.id, { status: 'REFUNDED' })).rejects.toThrow('A requested return cannot move to refunded');
  });

  it('books the reverse pickup on approval, emails the buyer, and signs the event with the operator', async () => {
    const { ret } = await requested();
    const out = await svc.update(staff, ret.id, { status: 'APPROVED', note: ' ok ' });
    expect(out.status).toBe('APPROVED');
    expect(out.admin_note).toBe('ok');
    expect(out.events.at(-1)).toMatchObject({ status: 'APPROVED', by: 'staff@x.com', note: 'ok' });
    expect(bookReturnPickup).toHaveBeenCalledTimes(1);
    expect(mailReturnUpdate).toHaveBeenCalledWith(expect.anything(), expect.anything(), '₹180.00');
  });

  it('signs by id when the operator has no email, and still moves on when the order has been deleted', async () => {
    const { order, ret } = await requested();
    await ProductOrderModel.deleteOne({ _id: order._id });
    const noEmail = { user: { id: 'staff-2', roles: ['ECOMM_STORE_MANAGER'] } } as unknown as GraphQLContext;
    const out = await svc.update(noEmail, ret.id, { status: 'APPROVED' });
    expect(out.events.at(-1)?.by).toBe('staff-2');
    expect(mailReturnUpdate).toHaveBeenCalledWith(expect.anything(), null, '₹180.00');
  });

  it('puts the goods back in stock once, on receipt', async () => {
    const productId = new Types.ObjectId();
    const { order } = await seedOrder({}, productId);
    await StoreProductModel.create({ _id: productId, product_name: 'Leash', sku: 'RET-S', inventory_count: 5 });
    const ret = await svc.request(buyer, { order_no: order.order_no, items: [line(order, 0, 2)], reason: 'x' });
    await walk(ret.id, { status: 'APPROVED' }, { status: 'RECEIVED', restock: true });

    expect((await StoreProductModel.findById(productId))?.inventory_count).toBe(7);
    expect((await svc.get(ret.id)).restocked).toBe(true);
  });

  it('refunds to the original payment through Finance with the amount staff set', async () => {
    const { ret, payment } = await requested();
    await walk(ret.id, { status: 'APPROVED' }, { status: 'RECEIVED' });

    const out = await svc.update(staff, ret.id, { status: 'REFUNDED', refund_amount: 150.456, refund_mode: 'ORIGINAL' });

    expect(out).toMatchObject({ status: 'REFUNDED', refund_amount: 150.46, refund_mode: 'ORIGINAL' });
    expect(out.refunded_at).toEqual(expect.any(String));
    expect(recordPaymentRefund).toHaveBeenCalledWith(expect.objectContaining({ _id: payment._id }), 150.46, expect.stringContaining(ret.return_no), 'STORE_RETURN');
    expect(creditCoinsBack).not.toHaveBeenCalled();
  });

  it('refunds as coins, whole coins only, for a signed-in buyer', async () => {
    const { ret } = await requested();
    await walk(ret.id, { status: 'APPROVED' }, { status: 'RECEIVED' });
    await svc.update(staff, ret.id, { status: 'REFUNDED', refund_mode: 'COINS' });
    expect(creditCoinsBack).toHaveBeenCalledWith(expect.anything(), 180, `store-return:${ret.id}`, expect.any(String));
    expect(recordPaymentRefund).not.toHaveBeenCalled();
  });

  it('refuses a coin refund on a guest order, a zero amount, and an order whose payment is gone — leaving the return as it was', async () => {
    const guestOrder = await seedOrder({ buyer_id: null });
    const g = await svc.request(guest, { order_no: guestOrder.order.order_no, access_key: KEY, items: [line(guestOrder.order, 0, 1)], reason: 'x' });
    await walk(g.id, { status: 'APPROVED' }, { status: 'RECEIVED' });
    await expect(svc.update(staff, g.id, { status: 'REFUNDED', refund_mode: 'COINS' })).rejects.toThrow('only be refunded to the original payment');
    await expect(svc.update(staff, g.id, { status: 'REFUNDED', refund_amount: -5 })).rejects.toThrow('Set the refund amount first');
    await expect(svc.update(staff, g.id, { status: 'REFUNDED', refund_amount: 0 })).rejects.toThrow('Set the refund amount first');

    await PaymentModel.deleteOne({ _id: guestOrder.payment._id });
    await expect(svc.update(staff, g.id, { status: 'REFUNDED' })).rejects.toThrow('payment behind this order could not be found');
    expect((await svc.get(g.id)).status).toBe('RECEIVED');
    expect(recordPaymentRefund).not.toHaveBeenCalled();
  });

  it('closes a refunded or rejected return, and a closed one goes nowhere', async () => {
    const { ret } = await requested();
    await walk(ret.id, { status: 'REJECTED' }, { status: 'CLOSED' });
    expect((await svc.get(ret.id)).next_statuses).toEqual([]);
    await expect(svc.update(staff, ret.id, { status: 'APPROVED' })).rejects.toThrow('A closed return cannot move to approved');
  });
});
