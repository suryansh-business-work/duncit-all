import { Types, type PipelineStage } from 'mongoose';
import { ProductReviewModel } from '@modules/venues/productReview/productReview.model';
import { productReviewService } from '@modules/venues/productReview/productReview.service';
import { StoreBrandModel, StoreCategoryModel, StoreFacetModel, StorePetTypeModel } from './storeTaxonomy.model';
import { StoreCollectionModel, type IStoreCollection } from './storeMerch.model';
import { getStoreSettings } from './storeSettings.model';
import { StoreProductModel } from './storeProduct.model';
import {
  discountPct,
  listingOf,
  toStoreCard,
  toStoreVariant,
  totalAvailable,
  unitPriceOf,
  variantOptionsOf,
  type RatingSummary,
} from './store.product';
import { round2, searchRegex, toObjectIds } from './store.shared';

/**
 * The storefront's reads of the catalogue: the shelf search (filters, sort,
 * facet counts), a product page, and the lists a page hangs off it. Public — a
 * shopper browses without signing in — so nothing here returns anything the
 * product's own public fields do not already say.
 */

/** Published: the only products a shopper may ever see. */
export function listedFilter(extra: Record<string, unknown> = {}) {
  return { status: 'PUBLISHED', ...extra };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Average stars and review count for a batch of products, in one read. */
export async function ratingsFor(ids: readonly unknown[]): Promise<Map<string, RatingSummary>> {
  const objectIds = toObjectIds(ids);
  if (objectIds.length === 0) return new Map();
  const rows = await ProductReviewModel.aggregate<{ _id: Types.ObjectId; average: number; count: number }>([
    { $match: { product_id: { $in: objectIds } } },
    { $group: { _id: '$product_id', average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), { average: round1(r.average), count: r.count }]));
}

/** Cards for a list of product docs, ratings included. */
export async function cardsFor(docs: any[]) {
  const ratings = await ratingsFor(docs.map((d) => d._id));
  return docs.map((d) => toStoreCard(d, ratings.get(String(d._id))));
}

/** A category and every category beneath it — a shelf for "Food" shows Dry Food too. */
async function categoryWithDescendants(rootId: Types.ObjectId): Promise<Types.ObjectId[]> {
  const all = await StoreCategoryModel.find({ is_active: true }).select('_id parent_id').lean();
  const children = new Map<string, Types.ObjectId[]>();
  for (const c of all) {
    const parent = c.parent_id ? String(c.parent_id) : '';
    children.set(parent, [...(children.get(parent) ?? []), c._id as Types.ObjectId]);
  }
  const out: Types.ObjectId[] = [];
  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift()!;
    out.push(id);
    queue.push(...(children.get(String(id)) ?? []));
  }
  return out;
}

export type StoreSort =
  | 'RELEVANCE'
  | 'NEWEST'
  | 'PRICE_ASC'
  | 'PRICE_DESC'
  | 'BESTSELLING'
  | 'DISCOUNT'
  | 'RATING';

export interface StoreFacetFilter {
  facet: string;
  values: string[];
}

export interface StoreSearchInput {
  q?: string | null;
  pet_type?: string | null;
  category?: string | null;
  collection?: string | null;
  brand_ids?: string[] | null;
  facets?: StoreFacetFilter[] | null;
  min_price?: number | null;
  max_price?: number | null;
  in_stock_only?: boolean | null;
  on_sale?: boolean | null;
  /** At least this much off MRP — a flash sale's "30% and more" tab. */
  min_discount_pct?: number | null;
  sort?: StoreSort | null;
  page?: number | null;
  page_size?: number | null;
}

const SORTS: Record<StoreSort, Record<string, 1 | -1>> = {
  RELEVANCE: { _in_stock: -1, 'store.featured': -1, 'store.sort_rank': -1, 'store.sold_count': -1, _id: -1 },
  NEWEST: { 'store.listed_at': -1, _id: -1 },
  PRICE_ASC: { _price: 1, _id: 1 },
  PRICE_DESC: { _price: -1, _id: -1 },
  BESTSELLING: { 'store.sold_count': -1, _id: -1 },
  DISCOUNT: { _discount: -1, _id: -1 },
  RATING: { _rating: -1, _rating_count: -1, _id: -1 },
};

