import { Types } from 'mongoose';
import { BrandPickupLocationModel } from '@modules/venues/brandPickupLocation/brandPickupLocation.model';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { StoreBrandModel, StoreFacetModel } from './storeTaxonomy.model';
import {
  StoreProductModel,
  type IStoreProduct,
  type IStoreProductVariant,
  type StoreProductStatus,
} from './storeProduct.model';
import {
  assertMrp,
  packagingMissing,
  parcelOf as packedParcelOf,
  validatePackagingInput,
} from '@modules/venues/inventory/inventory.packaging';
import { listingOf, totalAvailable } from './store.product';
import { badInput, cleanList, iso, nonNegative, notFound, secretKey, slugify, toObjectId, toObjectIds } from './store.shared';

/**
 * The Ecomm portal's own catalogue: products created, edited, drafted and
 * published here, and nowhere else. A DRAFT saves whatever has been filled in;
 * PUBLISHED puts the product on the store and first checks it can be sold.
 */

type Doc = Record<string, any>;

const PRODUCT_TABLE: TableEntityConfig = {
  searchFields: ['product_name', 'sku', 'brand_name', 'store.slug', 'store.title'],
  sortFields: {
    product_name: 'product_name',
    sku: 'sku',
    brand_name: 'brand_name',
    price: 'unit_cost',
    inventory_count: 'inventory_count',
    status: 'status',
    featured: 'store.featured',
    sort_rank: 'store.sort_rank',
    sold_count: 'store.sold_count',
    view_count: 'store.view_count',
    wishlist_count: 'store.wishlist_count',
    updated_at: 'updated_at',
  },
  filterFields: {
    status: { type: 'enum' },
    featured: { path: 'store.featured', type: 'boolean' },
    brand_name: { type: 'string' },
    pet_type_id: { path: 'store.pet_type_ids', type: 'string' },
    category_id: { path: 'store.category_ids', type: 'string' },
    price: { path: 'unit_cost', type: 'number' },
    updated_at: { type: 'date' },
  },
  defaultSort: { updated_at: -1, _id: -1 },
};

const productRow = (p: Doc) => {
  const s = listingOf(p);
  return {
    id: String(p._id),
    product_name: p.product_name,
    sku: p.sku,
    brand_id: p.brand_id ? String(p.brand_id) : null,
    brand_name: p.brand_name,
    image_url: p.images[0] ?? '',
    price: p.unit_cost,
    mrp: s.mrp,
    available: totalAvailable(p as any),
    // What stops it shipping with ShipRocket, and what one unit is billed at.
    packaging_missing: packagingMissing(p as never),
    chargeable_weight_kg: packedParcelOf(p).chargeable_weight_kg,
    variant_count: p.variants.length,
    status: p.status,
    has_warehouse: !!p.pickup_location_id,
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
    published_at: iso(s.listed_at),
    updated_at: iso(p.updated_at) ?? '',
  };
};

const variantOut = (v: IStoreProductVariant) => ({
  id: v._id.toHexString(),
  option_label: v.option_label,
  sku: v.sku,
  price: v.unit_cost,
  mrp: v.mrp,
  stock: v.inventory_count,
  images: v.images,
  weight_kg: v.weight_kg,
  length_cm: v.length_cm,
  breadth_cm: v.breadth_cm,
  height_cm: v.height_cm,
});

