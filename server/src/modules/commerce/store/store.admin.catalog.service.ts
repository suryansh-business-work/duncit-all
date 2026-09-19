import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';
import { ProductReviewModel } from '@modules/venues/productReview/productReview.model';
import { couponService } from '@modules/finance/coupon/coupon.service';
import { CouponModel } from '@modules/finance/coupon/coupon.model';
import {
  applyTableQueryInMemory,
  runTableQuery,
  type TableEntityConfig,
  type TableQueryInput,
} from '@utils/table-query';
import { StoreCartModel } from './storeCart.model';
import { StoreStockAlertModel } from './storeReturn.model';
import { StoreProductModel } from './storeProduct.model';
import { getStoreSettings } from './storeSettings.model';
import { mailBackInStock, mailCartReminder } from './store.emails';
import { resolveStoreLines } from './store.pricing';
import { availableFor, findVariant, listingOf } from './store.product';
import { badInput, iso, notFound, round2, toObjectId, toObjectIds } from './store.shared';

/**
 * The ecomm portal's customer operations: who has bought, what was left in
 * carts, who is waiting for stock, what reviewers said, and the store's own
 * coupons. The products themselves are `store.admin.products.service`.
 */

type Doc = Record<string, any>;

/* ------------------------------------------------------------------ *
 * Customers, carts, alerts, reviews
 * ------------------------------------------------------------------ */

const CUSTOMER_TABLE: TableEntityConfig = {
  searchFields: ['email', 'name', 'phone'],
  sortFields: {
    email: 'email',
    name: 'name',
    orders: 'orders',
    spent: 'spent',
    last_order_at: 'last_order_at',
    first_order_at: 'first_order_at',
  },
  filterFields: {
    is_guest: { type: 'boolean' },
    orders: { type: 'number' },
    spent: { type: 'number' },
  },
  defaultSort: { last_order_at: -1 },
};

const CART_TABLE: TableEntityConfig = {
  searchFields: ['email', 'phone'],
  sortFields: { email: 'email', last_activity_at: 'last_activity_at', reminded_at: 'reminded_at', created_at: 'created_at' },
  filterFields: { email: { type: 'string' }, last_activity_at: { type: 'date' } },
  defaultSort: { last_activity_at: -1, _id: -1 },
};

const ALERT_TABLE: TableEntityConfig = {
  searchFields: ['email'],
  sortFields: { email: 'email', created_at: 'created_at', notified_at: 'notified_at' },
  filterFields: { notified_at: { type: 'date' }, email: { type: 'string' } },
  defaultSort: { created_at: -1, _id: -1 },
};

const REVIEW_TABLE: TableEntityConfig = {
  searchFields: ['comment', 'user_name'],
  sortFields: { rating: 'rating', created_at: 'created_at', user_name: 'user_name' },
  filterFields: { rating: { type: 'number' }, created_at: { type: 'date' } },
  defaultSort: { created_at: -1, _id: -1 },
};

/** Carts idle this long with something in them count as abandoned. */
const ABANDONED_AFTER_MS = 60 * 60 * 1000;

async function productNames(ids: unknown[]) {
  const docs = await StoreProductModel.find({ _id: { $in: toObjectIds(ids) } })
    .select('product_name store.title store.slug images')
    .lean();
  return new Map(docs.map((d) => [String(d._id), d]));
}

