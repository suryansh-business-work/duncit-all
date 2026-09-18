import { Types } from 'mongoose';
import { InventoryProductModel, type IInventoryProduct } from '@modules/venues/inventory/inventory.model';
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
import { StoreFacetModel } from './storeTaxonomy.model';
import { getStoreSettings } from './storeSettings.model';
import { mailBackInStock, mailCartReminder } from './store.emails';
import { resolveStoreLines } from './store.pricing';
import { availableFor, findVariant, listingOf, totalAvailable } from './store.product';
import {
  badInput,
  cleanList,
  iso,
  nonNegative,
  notFound,
  round2,
  slugify,
  toObjectId,
  toObjectIds,
} from './store.shared';

/**
 * The ecomm portal's catalogue and customer operations: which products are on
 * the shelf and how they read there, who has bought, what was left in carts,
 * who is waiting for stock, what reviewers said, and the store's own coupons.
 */

type Doc = Record<string, any>;

/* ------------------------------------------------------------------ *
 * Listings
 * ------------------------------------------------------------------ */

const LISTING_TABLE: TableEntityConfig = {
  searchFields: ['product_name', 'sku', 'brand_name', 'store.slug', 'store.title', 'tags'],
  sortFields: {
    product_name: 'product_name',
    sku: 'sku',
    brand_name: 'brand_name',
    price: 'unit_cost',
    inventory_count: 'inventory_count',
    listed: 'store.listed',
    featured: 'store.featured',
    sort_rank: 'store.sort_rank',
    sold_count: 'store.sold_count',
    view_count: 'store.view_count',
    wishlist_count: 'store.wishlist_count',
    updated_at: 'updated_at',
  },
  filterFields: {
    listed: { path: 'store.listed', type: 'boolean' },
    featured: { path: 'store.featured', type: 'boolean' },
    brand_name: { type: 'string' },
    status: { type: 'enum' },
    ownership: { type: 'enum' },
    pet_type_id: { path: 'store.pet_type_ids', type: 'string' },
    category_id: { path: 'store.category_ids', type: 'string' },
    price: { path: 'unit_cost', type: 'number' },
    updated_at: { type: 'date' },
  },
  defaultSort: { 'store.listed': -1, 'store.sort_rank': -1, updated_at: -1, _id: -1 },
};

const listingRow = (p: IInventoryProduct | Doc) => {
  const s = listingOf(p);
  return {
    id: String(p._id),
    product_name: p.product_name,
    sku: p.sku,
    brand_name: p.brand_name ?? '',
    image_url: p.image_url || p.images?.[0] || '',
    price: p.unit_cost,
    mrp: s.mrp,
    available: totalAvailable(p as any),
    variant_count: (p.variants ?? []).length,
    status: p.status,
    is_active: p.is_active !== false,
    review_status: p.listing_review_status,
    has_warehouse: !!p.pickup_location_id,
    listed: s.listed,
    slug: s.slug,
    title: s.title,
    badge: s.badge,
    featured: s.featured,
    sort_rank: s.sort_rank,
    pet_type_ids: s.pet_type_ids.map(String),
    category_ids: s.category_ids.map(String),
    sold_count: s.sold_count,
    view_count: s.view_count,
    wishlist_count: s.wishlist_count,
    listed_at: iso(s.listed_at),
    updated_at: iso(p.updated_at) ?? '',
  };
};

