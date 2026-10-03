jest.mock('../../store.emails', () => ({
  mailBackInStock: jest.fn(),
  mailCartReminder: jest.fn(),
}));
// Cart pricing has its own suite (store.pricing.int.test.ts); here only how the
// console shapes priced lines into a row matters.
jest.mock('../../store.pricing', () => ({ resolveStoreLines: jest.fn() }));

import { Types } from 'mongoose';
import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';
import { ProductReviewModel } from '@modules/venues/productReview/productReview.model';
import { CouponModel } from '@modules/finance/coupon/coupon.model';
import { couponService } from '@modules/finance/coupon/coupon.service';
import { storeAdminCatalogService as svc } from '../../store.admin.catalog.service';
import { StoreCartModel } from '../../storeCart.model';
import { StoreStockAlertModel } from '../../storeReturn.model';
import { StoreProductModel } from '../../storeProduct.model';
import { mailBackInStock, mailCartReminder } from '../../store.emails';
import { resolveStoreLines } from '../../store.pricing';

/**
 * The Ecomm console's customer operations: who bought (and what they really
 * spent), which carts were abandoned, who is waiting on stock, and the store's
 * own coupons — each one guarded so a POD/GLOBAL code can never be edited here.
 */

const mockBackInStock = jest.mocked(mailBackInStock);
const mockCartReminder = jest.mocked(mailCartReminder);
const mockLines = jest.mocked(resolveStoreLines);

const HOUR = 60 * 60 * 1000;
let seq = 0;

const seedProduct = (over: Record<string, unknown> = {}) => {
  seq += 1;
  return StoreProductModel.create({
    product_name: `Kibble ${seq}`,
    sku: `CAT-${seq}`,
    unit_cost: 499,
    inventory_count: 5,
    status: 'PUBLISHED',
    store: { slug: `kibble-${seq}`, title: `Kibble listing ${seq}` },
    ...over,
  });
};

async function seedOrder(row: Record<string, unknown>, createdAt: Date) {
  seq += 1;
  const order = await ProductOrderModel.create({
    order_no: `PS-${seq}`,
    payment_id: new Types.ObjectId(),
    items_total: 0,
    total: 0,
    fulfilment_method: 'SHIP',
    channel: 'PET_STORE',
    ...row,
  });
  await ProductOrderModel.collection.updateOne({ _id: order._id }, { $set: { created_at: createdAt } });
  return order;
}

async function seedCart(row: Record<string, unknown>, idleMs: number) {
  seq += 1;
  const cart = await StoreCartModel.create({ owner_key: `g:cart-${seq}`, ...row });
  await StoreCartModel.collection.updateOne(
    { _id: cart._id },
    { $set: { last_activity_at: new Date(Date.now() - idleMs) } }
  );
  return cart;
}

describe('customersTable', () => {
  it('groups pet-store orders per email: counts, cancellations, net spend and first/last order dates', async () => {
    const buyer = new Types.ObjectId();
    await seedOrder(
      { buyer_email: 'a@x.com', buyer_name: 'Old Name', buyer_id: buyer, total: 1000, discount_total: 100.25 },
      new Date('2026-09-01T00:00:00Z')
    );
    await seedOrder(
      { buyer_email: 'a@x.com', buyer_name: 'Asha', buyer_phone: '9876543210', buyer_id: buyer, total: 500 },
      new Date('2026-09-10T00:00:00Z')
    );
    await seedOrder(
      { buyer_email: 'a@x.com', total: 300, cancelled_at: new Date('2026-09-11T00:00:00Z') },
      new Date('2026-09-05T00:00:00Z')
    );
    await seedOrder({ buyer_email: 'g@x.com', buyer_name: 'Guest', total: 250 }, new Date('2026-08-01T00:00:00Z'));
    await seedOrder({ buyer_email: 'pod@x.com', channel: 'POD_SHOP', total: 999 }, new Date('2026-09-20T00:00:00Z'));

    const result = await svc.customersTable(null);

    expect(result.total).toBe(2);
    const [asha, guest] = result.rows;
    expect(asha).toEqual({
      id: 'a@x.com',
      email: 'a@x.com',
      name: 'Asha',
      phone: '9876543210',
      is_guest: false,
      user_id: String(buyer),
      orders: 3,
      cancelled: 1,
      // 1000 - 100.25 + 500; the cancelled ₹300 is not spend.
      spent: 1399.75,
      last_order_at: '2026-09-10T00:00:00.000Z',
      first_order_at: '2026-09-01T00:00:00.000Z',
    });
    expect(guest).toMatchObject({ email: 'g@x.com', is_guest: true, user_id: null, phone: '', spent: 250, orders: 1 });
  });

  it('searches and filters the grouped rows in memory', async () => {
    await seedOrder({ buyer_email: 'a@x.com', buyer_id: new Types.ObjectId(), total: 10 }, new Date('2026-09-01T00:00:00Z'));
    await seedOrder({ buyer_email: 'b@x.com', total: 20 }, new Date('2026-09-02T00:00:00Z'));

    const guests = await svc.customersTable({ filters: [{ field: 'is_guest', op: 'is_true' }] });
    expect(guests.rows.map((r) => r.email)).toEqual(['b@x.com']);

    const searched = await svc.customersTable({ search: 'a@x' });
    expect(searched.rows.map((r) => r.email)).toEqual(['a@x.com']);
  });
});

