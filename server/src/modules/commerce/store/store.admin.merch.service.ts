import type { Types } from 'mongoose';
import type { GraphQLContext } from '@context';
import { EnvEntryModel } from '@modules/platform/envEntry/envEntry.model';
import { StoreProductModel } from './storeProduct.model';
import { getStoreSettings, StoreSettingsModel, type IStoreOccasion } from './storeSettings.model';
import { StorePageModel } from './storePage.model';
import { StoreBrandModel, StoreCategoryModel, StoreFacetModel, StorePetTypeModel } from './storeTaxonomy.model';
import {
  STORE_COLLECTION_MODES,
  STORE_HOME_SECTION_KINDS,
  STORE_SECTION_PRODUCT_SOURCES,
  StoreCollectionModel,
  StoreHomeSectionModel,
} from './storeMerch.model';
import { cardsFor, storeCatalogService } from './store.catalog.service';
import {
  badInput,
  cleanList,
  iso,
  nonNegative,
  notFound,
  slugify,
  toObjectId,
  toObjectIds,
} from './store.shared';

/**
 * The ecomm portal's writes to the store's shape: its settings, the pet types
 * and aisles it is filed by, the filters, the curated collections and the home
 * page. Every write re-validates here — the portal's form is a convenience, the
 * server is the rule.
 */

type Doc = Record<string, any>;

/** A unique slug for `Model`: the typed one, else one made from the name. */
async function uniqueSlug(Model: any, wanted: string, fallbackFrom: string, selfId: unknown) {
  const slug = slugify(wanted || fallbackFrom);
  if (!slug) badInput('Enter a name');
  const clash = await Model.findOne({ slug, _id: { $ne: selfId ?? null } }).select('_id').lean();
  if (clash) badInput(`The URL key "${slug}" is already used — choose another`);
  return slug;
}

/** Create (no id) or update one document; answers with the saved doc. */
async function upsert(Model: any, id: string | null | undefined, fields: Doc) {
  if (id) {
    const doc = await Model.findByIdAndUpdate(toObjectId(id), { $set: fields }, { new: true, runValidators: true });
    if (!doc) notFound('That item no longer exists');
    return doc;
  }
  return Model.create(fields);
}

/** Apply a new order: `ids[i]` gets sort_order i. */
async function reorder(Model: any, ids: string[]) {
  const valid = toObjectIds(ids);
  await Promise.all(valid.map((id, index) => Model.updateOne({ _id: id }, { $set: { sort_order: index } })));
  return true;
}

export const petTypeOut = (p: Doc, categoryIds: string[] = []) => ({
  id: String(p._id),
  name: p.name,
  slug: p.slug,
  icon_url: p.icon_url ?? '',
  image_url: p.image_url ?? '',
  description: p.description ?? '',
  sort_order: p.sort_order ?? 0,
  is_active: p.is_active !== false,
  category_ids: categoryIds,
});

/** Which categories are filed under each pet, in the categories' own order. */
async function categoryIdsByPet(): Promise<Map<string, string[]>> {
  const categories = await StoreCategoryModel.find({}).select('pet_type_ids').sort({ sort_order: 1, name: 1 }).lean();
  const byPet = new Map<string, string[]>();
  for (const category of categories) {
    for (const petId of category.pet_type_ids ?? []) {
      const key = String(petId);
      byPet.set(key, [...(byPet.get(key) ?? []), String(category._id)]);
    }
  }
  return byPet;
}

/** File exactly `categoryIds` under the pet: added where missing, removed everywhere else. */
async function syncPetCategories(petId: Types.ObjectId, categoryIds: Types.ObjectId[]) {
  await StoreCategoryModel.updateMany(
    { pet_type_ids: petId, _id: { $nin: categoryIds } },
    { $pull: { pet_type_ids: petId } }
  );
  if (categoryIds.length > 0) {
    await StoreCategoryModel.updateMany({ _id: { $in: categoryIds } }, { $addToSet: { pet_type_ids: petId } });
  }
}

export const pageOut = (p: Doc) => ({
  id: String(p._id),
  title: p.title,
  slug: p.slug,
  content_html: p.content_html ?? '',
  show_in_footer: p.show_in_footer !== false,
  is_active: p.is_active !== false,
  sort_order: p.sort_order ?? 0,
  seo_title: p.seo_title ?? '',
  seo_description: p.seo_description ?? '',
  updated_at: iso(p.updated_at) ?? '',
});