/** The full editable listing, with the product facts the editor shows beside it. */
const listingDetail = (p: IInventoryProduct | Doc) => {
  const s = listingOf(p);
  return {
    ...listingRow(p),
    short_description: p.short_description ?? '',
    description: p.description ?? '',
    images: [p.image_url, ...(p.images ?? [])].filter(Boolean),
    variants: (p.variants ?? []).map((v: Doc) => ({
      id: String(v._id),
      label: v.option_label || [v.color, v.size_label].filter(Boolean).join(' / '),
      sku: v.sku ?? '',
      price: v.unit_cost ?? 0,
      mrp: v.mrp ?? 0,
      available: availableFor(p as any, v as any),
    })),
    facet_values: s.facet_values.map((f) => ({ facet_id: String(f.facet_id), values: f.values })),
    highlights: s.highlights,
    specifications: s.specifications.map((x) => ({ label: x.label, value: x.value })),
    ingredients: s.ingredients,
    feeding_guide: s.feeding_guide,
    care_instructions: s.care_instructions,
    seo_title: s.seo_title,
    seo_description: s.seo_description,
    search_keywords: s.search_keywords,
    video_url: s.video_url,
    cod_available: s.cod_available,
    returnable: s.returnable,
    return_window_days: s.return_window_days,
    max_per_order: s.max_per_order,
  };
};

/** A free listing slug built from `wanted`, suffixed until no LISTED product holds it. */
async function freeSlug(wanted: string, selfId: Types.ObjectId) {
  const base = slugify(wanted) || `product-${String(selfId).slice(-6)}`;
  for (let n = 0; n < 50; n += 1) {
    const slug = n === 0 ? base : `${base}-${n + 1}`;
    const clash = await InventoryProductModel.exists({ _id: { $ne: selfId }, 'store.listed': true, 'store.slug': slug });
    if (!clash) return slug;
  }
  return `${base}-${String(selfId).slice(-6)}`;
}

/** The facet values a listing may carry: known facets, known option slugs. */
async function cleanFacetValues(values: Doc[] | null | undefined) {
  const facets = await StoreFacetModel.find({ _id: { $in: toObjectIds((values ?? []).map((v) => v.facet_id)) } }).lean();
  const allowed = new Map(facets.map((f) => [String(f._id), new Set(f.options.map((o) => o.slug))]));
  return (values ?? [])
    .map((v) => ({
      facet_id: toObjectId(v.facet_id),
      values: cleanList(v.values, 30).filter((slug) => allowed.get(String(v.facet_id))?.has(slug)),
    }))
    .filter((v) => v.facet_id && v.values.length > 0);
}

function assertListable(p: IInventoryProduct) {
  if (p.listing_review_status !== 'APPROVED') badInput('Only an approved product can go on the store');
  if (p.is_active === false) badInput('This product is paused in the catalogue — resume it first');
  if (p.status === 'ARCHIVED' || p.status === 'DRAFT') badInput('An archived or draft product cannot go on the store');
}

async function listingFields(p: IInventoryProduct, input: Doc) {
  const current = listingOf(p);
  const listed = input.listed ?? current.listed;
  const slug = await freeSlug(String(input.slug || current.slug || p.product_name), p._id as Types.ObjectId);
  if (input.slug && slugify(input.slug) !== slug) badInput(`The URL key "${slugify(input.slug)}" is already used by a listed product`);
  const spec = ((input.specifications ?? current.specifications) as Doc[])
    .map((x) => ({ label: String(x.label ?? '').trim(), value: String(x.value ?? '').trim() }))
    .filter((x) => x.label && x.value)
    .slice(0, 40);
  const has = (key: string) => input[key] !== undefined && input[key] !== null;
  return {
    ...current,
    listed,
    slug,
    title: has('title') ? String(input.title).trim() : current.title,
    pet_type_ids: has('pet_type_ids') ? toObjectIds(input.pet_type_ids) : current.pet_type_ids,
    category_ids: has('category_ids') ? toObjectIds(input.category_ids) : current.category_ids,
    facet_values: has('facet_values') ? await cleanFacetValues(input.facet_values) : current.facet_values,
    mrp: has('mrp') ? nonNegative(input.mrp) : current.mrp,
    highlights: has('highlights') ? cleanList(input.highlights, 12) : current.highlights,
    specifications: spec,
    ingredients: has('ingredients') ? String(input.ingredients) : current.ingredients,
    feeding_guide: has('feeding_guide') ? String(input.feeding_guide) : current.feeding_guide,
    care_instructions: has('care_instructions') ? String(input.care_instructions) : current.care_instructions,
    badge: has('badge') ? String(input.badge).trim().slice(0, 40) : current.badge,
    featured: has('featured') ? !!input.featured : current.featured,
    sort_rank: has('sort_rank') ? Math.floor(Number(input.sort_rank) || 0) : current.sort_rank,
    seo_title: has('seo_title') ? String(input.seo_title).trim() : current.seo_title,
    seo_description: has('seo_description') ? String(input.seo_description).trim() : current.seo_description,
    search_keywords: has('search_keywords') ? cleanList(input.search_keywords, 30) : current.search_keywords,
    video_url: has('video_url') ? String(input.video_url).trim() : current.video_url,
    cod_available: has('cod_available') ? !!input.cod_available : current.cod_available,
    returnable: has('returnable') ? !!input.returnable : current.returnable,
    return_window_days:
      input.return_window_days === undefined ? current.return_window_days : input.return_window_days === null ? null : nonNegative(input.return_window_days),
    max_per_order: has('max_per_order') ? Math.floor(nonNegative(input.max_per_order)) : current.max_per_order,
    listed_at: listed ? current.listed_at ?? new Date() : current.listed_at,
  };
}

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
  const docs = await InventoryProductModel.find({ _id: { $in: toObjectIds(ids) } })
    .select('product_name store.title store.slug image_url images')
    .lean();
  return new Map(docs.map((d) => [String(d._id), d]));
}

