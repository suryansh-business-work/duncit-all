jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn(), error: jest.fn(), info: jest.fn() } } }));
jest.mock('../../catalogDeletion.notify', () => ({ notifyDeletionUpdate: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@modules/commerce/productOrder/productOrder.cancel', () => ({
  ...jest.requireActual('@modules/commerce/productOrder/productOrder.cancel'),
  cancelPodShopOrder: jest.fn(),
}));
jest.mock('@modules/venues/ecommBrand/ecommBrand.service', () => ({
  ecommBrandService: { removeForDeletionRequest: jest.fn().mockResolvedValue(true) },
}));

import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { cancelPodShopOrder } from '@modules/commerce/productOrder/productOrder.cancel';
import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';
import { PodShopReturnModel } from '@modules/commerce/podShopReturn/podShopReturn.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { ecommBrandService } from '@modules/venues/ecommBrand/ecommBrand.service';
import { CatalogDeletionRequestModel } from '../../catalogDeletion.model';
import { CatalogDeletionSettingsModel } from '../../catalogDeletion.model';
import { notifyDeletionUpdate } from '../../catalogDeletion.notify';
import { toDeletionPub } from '../../catalogDeletion.pub';
import { runDueDeletions } from '../../catalogDeletion.executor';
import { cancelRunningOrders } from '../../catalogDeletion.orders';
import { deletionImpact } from '../../catalogDeletion.impact';
import { deletionWindow, scheduledInstant, updateDeletionWindow } from '../../catalogDeletion.window';

/**
 * Carrying out a deletion: orders cancelled with a refund only when they hold
 * nothing but the deleted item, nothing removed while an order or return is
 * still open, and the waiting reason recorded once per change.
 */

const mockCancel = cancelPodShopOrder as jest.Mock;
let seq = 0;
const brandId = new Types.ObjectId();

const product = (over: Record<string, unknown> = {}) => {
  seq += 1;
  return InventoryProductModel.create({
    product_name: `Item ${seq}`,
    sku: `RUN-${seq}`,
    unit_cost: 50,
    brand_id: brandId,
    ownership: 'BRAND',
    ...over,
  });
};

const order = (lines: { product_id: unknown; brand_id?: unknown; qty?: number }[], over: Record<string, unknown> = {}) => {
  seq += 1;
  return ProductOrderModel.create({
    order_no: `ord-run-${seq}`,
    payment_id: new Types.ObjectId(),
    buyer_name: 'Buyer',
    buyer_email: 'b@x.com',
    items_total: 100,
    total: 100,
    fulfilment_method: 'SHIP',
    fulfilment_status: 'AWAITING_SHIPMENT',
    line_items: lines.map((l) => ({ name: 'L', qty: 1, unit_cost: 50, gross: 50, brand_id: brandId, ...l })),
    ...over,
  });
};

const request = (over: Record<string, unknown> = {}) => {
  seq += 1;
  return CatalogDeletionRequestModel.create({
    request_no: `DEL-RUN${seq}`,
    kind: 'PRODUCT',
    brand_id: brandId,
    brand_name: 'Brandy',
    product_name: 'Thing',
    mode: 'WAIT_FOR_ORDERS',
    status: 'APPROVED',
    scheduled_for: new Date(Date.now() - 1000),
    ...over,
  });
};

const cancelsByClaiming = async (id: string) => {
  await ProductOrderModel.updateOne({ _id: id }, { cancelled_at: new Date(), fulfilment_status: 'CANCELLED' });
  return { refund: { status: 'PROCESSED' } };
};

beforeAll(async () => {
  await Promise.all([CatalogDeletionRequestModel.init(), InventoryProductModel.init()]);
});