describe('cartsTable', () => {
  beforeEach(() => {
    mockLines.mockResolvedValue([
      { name: 'Kibble', quantity: 2, requested_qty: 3, gross: 99.5 },
      { name: '', quantity: 1, requested_qty: 1, gross: 50 },
    ] as never);
  });

  it('lists only non-empty carts idle over an hour by default, priced through the store lines', async () => {
    const product = new Types.ObjectId();
    const idle = await seedCart({ email: 'idle@x.com', items: [{ product_id: product, qty: 3 }] }, 2 * HOUR);
    await seedCart({ email: 'fresh@x.com', items: [{ product_id: product, qty: 1 }] }, 10 * 60 * 1000);
    await seedCart({ email: 'empty@x.com', items: [] }, 3 * HOUR);

    const result = await svc.cartsTable(null);

    expect(result.total).toBe(1);
    expect(result.rows[0]).toMatchObject({
      id: String(idle._id),
      email: 'idle@x.com',
      phone: '',
      is_guest: true,
      item_count: 3,
      value: 149.5,
      items: ['Kibble × 3', '— × 1'],
      reminded_at: null,
    });
  });

  it('with abandonedOnly=false includes the fresh carts too', async () => {
    const product = new Types.ObjectId();
    await seedCart({ items: [{ product_id: product, qty: 1 }] }, 2 * HOUR);
    await seedCart({ items: [{ product_id: product, qty: 1 }], user_id: new Types.ObjectId() }, 60 * 1000);

    const result = await svc.cartsTable(null, false);
    expect(result.total).toBe(2);
    expect(result.rows.map((r) => r.is_guest)).toEqual([false, true]);
  });
});

describe('remindCart', () => {
  it('mails the item list by product name and stamps reminded_at', async () => {
    const product = await seedProduct({ product_name: 'Chew Toy' });
    const ghost = new Types.ObjectId();
    const cart = await seedCart(
      { email: 'shopper@x.com', items: [{ product_id: product._id, qty: 2 }, { product_id: ghost, qty: 1 }] },
      2 * HOUR
    );

    await expect(svc.remindCart(String(cart._id))).resolves.toBe(true);

    expect(mockCartReminder).toHaveBeenCalledTimes(1);
    expect(mockCartReminder.mock.calls[0][1]).toBe('Chew Toy × 2, — × 1');
    expect(mockCartReminder.mock.calls[0][2]).toBe('');
    expect((await StoreCartModel.findById(cart._id).lean())?.reminded_at).toBeInstanceOf(Date);
  });

  it('refuses a missing cart, a cart with no email and an empty cart', async () => {
    await expect(svc.remindCart(String(new Types.ObjectId()))).rejects.toThrow('Cart not found');
    const anon = await seedCart({ items: [{ product_id: new Types.ObjectId(), qty: 1 }] }, HOUR);
    await expect(svc.remindCart(String(anon._id))).rejects.toThrow('This shopper never gave an email address');
    const empty = await seedCart({ email: 'e@x.com', items: [] }, HOUR);
    await expect(svc.remindCart(String(empty._id))).rejects.toThrow('This cart is empty');
    expect(mockCartReminder).not.toHaveBeenCalled();
  });
});

