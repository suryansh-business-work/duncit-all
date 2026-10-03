import { Types } from 'mongoose';
import { brandAnalytics } from '../../ecommBrand.analytics';
import { ecommBrandResolvers } from '../../ecommBrand.resolver';
import { EcommBrandModel } from '../../ecommBrand.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';
import { makeContext } from '@test/harness';

/**
 * One brand's sales over a window: only its own line items, only countable
 * orders, zero-filled per day, and netted by the brand's commission — the
 * partner dashboard's money rule.
 */

const DAY_MS = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS);
const dateKey = (d: Date) => d.toISOString().slice(0, 10);

let seq = 0;

/** A product order placed at `at` (created_at is stamped after the insert). */
async function seedOrder(at: Date, lineItems: Record<string, unknown>[], over: Record<string, unknown> = {}) {
  const order = await ProductOrderModel.create({
    order_no: `BA-${++seq}`,
    buyer_id: new Types.ObjectId(),
    payment_id: new Types.ObjectId(),
    items_total: 0,
    total: 0,
    fulfilment_method: 'SHIP',
    line_items: lineItems,
    ...over,
  });
  await ProductOrderModel.collection.updateOne({ _id: order._id }, { $set: { created_at: at } });
}

const line = (product: { _id: Types.ObjectId; product_name: string }, brandId: Types.ObjectId, qty: number, gross: number) => ({
  product_id: product._id,
  name: product.product_name,
  qty,
  unit_cost: gross / qty,
  gross,
  ownership: 'BRAND',
  brand_id: brandId,
});

async function seedCatalogue() {
  const owner = new Types.ObjectId();
  // 10% Duncit commission on every product of the brand.
  const brand = await EcommBrandModel.create({ owner_user_id: owner, brand_name: 'Stats Co', product_commission_pct: 10 });
  const other = await EcommBrandModel.create({ owner_user_id: new Types.ObjectId(), brand_name: 'Other Co' });
  const mug = await InventoryProductModel.create({
    product_name: 'Mug', sku: 'BA-MUG', unit_cost: 50, brand_id: brand._id, ownership: 'BRAND',
    listing_review_status: 'APPROVED', status: 'ACTIVE', view_count: 5, click_count: 2,
  });
  const vase = await InventoryProductModel.create({
    product_name: 'Vase', sku: 'BA-VASE', unit_cost: 50, brand_id: brand._id, ownership: 'BRAND',
    listing_review_status: 'PENDING', status: 'ACTIVE', view_count: 3, click_count: 1,
  });
  await InventoryProductModel.create({
    product_name: 'Old Lamp', sku: 'BA-LAMP', unit_cost: 50, brand_id: brand._id, ownership: 'BRAND',
    listing_review_status: 'APPROVED', status: 'ARCHIVED', is_active: false,
  });
  const theirs = await InventoryProductModel.create({
    product_name: 'Their Bowl', sku: 'BA-BOWL', unit_cost: 50, brand_id: other._id, ownership: 'BRAND',
    view_count: 100, click_count: 100,
  });
  return { owner, brand, other, mug, vase, theirs };
}