export const storeAdminCatalogService = {
  /* --- customers ------------------------------------------------------ */
  async customersTable(query?: TableQueryInput | null) {
    const rows = await ProductOrderModel.aggregate<Doc>([
      { $match: { channel: 'PET_STORE' } },
      { $sort: { created_at: -1 } },
      {
        $group: {
          _id: '$buyer_email',
          name: { $first: '$buyer_name' },
          phone: { $first: '$buyer_phone' },
          user_id: { $max: '$buyer_id' },
          orders: { $sum: 1 },
          cancelled: { $sum: { $cond: [{ $ne: ['$cancelled_at', null] }, 1, 0] } },
          spent: {
            $sum: {
              $cond: [{ $eq: ['$cancelled_at', null] }, { $subtract: ['$total', { $ifNull: ['$discount_total', 0] }] }, 0],
            },
          },
          last_order_at: { $first: '$created_at' },
          first_order_at: { $last: '$created_at' },
        },
      },
    ]);
    const shaped = rows.map((r) => ({
      id: String(r._id ?? ''),
      email: String(r._id ?? ''),
      name: r.name ?? '',
      phone: r.phone ?? '',
      is_guest: !r.user_id,
      user_id: r.user_id ? String(r.user_id) : null,
      orders: r.orders,
      cancelled: r.cancelled,
      spent: round2(r.spent),
      last_order_at: iso(r.last_order_at) ?? '',
      first_order_at: iso(r.first_order_at) ?? '',
    }));
    return applyTableQueryInMemory(shaped, query, CUSTOMER_TABLE);
  },

  /* --- carts ---------------------------------------------------------- */
  async cartsTable(query?: TableQueryInput | null, abandonedOnly = true) {
    const base: Doc = { 'items.0': { $exists: true } };
    if (abandonedOnly) base.last_activity_at = { $lt: new Date(Date.now() - ABANDONED_AFTER_MS) };
    const { docs, total, page, page_size } = await runTableQuery<Doc>(StoreCartModel, base, query, CART_TABLE);
    const settings = await getStoreSettings();
    const rows = await Promise.all(
      docs.map(async (cart: Doc) => {
        const lines = await resolveStoreLines(cart.items, settings);
        return {
          id: String(cart._id),
          email: cart.email ?? '',
          phone: cart.phone ?? '',
          is_guest: !cart.user_id,
          item_count: lines.reduce((s, l) => s + l.quantity, 0),
          value: round2(lines.reduce((s, l) => s + l.gross, 0)),
          items: lines.map((l) => `${l.name || '—'} × ${l.requested_qty}`),
          last_activity_at: iso(cart.last_activity_at) ?? '',
          reminded_at: iso(cart.reminded_at),
          created_at: iso(cart.created_at) ?? '',
        };
      })
    );
    return { rows, total, page, page_size };
  },

  async remindCart(cartId: string) {
    const cart = await StoreCartModel.findById(toObjectId(cartId));
    if (!cart) notFound('Cart not found');
    if (!cart.email) badInput('This shopper never gave an email address');
    if (cart.items.length === 0) badInput('This cart is empty');
    const names = await productNames(cart.items.map((i) => i.product_id));
    const items = cart.items
      .map((i) => `${names.get(String(i.product_id))?.product_name ?? '—'} × ${i.qty}`)
      .join(', ');
    await mailCartReminder(cart, items, '');
    cart.reminded_at = new Date();
    await cart.save();
    return true;
  },

  /* --- back-in-stock alerts ------------------------------------------ */
  async alertsTable(query?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<Doc>(StoreStockAlertModel, {}, query, ALERT_TABLE);
    const names = await productNames(docs.map((d: Doc) => d.product_id));
    return {
      rows: docs.map((d: Doc) => {
        const p = names.get(String(d.product_id));
        return {
          id: String(d._id),
          email: d.email,
          product_id: String(d.product_id),
          product_name: (p?.store as any)?.title || p?.product_name || '—',
          variant_id: d.variant_id ?? '',
          notified_at: iso(d.notified_at),
          created_at: iso(d.created_at) ?? '',
        };
      }),
      total,
      page,
      page_size,
    };
  },

  /**
   * Tell everyone waiting on a product that is sellable again. Run on a timer
   * and on demand from the portal; each alert is sent once, then stamped.
   */
  async sendBackInStock(limit = 200) {
    const pending = await StoreStockAlertModel.find({ notified_at: null }).limit(limit);
    if (pending.length === 0) return 0;
    const products = await StoreProductModel.find({
      _id: { $in: pending.map((a) => a.product_id) },
      status: 'PUBLISHED',
    }).lean();
    const byId = new Map(products.map((p) => [String(p._id), p]));
    let sent = 0;
    for (const alert of pending) {
      const product = byId.get(String(alert.product_id));
      if (!product) continue;
      const variant = findVariant(product as any, alert.variant_id ?? '');
      if (availableFor(product as any, variant) <= 0) continue;
      const listing = listingOf(product);
      const ok = await mailBackInStock(alert.email, listing.title || product.product_name, listing.slug);
      if (ok) {
        alert.notified_at = new Date();
        await alert.save();
        sent += 1;
      }
    }
    return sent;
  },

  /* --- reviews -------------------------------------------------------- */
  async reviewsTable(query?: TableQueryInput | null) {
    const listedIds = await StoreProductModel.distinct('_id');
    const { docs, total, page, page_size } = await runTableQuery<Doc>(
      ProductReviewModel,
      { product_id: { $in: listedIds } },
      query,
      REVIEW_TABLE
    );
    const names = await productNames(docs.map((d: Doc) => d.product_id));
    return {
      rows: docs.map((d: Doc) => {
        const p = names.get(String(d.product_id));
        return {
          id: String(d._id),
          product_id: String(d.product_id),
          product_name: (p?.store as any)?.title || p?.product_name || '—',
          user_name: d.user_name ?? '',
          rating: d.rating,
          comment: d.comment ?? '',
          images: d.images ?? [],
          seller_reply: d.seller_reply ?? '',
          created_at: iso(d.created_at) ?? '',
        };
      }),
      total,
      page,
      page_size,
    };
  },

  async deleteReview(id: string) {
    const res = await ProductReviewModel.deleteOne({ _id: toObjectId(id) });
    return res.deletedCount > 0;
  },

  async replyReview(id: string, reply: string) {
    const text = String(reply ?? '').trim().slice(0, 1000);
    if (!text) badInput('Write the reply first');
    const res = await ProductReviewModel.updateOne(
      { _id: toObjectId(id) },
      { $set: { seller_reply: text, seller_reply_at: new Date() } }
    );
    if (res.matchedCount === 0) notFound('Review not found');
    return true;
  },

  /* --- coupons -------------------------------------------------------- */
  couponsTable: (query?: TableQueryInput | null) => couponService.tableForScope('STORE', query),

  async saveCoupon(id: string | null | undefined, input: Doc) {
    const payload = { ...input, scope: 'STORE', pod_id: null };
    if (!id) return couponService.create(payload);
    const existing = await CouponModel.findById(toObjectId(id)).select('scope').lean();
    if (existing?.scope !== 'STORE') notFound('Store coupon not found');
    return couponService.update(id, payload);
  },

  async deleteCoupon(id: string) {
    const existing = await CouponModel.findById(toObjectId(id)).select('scope').lean();
    if (existing?.scope !== 'STORE') notFound('Store coupon not found');
    return couponService.remove(id);
  },
};