export const storeAdminCatalogService = {
  /* --- listings ------------------------------------------------------- */
  async listingsTable(query?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IInventoryProduct>(
      InventoryProductModel,
      { listing_review_status: 'APPROVED' },
      query,
      LISTING_TABLE
    );
    return { rows: docs.map(listingRow), total, page, page_size };
  },

  async listing(productId: string) {
    const doc = await InventoryProductModel.findById(toObjectId(productId)).lean();
    if (!doc) notFound('Product not found');
    return listingDetail(doc);
  },

  async saveListing(productId: string, input: Doc) {
    const doc = await InventoryProductModel.findById(toObjectId(productId));
    if (!doc) notFound('Product not found');
    const fields = await listingFields(doc, input);
    if (fields.listed) assertListable(doc);
    doc.store = fields as any;
    for (const vm of (input.variant_mrps ?? []) as Doc[]) {
      const variant = findVariant(doc as any, String(vm.variant_id ?? ''));
      if (variant) variant.mrp = nonNegative(vm.mrp);
    }
    await doc.save();
    return listingDetail(doc);
  },

  /** Put many products on (or off) the shelf at once. Listing mints a slug when missing. */
  async setListed(productIds: string[], listed: boolean) {
    const docs = await InventoryProductModel.find({ _id: { $in: toObjectIds(productIds) } });
    let changed = 0;
    for (const doc of docs) {
      if (listed) {
        try {
          assertListable(doc);
        } catch {
          continue;
        }
      }
      const current = listingOf(doc);
      doc.store = {
        ...current,
        listed,
        slug: listed ? await freeSlug(current.slug || doc.product_name, doc._id as Types.ObjectId) : current.slug,
        listed_at: listed ? current.listed_at ?? new Date() : current.listed_at,
      } as any;
      await doc.save();
      changed += 1;
    }
    return changed;
  },

  /** File many products under the same pet types / categories (added, never replaced). */
  async bulkFile(productIds: string[], petTypeIds: string[], categoryIds: string[]) {
    const res = await InventoryProductModel.updateMany(
      { _id: { $in: toObjectIds(productIds) } },
      {
        $addToSet: {
          'store.pet_type_ids': { $each: toObjectIds(petTypeIds) },
          'store.category_ids': { $each: toObjectIds(categoryIds) },
        },
      }
    );
    return res.modifiedCount;
  },

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
    const products = await InventoryProductModel.find({
      _id: { $in: pending.map((a) => a.product_id) },
      'store.listed': true,
      is_active: true,
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
    const listedIds = await InventoryProductModel.distinct('_id', { 'store.listed': true });
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