/** Everything the editor page shows and saves back. */
const productDetail = (p: Doc) => {
  const s = listingOf(p);
  return {
    ...productRow(p),
    short_description: p.short_description,
    description: p.description,
    images: p.images,
    stock: p.inventory_count,
    low_stock_alert: p.low_stock_alert,
    weight_kg: p.weight_kg,
    length_cm: p.length_cm,
    breadth_cm: p.breadth_cm,
    height_cm: p.height_cm,
    package_type: p.package_type ?? 'BOX',
    hsn_code: p.hsn_code ?? '',
    is_fragile: !!p.is_fragile,
    is_liquid: !!p.is_liquid,
    shelf_life_days: p.shelf_life_days ?? null,
    volumetric_weight_kg: packedParcelOf(p).volumetric_weight_kg,
    warehouse_id: p.pickup_location_id ? String(p.pickup_location_id) : null,
    variant_option: p.variant_option,
    variants: p.variants.map(variantOut),
    facet_values: s.facet_values.map((f) => ({ facet_id: f.facet_id.toHexString(), values: f.values })),
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

/** A free URL key built from `wanted`, suffixed until no PUBLISHED product holds it. */
async function freeSlug(wanted: string, selfId: Types.ObjectId) {
  const base = slugify(wanted) || `product-${selfId.toHexString().slice(-6)}`;
  for (let n = 0; n < 50; n += 1) {
    const slug = n === 0 ? base : `${base}-${n + 1}`;
    const clash = await StoreProductModel.exists({ _id: { $ne: selfId }, status: 'PUBLISHED', 'store.slug': slug });
    if (!clash) return slug;
  }
  return `${base}-${selfId.toHexString().slice(-6)}`;
}

/** A SKU no other store product holds: the one typed, else a minted `PET-XXXXXX`. */
async function freeSku(wanted: string, selfId: Types.ObjectId) {
  const typed = String(wanted ?? '').trim().toUpperCase();
  if (typed) {
    const clash = await StoreProductModel.exists({ _id: { $ne: selfId }, sku: typed });
    if (clash) badInput(`The SKU "${typed}" is already used by another product`);
    return typed;
  }
  for (let n = 0; n < 10; n += 1) {
    const minted = `PET-${secretKey(3).toUpperCase()}`;
    if (!(await StoreProductModel.exists({ sku: minted }))) return minted;
  }
  return `PET-${secretKey(6).toUpperCase()}`;
}

/** The facet values a product may carry: known facets, known option slugs. */
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

/** Parcel facts, as saved: never negative. */
const parcelOf = (input: Doc) => ({
  weight_kg: nonNegative(input.weight_kg),
  length_cm: nonNegative(input.length_cm),
  breadth_cm: nonNegative(input.breadth_cm),
  height_cm: nonNegative(input.height_cm),
});

/** The variants as typed, keeping each existing variant's id so carts that hold it stay valid. */
function variantsOf(input: Doc[], current: readonly IStoreProductVariant[]) {
  const known = new Set(current.map((v) => v._id.toHexString()));
  return input.slice(0, 60).map((v) => ({
    _id: known.has(String(v.id)) ? new Types.ObjectId(String(v.id)) : new Types.ObjectId(),
    option_label: String(v.option_label ?? '').trim(),
    sku: String(v.sku ?? '').trim().toUpperCase(),
    unit_cost: nonNegative(v.price),
    mrp: nonNegative(v.mrp),
    inventory_count: Math.floor(nonNegative(v.stock)),
    images: cleanList(v.images, 12),
    ...parcelOf(v),
  }));
}

/** One of the store's brands, as the product records it. No brand picked is allowed. */
async function brandOf(id: unknown) {
  const oid = toObjectId(id);
  if (!oid) return { brand_id: null, brand_name: '' };
  const brand = await StoreBrandModel.findById(oid).select('name').lean();
  if (!brand) badInput('That brand no longer exists — pick another');
  return { brand_id: oid, brand_name: brand.name };
}

/** A warehouse the store may ship from: one of Duncit's own. Null when none is picked. */
async function warehouseOf(id: unknown) {
  const oid = toObjectId(id);
  if (!oid) return null;
  const found = await BrandPickupLocationModel.exists({ _id: oid, owner_kind: 'DUNCIT' });
  if (!found) badInput('Pick one of Duncit’s warehouses');
  return oid;
}

/** The courier's bounds and MRP-over-price, for the product and each variant, before anything is saved. */
function checkPackagingInput(input: Doc) {
  validatePackagingInput(input);
  const variants = (input.variants ?? []) as Doc[];
  if (variants.length === 0) assertMrp(nonNegative(input.price), input.mrp);
  for (const v of variants) {
    const label = String(v.option_label ?? '').trim() || String(v.sku ?? '').trim();
    validatePackagingInput(v, label);
    assertMrp(nonNegative(v.price), v.mrp, label);
  }
}

/** The packaging values that are product-wide — the four dimensions go with parcelOf. */
const packagingOf = (input: Doc) => ({
  package_type: input.package_type ?? 'BOX',
  hsn_code: String(input.hsn_code ?? '').trim().slice(0, 8),
  is_fragile: !!input.is_fragile,
  is_liquid: !!input.is_liquid,
  shelf_life_days: input.shelf_life_days ?? null,
});

async function applyProduct(doc: IStoreProduct, input: Doc) {
  checkPackagingInput(input);
  const variants = variantsOf(input.variants ?? [], doc.variants);
  doc.product_name = String(input.product_name ?? '').trim();
  doc.sku = await freeSku(input.sku, doc._id);
  Object.assign(doc, await brandOf(input.brand_id));
  doc.short_description = String(input.short_description ?? '').trim();
  doc.description = String(input.description ?? '');
  doc.images = cleanList(input.images, 20);
  doc.low_stock_alert = Math.floor(nonNegative(input.low_stock_alert));
  doc.pickup_location_id = await warehouseOf(input.warehouse_id);
  doc.variant_option = variants.length ? String(input.variant_option ?? '').trim() : '';
  doc.set('variants', variants);
  Object.assign(doc, parcelOf(input), packagingOf(input));
  // With variants the product's own price and stock are theirs: the cheapest
  // price, and the sum of their counts (which caps nothing).
  doc.unit_cost = variants.length ? Math.min(...variants.map((v) => v.unit_cost)) : nonNegative(input.price);
  doc.inventory_count = variants.length
    ? variants.reduce((sum, v) => sum + v.inventory_count, 0)
    : Math.floor(nonNegative(input.stock));
}

async function listingFields(doc: IStoreProduct, input: Doc, publishing: boolean) {
  const current = listingOf(doc);
  // Null (or not sent) is "the store's default window".
  const returnWindow = input.return_window_days ?? null;
  const wanted = String(input.slug || current.slug || input.title || doc.product_name);
  const slug = await freeSlug(wanted, doc._id);
  if (input.slug && slugify(input.slug) !== slug) {
    badInput(`The URL key "${slugify(input.slug)}" is already used by a published product`);
  }
  return {
    ...current,
    slug,
    title: String(input.title ?? '').trim(),
    pet_type_ids: toObjectIds(input.pet_type_ids),
    category_ids: toObjectIds(input.category_ids),
    facet_values: await cleanFacetValues(input.facet_values),
    mrp: nonNegative(input.mrp),
    highlights: cleanList(input.highlights, 12),
    specifications: ((input.specifications ?? []) as Doc[])
      .map((x) => ({ label: String(x.label ?? '').trim(), value: String(x.value ?? '').trim() }))
      .filter((x) => x.label && x.value)
      .slice(0, 40),
    ingredients: String(input.ingredients ?? ''),
    feeding_guide: String(input.feeding_guide ?? ''),
    care_instructions: String(input.care_instructions ?? ''),
    badge: String(input.badge ?? '').trim().slice(0, 40),
    featured: !!input.featured,
    sort_rank: Math.floor(Number(input.sort_rank) || 0),
    seo_title: String(input.seo_title ?? '').trim(),
    seo_description: String(input.seo_description ?? '').trim(),
    search_keywords: cleanList(input.search_keywords, 30),
    video_url: String(input.video_url ?? '').trim(),
    cod_available: input.cod_available !== false,
    returnable: input.returnable !== false,
    return_window_days: returnWindow === null ? null : nonNegative(returnWindow),
    max_per_order: Math.floor(nonNegative(input.max_per_order)),
    listed_at: current.listed_at ?? (publishing ? new Date() : null),
  };
}

/** What still stands between a product and the shelf — empty when it can be sold. */
export function publishGaps(
  p: Pick<
    IStoreProduct,
    | 'unit_cost'
    | 'images'
    | 'pickup_location_id'
    | 'weight_kg'
    | 'length_cm'
    | 'breadth_cm'
    | 'height_cm'
    | 'hsn_code'
    | 'product_name'
    | 'brand_id'
    | 'variant_option'
    | 'store'
  > & { variants: readonly IStoreProductVariant[] }
) {
  const gaps: string[] = [];
  const variants = p.variants;
  if (variants.length === 0 && p.unit_cost <= 0) gaps.push('a selling price');
  if (variants.some((v) => !v.option_label || v.unit_cost <= 0)) gaps.push('a name and price for every variant');
  if (variants.length > 0 && !p.variant_option) gaps.push('what the variants differ by (e.g. Size)');
  if (p.images.length === 0) gaps.push('at least one photo');
  if (listingOf(p).category_ids.length === 0) gaps.push('a category');
  if (!p.pickup_location_id) gaps.push('the warehouse it ships from');
  if (!p.brand_id) gaps.push('a brand');
  // ShipRocket bills the packed parcel: every variant's (falling back to the
  // product's) weight and L × B × H, and the HSN code for the GST invoice.
  const packaging = packagingMissing(p as never);
  if (packaging.length > 0) gaps.push(`the packaging (${packaging.join('; ')})`);
  return gaps;
}

function assertPublishable(p: IStoreProduct) {
  const gaps = publishGaps(p);
  if (gaps.length) badInput(`Before publishing, add ${gaps.join(', ')}`);
}

const STATUSES = new Set<StoreProductStatus>(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

export const storeAdminProductsService = {
  async table(query?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IStoreProduct>(StoreProductModel, {}, query, PRODUCT_TABLE);
    return { rows: docs.map(productRow), total, page, page_size };
  },

  async get(id: string) {
    const doc = await StoreProductModel.findById(toObjectId(id)).lean();
    if (!doc) notFound('Product not found');
    return productDetail(doc);
  },

  /** Create (no id) or update a product, saved as `status`. */
  async save(userId: string, id: string | null | undefined, input: Doc, status: StoreProductStatus) {
    if (!STATUSES.has(status)) badInput('Unknown product status');
    const doc = id ? await StoreProductModel.findById(toObjectId(id)) : new StoreProductModel({ created_by: toObjectId(userId) });
    if (!doc) notFound('Product not found');
    if (!String(input.product_name ?? '').trim()) badInput('Give the product a name');
    await applyProduct(doc, input);
    doc.store = (await listingFields(doc, input, status === 'PUBLISHED')) as any;
    doc.status = status;
    doc.updated_by = toObjectId(userId);
    if (status === 'PUBLISHED') assertPublishable(doc);
    await doc.save();
    return productDetail(doc.toObject());
  },

  /** Publish, move to draft or archive many at once. A product not ready to publish is skipped. */
  async setStatus(ids: string[], status: StoreProductStatus) {
    if (!STATUSES.has(status)) badInput('Unknown product status');
    const docs = await StoreProductModel.find({ _id: { $in: toObjectIds(ids) } });
    let changed = 0;
    for (const doc of docs) {
      if (status === 'PUBLISHED' && publishGaps(doc).length > 0) continue;
      if (status === 'PUBLISHED') {
        const current = listingOf(doc);
        doc.store = { ...current, slug: await freeSlug(current.slug || doc.product_name, doc._id), listed_at: current.listed_at ?? new Date() } as any;
      }
      doc.status = status;
      await doc.save();
      changed += 1;
    }
    return changed;
  },

  /** File many products under the same pet types / categories (added, never replaced). */
  async bulkFile(ids: string[], petTypeIds: string[], categoryIds: string[]) {
    const res = await StoreProductModel.updateMany(
      { _id: { $in: toObjectIds(ids) } },
      {
        $addToSet: {
          'store.pet_type_ids': { $each: toObjectIds(petTypeIds) },
          'store.category_ids': { $each: toObjectIds(categoryIds) },
        },
      }
    );
    return res.modifiedCount;
  },

  /** Duncit's own warehouses — where a store product may ship from. */
  async warehouses() {
    const rows = await BrandPickupLocationModel.find({ owner_kind: 'DUNCIT' }).sort({ is_default: -1, nickname: 1 }).lean();
    return rows.map((w) => ({
      id: String(w._id),
      nickname: w.nickname,
      city: w.city,
      pincode: w.pincode,
      is_default: w.is_default,
      shiprocket_ready: w.shiprocket_registered,
    }));
  },
};