describe('the notice window', () => {
  it('starts at the default 30–60 days and counts whole days from today', async () => {
    const now = new Date('2026-03-10T12:00:00.000Z');
    expect(await deletionWindow(now)).toMatchObject({ min_days: 30, max_days: 60, earliest: '2026-04-09', latest: '2026-05-09' });
  });

  it('turns an allowed day into that day’s start in the app zone, and refuses any other', async () => {
    const now = new Date('2026-03-10T12:00:00.000Z');
    const due = await scheduledInstant('2026-04-09', now);
    expect(due.toISOString()).toBe('2026-04-08T18:30:00.000Z');
    await expect(scheduledInstant('2026-04-08', now)).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    await expect(scheduledInstant('2026-05-10', now)).rejects.toThrow('Pick a deletion date between 2026-04-09 and 2026-05-09');
    await expect(scheduledInstant('9 April', now)).rejects.toThrow('Pick a deletion date between');
    // A full timestamp is read as its day.
    expect((await scheduledInstant('2026-04-09T23:59:00Z', now)).toISOString()).toBe(due.toISOString());
  });

  it('changes the window within bounds and records who did it', async () => {
    const out = await updateDeletionWindow({ min_days: 7.9, max_days: 90 }, 'admin-1');
    expect(out).toMatchObject({ min_days: 7, max_days: 90 });
    expect((await CatalogDeletionSettingsModel.findOne({}))?.updated_by).toBe('admin-1');
  });

  it.each([
    [{ min_days: 0, max_days: 30 }],
    [{ min_days: 10, max_days: 366 }],
    [{ min_days: 40, max_days: 30 }],
    [{ min_days: Number.NaN, max_days: 30 }],
  ])('refuses a window outside 1–365 days or with min above max (%j)', async (input) => {
    await expect(updateDeletionWindow(input, 'admin-1')).rejects.toThrow('Minimum and maximum must be 1–365 days');
  });

  it('fails loudly when the settings cannot be created', async () => {
    jest.spyOn(CatalogDeletionSettingsModel, 'findOneAndUpdate').mockResolvedValueOnce(null as never);
    await expect(deletionWindow()).rejects.toThrow('Deletion settings could not be created');
  });
});

describe('deletionImpact', () => {
  it('lists the running orders with the units of the item being deleted only', async () => {
    const target = await product();
    const other = await product();
    await order([
      { product_id: target._id, qty: 2 },
      { product_id: other._id, qty: 5 },
    ]);
    await order([{ product_id: other._id }], { fulfilment_status: 'DELIVERED' });

    const impact = await deletionImpact({ kind: 'PRODUCT', brandId, productId: target._id as Types.ObjectId });

    expect(impact.open_orders).toBe(1);
    expect(impact.orders).toHaveLength(1);
    expect(impact.orders[0]).toMatchObject({ units: 2, buyer_name: 'Buyer', fulfilment_status: 'AWAITING_SHIPMENT' });
    expect(impact.products).toEqual([]);
  });

  it('counts a brand’s units across every product of it, and lists its live products', async () => {
    const a = await product();
    await product({ status: 'ARCHIVED' });
    await order([{ product_id: a._id, qty: 3 }, { product_id: new Types.ObjectId(), brand_id: new Types.ObjectId(), qty: 9 }]);
    const impact = await deletionImpact({ kind: 'BRAND', brandId });
    expect(impact.orders[0].units).toBe(3);
    expect(impact.products.map((p) => p.id)).toEqual([String(a._id)]);
  });
});

describe('cancelRunningOrders', () => {
  it('cancels orders made only of the deleted item, leaves mixed ones running and records both', async () => {
    const target = await product();
    const other = await product();
    const pure = await order([{ product_id: target._id }]);
    const mixed = await order([{ product_id: target._id }, { product_id: other._id }]);
    mockCancel.mockImplementation(cancelsByClaiming);
    const req = await request({ product_id: target._id, product_name: 'Thing', mode: 'CANCEL_AND_REFUND' });

    const out = await cancelRunningOrders(req, 'staff@x.com');

    expect(out).toEqual({ cancelled: 1, failedRefunds: 0, mixed: 1 });
    expect(mockCancel).toHaveBeenCalledTimes(1);
    expect(mockCancel).toHaveBeenCalledWith(String(pure._id), expect.objectContaining({ source: 'DELETION', actor: 'staff@x.com', reason: 'Thing is no longer sold on Duncit' }));
    expect((await ProductOrderModel.findById(mixed._id))?.cancelled_at).toBeNull();
    const stored = await CatalogDeletionRequestModel.findById(req._id);
    expect(stored?.cancelled_orders).toBe(1);
    expect(stored?.events.at(-1)?.note).toBe('Cancelled 1 order(s) with a full refund; 1 order(s) also carry other items and were left running');
  });

  it('counts a refund Razorpay refused, names a brand by its brand name, and keeps going past an order that cannot be cancelled', async () => {
    const a = await product();
    const first = await order([{ product_id: a._id }]);
    await order([{ product_id: a._id }]);
    mockCancel.mockImplementation(async (id: string) => {
      if (id === String(first._id)) throw new Error('courier refused');
      await cancelsByClaiming(id);
      return { refund: { status: 'FAILED' } };
    });
    const req = await request({ kind: 'BRAND', mode: 'CANCEL_AND_REFUND' });

    const out = await cancelRunningOrders(req, 'staff');

    expect(out).toEqual({ cancelled: 1, failedRefunds: 1, mixed: 0 });
    expect(mockCancel.mock.calls[0][1].reason).toBe('Brandy is no longer sold on Duncit');
    expect(logs.server.warn).toHaveBeenCalledWith('catalogDeletion', 'cancelOrder', expect.objectContaining({ request_no: req.request_no }));
    const stored = await CatalogDeletionRequestModel.findById(req._id);
    expect(stored).toMatchObject({ cancelled_orders: 1, failed_refunds: 1 });
    expect(stored?.events.at(-1)?.note).toContain('1 refund(s) refused by Razorpay');
  });

  it('writes nothing when a quiet re-run finds nothing to cancel', async () => {
    const req = await request({ product_id: new Types.ObjectId(), mode: 'CANCEL_AND_REFUND' });
    const out = await cancelRunningOrders(req, 'Scheduler', true);
    expect(out).toEqual({ cancelled: 0, failedRefunds: 0, mixed: 0 });
    expect((await CatalogDeletionRequestModel.findById(req._id))?.events).toHaveLength(0);
  });
});