/** The derived columns every shelf sorts and filters on — price, MRP, stock, discount. */
const DERIVED_STAGES: PipelineStage[] = [
  { $addFields: { _variant_count: { $size: { $ifNull: ['$variants', []] } } } },
  {
    $addFields: {
      _price: {
        $cond: [{ $gt: ['$_variant_count', 0] }, { $min: '$variants.unit_cost' }, '$unit_cost'],
      },
      _mrp: {
        $cond: [{ $gt: ['$store.mrp', 0] }, '$store.mrp', { $ifNull: [{ $max: '$variants.mrp' }, 0] }],
      },
      _available: { $max: [0, '$inventory_count'] },
      _variant_stock: { $sum: '$variants.inventory_count' },
    },
  },
  {
    $addFields: {
      _in_stock: {
        $and: [
          { $gt: ['$_available', 0] },
          { $or: [{ $eq: ['$_variant_count', 0] }, { $gt: ['$_variant_stock', 0] }] },
        ],
      },
      _discount: {
        $cond: [
          { $gt: ['$_mrp', '$_price'] },
          { $multiply: [{ $divide: [{ $subtract: ['$_mrp', '$_price'] }, '$_mrp'] }, 100] },
          0,
        ],
      },
    },
  },
];

/** Stars joined on, only for the one sort that needs them. */
const RATING_STAGES = (): PipelineStage[] => [
  {
    $lookup: {
      from: ProductReviewModel.collection.name,
      let: { pid: '$_id' },
      pipeline: [
        { $match: { $expr: { $eq: ['$product_id', '$$pid'] } } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ],
      as: '_reviews',
    },
  },
  {
    $addFields: {
      _rating: { $ifNull: [{ $first: '$_reviews.avg' }, 0] },
      _rating_count: { $ifNull: [{ $first: '$_reviews.count' }, 0] },
    },
  },
];

/** The heavy text a shelf never renders. */
const SHELF_PROJECTION = {
  description: 0,
  'store.feeding_guide': 0,
  'store.care_instructions': 0,
  'store.ingredients': 0,
  'store.specifications': 0,
  _reviews: 0,
};

/** Resolve a collection into the product filter + post-filter it stands for. */
async function collectionFilters(collection: IStoreCollection) {
  if (collection.mode === 'MANUAL') {
    return { match: { _id: { $in: collection.product_ids } }, post: {} as Record<string, unknown> };
  }
  const rules = collection.rules;
  const match: Record<string, unknown> = {};
  if (rules.pet_type_ids?.length) match['store.pet_type_ids'] = { $in: rules.pet_type_ids };
  if (rules.category_ids?.length) match['store.category_ids'] = { $in: rules.category_ids };
  if (rules.brand_ids?.length) match.brand_id = { $in: rules.brand_ids };
  if (rules.tags?.length) match['store.search_keywords'] = { $in: rules.tags };
  if (rules.featured_only) match['store.featured'] = true;
  const post: Record<string, unknown> = {};
  if (rules.min_discount_pct > 0) post._discount = { $gte: rules.min_discount_pct };
  if (rules.max_price > 0) post._price = { $lte: rules.max_price };
  if (rules.in_stock_only) post._in_stock = true;
  return { match, post };
}

/** Everything the shelf is narrowed to BEFORE the derived columns exist. */
async function preFilter(input: StoreSearchInput) {
  const and: Record<string, unknown>[] = [];
  let post: Record<string, unknown> = {};
  const q = String(input.q ?? '').trim();
  if (q) {
    const r = searchRegex(q);
    and.push({
      $or: [
        { product_name: r },
        { 'store.title': r },
        { brand_name: r },
        { 'store.search_keywords': r },
        { short_description: r },
      ],
    });
  }
  if (input.pet_type) {
    const pet = await StorePetTypeModel.findOne({ slug: input.pet_type, is_active: true }).select('_id');
    and.push({ 'store.pet_type_ids': pet?._id ?? null });
  }
  if (input.category) {
    const category = await StoreCategoryModel.findOne({ slug: input.category, is_active: true }).select('_id');
    const ids = category ? await categoryWithDescendants(category._id as Types.ObjectId) : [];
    and.push({ 'store.category_ids': { $in: ids } });
  }
  if (input.collection) {
    const collection = await StoreCollectionModel.findOne({ slug: input.collection, is_active: true });
    if (collection) {
      const filters = await collectionFilters(collection);
      and.push(filters.match);
      post = { ...post, ...filters.post };
    } else {
      and.push({ _id: null });
    }
  }
  const brands = toObjectIds(input.brand_ids);
  if (brands.length) and.push({ brand_id: { $in: brands } });
  for (const f of await facetClauses(input.facets)) and.push(f);
  return { match: listedFilter(and.length ? { $and: and } : {}), post };
}

/** One `$elemMatch` per chosen facet: a product must carry one of the values. */
async function facetClauses(facets: StoreFacetFilter[] | null | undefined) {
  const chosen = (facets ?? []).filter((f) => f.facet && f.values?.length);
  if (chosen.length === 0) return [];
  const defs = await StoreFacetModel.find({ slug: { $in: chosen.map((f) => f.facet) } }).select('_id slug');
  const idBySlug = new Map(defs.map((d) => [d.slug, d._id]));
  return chosen.map((f) => ({
    'store.facet_values': {
      $elemMatch: { facet_id: idBySlug.get(f.facet) ?? null, values: { $in: f.values } },
    },
  }));
}

/** The filters that need the derived columns. */
function postFilter(input: StoreSearchInput, collectionPost: Record<string, unknown>) {
  const post: Record<string, unknown> = { ...collectionPost };
  const price: Record<string, number> = {};
  if (Number(input.min_price) > 0) price.$gte = Number(input.min_price);
  if (Number(input.max_price) > 0) price.$lte = Number(input.max_price);
  if (Object.keys(price).length) post._price = price;
  if (input.in_stock_only) post._in_stock = true;
  if (input.on_sale) post._discount = { $gt: 0 };
  const minDiscount = Math.min(95, Math.max(0, Number(input.min_discount_pct) || 0));
  if (minDiscount > 0) post._discount = { $gte: minDiscount };
  return post;
}

interface SearchFacetRows {
  items: any[];
  total: { n: number }[];
  price: { min: number; max: number }[];
  brands: { _id: Types.ObjectId; name: string; count: number }[];
  facets: { _id: { f: Types.ObjectId; v: string }; count: number }[];
  pets: { _id: Types.ObjectId; count: number }[];
}

/** Turn the raw facet counts into the filter panel: every active facet, its options with counts. */
async function facetPanel(rows: SearchFacetRows['facets'], selected: StoreFacetFilter[]) {
  const counts = new Map(rows.map((r) => [`${String(r._id.f)}|${r._id.v}`, r.count]));
  const defs = await StoreFacetModel.find({ is_active: true }).sort({ sort_order: 1, name: 1 }).lean();
  const chosen = new Map(selected.map((s) => [s.facet, new Set(s.values)]));
  return defs
    .map((d) => ({
      id: String(d._id),
      name: d.name,
      slug: d.slug,
      options: d.options
        .map((o) => ({
          label: o.label,
          slug: o.slug,
          count: counts.get(`${String(d._id)}|${o.slug}`) ?? 0,
          selected: chosen.get(d.slug)?.has(o.slug) ?? false,
        }))
        .filter((o) => o.count > 0 || o.selected),
    }))
    .filter((d) => d.options.length > 0);
}

async function petPanel(rows: SearchFacetRows['pets'], selected: string | null | undefined) {
  const counts = new Map(rows.map((r) => [String(r._id), r.count]));
  const pets = await StorePetTypeModel.find({ is_active: true }).sort({ sort_order: 1, name: 1 }).lean();
  return pets
    .map((p) => ({
      id: String(p._id),
      name: p.name,
      slug: p.slug,
      count: counts.get(String(p._id)) ?? 0,
      selected: p.slug === selected,
    }))
    .filter((p) => p.count > 0 || p.selected);
}

export const storeCatalogService = {
  async search(input: StoreSearchInput) {
    const page = Math.max(1, Math.floor(Number(input.page) || 1));
    const pageSize = Math.min(48, Math.max(1, Math.floor(Number(input.page_size) || 24)));
    const sortKey: StoreSort = input.sort && SORTS[input.sort] ? input.sort : 'RELEVANCE';
    const { match, post } = await preFilter(input);
    const pipeline: PipelineStage[] = [{ $match: match }, ...DERIVED_STAGES];
    const after = postFilter(input, post);
    if (Object.keys(after).length) pipeline.push({ $match: after });
    if (sortKey === 'RATING') pipeline.push(...RATING_STAGES());
    pipeline.push({
      $facet: {
        items: [
          { $sort: SORTS[sortKey] },
          { $skip: (page - 1) * pageSize },
          { $limit: pageSize },
          { $project: SHELF_PROJECTION },
        ],
        total: [{ $count: 'n' }],
        price: [{ $group: { _id: null, min: { $min: '$_price' }, max: { $max: '$_price' } } }],
        brands: [
          { $match: { brand_id: { $ne: null } } },
          { $group: { _id: '$brand_id', name: { $first: '$brand_name' }, count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 40 },
        ],
        facets: [
          { $unwind: '$store.facet_values' },
          { $unwind: '$store.facet_values.values' },
          {
            $group: {
              _id: { f: '$store.facet_values.facet_id', v: '$store.facet_values.values' },
              count: { $sum: 1 },
            },
          },
        ],
        pets: [{ $unwind: '$store.pet_type_ids' }, { $group: { _id: '$store.pet_type_ids', count: { $sum: 1 } } }],
      },
    });
    const [rows] = await StoreProductModel.aggregate<SearchFacetRows>(pipeline);
    const selectedBrands = new Set((input.brand_ids ?? []).map(String));
    return {
      items: await cardsFor(rows.items),
      total: rows.total[0]?.n ?? 0,
      page,
      page_size: pageSize,
      sort: sortKey,
      price_min: round2(rows.price[0]?.min ?? 0),
      price_max: round2(rows.price[0]?.max ?? 0),
      brands: rows.brands.map((b) => ({
        id: b._id.toHexString(),
        name: b.name,
        count: b.count,
        selected: selectedBrands.has(b._id.toHexString()),
      })),
      facets: await facetPanel(rows.facets, input.facets ?? []),
      pet_types: await petPanel(rows.pets, input.pet_type),
    };
  },

  /** A product page by its public slug. Null when it is not (or no longer) on the shelf. */
  async productBySlug(slug: string) {
    const doc = await StoreProductModel.findOne(
      listedFilter({ 'store.slug': String(slug ?? '').toLowerCase().trim() })
    ).lean();
    if (!doc) return null;
    return productDetail(doc);
  },

  /** Cards for ids the storefront remembers (recently viewed), in the order asked. */
  async productsByIds(ids: string[]) {
    const objectIds = toObjectIds(ids).slice(0, 24);
    const docs = await StoreProductModel.find(listedFilter({ _id: { $in: objectIds } })).lean();
    const byId = new Map(docs.map((d) => [String(d._id), d]));
    return cardsFor(objectIds.map((id) => byId.get(String(id))).filter(Boolean));
  },

  /** "You may also like": same aisle or same pet, best sellers first. */
  async related(productId: string, limit = 12) {
    const [self] = toObjectIds([productId]);
    if (!self) return [];
    const doc = await StoreProductModel.findById(self).select('store').lean();
    const listing = listingOf(doc ?? {});
    const or: Record<string, unknown>[] = [];
    if (listing.category_ids.length) or.push({ 'store.category_ids': { $in: listing.category_ids } });
    if (listing.pet_type_ids.length) or.push({ 'store.pet_type_ids': { $in: listing.pet_type_ids } });
    if (or.length === 0) return [];
    const docs = await StoreProductModel.find(listedFilter({ _id: { $ne: self }, $or: or }))
      .sort({ 'store.sold_count': -1, 'store.sort_rank': -1 })
      .limit(Math.min(24, Math.max(1, limit)))
      .lean();
    return cardsFor(docs);
  },

  /** Type-ahead: a handful of products, aisles and brands matching what was typed. */
  async suggest(q: string) {
    const text = String(q ?? '').trim();
    if (text.length < 2) return { products: [], categories: [], brands: [] };
    const r = searchRegex(text);
    const [docs, categories, brands] = await Promise.all([
      StoreProductModel.find(
        listedFilter({ $or: [{ product_name: r }, { 'store.title': r }, { 'store.search_keywords': r }] })
      )
        .sort({ 'store.sold_count': -1 })
        .limit(6)
        .lean(),
      StoreCategoryModel.find({ is_active: true, name: r }).limit(5).lean(),
      StoreBrandModel.find({ is_active: true, name: r }).sort({ sort_order: 1, name: 1 }).limit(5).lean(),
    ]);
    return {
      products: await cardsFor(docs),
      categories: categories.map((c) => ({ id: String(c._id), name: c.name, slug: c.slug })),
      brands: brands.map((b) => ({ id: String(b._id), name: b.name, logo_url: b.logo_url })),
    };
  },

  /** Count a product page view — forward-only engagement, never trusted for money. */
  async recordView(productId: string) {
    const [id] = toObjectIds([productId]);
    if (!id) return false;
    const res = await StoreProductModel.updateOne(listedFilter({ _id: id }), { $inc: { 'store.view_count': 1 } });
    return res.modifiedCount > 0;
  },
};

/** The breadcrumb trail to a category: its ancestors, root first. */
async function breadcrumbsFor(categoryId: Types.ObjectId | undefined) {
  if (!categoryId) return [];
  const all = await StoreCategoryModel.find({}).select('_id name slug parent_id').lean();
  const byId = new Map(all.map((c) => [String(c._id), c]));
  const trail: { id: string; name: string; slug: string }[] = [];
  let current = byId.get(String(categoryId));
  let guard = 0;
  while (current && guard < 10) {
    trail.unshift({ id: String(current._id), name: current.name, slug: current.slug });
    current = current.parent_id ? byId.get(String(current.parent_id)) : undefined;
    guard += 1;
  }
  return trail;
}

/** Every image a product page can show, product first, no duplicates. */
function galleryOf(doc: any): string[] {
  const all = [...(doc.images ?? []), ...(doc.variants ?? []).flatMap((v: any) => v.images ?? [])];
  return [...new Set(all.filter(Boolean))];
}

async function productDetail(doc: any) {
  const listing = listingOf(doc);
  const settings = await getStoreSettings();
  const [pets, categories, facets, brand, summary] = await Promise.all([
    StorePetTypeModel.find({ _id: { $in: listing.pet_type_ids } }).lean(),
    StoreCategoryModel.find({ _id: { $in: listing.category_ids } }).lean(),
    StoreFacetModel.find({ _id: { $in: listing.facet_values.map((f) => f.facet_id) } }).lean(),
    doc.brand_id ? StoreBrandModel.findOne({ _id: doc.brand_id, is_active: true }).lean() : null,
    productReviewService.summary(String(doc._id)),
  ]);
  const variants = (doc.variants ?? []).map((v: any) => toStoreVariant(doc, v));
  const lead = variants.find((v: any) => v.in_stock) ?? variants[0] ?? null;
  const base = unitPriceOf(doc, null);
  const price = lead ? lead.price : base.price;
  const mrp = lead ? lead.mrp : base.mrp;
  const facetById = new Map(facets.map((f) => [String(f._id), f]));
  return {
    ...toStoreCard(doc, { average: summary.average_rating, count: summary.total }),
    price,
    mrp,
    discount_pct: discountPct(price, mrp),
    available: totalAvailable(doc),
    images: galleryOf(doc),
    video_url: listing.video_url,
    description: doc.description ?? '',
    highlights: listing.highlights,
    specifications: listing.specifications.map((s) => ({ label: s.label, value: s.value })),
    ingredients: listing.ingredients,
    feeding_guide: listing.feeding_guide,
    care_instructions: listing.care_instructions,
    options: variantOptionsOf(doc),
    variants,
    default_variant_id: lead?.id ?? null,
    brand: brand ? { id: String(brand._id), name: brand.name, logo_url: brand.logo_url, tagline: brand.tagline } : null,
    pet_types: pets.map((p) => ({ id: String(p._id), name: p.name, slug: p.slug })),
    categories: categories.map((c) => ({ id: String(c._id), name: c.name, slug: c.slug })),
    breadcrumbs: await breadcrumbsFor(listing.category_ids[0]),
    facets: listing.facet_values
      .map((fv) => {
        const def = facetById.get(String(fv.facet_id));
        if (!def) return null;
        const labels = def.options.filter((o) => fv.values.includes(o.slug)).map((o) => o.label);
        return labels.length ? { name: def.name, values: labels } : null;
      })
      .filter(Boolean),
    cod_available: settings.cod_enabled && listing.cod_available,
    returnable: settings.returns_enabled && listing.returnable,
    return_window_days: listing.return_window_days ?? settings.return_window_days,
    max_per_order: listing.max_per_order || settings.max_qty_per_line,
    min_order_qty: 1,
    weight_volume: '',
    tags: [],
    seo_title: listing.seo_title,
    seo_description: listing.seo_description,
    star_counts: summary.star_counts,
    sold_count: listing.sold_count,
  };
}
