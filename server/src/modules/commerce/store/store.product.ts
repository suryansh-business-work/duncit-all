import { EMPTY_STORE_LISTING, type IStoreListing } from './store.listing.model';
import type { IStoreProduct, IStoreProductVariant } from './storeProduct.model';
import { round2 } from './store.shared';

/**
 * The one reading of a store product as something a shopper buys: its price,
 * its stock, and the shapes the storefront renders. Cart, checkout and the
 * shelves all price through here, so a card, a cart line and the charge can
 * never disagree about what something costs or whether it is in stock.
 */

type ProductLike = Pick<IStoreProduct, 'product_name' | 'unit_cost' | 'inventory_count'> & {
  _id: unknown;
  variants?: readonly IStoreProductVariant[] | null;
  store?: IStoreListing | null;
};

export const listingOf = (p: { store?: IStoreListing | null }): IStoreListing => ({
  ...EMPTY_STORE_LISTING,
  ...((p.store as any)?.toObject?.() ?? p.store ?? {}),
});

/** The product-level units free to sell. */
export const productAvailable = (p: ProductLike) => Math.max(0, Number(p.inventory_count) || 0);

/** A variant's sellable units: its own count, capped by the product's pool. */
export const variantAvailable = (p: ProductLike, v: Pick<IStoreProductVariant, 'inventory_count'>) =>
  Math.max(0, Math.min(Number(v.inventory_count) || 0, productAvailable(p)));

export const findVariant = (p: ProductLike, variantId: string) =>
  variantId ? ((p.variants ?? []).find((v) => String(v._id) === variantId) ?? null) : null;

/** What one unit costs and what it is struck through from, for a variant or the product. */
export function unitPriceOf(p: ProductLike, variant: IStoreProductVariant | null) {
  const listing = listingOf(p);
  const price = round2(Number(variant ? variant.unit_cost : p.unit_cost) || 0);
  const ownMrp = Number(variant?.mrp) || 0;
  const mrp = round2(Math.max(ownMrp || Number(listing.mrp) || 0, 0));
  return { price, mrp: mrp > price ? mrp : 0 };
}

export const discountPct = (price: number, mrp: number) =>
  mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;

/** Units available for one line: the variant's, else the product's. */
export function availableFor(p: ProductLike, variant: IStoreProductVariant | null) {
  return variant ? variantAvailable(p, variant) : productAvailable(p);
}

/** Most units one order may carry: the listing cap, else the store-wide one. */
export function maxPerOrder(p: ProductLike, settingsCap: number) {
  const listingCap = Number(listingOf(p).max_per_order) || 0;
  const caps = [listingCap, settingsCap].filter((n) => n > 0);
  return caps.length ? Math.min(...caps) : settingsCap;
}

/** The cheapest in-stock variant — what a card leads with. Falls back to any. */
function leadVariant(p: ProductLike): IStoreProductVariant | null {
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
  const images: string[] = [...(lead?.images ?? []), ...(p.images ?? [])].filter(Boolean);
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
    offer_text: listing.offer_text ?? '',
  };
}

/** The one option a store product's variants differ by, as the picker lists it. */
export function variantOptionsOf(p: any) {
  const variants: IStoreProductVariant[] = p.variants ?? [];
  if (variants.length === 0) return [];
  return [{ name: p.variant_option, values: variants.map((v) => v.option_label) }];
}

/** One purchasable variant as the product page lists it. */
export function toStoreVariant(p: any, v: IStoreProductVariant) {
  const { price, mrp } = unitPriceOf(p, v);
  const available = variantAvailable(p, v);
  return {
    id: String(v._id),
    label: v.option_label,
    option_values: [{ name: p.variant_option, value: v.option_label }],
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