describe('runDueDeletions — products', () => {
  it('archives a product with nothing running, completes the request and tells the partner', async () => {
    const p = await product({ is_active: false });
    const req = await request({ product_id: p._id });

    expect(await runDueDeletions()).toBe(1);

    expect(await InventoryProductModel.findById(p._id)).toMatchObject({ status: 'ARCHIVED', is_active: false, pod_available: false, host_request_allowed: false });
    const stored = await CatalogDeletionRequestModel.findById(req._id);
    expect(stored).toMatchObject({ status: 'COMPLETED', open: false, blocked_reason: '' });
    expect(toDeletionPub(stored as never)).toMatchObject({ status: 'COMPLETED', completed_at: expect.any(String), reviewed_at: null });
    expect(stored?.completed_at).toBeInstanceOf(Date);
    expect(notifyDeletionUpdate).toHaveBeenCalledWith(expect.anything(), 'completed — it has been deleted', expect.any(String));
  });

  it('waits while an order or a return is open, saying why once, and does not run before its date', async () => {
    const p = await product();
    await order([{ product_id: p._id }]);
    await PodShopReturnModel.create({
      return_no: 'RET-RUN1',
      order_id: new Types.ObjectId(),
      order_no: 'o',
      payment_id: new Types.ObjectId(),
      brand_ids: [brandId],
      items: [{ product_id: p._id, qty: 1, unit_cost: 1 }],
      reason: 'x',
    });
    const req = await request({ product_id: p._id });
    await request({ product_id: (await product())._id, scheduled_for: new Date(Date.now() + 86_400_000) });

    expect(await runDueDeletions()).toBe(0);
    expect(await runDueDeletions()).toBe(0);

    const stored = await CatalogDeletionRequestModel.findById(req._id);
    expect(stored?.status).toBe('APPROVED');
    expect(stored?.blocked_reason).toBe('1 order(s) still running, 1 return(s) still open');
    expect(stored?.events.filter((e) => e.action === 'WAITING')).toHaveLength(1);
    expect((await InventoryProductModel.findById(p._id))?.status).not.toBe('ARCHIVED');
  });

  it('waits on an open return alone, and shows when it last checked', async () => {
    const p = await product();
    await PodShopReturnModel.create({
      return_no: 'RET-RUN2',
      order_id: new Types.ObjectId(),
      order_no: 'o',
      payment_id: new Types.ObjectId(),
      brand_ids: [brandId],
      items: [{ product_id: p._id, qty: 1, unit_cost: 1 }],
      reason: 'x',
    });
    const req = await request({ product_id: p._id });

    await runDueDeletions();

    const stored = await CatalogDeletionRequestModel.findById(req._id);
    expect(stored?.blocked_reason).toBe('1 return(s) still open');
    expect(toDeletionPub(stored as never).last_checked_at).toEqual(expect.any(String));
    expect(toDeletionPub(stored as never).completed_at).toBeNull();
  });

  it('cancels first under CANCEL_AND_REFUND and then deletes, without notifying for a product inside a brand request', async () => {
    const p = await product();
    await order([{ product_id: p._id }]);
    mockCancel.mockImplementation(cancelsByClaiming);
    const parent = await request({ kind: 'BRAND', status: 'PENDING', open: true, scheduled_for: new Date(Date.now() + 86_400_000) });
    await request({ product_id: p._id, mode: 'CANCEL_AND_REFUND', parent_id: parent._id });

    expect(await runDueDeletions()).toBe(1);

    expect(mockCancel).toHaveBeenCalledTimes(1);
    expect((await InventoryProductModel.findById(p._id))?.status).toBe('ARCHIVED');
    expect(notifyDeletionUpdate).not.toHaveBeenCalled();
  });

  it('logs a failing request and carries on with the rest', async () => {
    const bad = await product();
    const good = await product();
    await request({ product_id: bad._id, scheduled_for: new Date(Date.now() - 5000) });
    await request({ product_id: good._id });
    const real = InventoryProductModel.updateOne.bind(InventoryProductModel);
    const spy = jest.spyOn(InventoryProductModel, 'updateOne').mockImplementation(((filter: { _id?: Types.ObjectId }, ...rest: unknown[]) => {
      if (String(filter?._id) === String(bad._id)) return Promise.reject(new Error('write failed'));
      return (real as (...a: unknown[]) => unknown)(filter, ...rest);
    }) as never);

    let completed: number;
    try {
      completed = await runDueDeletions();
    } finally {
      spy.mockRestore();
    }
    expect(completed).toBe(1);

    expect(logs.server.error).toHaveBeenCalledWith('catalogDeletion', 'runDueDeletions', expect.objectContaining({ error: expect.any(Error) }));
    expect((await InventoryProductModel.findById(good._id))?.status).toBe('ARCHIVED');
    expect((await InventoryProductModel.findById(bad._id))?.status).not.toBe('ARCHIVED');
  });
});