describe('alertsTable', () => {
  it('names each alert by listing title, then product name, then a dash', async () => {
    const titled = await seedProduct({ store: { slug: 'with-title', title: 'Listing Title' } });
    const untitled = await seedProduct({ product_name: 'Plain Name', status: 'DRAFT', store: { slug: '' } });
    const gone = new Types.ObjectId();
    await StoreStockAlertModel.create({ product_id: titled._id, email: 'a@x.com', variant_id: 'v1' });
    await StoreStockAlertModel.create({ product_id: untitled._id, email: 'b@x.com' });
    await StoreStockAlertModel.create({ product_id: gone, email: 'c@x.com' });

    const result = await svc.alertsTable({ sort_by: 'email', sort_dir: 'asc' });

    expect(result.total).toBe(3);
    expect(result.rows.map((r) => [r.email, r.product_name, r.variant_id, r.notified_at])).toEqual([
      ['a@x.com', 'Listing Title', 'v1', null],
      ['b@x.com', 'Plain Name', '', null],
      ['c@x.com', '—', '', null],
    ]);
  });
});

describe('sendBackInStock', () => {
  it('returns 0 without querying products when nobody is waiting', async () => {
    await expect(svc.sendBackInStock()).resolves.toBe(0);
    expect(mockBackInStock).not.toHaveBeenCalled();
  });

  it('mails only alerts whose published product (or variant) has stock, and stamps each once', async () => {
    const inStock = await seedProduct({ store: { slug: 'in-stock', title: 'In Stock Title' } });
    const soldOut = await seedProduct({ inventory_count: 0 });
    const draft = await seedProduct({ status: 'DRAFT', store: { slug: '' } });
    const withVariants = await seedProduct({
      inventory_count: 4,
      variants: [
        { option_label: '1 kg', inventory_count: 0 },
        { option_label: '3 kg', inventory_count: 2 },
      ],
    });
    const [emptyVariant, fullVariant] = withVariants.variants;

    const ok = await StoreStockAlertModel.create({ product_id: inStock._id, email: 'ok@x.com' });
    await StoreStockAlertModel.create({ product_id: soldOut._id, email: 'sold@x.com' });
    await StoreStockAlertModel.create({ product_id: draft._id, email: 'draft@x.com' });
    await StoreStockAlertModel.create({ product_id: withVariants._id, email: 'v0@x.com', variant_id: String(emptyVariant._id) });
    const v1 = await StoreStockAlertModel.create({
      product_id: withVariants._id,
      email: 'v1@x.com',
      variant_id: String(fullVariant._id),
    });
    mockBackInStock.mockResolvedValue(true as never);

    await expect(svc.sendBackInStock()).resolves.toBe(2);

    expect(mockBackInStock).toHaveBeenCalledWith('ok@x.com', 'In Stock Title', 'in-stock');
    expect(mockBackInStock).toHaveBeenCalledWith('v1@x.com', withVariants.store.title, withVariants.store.slug);
    expect(mockBackInStock).toHaveBeenCalledTimes(2);
    expect((await StoreStockAlertModel.findById(ok._id).lean())?.notified_at).toBeInstanceOf(Date);
    expect((await StoreStockAlertModel.findById(v1._id).lean())?.notified_at).toBeInstanceOf(Date);
    expect(await StoreStockAlertModel.countDocuments({ notified_at: null })).toBe(3);

    // A second run never mails the stamped alerts again.
    mockBackInStock.mockClear();
    await expect(svc.sendBackInStock()).resolves.toBe(0);
    expect(mockBackInStock).not.toHaveBeenCalled();
  });

  it('leaves an alert unstamped when the mail did not go out, and respects the batch limit', async () => {
    const product = await seedProduct({ product_name: 'Fallback Name', store: { slug: 'fb', title: '' } });
    const a = await StoreStockAlertModel.create({ product_id: product._id, email: 'a@x.com' });
    await StoreStockAlertModel.create({ product_id: product._id, email: 'b@x.com' });
    mockBackInStock.mockResolvedValue(false as never);

    await expect(svc.sendBackInStock(1)).resolves.toBe(0);

    expect(mockBackInStock).toHaveBeenCalledTimes(1);
    expect(mockBackInStock).toHaveBeenCalledWith(expect.any(String), 'Fallback Name', 'fb');
    expect((await StoreStockAlertModel.findById(a._id).lean())?.notified_at).toBeNull();
  });
});