export const occasionOut = (o: IStoreOccasion) => ({
  slug: o.slug,
  label: o.label,
  starts_at: iso(o.starts_at) ?? '',
  ends_at: iso(o.ends_at) ?? '',
  logo_url: o.logo_url ?? '',
  favicon_url: o.favicon_url ?? '',
  background_url: o.background_url ?? '',
  background_color: o.background_color ?? '',
  announcement_text: o.announcement_text ?? '',
  is_active: o.is_active !== false,
  sort_order: o.sort_order ?? 0,
});

export const brandOut = (b: Doc) => ({
  id: String(b._id),
  name: b.name,
  slug: b.slug,
  logo_url: b.logo_url ?? '',
  tagline: b.tagline ?? '',
  description: b.description ?? '',
  sort_order: b.sort_order ?? 0,
  is_active: b.is_active !== false,
});

export const categoryAdminOut = (c: Doc) => ({
  id: String(c._id),
  name: c.name,
  slug: c.slug,
  parent_id: c.parent_id ? String(c.parent_id) : null,
  image_url: c.image_url ?? '',
  banner_url: c.banner_url ?? '',
  description: c.description ?? '',
  pet_type_ids: (c.pet_type_ids ?? []).map(String),
  sort_order: c.sort_order ?? 0,
  is_active: c.is_active !== false,
  show_in_menu: c.show_in_menu !== false,
  seo_title: c.seo_title ?? '',
  seo_description: c.seo_description ?? '',
});

export const facetOut = (f: Doc) => ({
  id: String(f._id),
  name: f.name,
  slug: f.slug,
  options: (f.options ?? []).map((o: Doc) => ({ label: o.label, slug: o.slug })),
  sort_order: f.sort_order ?? 0,
  is_active: f.is_active !== false,
});

export const collectionOut = (c: Doc) => ({
  id: String(c._id),
  name: c.name,
  slug: c.slug,
  description: c.description ?? '',
  image_url: c.image_url ?? '',
  banner_url: c.banner_url ?? '',
  mode: c.mode,
  product_ids: (c.product_ids ?? []).map(String),
  rules: {
    pet_type_ids: (c.rules?.pet_type_ids ?? []).map(String),
    category_ids: (c.rules?.category_ids ?? []).map(String),
    brand_ids: (c.rules?.brand_ids ?? []).map(String),
    tags: c.rules?.tags ?? [],
    min_discount_pct: c.rules?.min_discount_pct ?? 0,
    max_price: c.rules?.max_price ?? 0,
    featured_only: !!c.rules?.featured_only,
    in_stock_only: !!c.rules?.in_stock_only,
  },
  sort_order: c.sort_order ?? 0,
  is_active: c.is_active !== false,
  seo_title: c.seo_title ?? '',
  seo_description: c.seo_description ?? '',
});

export const sectionOut = (s: Doc) => ({
  id: String(s._id),
  kind: s.kind,
  title: s.title ?? '',
  subtitle: s.subtitle ?? '',
  items: (s.items ?? []).map((i: Doc) => ({
    id: String(i._id ?? ''),
    title: i.title ?? '',
    subtitle: i.subtitle ?? '',
    image_url: i.image_url ?? '',
    mobile_image_url: i.mobile_image_url ?? '',
    cta_label: i.cta_label ?? '',
    link: i.link ?? '',
  })),
  collection_id: s.collection_id ? String(s.collection_id) : null,
  category_ids: (s.category_ids ?? []).map(String),
  product_limit: s.product_limit ?? 12,
  discount_tiers: s.discount_tiers ?? [],
  product_source: s.product_source ?? 'COLLECTION',
  product_ids: (s.product_ids ?? []).map(String),
  sort_order: s.sort_order ?? 0,
  is_active: s.is_active !== false,
  starts_at: iso(s.starts_at),
  ends_at: iso(s.ends_at),
});