describe('runDueDeletions — brands', () => {
  it('waits for the brand’s own product requests, then removes the brand once they are done', async () => {
    const p = await product();
    const parent = await request({ kind: 'BRAND', product_id: null, review_note: 'Brand closed' });
    const child = await request({ product_id: p._id, parent_id: parent._id, scheduled_for: new Date(Date.now() + 86_400_000) });

    expect(await runDueDeletions()).toBe(0);
    expect((await CatalogDeletionRequestModel.findById(parent._id))?.blocked_reason).toBe('1 product(s) of the brand still waiting to be deleted');
    expect(ecommBrandService.removeForDeletionRequest).not.toHaveBeenCalled();

    await CatalogDeletionRequestModel.updateOne({ _id: child._id }, { scheduled_for: new Date(Date.now() - 1000) });
    // Products go first in the sweep, so the brand can finish in the same run.
    expect(await runDueDeletions()).toBe(2);

    expect(ecommBrandService.removeForDeletionRequest).toHaveBeenCalledWith(String(brandId), 'Brand closed');
    expect((await CatalogDeletionRequestModel.findById(parent._id))?.status).toBe('COMPLETED');
    expect(notifyDeletionUpdate).toHaveBeenCalledTimes(1);
  });

  it('cancels running orders of the brand before it checks what is left, under CANCEL_AND_REFUND', async () => {
    const p = await product();
    const o = await order([{ product_id: p._id }]);
    mockCancel.mockImplementation(cancelsByClaiming);
    const parent = await request({ kind: 'BRAND', product_id: null, mode: 'CANCEL_AND_REFUND' });

    expect(await runDueDeletions()).toBe(1);

    expect(mockCancel).toHaveBeenCalledWith(String(o._id), expect.objectContaining({ source: 'DELETION', actor: 'Scheduler' }));
    expect((await CatalogDeletionRequestModel.findById(parent._id))?.status).toBe('COMPLETED');
  });

  it('sweeps up products listed after the request, falls back to the reason, and waits on running orders under WAIT mode', async () => {
    const late = await product();
    const running = await order([{ product_id: late._id }]);
    const parent = await request({ kind: 'BRAND', product_id: null, reason: 'Closing down' });

    expect(await runDueDeletions()).toBe(0);
    expect((await CatalogDeletionRequestModel.findById(parent._id))?.blocked_reason).toBe('1 order(s) still running');

    await ProductOrderModel.updateOne({ _id: running._id }, { fulfilment_status: 'DELIVERED' });
    expect(await runDueDeletions()).toBe(1);

    expect((await InventoryProductModel.findById(late._id))?.status).toBe('ARCHIVED');
    expect(ecommBrandService.removeForDeletionRequest).toHaveBeenCalledWith(String(brandId), 'Closing down');
  });
});