describe('brandAnalytics', () => {
  it('sums only the brand’s countable lines inside the window, zero-fills the trend and ranks products', async () => {
    const { brand, other, mug, vase, theirs } = await seedCatalogue();
    const twoDaysAgo = daysAgo(2);
    const fiveDaysAgo = daysAgo(5);

    // A shared order: only the brand's line counts.
    await seedOrder(twoDaysAgo, [line(mug, brand._id, 2, 200), line(theirs, other._id, 5, 999)]);
    await seedOrder(twoDaysAgo, [line(vase, brand._id, 1, 50)]);
    await seedOrder(fiveDaysAgo, [line(mug, brand._id, 1, 100)]);
    // Never counted: cancelled, failed and RTO orders, and a sale before the window.
    for (const status of ['CANCELLED', 'FAILED', 'RTO']) {
      await seedOrder(daysAgo(1), [line(mug, brand._id, 9, 900)], { fulfilment_status: status });
    }
    await seedOrder(daysAgo(40), [line(mug, brand._id, 7, 700)]);

    const stats = await brandAnalytics(String(brand._id), 30);

    expect(stats).toMatchObject({
      days: 30,
      orders: 3,
      units_sold: 4,
      gross_revenue: 350,
      // (300 + 50) less the brand's 10% commission.
      net_earnings: 315,
      average_order_value: 116.67,
      // Lifetime counters over the brand's own products only.
      product_views: 8,
      product_clicks: 3,
      total_products: 3,
      // Approved, active and listed: only the mug.
      live_products: 1,
    });

    expect(stats.trend).toHaveLength(30);
    expect(stats.trend[0].date).toBe(stats.since.slice(0, 10));
    expect(stats.trend[29].date).toBe(dateKey(new Date(Date.parse(stats.since) + 29 * DAY_MS)));
    const sold = stats.trend.filter((p) => p.orders > 0);
    expect(sold).toEqual([
      { date: dateKey(fiveDaysAgo), orders: 1, gross_revenue: 100 },
      { date: dateKey(twoDaysAgo), orders: 2, gross_revenue: 250 },
    ]);

    expect(stats.top_products).toEqual([
      { product_id: String(mug._id), name: 'Mug', units_sold: 3, gross_revenue: 300, net_earnings: 270 },
      { product_id: String(vase._id), name: 'Vase', units_sold: 1, gross_revenue: 50, net_earnings: 45 },
    ]);
  });

  it('a longer window reaches the older sale; no window given means the last 30 days', async () => {
    const { brand, mug } = await seedCatalogue();
    await seedOrder(daysAgo(3), [line(mug, brand._id, 1, 100)]);
    await seedOrder(daysAgo(40), [line(mug, brand._id, 7, 700)]);

    const dflt = await brandAnalytics(String(brand._id));
    expect(dflt).toMatchObject({ days: 30, orders: 1, gross_revenue: 100 });

    const wide = await brandAnalytics(String(brand._id), 60);
    expect(wide).toMatchObject({ days: 60, orders: 2, units_sold: 8, gross_revenue: 800, average_order_value: 400 });
    expect(wide.trend).toHaveLength(60);
  });

  it('reads all zeros for a brand that has sold nothing', async () => {
    const brand = await EcommBrandModel.create({ owner_user_id: new Types.ObjectId(), brand_name: 'Quiet Co' });
    const stats = await brandAnalytics(String(brand._id), 7);

    expect(stats).toMatchObject({
      days: 7,
      orders: 0,
      units_sold: 0,
      gross_revenue: 0,
      net_earnings: 0,
      average_order_value: 0,
      product_views: 0,
      total_products: 0,
      top_products: [],
    });
    expect(stats.trend).toHaveLength(7);
    expect(stats.trend.every((p) => p.orders === 0 && p.gross_revenue === 0)).toBe(true);
  });

  it('refuses a malformed brand id', async () => {
    await expect(brandAnalytics('not-an-id')).rejects.toMatchObject({
      message: 'Invalid brand',
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });
});

describe('Query.brandAnalytics — who may read it', () => {
  const Q = ecommBrandResolvers.Query as any;

  it('serves the brand’s owner and brand-review staff', async () => {
    const { owner, brand, mug } = await seedCatalogue();
    await seedOrder(daysAgo(1), [line(mug, brand._id, 1, 100)]);
    const args = { brand_doc_id: String(brand._id), days: 7 };

    const asOwner = await Q.brandAnalytics({}, args, makeContext({ id: String(owner), roles: ['USER'] }));
    expect(asOwner).toMatchObject({ days: 7, orders: 1, gross_revenue: 100 });

    const asStaff = await Q.brandAnalytics({}, args, makeContext({ roles: ['PRODUCTS_MANAGER'] }));
    expect(asStaff).toMatchObject({ orders: 1, gross_revenue: 100 });
  });

  it('refuses another partner and the anonymous', async () => {
    const { brand } = await seedCatalogue();
    const args = { brand_doc_id: String(brand._id) };

    await expect(Q.brandAnalytics({}, args, makeContext({ roles: ['USER', 'ECOMM_MANAGER'] }))).rejects.toMatchObject({
      extensions: { code: 'NOT_FOUND' },
    });
    await expect(Q.brandAnalytics({}, args, makeContext(null))).rejects.toMatchObject({
      extensions: { code: 'UNAUTHENTICATED' },
    });
  });
});
