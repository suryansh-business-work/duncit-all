jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn(), error: jest.fn(), info: jest.fn() } } }));
jest.mock('@modules/commerce/productOrder/productOrder.notify', () => ({ notifyReturnUpdate: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@modules/commerce/productOrder/productOrder.refund', () => ({
  issueRefund: jest.fn(async (target: { refund: { status: string } }) => {
    target.refund.status = 'PROCESSED';
  }),
  retryRefund: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../podShopReturn.pickup', () => ({ bookPodShopReturnPickup: jest.fn().mockResolvedValue(undefined) }));

import { Types } from 'mongoose';
import { notifyReturnUpdate } from '@modules/commerce/productOrder/productOrder.notify';
import { issueRefund, retryRefund } from '@modules/commerce/productOrder/productOrder.refund';
import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';
import { bookPodShopReturnPickup } from '../../podShopReturn.pickup';
import { PodShopReturnModel } from '../../podShopReturn.model';
import { podShopReturnService as svc, type ReturnActor } from '../../podShopReturn.service';

/**
 * A pod-shop return end to end against a real database: what a buyer may send
 * back, who may decide it (staff, or only the brand's owner), the reverse
 * pickup, and the refund that must run exactly once.
 */

const mockNotify = notifyReturnUpdate as jest.Mock;
const mockIssue = issueRefund as jest.Mock;
const mockRetry = retryRefund as jest.Mock;
const mockPickup = bookPodShopReturnPickup as jest.Mock;
const staff: ReturnActor = { kind: 'STAFF', userId: new Types.ObjectId().toHexString(), label: 'products@x.com' };
let seq = 0;

const brandActor = (userId: string): ReturnActor => ({ kind: 'BRAND', userId, label: 'owner@x.com' });
const nextId = () => new Types.ObjectId();

async function seedOrder(over: Record<string, unknown> = {}, lines?: Record<string, unknown>[]) {
  seq += 1;
  const buyer = nextId();
  const order = await ProductOrderModel.create({
    order_no: `ord_ret_${seq}`,
    payment_id: nextId(),
    buyer_id: buyer,
    buyer_name: 'Asha',
    buyer_email: 'asha@x.com',
    channel: 'POD_SHOP',
    fulfilment_method: 'SHIP',
    fulfilment_status: 'DELIVERED',
    items_total: 400,
    total: 400,
    line_items: lines ?? [
      { product_id: nextId(), name: 'Leash', qty: 2, unit_cost: 100, gross: 200, brand_id: nextId(), return_window_days: 7 },
      { product_id: nextId(), name: 'Bowl', variant_id: 'L', variant_label: 'Large', qty: 1, unit_cost: 200, gross: 200, brand_id: null, return_window_days: 7 },
    ],
    ...over,
  });
  return { order, buyerId: String(buyer) };
}

const lineOf = (order: { line_items: { product_id: unknown; variant_id?: string }[] }, i: number) => ({
  product_id: String(order.line_items[i].product_id),
  variant_id: order.line_items[i].variant_id ?? '',
});

async function seedReturn(over: Record<string, unknown> = {}) {
  seq += 1;
  const { order } = await seedOrder();
  return PodShopReturnModel.create({
    return_no: `RET-T${seq}`,
    order_id: order._id,
    order_no: order.order_no,
    payment_id: order.payment_id,
    buyer_id: order.buyer_id,
    brand_ids: [nextId()],
    items: [{ product_id: order.line_items[0].product_id, qty: 1, unit_cost: 100 }],
    reason: 'Broken',
    gross: 100,
    ...over,
  });
}

beforeAll(async () => {
  await Promise.all([ProductOrderModel.init(), PodShopReturnModel.init()]);
});

describe('request', () => {
  it('refuses a blank reason', async () => {
    const { order, buyerId } = await seedOrder();
    await expect(
      svc.request(buyerId, { order_id: String(order._id), items: [{ ...lineOf(order, 0), qty: 1 }], reason: '   ' })
    ).rejects.toMatchObject({ message: 'Tell us why you are returning it', extensions: { code: 'BAD_REQUEST' } });
  });

  it('does not reveal an order that is not the buyer’s, not a pod-shop order, or not an id', async () => {
    const { order, buyerId } = await seedOrder();
    const { order: petOrder, buyerId: petBuyer } = await seedOrder({ channel: 'PET_STORE' });
    const ask = (userId: string, orderId: string) =>
      svc.request(userId, { order_id: orderId, items: [{ ...lineOf(order, 0), qty: 1 }], reason: 'Broken' });
    await expect(ask(nextId().toHexString(), String(order._id))).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    await expect(ask(petBuyer, String(petOrder._id))).rejects.toThrow('Order not found');
    await expect(ask(buyerId, 'not-an-id')).rejects.toThrow('Order not found');
  });

  it('refuses a line that is not on the order, and one past its return window', async () => {
    const { order, buyerId } = await seedOrder();
    await expect(
      svc.request(buyerId, { order_id: String(order._id), items: [{ product_id: String(nextId()), qty: 1 }], reason: 'x' })
    ).rejects.toThrow('This item cannot be returned');

    const old = new Date(Date.now() - 30 * 86_400_000);
    await ProductOrderModel.updateOne({ _id: order._id }, { delivered_at: old });
    await expect(
      svc.request(buyerId, { order_id: String(order._id), items: [{ ...lineOf(order, 0), qty: 1 }], reason: 'x' })
    ).rejects.toThrow('The return window for this item has closed, or it is already being returned');
    expect(await PodShopReturnModel.countDocuments({ order_id: order._id })).toBe(0);
  });

  it('refuses a line that cannot be returned at all (no window on the product)', async () => {
    const { order, buyerId } = await seedOrder({}, [
      { product_id: nextId(), name: 'Treats', qty: 1, unit_cost: 50, gross: 50, return_window_days: 0 },
    ]);
    await expect(
      svc.request(buyerId, { order_id: String(order._id), items: [{ ...lineOf(order, 0), qty: 1 }], reason: 'x' })
    ).rejects.toThrow('This item cannot be returned');
  });

  it('refuses when every requested quantity is zero', async () => {
    const { order, buyerId } = await seedOrder();
    await expect(
      svc.request(buyerId, { order_id: String(order._id), items: [{ ...lineOf(order, 0), qty: 0 }], reason: 'x' })
    ).rejects.toThrow('Pick at least one item to return');
  });

  it('files one return per brand, prices it at the order’s unit cost and tells the buyer', async () => {
    const { order, buyerId } = await seedOrder();
    const out = await svc.request(buyerId, {
      order_id: String(order._id),
      items: [
        { ...lineOf(order, 0), qty: 2 },
        { ...lineOf(order, 1), qty: 1 },
      ],
      reason: ` ${'r'.repeat(250)} `,
      comments: null,
    });

    expect(out).toHaveLength(2);
    const withBrand = out.find((r) => r.brand_ids.length === 1);
    const noBrand = out.find((r) => r.brand_ids.length === 0);
    expect(withBrand).toMatchObject({ gross: 200, status: 'REQUESTED', comments: '', buyer_id: buyerId });
    expect(withBrand?.reason).toHaveLength(200);
    expect(withBrand?.items).toEqual([expect.objectContaining({ name: 'Leash', qty: 2, unit_cost: 100 })]);
    expect(noBrand?.items[0]).toMatchObject({ name: 'Bowl', variant_id: 'L', variant_label: 'Large' });
    expect(noBrand?.pickup).toMatchObject({ status: 'NONE', awb: '' });
    expect(noBrand?.refund).toMatchObject({ status: 'NONE', amount: 0, refunded_at: null });
    expect(out[0].return_no).toMatch(/^RET-[0-9A-F]{6}$/);
    expect(mockNotify).toHaveBeenCalledTimes(2);
    expect(mockNotify.mock.calls[0][1]).toMatchObject({ status: 'REQUESTED', status_label: expect.stringContaining('requested') });
  });

  it('stops a second request from taking units already on a live return', async () => {
    const { order, buyerId } = await seedOrder();
    const items = [{ ...lineOf(order, 0), qty: 2 }];
    await svc.request(buyerId, { order_id: String(order._id), items, reason: 'x', comments: ' too big ' });
    await expect(svc.request(buyerId, { order_id: String(order._id), items: [{ ...lineOf(order, 0), qty: 1 }], reason: 'x' })).rejects.toThrow(
      'already being returned'
    );
    expect((await PodShopReturnModel.findOne({ order_id: order._id }))?.comments).toBe('too big');
  });
});

describe('request — the same line asked twice', () => {
  it('adds the entries up, so two halves cannot return more than was bought', async () => {
    const { order, buyerId } = await seedOrder();
    const half = { ...lineOf(order, 0), qty: 2 };
    await expect(
      svc.request(buyerId, { order_id: String(order._id), items: [half, half], reason: 'x' })
    ).rejects.toThrow('already being returned');
    expect(await PodShopReturnModel.countDocuments({ order_id: order._id })).toBe(0);
  });
});

describe('mine and cancelMine', () => {
  it('lists only the buyer’s own returns', async () => {
    const ret = await seedReturn();
    await seedReturn();
    const mine = await svc.mine(String(ret.buyer_id));
    expect(mine.map((r) => r.id)).toEqual([String(ret._id)]);
  });

  it('lets the buyer withdraw a requested return, and only theirs', async () => {
    const ret = await seedReturn();
    await expect(svc.cancelMine(nextId().toHexString(), String(ret._id))).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    await expect(svc.cancelMine(String(ret.buyer_id), 'nope')).rejects.toThrow('Return not found');

    const pub = await svc.cancelMine(String(ret.buyer_id), String(ret._id));
    expect(pub.status).toBe('CANCELLED');
    expect(pub.events.at(-1)).toMatchObject({ status: 'CANCELLED', by: 'Buyer' });
    await expect(svc.cancelMine(String(ret.buyer_id), String(ret._id))).rejects.toThrow('already being processed');
  });
});

describe('table', () => {
  it('shows staff every return, narrowable to a brand, and a partner only their own brands', async () => {
    const owner = nextId();
    const brand = await EcommBrandModel.create({ owner_user_id: owner, brand_name: 'Yonex' });
    const other = nextId();
    const mineRet = await seedReturn({ brand_ids: [brand._id] });
    const otherRet = await seedReturn({ brand_ids: [other] });

    const all = await svc.table(staff, { page_size: 100 });
    const ids = all.rows.map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining([String(mineRet._id), String(otherRet._id)]));
    expect(all.total).toBeGreaterThanOrEqual(2);

    const byBrand = await svc.table(staff, null, String(other));
    expect(byBrand.rows.map((r) => r.id)).toEqual([String(otherRet._id)]);
    const ignored = await svc.table(staff, null, 'not-an-id');
    expect(ignored.total).toBeGreaterThanOrEqual(2);

    const partner = await svc.table(brandActor(String(owner)));
    expect(partner.rows.map((r) => r.id)).toEqual([String(mineRet._id)]);
    const scoped = await svc.table(brandActor(String(owner)), null, String(brand._id));
    expect(scoped.total).toBe(1);
    const foreign = await svc.table(brandActor(String(owner)), null, String(other));
    expect(foreign.rows).toEqual([]);
  });
});

describe('public shape', () => {
  it('shows a settled refund with its time, and a return with no buyer account as null', async () => {
    const refundedAt = new Date('2026-09-01T10:00:00.000Z');
    const ret = await seedReturn({
      buyer_id: null,
      status: 'REFUNDED',
      refund: { status: 'PROCESSED', amount: 90, coins: 10, razorpay_refund_id: 'rfnd_1', refunded_at: refundedAt },
    });
    const { rows } = await svc.table(staff, { search: ret.return_no });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ buyer_id: null, refund: { status: 'PROCESSED', amount: 90, coins: 10, refunded_at: refundedAt.toISOString() } });
  });
});