describe('reviews', () => {
  it('lists only reviews of store products, with listing names and defaults', async () => {
    const product = await seedProduct({ store: { slug: 'rv', title: 'Reviewed Listing' } });
    await ProductReviewModel.create({
      product_id: product._id,
      user_id: new Types.ObjectId(),
      rating: 4,
      comment: 'Good',
    });
    await ProductReviewModel.create({ product_id: new Types.ObjectId(), user_id: new Types.ObjectId(), rating: 1 });

    const result = await svc.reviewsTable(null);

    expect(result.total).toBe(1);
    expect(result.rows[0]).toMatchObject({
      product_id: String(product._id),
      product_name: 'Reviewed Listing',
      // The review schema keeps no reviewer name, so the row falls back to ''.
      user_name: '',
      rating: 4,
      comment: 'Good',
      seller_reply: '',
    });
  });

  it('replyReview trims and caps the reply at 1000 chars, refusing blank text and unknown reviews', async () => {
    const review = await ProductReviewModel.create({
      product_id: new Types.ObjectId(),
      user_id: new Types.ObjectId(),
      rating: 5,
    });

    await expect(svc.replyReview(String(review._id), `  ${'r'.repeat(1200)}  `)).resolves.toBe(true);
    const saved = await ProductReviewModel.findById(review._id).lean();
    expect((saved as Record<string, unknown>).seller_reply).toBe('r'.repeat(1000));
    expect((saved as Record<string, unknown>).seller_reply_at).toBeInstanceOf(Date);

    await expect(svc.replyReview(String(review._id), '   ')).rejects.toThrow('Write the reply first');
    await expect(svc.replyReview(String(new Types.ObjectId()), 'Thanks')).rejects.toThrow('Review not found');
  });

  it('deleteReview reports whether a review was removed', async () => {
    const review = await ProductReviewModel.create({ product_id: new Types.ObjectId(), user_id: new Types.ObjectId(), rating: 3 });
    await expect(svc.deleteReview(String(review._id))).resolves.toBe(true);
    await expect(svc.deleteReview(String(review._id))).resolves.toBe(false);
  });
});

describe('store coupons', () => {
  const seedCoupon = (code: string, scope: string) =>
    CouponModel.create({ code, discount_pct: 10, scope, pod_id: scope === 'POD' ? new Types.ObjectId() : null });

  it('creating forces STORE scope and no pod', async () => {
    const create = jest.spyOn(couponService, 'create').mockResolvedValue({ id: 'c1' } as never);
    await svc.saveCoupon(null, { code: 'PET10', scope: 'GLOBAL', pod_id: 'abc' });
    expect(create).toHaveBeenCalledWith({ code: 'PET10', scope: 'STORE', pod_id: null });
    create.mockRestore();
  });

  it('updates only a STORE coupon and refuses any other scope or a missing id', async () => {
    const update = jest.spyOn(couponService, 'update').mockResolvedValue({ id: 'x' } as never);
    const store = await seedCoupon('STORE5', 'STORE');
    const global = await seedCoupon('ALL5', 'GLOBAL');

    await svc.saveCoupon(String(store._id), { discount_pct: 15 });
    expect(update).toHaveBeenCalledWith(String(store._id), { discount_pct: 15, scope: 'STORE', pod_id: null });

    await expect(svc.saveCoupon(String(global._id), { discount_pct: 15 })).rejects.toThrow('Store coupon not found');
    await expect(svc.saveCoupon(String(new Types.ObjectId()), {})).rejects.toThrow('Store coupon not found');
    expect(update).toHaveBeenCalledTimes(1);
    update.mockRestore();
  });

  it('deletes only a STORE coupon', async () => {
    const remove = jest.spyOn(couponService, 'remove').mockResolvedValue(true as never);
    const store = await seedCoupon('STOREDEL', 'STORE');
    const pod = await seedCoupon('PODDEL', 'POD');

    await svc.deleteCoupon(String(store._id));
    expect(remove).toHaveBeenCalledWith(String(store._id));
    await expect(svc.deleteCoupon(String(pod._id))).rejects.toThrow('Store coupon not found');
    expect(remove).toHaveBeenCalledTimes(1);
    remove.mockRestore();
  });

  it('the table lists the STORE scope', async () => {
    const table = jest.spyOn(couponService, 'tableForScope').mockResolvedValue({ rows: [] } as never);
    await svc.couponsTable({ page: 2 });
    expect(table).toHaveBeenCalledWith('STORE', { page: 2 });
    table.mockRestore();
  });
});
