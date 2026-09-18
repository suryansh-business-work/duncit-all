import type { IInventoryProduct, IProductVariant } from '@modules/venues/inventory/inventory.model';
import { availableOf } from '@modules/venues/inventory/inventory.service';
import { EMPTY_STORE_LISTING, type IStoreListing } from './store.listing.model';
import { round2 } from './store.shared';

/**
 * The one reading of a catalogue product as a pet-store item: its price, its
 * stock, and the shapes the storefront renders. Cart, checkout and the shelves
 * all price through here, so a card, a cart line and the charge can never
 * disagree about what something costs or whether it is in stock.
 */

type ProductLike = Pick<
  IInventoryProduct,
  | 'product_name'
  | 'unit_cost'
  | 'variants'
  | 'inventory_count'
  | 'requested_count'
  | 'reserved_count'
  | 'max_order_qty'
  | 'min_order_qty'
> & { _id: unknown; store?: IStoreListing | null };

export const listingOf = (p: { store?: IStoreListing | null }): IStoreListing => ({
  ...EMPTY_STORE_LISTING,
  ...((p.store as any)?.toObject?.() ?? p.store ?? {}),
});

/** The product-level units free to sell (net of pod reservations). */
export const productAvailable = (p: ProductLike) => availableOf(p);

/** A variant's sellable units: its own count, capped by the product's pool. */
export const variantAvailable = (p: ProductLike, v: Pick<IProductVariant, 'inventory_count'>) =>
  Math.max(0, Math.min(Number(v.inventory_count) || 0, productAvailable(p)));

export const findVariant = (p: ProductLike, variantId: string) =>
  variantId ? ((p.variants ?? []).find((v) => String(v._id) === variantId) ?? null) : null;

/** What one unit costs and what it is struck through from, for a variant or the product. */
export function unitPriceOf(p: ProductLike, variant: IProductVariant | null) {
  const listing = listingOf(p);
  const price = round2(Number(variant ? variant.unit_cost : p.unit_cost) || 0);
  const ownMrp = Number(variant?.mrp) || 0;
  const mrp = round2(Math.max(ownMrp || Number(listing.mrp) || 0, 0));
  return { price, mrp: mrp > price ? mrp : 0 };
}

export const discountPct = (price: number, mrp: number) =>
  mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;

/** Units available for one line: the variant's, else the product's. */
export function availableFor(p: ProductLike, variant: IProductVariant | null) {
  return variant ? variantAvailable(p, variant) : productAvailable(p);
}

/** Most units one order may carry: the listing cap, else the product's own. */
export function maxPerOrder(p: ProductLike, settingsCap: number) {
  const listingCap = Number(listingOf(p).max_per_order) || 0;
  const productCap = Number(p.max_order_qty) || 0;
  const caps = [listingCap, productCap, settingsCap].filter((n) => n > 0);
  return caps.length ? Math.min(...caps) : settingsCap;
}

/** The cheapest in-stock variant — what a card leads with. Falls back to any. */
function leadVariant(p: ProductLike): IProductVariant | null {
  const variants = p.variants ?? [];
  if (variants.length === 0) return null;
  const inStock = variants.filter((v) => variantAvailable(p, v) > 0);
  const pool = inStock.length ? inStock : variants;
  return pool.reduce((min, v) => (Number(v.unit_cost) < Number(min.unit_cost) ? v : min), pool[0]);
}

/** Total sellable units across the product (or its variants). */
export function totalAvailable(p: ProductLike) {
  const variants = p.variants ?? [];
  if (variants.length === 0) return productAvailable(p);
  return Math.min(
    productAvailable(p),
    variants.reduce((sum, v) => sum + (Number(v.inventory_count) || 0), 0)
  );
}

export interface RatingSummary {
  average: number;
  count: number;
}

const NO_RATING: RatingSummary = { average: 0, count: 0 };

/** A product as a shelf card. */
export function toStoreCard(p: any, rating?: RatingSummary) {
  const listing = listingOf(p);
  const lead = leadVariant(p);
  const { price, mrp } = unitPriceOf(p, lead);
  const images: string[] = [...(lead?.images ?? []), ...(p.images ?? []), p.image_url].filter(Boolean);
  const available = totalAvailable(p);
  return {
    id: String(p._id),
    slug: listing.slug,
    title: listing.title || p.product_name,
    brand_id: p.brand_id ? String(p.brand_id) : null,
    brand_name: p.brand_name ?? '',
    image_url: images[0] ?? '',
    hover_image_url: images[1] ?? '',
    price,
    mrp,
    discount_pct: discountPct(price, mrp),
    has_variants: (p.variants ?? []).length > 0,
    in_stock: available > 0,
    low_stock: available > 0 && available <= Number(p.low_stock_alert || 0),
    badge: listing.badge,
    featured: listing.featured,
    rating: (rating ?? NO_RATING).average,
    rating_count: (rating ?? NO_RATING).count,
    short_description: p.short_description ?? '',
  };
}

/** One purchasable variant as the product page lists it. */
export function toStoreVariant(p: any, v: IProductVariant) {
  const { price, mrp } = unitPriceOf(p, v);
  const available = variantAvailable(p, v);
  return {
    id: String(v._id),
    label: v.option_label || [v.color, v.size_label].filter(Boolean).join(' / '),
    option_values: (v.option_values ?? []).map((o) => ({ name: o.name, value: o.value })),
    sku: v.sku,
    price,
    mrp,
    discount_pct: discountPct(price, mrp),
    available,
    in_stock: available > 0,
    images: v.images ?? [],
    weight_kg: Number(v.weight_kg) || 0,
  };
}