describe('decide', () => {
  it('hides a return from a partner that does not own its brand, and from a bad id', async () => {
    const ret = await seedReturn();
    await expect(svc.approve(brandActor(nextId().toHexString()), String(ret._id), '')).rejects.toThrow('Return not found');
    await expect(svc.approve(staff, 'nope', '')).rejects.toThrow('Return not found');
    expect((await PodShopReturnModel.findById(ret._id))?.status).toBe('REQUESTED');
  });

  it('approves a shipped order: books the courier pickup, records the note and tells the buyer', async () => {
    const owner = nextId();
    const brand = await EcommBrandModel.create({ owner_user_id: owner, brand_name: 'Yonex' });
    const ret = await seedReturn({ brand_ids: [brand._id] });

    const pub = await svc.approve(brandActor(String(owner)), String(ret._id), 'Looks fine');

    expect(pub).toMatchObject({ status: 'APPROVED', decision_note: 'Looks fine' });
    expect(pub.events.at(-1)).toMatchObject({ status: 'APPROVED', note: 'Looks fine', by: 'owner@x.com' });
    expect(mockPickup).toHaveBeenCalledTimes(1);
    expect(mockNotify.mock.calls.at(-1)?.[1]).toMatchObject({ status: 'APPROVED', note: 'Looks fine' });
    await expect(svc.approve(staff, String(ret._id), '')).rejects.toThrow('Only a requested return can be approved');
  });

  it('approves a pickup order without booking a courier, with the default note', async () => {
    const { order } = await seedOrder({ fulfilment_method: 'PICKUP' });
    const ret = await seedReturn({ order_id: order._id });
    const pub = await svc.approve(staff, String(ret._id), '');
    expect(pub.events.at(-1)?.note).toBe('Approved');
    expect(mockPickup).not.toHaveBeenCalled();
  });

  it('cannot approve once the order behind it is gone', async () => {
    const ret = await seedReturn();
    await ProductOrderModel.deleteOne({ _id: ret.order_id });
    await expect(svc.approve(staff, String(ret._id), '')).rejects.toThrow('The order behind this return is gone');
    expect((await PodShopReturnModel.findById(ret._id))?.status).toBe('REQUESTED');
  });

  it('rejects only with a reason, and only a requested return', async () => {
    const ret = await seedReturn();
    await expect(svc.reject(staff, String(ret._id), '  ')).rejects.toThrow('Tell the buyer why the return is not accepted');

    const pub = await svc.reject(staff, String(ret._id), ' Used item ');
    expect(pub).toMatchObject({ status: 'REJECTED', decision_note: 'Used item' });
    await expect(svc.reject(staff, String(ret._id), 'again')).rejects.toThrow('Only a requested return can be rejected');
  });
});

