jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn(), error: jest.fn(), info: jest.fn() } } }));
jest.mock('../../catalogDeletion.notify', () => ({ notifyDeletionUpdate: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../catalogDeletion.orders', () => ({ cancelRunningOrders: jest.fn().mockResolvedValue({ cancelled: 0, failedRefunds: 0, mixed: 0 }) }));

import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';
import { PodShopReturnModel } from '@modules/commerce/podShopReturn/podShopReturn.model';
import { CatalogDeletionRequestModel } from '../../catalogDeletion.model';
import { catalogDeletionService as svc } from '../../catalogDeletion.service';
import { notifyDeletionUpdate } from '../../catalogDeletion.notify';
import { cancelRunningOrders } from '../../catalogDeletion.orders';

/**
 * A partner asking to delete a brand or product, and the Products team's
 * answer: ownership is enforced, the item leaves the shop at once, one open
 * request per item, and a rejected or withdrawn request puts it all back.
 */

let seq = 0;
const owner = new Types.ObjectId().toHexString();

async function seedBrand(over: Record<string, unknown> = {}) {
  seq += 1;
  return EcommBrandModel.create({
    owner_user_id: new Types.ObjectId(owner),
    brand_name: `Brand ${seq}`,
    status: 'APPROVED',
    contact_person: 'Meera',
    ...over,
  });
}
async function seedProduct(brandId: unknown, over: Record<string, unknown> = {}) {
  seq += 1;
  return InventoryProductModel.create({
    product_name: `Product ${seq}`,
    sku: `DEL-${seq}`,
    unit_cost: 100,
    brand_id: brandId,
    ownership: 'BRAND',
    listing_review_status: 'APPROVED',
    ...over,
  });
}
const day = async () => (await svc.window()).earliest;
const ask = async (kind: 'BRAND' | 'PRODUCT', target_id: unknown, over: Record<string, unknown> = {}) =>
  svc.request(owner, { kind, target_id: String(target_id), mode: 'WAIT_FOR_ORDERS', scheduled_for: await day(), ...over } as never);
const missing = () => new Types.ObjectId().toHexString();

beforeAll(async () => {
  await Promise.all([CatalogDeletionRequestModel.init(), InventoryProductModel.init()]);
});

describe('what the partner may ask to delete', () => {
  it('refuses a brand that is not theirs, not approved, or an id that is not an id', async () => {
    const stranger = await seedBrand({ owner_user_id: new Types.ObjectId() });
    const draft = await seedBrand({ status: 'DRAFT' });
    await expect(ask('BRAND', stranger._id)).rejects.toMatchObject({ message: 'Brand not found', extensions: { code: 'NOT_FOUND' } });
    await expect(ask('BRAND', draft._id)).rejects.toThrow('never went on sale');
    await expect(ask('BRAND', 'nope')).rejects.toThrow('Brand not found');
  });

  it('refuses a product that is not a brand’s, is already deleted, was never on sale, or sits under a brand request', async () => {
    const brand = await seedBrand();
    const own = await seedProduct(brand._id, { status: 'ARCHIVED' });
    const unreviewed = await seedProduct(brand._id, { listing_review_status: 'PENDING' });
    const duncit = await seedProduct(brand._id, { ownership: 'DUNCIT' });
    const live = await seedProduct(brand._id);
    await expect(ask('PRODUCT', missing())).rejects.toThrow('Product not found');
    await expect(ask('PRODUCT', 'bad')).rejects.toThrow('Product not found');
    await expect(ask('PRODUCT', duncit._id)).rejects.toThrow('Product not found');
    await expect(ask('PRODUCT', own._id)).rejects.toThrow('already deleted');
    await expect(ask('PRODUCT', unreviewed._id)).rejects.toThrow('never on sale');

    await ask('BRAND', brand._id);
    await expect(ask('PRODUCT', live._id)).rejects.toThrow('The whole brand is already being deleted');
  });

  it('refuses a product whose brand belongs to someone else', async () => {
    const theirs = await seedBrand({ owner_user_id: new Types.ObjectId() });
    const product = await seedProduct(theirs._id);
    await expect(ask('PRODUCT', product._id)).rejects.toThrow('Brand not found');
  });
});

describe('request', () => {
  it('hides a product at once and records the request with its history', async () => {
    const brand = await seedBrand();
    const product = await seedProduct(brand._id);
    await ProductOrderModel.create({
      order_no: 'ord-del-1',
      payment_id: new Types.ObjectId(),
      buyer_name: 'B',
      buyer_email: 'b@x.com',
      items_total: 100,
      total: 100,
      fulfilment_method: 'SHIP',
      fulfilment_status: 'AWAITING_SHIPMENT',
      line_items: [{ product_id: product._id, brand_id: brand._id, name: 'P', qty: 1, unit_cost: 100, gross: 100 }],
    });

    const pub = await ask('PRODUCT', product._id, { reason: '  discontinued  ' });

    expect(pub).toMatchObject({ kind: 'PRODUCT', status: 'PENDING', reason: 'discontinued', open_orders_at_request: 1, mode: 'WAIT_FOR_ORDERS' });
    expect(pub.request_no).toMatch(/^DEL-[0-9A-F]{6}$/);
    expect(pub.events[0]).toMatchObject({ action: 'REQUESTED', by: 'Meera' });
    expect((await InventoryProductModel.findById(product._id))?.is_active).toBe(false);
    expect(logs.server.info).toHaveBeenCalledWith('catalogDeletion', 'request', expect.objectContaining({ kind: 'PRODUCT', open_orders: 1 }));
  });

  it('refuses an unknown mode and a date outside the notice window, before touching anything', async () => {
    const brand = await seedBrand();
    const product = await seedProduct(brand._id);
    await expect(ask('PRODUCT', product._id, { mode: 'DELETE_NOW' })).rejects.toThrow('Choose what happens to running orders');
    await expect(ask('PRODUCT', product._id, { scheduled_for: '2000-01-01' })).rejects.toThrow('Pick a deletion date between');
    await expect(ask('PRODUCT', product._id, { scheduled_for: 'soon' })).rejects.toThrow('Pick a deletion date between');
    expect((await InventoryProductModel.findById(product._id))?.is_active).toBe(true);
    expect(await CatalogDeletionRequestModel.countDocuments()).toBe(0);
  });

  it('refuses a second open request for the same product', async () => {
    const brand = await seedBrand();
    const product = await seedProduct(brand._id);
    await ask('PRODUCT', product._id);
    await expect(ask('PRODUCT', product._id)).rejects.toThrow('A deletion request for this is already open');
  });

  it('does not swallow a database failure as a duplicate', async () => {
    const brand = await seedBrand();
    const product = await seedProduct(brand._id);
    jest.spyOn(CatalogDeletionRequestModel, 'create').mockRejectedValueOnce(new Error('db down') as never);
    await expect(ask('PRODUCT', product._id)).rejects.toThrow('db down');
    expect((await InventoryProductModel.findById(product._id))?.is_active).toBe(true);
  });

  it('files a brand request with one request per live product, folding in a product already being deleted', async () => {
    const brand = await seedBrand({ contact_person: '' });
    const [live, hidden, own] = await Promise.all([
      seedProduct(brand._id),
      seedProduct(brand._id, { is_active: false }),
      seedProduct(brand._id),
    ]);
    await seedProduct(brand._id, { status: 'ARCHIVED' });
    const ownRequest = await ask('PRODUCT', own._id);

    const pub = await ask('BRAND', brand._id, { mode: 'CANCEL_AND_REFUND' });

    expect(pub).toMatchObject({ kind: 'BRAND', mode: 'CANCEL_AND_REFUND', brand_name: brand.brand_name });
    expect(pub.events[0].by).toBe('Partner');
    expect((await EcommBrandModel.findById(brand._id))?.is_active).toBe(false);
    const children = await CatalogDeletionRequestModel.find({ parent_id: pub.id });
    expect(children.map((c) => String(c.product_id)).sort()).toEqual([String(live._id), String(hidden._id), String(own._id)].sort());
    // A product hidden already stays "was not active", so rejecting never turns it on.
    expect(children.find((c) => String(c.product_id) === String(hidden._id))?.was_active).toBe(false);
    expect(children.find((c) => String(c.product_id) === String(live._id))?.was_active).toBe(true);
    const folded = await CatalogDeletionRequestModel.findById(ownRequest.id);
    expect(String(folded?.parent_id)).toBe(pub.id);
    expect(folded?.events.at(-1)?.action).toBe('LINKED');
    await expect(ask('BRAND', brand._id)).rejects.toThrow('already open');
  });
});

describe('preview, mine, table and detail', () => {
  it('shows the warning: names, the window and what is running', async () => {
    const brand = await seedBrand();
    const product = await seedProduct(brand._id);
    const out = await svc.preview(owner, 'PRODUCT', String(product._id));
    expect(out).toMatchObject({ kind: 'PRODUCT', brand_name: brand.brand_name, product_name: product.product_name });
    expect(out.window.min_days).toBe(30);
    expect(out.impact).toMatchObject({ open_orders: 0, open_returns: 0, orders: [], products: [] });

    const forBrand = await svc.preview(owner, 'BRAND', String(brand._id));
    expect(forBrand.product_name).toBe('');
    expect(forBrand.impact.products.map((p) => p.product_name)).toEqual([product.product_name]);
  });

  it('counts open returns of the item in the warning', async () => {
    const brand = await seedBrand();
    const product = await seedProduct(brand._id);
    await PodShopReturnModel.create({
      return_no: 'RET-DEL1',
      order_id: new Types.ObjectId(),
      order_no: 'o1',
      payment_id: new Types.ObjectId(),
      brand_ids: [brand._id],
      items: [{ product_id: product._id, qty: 1, unit_cost: 10 }],
      reason: 'x',
    });
    const out = await svc.preview(owner, 'PRODUCT', String(product._id));
    expect(out.impact.open_returns).toBe(1);
  });

  it('lists only the partner’s own requests, narrowable to one brand', async () => {
    const [a, b] = await Promise.all([seedBrand(), seedBrand()]);
    const pa = await seedProduct(a._id);
    const pb = await seedProduct(b._id);
    await ask('PRODUCT', pa._id);
    await ask('PRODUCT', pb._id);
    const other = await seedBrand({ owner_user_id: new Types.ObjectId() });
    await CatalogDeletionRequestModel.create({
      request_no: 'DEL-OTHER',
      kind: 'BRAND',
      brand_id: other._id,
      mode: 'WAIT_FOR_ORDERS',
      scheduled_for: new Date(),
    });

    expect(await svc.mine(owner)).toHaveLength(2);
    const one = await svc.mine(owner, String(a._id));
    expect(one.map((r) => r.brand_id)).toEqual([String(a._id)]);
  });

  it('serves the Products team’s table by kind, or by parent request, and one request’s detail', async () => {
    const brand = await seedBrand();
    await seedProduct(brand._id);
    const parent = await ask('BRAND', brand._id);

    const brands = await svc.table('BRAND');
    expect(brands.rows.map((r) => r.id)).toEqual([parent.id]);
    const children = await svc.table('PRODUCT', null, parent.id);
    expect(children.total).toBe(1);
    expect((await svc.table('PRODUCT', null, 'not-an-id')).total).toBe(1);

    const detail = await svc.detail(parent.id);
    expect(detail.request.id).toBe(parent.id);
    expect(detail.impact.products).toHaveLength(1);
    await expect(svc.detail(missing())).rejects.toThrow('Request not found');
    await expect(svc.detail('bad')).rejects.toThrow('Request not found');
  });
});

describe('withdraw', () => {
  it('puts a product back on sale, and only if it was on sale before', async () => {
    const brand = await seedBrand();
    const product = await seedProduct(brand._id);
    const pub = await ask('PRODUCT', product._id);

    const out = await svc.withdraw(owner, pub.id);

    expect(out).toMatchObject({ status: 'WITHDRAWN' });
    expect((await InventoryProductModel.findById(product._id))?.is_active).toBe(true);
    const stored = await CatalogDeletionRequestModel.findById(pub.id);
    expect(stored?.open).toBe(false);
    expect(stored?.events.at(-1)).toMatchObject({ action: 'WITHDRAWN', note: 'Withdrawn by the partner' });
    await expect(svc.withdraw(owner, pub.id)).rejects.toThrow('already closed');
  });

  it('signs a withdrawal as the partner when the brand has no contact person', async () => {
    const brand = await seedBrand({ contact_person: '' });
    const product = await seedProduct(brand._id);
    const pub = await ask('PRODUCT', product._id);
    await svc.withdraw(owner, pub.id);
    expect((await CatalogDeletionRequestModel.findById(pub.id))?.events.at(-1)?.by).toBe('Partner');
  });

  it('leaves a product that was already off the shop off, and brings a brand and its products back together', async () => {
    const brand = await seedBrand();
    const hidden = await seedProduct(brand._id, { is_active: false });
    const live = await seedProduct(brand._id);
    const pub = await ask('BRAND', brand._id);
    const child = await CatalogDeletionRequestModel.findOne({ parent_id: pub.id, product_id: live._id });
    await expect(svc.withdraw(owner, String(child?._id))).rejects.toThrow('withdraw the brand request instead');

    await svc.withdraw(owner, pub.id);

    expect((await EcommBrandModel.findById(brand._id))?.is_active).toBe(true);
    expect((await InventoryProductModel.findById(live._id))?.is_active).toBe(true);
    expect((await InventoryProductModel.findById(hidden._id))?.is_active).toBe(false);
    expect(await CatalogDeletionRequestModel.countDocuments({ open: true })).toBe(0);
  });

  it('refuses an unknown request or one on someone else’s brand', async () => {
    await expect(svc.withdraw(owner, missing())).rejects.toThrow('Request not found');
    const theirs = await seedBrand({ owner_user_id: new Types.ObjectId() });
    const req = await CatalogDeletionRequestModel.create({
      request_no: 'DEL-THEIRS',
      kind: 'BRAND',
      brand_id: theirs._id,
      mode: 'WAIT_FOR_ORDERS',
      scheduled_for: new Date(),
    });
    await expect(svc.withdraw(owner, String(req._id))).rejects.toThrow('Brand not found');
  });
});

describe('review', () => {
  it('rejects only with a reason, tells the partner, and puts everything back on sale', async () => {
    const brand = await seedBrand();
    const product = await seedProduct(brand._id);
    const pub = await ask('PRODUCT', product._id);

    await expect(svc.review(pub.id, false, '  ', 'staff@x.com')).rejects.toThrow('Tell the partner why');
    const out = await svc.review(pub.id, false, ' Still selling well ', 'staff@x.com');

    expect(out).toMatchObject({ status: 'REJECTED', reviewed_by: 'staff@x.com', review_note: 'Still selling well' });
    expect((await InventoryProductModel.findById(product._id))?.is_active).toBe(true);
    expect(notifyDeletionUpdate).toHaveBeenCalledWith(expect.anything(), 'rejected — it is back on sale', 'Still selling well');
    await expect(svc.review(pub.id, true, '', 'staff@x.com')).rejects.toThrow('Only a pending request can be reviewed');
  });

  it('approves a brand together with its products, and does not touch the running orders in WAIT mode', async () => {
    const brand = await seedBrand();
    await seedProduct(brand._id);
    const pub = await ask('BRAND', brand._id);

    const out = await svc.review(pub.id, true, 'ok', 'staff@x.com');

    expect(out.status).toBe('APPROVED');
    const all = await CatalogDeletionRequestModel.find({});
    expect(all.map((r) => r.status)).toEqual(['APPROVED', 'APPROVED']);
    expect(all.every((r) => r.reviewed_by === 'staff@x.com')).toBe(true);
    expect(cancelRunningOrders).not.toHaveBeenCalled();
  });

  it('starts cancelling in the background under CANCEL_AND_REFUND, and logs a failure instead of failing the review', async () => {
    const brand = await seedBrand();
    const product = await seedProduct(brand._id);
    const pub = await ask('PRODUCT', product._id, { mode: 'CANCEL_AND_REFUND' });
    (cancelRunningOrders as jest.Mock).mockRejectedValueOnce(new Error('razorpay down'));

    const out = await svc.review(pub.id, true, '', 'staff@x.com');
    await new Promise((resolve) => setImmediate(resolve));

    expect(out.status).toBe('APPROVED');
    expect(cancelRunningOrders).toHaveBeenCalledTimes(1);
    expect(logs.server.error).toHaveBeenCalledWith('catalogDeletion', 'cancelRunningOrders', expect.objectContaining({ request_no: pub.request_no }));
  });

  it('applies only one of two simultaneous approvals: one event, one partner message', async () => {
    const brand = await seedBrand();
    const product = await seedProduct(brand._id);
    const pub = await ask('PRODUCT', product._id);

    const results = await Promise.allSettled([
      svc.review(pub.id, true, 'first', 'a@x.com'),
      svc.review(pub.id, true, 'second', 'b@x.com'),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const lost = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(lost?.reason).toMatchObject({ message: 'Only a pending request can be reviewed', extensions: { code: 'BAD_REQUEST' } });
    const saved = await CatalogDeletionRequestModel.findById(pub.id);
    expect(saved?.status).toBe('APPROVED');
    expect(saved?.events.filter((e) => e.action === 'APPROVED')).toHaveLength(1);
    expect(notifyDeletionUpdate).toHaveBeenCalledTimes(1);
  });

  it('never lets an approval and a rejection both land on the same request', async () => {
    const brand = await seedBrand();
    const product = await seedProduct(brand._id);
    const pub = await ask('PRODUCT', product._id);

    const results = await Promise.allSettled([
      svc.review(pub.id, true, 'ok', 'a@x.com'),
      svc.review(pub.id, false, 'Still selling', 'b@x.com'),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const saved = await CatalogDeletionRequestModel.findById(pub.id);
    const decisions = saved?.events.filter((e) => e.action === 'APPROVED' || e.action === 'REJECTED') ?? [];
    expect(decisions).toHaveLength(1);
    expect(saved?.status).toBe(decisions[0].action);
    expect(saved?.open).toBe(saved?.status === 'APPROVED');
  });

  it('refuses an unknown request and a product that is part of a brand request', async () => {
    await expect(svc.review(missing(), true, '', 'staff')).rejects.toThrow('Request not found');
    const brand = await seedBrand();
    await seedProduct(brand._id);
    const parent = await ask('BRAND', brand._id);
    const child = await CatalogDeletionRequestModel.findOne({ parent_id: parent.id });
    await expect(svc.review(String(child?._id), true, '', 'staff')).rejects.toThrow('review the brand request');
  });
});