const SETTINGS_STRINGS = [
  'store_name',
  'tagline',
  'logo_url',
  'favicon_url',
  'support_email',
  'support_phone',
  'whatsapp_number',
  'announcement_text',
  'announcement_link',
  'seo_title',
  'seo_description',
  'og_image_url',
  'shipping_policy_html',
  'returns_policy_html',
  'terms_html',
  'about_html',
] as const;

const SETTINGS_FLAGS = [
  'store_enabled',
  'announcement_enabled',
  'guest_checkout_enabled',
  'cod_enabled',
  'cod_requires_otp',
  'returns_enabled',
  'restock_on_cancel',
  'autoship_enabled',
  'serviceable_pincodes_enabled',
] as const;

/** A CSS hex colour, the one form the storefront paints without parsing. */
const HEX_COLOUR = /^#(?:[\da-f]{3}|[\da-f]{6})$/i;

/** Six digits, whatever was pasted around them. */
const pincodesOf = (values: unknown) =>
  cleanList(Array.isArray(values) ? values : [], 20000)
    .map((p) => p.replaceAll(/\D/g, ''))
    .filter((p) => p.length === 6);

/** The festive windows as saved: named, dated in order, slugged uniquely, colours well-formed. */
function occasionsOf(input: Doc[]): IStoreOccasion[] {
  const seen = new Set<string>();
  return input.slice(0, 24).map((o, index) => {
    const label = String(o.label ?? '').trim();
    if (!label) badInput(`Give occasion ${index + 1} a name`);
    const starts = dateOrNull(o.starts_at);
    const ends = dateOrNull(o.ends_at);
    if (!starts || !ends) badInput(`Set when "${label}" starts and ends`);
    if (ends.getTime() <= starts.getTime()) badInput(`"${label}" must end after it starts`);
    const colour = String(o.background_color ?? '').trim();
    if (colour && !HEX_COLOUR.test(colour)) badInput(`The background colour of "${label}" must be a hex colour like #FFF4E5`);
    let slug = slugify(o.slug || label) || `occasion-${index + 1}`;
    while (seen.has(slug)) slug = `${slug}-2`;
    seen.add(slug);
    return {
      slug,
      label,
      starts_at: starts,
      ends_at: ends,
      logo_url: String(o.logo_url ?? '').trim(),
      favicon_url: String(o.favicon_url ?? '').trim(),
      background_url: String(o.background_url ?? '').trim(),
      background_color: colour,
      announcement_text: String(o.announcement_text ?? '').trim().slice(0, 200),
      is_active: o.is_active !== false,
      sort_order: Math.floor(Number(o.sort_order) || 0),
    };
  });
}

const SETTINGS_NUMBERS = [
  'cod_fee',
  'cod_min_order',
  'cod_max_order',
  'prepaid_discount_pct',
  'min_order_value',
  'free_shipping_above',
  'flat_shipping_fee',
  'max_qty_per_line',
  'return_window_days',
  'autoship_discount_pct',
] as const;

/** A Razorpay account the store may use: '' (the default), or an active Tech-portal RAZORPAY entry. */
async function razorpayAccountOf(value: unknown) {
  const id = typeof value === 'string' ? value.trim() : '';
  if (!id) return '';
  const oid = toObjectId(id);
  const found = oid ? await EnvEntryModel.exists({ _id: oid, category: 'RAZORPAY', is_active: true }) : null;
  if (!found) badInput('That Razorpay account is not an active entry in the Tech portal');
  return id;
}

type RazorpayMode = 'LIVE' | 'TEST' | 'UNKNOWN';

/** One text value of an env entry's config ('' when it is missing or not text). */
const configText = (config: unknown, key: string) => {
  const value = (config as Record<string, unknown> | null | undefined)?.[key];
  return typeof value === 'string' ? value : '';
};

/** Razorpay key ids say which mode they belong to. */
function razorpayModeOf(keyId: string): RazorpayMode {
  if (keyId.startsWith('rzp_live_')) return 'LIVE';
  if (keyId.startsWith('rzp_test_')) return 'TEST';
  return 'UNKNOWN';
}

/** Enough of a key id to tell accounts apart, never the whole thing. */
const keyHint = (keyId: string) => (keyId.length > 8 ? `${keyId.slice(0, 9)}…${keyId.slice(-4)}` : '');