describe('pickup and receipt', () => {
  it('retries the pickup only for an approved return', async () => {
    const ret = await seedReturn();
    await expect(svc.retryPickup(staff, String(ret._id))).rejects.toThrow('Only an approved return still waiting');

    await PodShopReturnModel.updateOne({ _id: ret._id }, { status: 'APPROVED' });
    const pub = await svc.retryPickup(staff, String(ret._id));
    expect(pub.status).toBe('APPROVED');
    expect(mockPickup).toHaveBeenCalledTimes(1);

    await ProductOrderModel.deleteOne({ _id: ret.order_id });
    await expect(svc.retryPickup(staff, String(ret._id))).rejects.toThrow('The order behind this return is gone');
  });

  it('marks received from approved or pickup-scheduled, never from requested', async () => {
    const ret = await seedReturn();
    await expect(svc.markReceived(staff, String(ret._id))).rejects.toThrow('Only an approved return can be marked received');
    for (const status of ['APPROVED', 'PICKUP_SCHEDULED']) {
      const r = await seedReturn({ status });
      const pub = await svc.markReceived(staff, String(r._id));
      expect(pub.status).toBe('RECEIVED');
      expect(pub.events.at(-1)).toMatchObject({ note: 'Marked received', by: 'products@x.com' });
    }
  });

  it('does not notify when the order has been deleted', async () => {
    const ret = await seedReturn({ status: 'APPROVED' });
    await ProductOrderModel.deleteOne({ _id: ret.order_id });
    await svc.markReceived(staff, String(ret._id));
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('tells the buyer when the courier delivers the return', async () => {
    const ret = await seedReturn({ status: 'PICKUP_SCHEDULED' });
    await svc.onArrived(ret);
    expect(mockNotify).toHaveBeenCalledTimes(1);
  });
});

describe('refund', () => {
  it('refuses until the goods are back', async () => {
    const ret = await seedReturn({ status: 'APPROVED' });
    await expect(svc.refund(staff, String(ret._id))).rejects.toThrow('Refund once the goods are back');
    expect(mockIssue).not.toHaveBeenCalled();
  });

  it('puts the units back on the shelf and refunds exactly once', async () => {
    const product = await InventoryProductModel.create({ product_name: 'Leash', sku: 'RET-L', unit_cost: 100, inventory_count: 5 });
    const ret = await seedReturn({
      status: 'RECEIVED',
      gross: 300,
      items: [{ product_id: product._id, qty: 3, unit_cost: 100 }],
    });

    const pub = await svc.refund(staff, String(ret._id));

    expect(pub.status).toBe('REFUNDED');
    expect(pub.events.at(-1)?.note).toBe('Refund PROCESSED');
    expect((await InventoryProductModel.findById(product._id))?.inventory_count).toBe(8);
    expect(mockIssue).toHaveBeenCalledTimes(1);
    expect(mockIssue.mock.calls[0][1]).toMatchObject({ gross: 300, receipt: ret.return_no, initiatedBy: 'POD_SHOP_RETURN' });
    // A second press cannot restock or refund again.
    await expect(svc.refund(staff, String(ret._id))).rejects.toThrow('Refund once the goods are back');
    expect((await InventoryProductModel.findById(product._id))?.inventory_count).toBe(8);
  });

  it('refuses a refund another request already claimed', async () => {
    const ret = await seedReturn({ status: 'RECEIVED', refund: { status: 'PENDING' } });
    await expect(svc.refund(staff, String(ret._id))).rejects.toThrow('This refund is already on its way');
    expect(mockIssue).not.toHaveBeenCalled();
  });

  it('retries a refund with the return’s own amounts', async () => {
    const ret = await seedReturn({ status: 'RECEIVED', refund: { status: 'FAILED' }, gross: 120 });
    await svc.retryRefund(staff, String(ret._id));
    expect(mockRetry).toHaveBeenCalledTimes(1);
    expect(mockRetry.mock.calls[0][1]).toMatchObject({ gross: 120, receipt: ret.return_no, initiatedBy: 'POD_SHOP_RETURN' });
  });
});

describe('countOpen', () => {
  it('counts the returns still being worked, by product or by brand', async () => {
    const brand = nextId();
    const productId = nextId();
    const live = await seedReturn({ brand_ids: [brand], items: [{ product_id: productId, qty: 1, unit_cost: 1 }] });
    await seedReturn({ brand_ids: [brand], status: 'REFUNDED', items: [{ product_id: productId, qty: 1, unit_cost: 1 }] });

    expect(await svc.countOpen({ productIds: [productId] })).toBe(1);
    expect(await svc.countOpen({ brandId: brand })).toBe(1);
    expect(await svc.countOpen({ brandId: brand, productIds: [nextId()] })).toBe(0);
    expect(await svc.countOpen({})).toBeGreaterThanOrEqual(1);
    expect(live.status).toBe('REQUESTED');
  });
});