/** Whole numbers within [min, max], de-duplicated and ascending — autoship
 * frequencies in weeks, flash-sale discount tiers in percent. */
function intList(values: unknown, min: number, max: number, cap: number): number[] {
  const list = Array.isArray(values) ? values : [];
  const whole = list.map((n) => Math.floor(Number(n))).filter((n) => n >= min && n <= max);
  return [...new Set(whole)].sort((a, b) => a - b).slice(0, cap);
}

const present = (value: unknown) => value !== undefined && value !== null;

function scalarPatch(input: Doc) {
  const patch: Doc = {};
  for (const key of SETTINGS_STRINGS) if (present(input[key])) patch[key] = String(input[key]).trim();
  for (const key of SETTINGS_FLAGS) if (typeof input[key] === 'boolean') patch[key] = input[key];
  for (const key of SETTINGS_NUMBERS) if (present(input[key])) patch[key] = nonNegative(input[key]);
  return patch;
}

function settingsPatch(input: Doc) {
  const patch = scalarPatch(input);
  if (patch.prepaid_discount_pct > 50) badInput('The prepaid discount can be at most 50%');
  if (patch.autoship_discount_pct > 50) badInput('The autoship discount can be at most 50%');
  if (present(patch.max_qty_per_line) && Number(patch.max_qty_per_line) < 1) badInput('Allow at least 1 unit per item');
  if (input.autoship_frequencies) patch.autoship_frequencies = intList(input.autoship_frequencies, 1, 26, 8);
  if (input.cod_blocked_pincodes) {
    patch.cod_blocked_pincodes = cleanList(input.cod_blocked_pincodes, 5000)
      .map((p) => p.replaceAll(/\D/g, ''))
      .filter((p) => p.length === 6);
  }
  if (input.return_reasons) patch.return_reasons = cleanList(input.return_reasons, 30);
  if (input.cancel_reasons) patch.cancel_reasons = cleanList(input.cancel_reasons, 30);
  if (input.serviceable_pincodes) patch.serviceable_pincodes = pincodesOf(input.serviceable_pincodes);
  if (input.occasions) patch.occasions = occasionsOf(input.occasions as Doc[]);
  if (input.social_links) {
    patch.social_links = (input.social_links as Doc[])
      .map((l) => ({ label: String(l.label ?? '').trim(), url: String(l.url ?? '').trim() }))
      .filter((l) => l.label && /^https?:\/\//.test(l.url))
      .slice(0, 12);
  }
  return patch;
}

function sectionItems(items: Doc[] | null | undefined) {
  return (items ?? []).slice(0, 24).map((i) => ({
    title: String(i.title ?? '').trim(),
    subtitle: String(i.subtitle ?? '').trim(),
    image_url: String(i.image_url ?? '').trim(),
    mobile_image_url: String(i.mobile_image_url ?? '').trim(),
    cta_label: String(i.cta_label ?? '').trim(),
    link: String(i.link ?? '').trim(),
  }));
}

const dateOrNull = (value: unknown) => {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
};

export const storeAdminMerchService = {
  async settings() {
    return getStoreSettings();
  },

  async saveSettings(ctx: GraphQLContext, input: Doc) {
    await getStoreSettings();
    const patch = settingsPatch(input);
    if (present(input.razorpay_account)) patch.razorpay_account = await razorpayAccountOf(input.razorpay_account);
    return StoreSettingsModel.findOneAndUpdate(
      { singleton_key: 'store' },
      { $set: { ...patch, updated_by_id: ctx.user?.id ?? null } },
      { new: true, runValidators: true }
    );
  },

  /** The Tech portal's Razorpay accounts, default first — names and a key hint, no secrets. */
  async razorpayAccounts() {
    const rows = await EnvEntryModel.find({ category: 'RAZORPAY' }).sort({ is_default: -1, name: 1 }).lean();
    return rows.map((row) => {
      const keyId = configText(row.config, 'key_id');
      return {
        id: String(row._id),
        name: row.name,
        key_hint: keyHint(keyId),
        mode: razorpayModeOf(keyId),
        is_default: row.is_default,
        is_active: row.is_active,
      };
    });
  },

  /* --- pet types ------------------------------------------------------ */
  async petTypes() {
    const [rows, byPet] = await Promise.all([
      StorePetTypeModel.find({}).sort({ sort_order: 1, name: 1 }).lean(),
      categoryIdsByPet(),
    ]);
    return rows.map((row) => petTypeOut(row, byPet.get(String(row._id)) ?? []));
  },
  async savePetType(id: string | null | undefined, input: Doc) {
    const name = String(input.name ?? '').trim();
    if (!name) badInput('Enter the pet type name');
    const doc = await upsert(StorePetTypeModel, id, {
      name,
      slug: await uniqueSlug(StorePetTypeModel, input.slug, name, toObjectId(id)),
      icon_url: String(input.icon_url ?? '').trim(),
      image_url: String(input.image_url ?? '').trim(),
      description: String(input.description ?? '').trim(),
      is_active: input.is_active !== false,
      ...(id ? {} : { sort_order: await StorePetTypeModel.countDocuments() }),
    });
    // The categories under a pet live on the categories (`pet_type_ids`); the
    // form edits them from the pet's side, so the list sent is made exact here.
    if (Array.isArray(input.category_ids)) await syncPetCategories(doc._id, toObjectIds(input.category_ids));
    const byPet = await categoryIdsByPet();
    return petTypeOut(doc, byPet.get(String(doc._id)) ?? []);
  },
  async deletePetType(id: string) {
    const oid = toObjectId(id);
    const used = await StoreProductModel.countDocuments({ 'store.pet_type_ids': oid });
    if (used > 0) badInput(`${used} product(s) are filed under this pet type — move them first, or switch it off`);
    await StorePetTypeModel.deleteOne({ _id: oid });
    return true;
  },
  reorderPetTypes: (ids: string[]) => reorder(StorePetTypeModel, ids),

  /* --- brands --------------------------------------------------------- */
  async brands() {
    const rows = await StoreBrandModel.find({}).sort({ sort_order: 1, name: 1 }).lean();
    return rows.map(brandOut);
  },
  async saveBrand(id: string | null | undefined, input: Doc) {
    const name = String(input.name ?? '').trim();
    if (!name) badInput('Enter the brand name');
    const doc = await upsert(StoreBrandModel, id, {
      name,
      slug: await uniqueSlug(StoreBrandModel, input.slug, name, toObjectId(id)),
      logo_url: String(input.logo_url ?? '').trim(),
      tagline: String(input.tagline ?? '').trim(),
      description: String(input.description ?? '').trim(),
      is_active: input.is_active !== false,
      ...(id ? {} : { sort_order: await StoreBrandModel.countDocuments() }),
    });
    // Products carry the brand's name for search and the table — keep it current.
    await StoreProductModel.updateMany({ brand_id: doc._id }, { $set: { brand_name: doc.name } });
    return brandOut(doc);
  },
  async deleteBrand(id: string) {
    const oid = toObjectId(id);
    const used = await StoreProductModel.countDocuments({ brand_id: oid });
    if (used > 0) badInput(`${used} product(s) carry this brand — change them first, or switch it off`);
    await StoreCollectionModel.updateMany({ 'rules.brand_ids': oid }, { $pull: { 'rules.brand_ids': oid } });
    await StoreBrandModel.deleteOne({ _id: oid });
    return true;
  },
  reorderBrands: (ids: string[]) => reorder(StoreBrandModel, ids),

  /* --- pages (policies, guides, about) -------------------------------- */
  async pages() {
    const rows = await StorePageModel.find({}).sort({ sort_order: 1, title: 1 }).lean();
    return rows.map(pageOut);
  },
  async savePage(id: string | null | undefined, input: Doc) {
    const title = String(input.title ?? '').trim();
    if (!title) badInput('Give the page a title');
    const doc = await upsert(StorePageModel, id, {
      title,
      slug: await uniqueSlug(StorePageModel, input.slug, title, toObjectId(id)),
      content_html: String(input.content_html ?? ''),
      show_in_footer: input.show_in_footer !== false,
      is_active: input.is_active !== false,
      seo_title: String(input.seo_title ?? '').trim(),
      seo_description: String(input.seo_description ?? '').trim(),
      ...(id ? {} : { sort_order: await StorePageModel.countDocuments() }),
    });
    return pageOut(doc);
  },
  async deletePage(id: string) {
    await StorePageModel.deleteOne({ _id: toObjectId(id) });
    return true;
  },
  reorderPages: (ids: string[]) => reorder(StorePageModel, ids),

  /* --- categories ----------------------------------------------------- */
  async categories() {
    const rows = await StoreCategoryModel.find({}).sort({ sort_order: 1, name: 1 }).lean();
    return rows.map(categoryAdminOut);
  },
  async saveCategory(id: string | null | undefined, input: Doc) {
    const name = String(input.name ?? '').trim();
    if (!name) badInput('Enter the category name');
    const self = toObjectId(id);
    const parent = toObjectId(input.parent_id);
    if (parent && self && String(parent) === String(self)) badInput('A category cannot sit inside itself');
    if (parent && !(await StoreCategoryModel.exists({ _id: parent }))) badInput('The parent category no longer exists');
    const doc = await upsert(StoreCategoryModel, id, {
      name,
      slug: await uniqueSlug(StoreCategoryModel, input.slug, name, self),
      parent_id: parent,
      image_url: String(input.image_url ?? '').trim(),
      banner_url: String(input.banner_url ?? '').trim(),
      description: String(input.description ?? '').trim(),
      pet_type_ids: toObjectIds(input.pet_type_ids),
      is_active: input.is_active !== false,
      show_in_menu: input.show_in_menu !== false,
      seo_title: String(input.seo_title ?? '').trim(),
      seo_description: String(input.seo_description ?? '').trim(),
      ...(id ? {} : { sort_order: await StoreCategoryModel.countDocuments({ parent_id: parent }) }),
    });
    return categoryAdminOut(doc);
  },
  async deleteCategory(id: string) {
    const oid = toObjectId(id);
    if (await StoreCategoryModel.exists({ parent_id: oid })) badInput('Move or delete its sub-categories first');
    const used = await StoreProductModel.countDocuments({ 'store.category_ids': oid });
    if (used > 0) badInput(`${used} product(s) are filed in this category — move them first, or switch it off`);
    await StoreCategoryModel.deleteOne({ _id: oid });
    return true;
  },
  reorderCategories: (ids: string[]) => reorder(StoreCategoryModel, ids),

  /* --- facets (filters) ----------------------------------------------- */
  async facets() {
    const rows = await StoreFacetModel.find({}).sort({ sort_order: 1, name: 1 }).lean();
    return rows.map(facetOut);
  },
  async saveFacet(id: string | null | undefined, input: Doc) {
    const name = String(input.name ?? '').trim();
    if (!name) badInput('Enter the filter name');
    const seen = new Set<string>();
    const options = ((input.options ?? []) as Doc[])
      .map((o) => ({ label: String(o.label ?? '').trim(), slug: slugify(o.slug || o.label) }))
      .filter((o) => o.label && o.slug && !seen.has(o.slug) && seen.add(o.slug));
    if (options.length === 0) badInput('Add at least one option');
    const doc = await upsert(StoreFacetModel, id, {
      name,
      slug: await uniqueSlug(StoreFacetModel, input.slug, name, toObjectId(id)),
      options,
      is_active: input.is_active !== false,
      ...(id ? {} : { sort_order: await StoreFacetModel.countDocuments() }),
    });
    return facetOut(doc);
  },
  async deleteFacet(id: string) {
    const oid = toObjectId(id);
    await StoreFacetModel.deleteOne({ _id: oid });
    await StoreProductModel.updateMany(
      { 'store.facet_values.facet_id': oid },
      { $pull: { 'store.facet_values': { facet_id: oid } } }
    );
    return true;
  },
  reorderFacets: (ids: string[]) => reorder(StoreFacetModel, ids),

  /* --- collections ---------------------------------------------------- */
  async collections() {
    const rows = await StoreCollectionModel.find({}).sort({ sort_order: 1, name: 1 }).lean();
    return rows.map(collectionOut);
  },
  async collection(id: string) {
    const doc = await StoreCollectionModel.findById(toObjectId(id)).lean();
    if (!doc) notFound('Collection not found');
    return collectionOut(doc);
  },
  async saveCollection(id: string | null | undefined, input: Doc) {
    const name = String(input.name ?? '').trim();
    if (!name) badInput('Enter the collection name');
    const mode = STORE_COLLECTION_MODES.includes(input.mode) ? input.mode : 'MANUAL';
    const rules = input.rules ?? {};
    const doc = await upsert(StoreCollectionModel, id, {
      name,
      slug: await uniqueSlug(StoreCollectionModel, input.slug, name, toObjectId(id)),
      description: String(input.description ?? '').trim(),
      image_url: String(input.image_url ?? '').trim(),
      banner_url: String(input.banner_url ?? '').trim(),
      mode,
      product_ids: toObjectIds(input.product_ids).slice(0, 500),
      rules: {
        pet_type_ids: toObjectIds(rules.pet_type_ids),
        category_ids: toObjectIds(rules.category_ids),
        brand_ids: toObjectIds(rules.brand_ids),
        tags: cleanList(rules.tags, 30),
        min_discount_pct: Math.min(100, nonNegative(rules.min_discount_pct)),
        max_price: nonNegative(rules.max_price),
        featured_only: !!rules.featured_only,
        in_stock_only: !!rules.in_stock_only,
      },
      is_active: input.is_active !== false,
      seo_title: String(input.seo_title ?? '').trim(),
      seo_description: String(input.seo_description ?? '').trim(),
      ...(id ? {} : { sort_order: await StoreCollectionModel.countDocuments() }),
    });
    return collectionOut(doc);
  },
  async deleteCollection(id: string) {
    const oid = toObjectId(id);
    await StoreCollectionModel.deleteOne({ _id: oid });
    await StoreHomeSectionModel.updateMany({ collection_id: oid }, { $set: { collection_id: null } });
    return true;
  },
  reorderCollections: (ids: string[]) => reorder(StoreCollectionModel, ids),

  /** What a collection shows on the store right now — the portal's preview. */
  async previewCollection(slug: string) {
    const page = await storeCatalogService.search({ collection: slug, page_size: 48 });
    return page.items;
  },

  /** Cards for a manual collection's picked products, in its own order. */
  async productsForPicker(ids: string[]) {
    const objectIds = toObjectIds(ids).slice(0, 500);
    const docs = await StoreProductModel.find({ _id: { $in: objectIds } }).lean();
    const byId = new Map(docs.map((d) => [String(d._id), d]));
    return cardsFor(objectIds.map((id) => byId.get(String(id))).filter(Boolean));
  },

  /* --- home page ------------------------------------------------------ */
  async sections() {
    const rows = await StoreHomeSectionModel.find({}).sort({ sort_order: 1, _id: 1 }).lean();
    return rows.map(sectionOut);
  },
  async saveSection(id: string | null | undefined, input: Doc) {
    if (!STORE_HOME_SECTION_KINDS.includes(input.kind)) badInput('Choose what this section shows');
    const endsAt = dateOrNull(input.ends_at);
    if (input.kind === 'FLASH_SALE' && !endsAt) badInput('A flash sale needs an end time to count down to');
    const tiers = intList(input.discount_tiers, 1, 90, 8);
    const doc = await upsert(StoreHomeSectionModel, id, {
      kind: input.kind,
      title: String(input.title ?? '').trim(),
      subtitle: String(input.subtitle ?? '').trim(),
      items: sectionItems(input.items),
      collection_id: toObjectId(input.collection_id),
      category_ids: toObjectIds(input.category_ids),
      product_limit: Math.min(48, Math.max(1, Math.floor(nonNegative(input.product_limit, 12)) || 12)),
      discount_tiers: tiers,
      product_source: STORE_SECTION_PRODUCT_SOURCES.includes(input.product_source) ? input.product_source : 'COLLECTION',
      product_ids: toObjectIds(input.product_ids).slice(0, 48),
      is_active: input.is_active !== false,
      starts_at: dateOrNull(input.starts_at),
      ends_at: endsAt,
      ...(id ? {} : { sort_order: await StoreHomeSectionModel.countDocuments() }),
    });
    return sectionOut(doc);
  },
  async deleteSection(id: string) {
    await StoreHomeSectionModel.deleteOne({ _id: toObjectId(id) });
    return true;
  },
  reorderSections: (ids: string[]) => reorder(StoreHomeSectionModel, ids),
};
