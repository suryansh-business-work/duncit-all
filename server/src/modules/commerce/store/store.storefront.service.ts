import { BrandPickupLocationModel } from '@modules/venues/brandPickupLocation/brandPickupLocation.model';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { getServiceability } from '@modules/commerce/shiprocket/shiprocket.gateway';
import { logs } from '@observability/log';
import { StoreBrandModel, StoreCategoryModel, StorePetTypeModel } from './storeTaxonomy.model';
import { StoreCollectionModel, StoreHomeSectionModel } from './storeMerch.model';
import { activeOccasionAt, getStoreSettings, isPincodeServed, type IStoreSettings } from './storeSettings.model';
import { StorePageModel } from './storePage.model';
import { StoreProductModel } from './storeProduct.model';
import { cardsFor, listedFilter, storeCatalogService, type StoreSort } from './store.catalog.service';
import { findVariant, listingOf, unitPriceOf } from './store.product';
import { parcelOf } from '@modules/venues/inventory/inventory.packaging';
import { iso, toObjectId } from './store.shared';

/** A lean document of any store collection — only its public fields are read. */
type Doc = Record<string, any>;

/**
 * Everything the storefront frames a shelf with: the header menu, the home
 * page, the landing copy for a pet / aisle / collection, the public settings,
 * the pincode check and the sitemap. Public reads.
 */

const petOut = (p: Doc) => ({
  id: String(p._id),
  name: p.name,
  slug: p.slug,
  icon_url: p.icon_url ?? '',
  image_url: p.image_url ?? '',
  description: p.description ?? '',
});

const categoryOut = (c: Doc) => ({
  id: String(c._id),
  name: c.name,
  slug: c.slug,
  parent_id: c.parent_id ? String(c.parent_id) : null,
  image_url: c.image_url ?? '',
  banner_url: c.banner_url ?? '',
  description: c.description ?? '',
  pet_type_ids: (c.pet_type_ids ?? []).map(String),
  seo_title: c.seo_title ?? '',
  seo_description: c.seo_description ?? '',
});

/** The festive window open right now, as the storefront paints it. */
function activeOccasionOut(s: IStoreSettings) {
  const occasion = activeOccasionAt(s.occasions ?? [], Date.now());
  if (!occasion) return null;
  return {
    slug: occasion.slug,
    label: occasion.label,
    logo_url: occasion.logo_url ?? '',
    favicon_url: occasion.favicon_url ?? '',
    background_url: occasion.background_url ?? '',
    background_color: occasion.background_color ?? '',
    announcement_text: occasion.announcement_text ?? '',
    ends_at: iso(occasion.ends_at) ?? '',
  };
}

const pageLinkOut = (p: Doc) => ({ id: String(p._id), title: p.title, slug: p.slug });

/** The public slice of the store settings — no internal switches, no audit fields. */
export async function publicSettingsOut(s: IStoreSettings) {
  const fs = await getFinanceSettings();
  return {
    serviceable_pincodes_enabled: s.serviceable_pincodes_enabled && (s.serviceable_pincodes ?? []).length > 0,
    active_occasion: activeOccasionOut(s),
    store_enabled: s.store_enabled,
    store_name: s.store_name,
    tagline: s.tagline,
    logo_url: s.logo_url,
    favicon_url: s.favicon_url,
    support_email: s.support_email,
    support_phone: s.support_phone,
    whatsapp_number: s.whatsapp_number,
    announcement_enabled: s.announcement_enabled,
    announcement_text: s.announcement_text,
    announcement_link: s.announcement_link,
    guest_checkout_enabled: s.guest_checkout_enabled,
    cod_enabled: s.cod_enabled,
    cod_fee: s.cod_fee,
    cod_requires_otp: s.cod_requires_otp,
    prepaid_discount_pct: s.prepaid_discount_pct,
    min_order_value: s.min_order_value,
    free_shipping_above: s.free_shipping_above,
    max_qty_per_line: s.max_qty_per_line,
    autoship_enabled: s.autoship_enabled,
    autoship_discount_pct: s.autoship_discount_pct,
    autoship_frequencies: s.autoship_frequencies,
    returns_enabled: s.returns_enabled,
    return_window_days: s.return_window_days,
    return_reasons: s.return_reasons,
    cancel_reasons: s.cancel_reasons,
    seo_title: s.seo_title,
    seo_description: s.seo_description,
    og_image_url: s.og_image_url,
    shipping_policy_html: s.shipping_policy_html,
    returns_policy_html: s.returns_policy_html,
    terms_html: s.terms_html,
    about_html: s.about_html,
    social_links: s.social_links.map((l) => ({ label: l.label, url: l.url })),
    currency_symbol: fs.currency_symbol,
    dummy_mode: fs.dummy_mode,
  };
}

/** Active categories as a tree (children under parents), for the header menu. */
function categoryTree(all: any[]) {
  const nodes = all.map((c) => ({ ...categoryOut(c), show_in_menu: c.show_in_menu !== false, children: [] as any[] }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const roots: typeof nodes = [];
  for (const node of nodes) {
    const parent = node.parent_id ? byId.get(node.parent_id) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

/** Brands that actually have something on the shelf. */
async function shelfBrands(limit = 40) {
  const ids = await StoreProductModel.distinct('brand_id', listedFilter({ brand_id: { $ne: null } }));
  const brands = await StoreBrandModel.find({ _id: { $in: ids }, is_active: true })
    .sort({ sort_order: 1, name: 1 })
    .limit(limit)
    .lean();
  return brands.map((b) => ({ id: String(b._id), name: b.name, slug: b.slug, logo_url: b.logo_url, tagline: b.tagline }));
}

/** The shelf sort a source-driven slider reads its products in. */
const SOURCE_SORT: Record<string, StoreSort> = {
  BESTSELLING: 'BESTSELLING',
  NEWEST: 'NEWEST',
  DISCOUNT: 'DISCOUNT',
  FEATURED: 'RELEVANCE',
};

const refOut = (d: { _id: unknown; name: string; slug: string }) => ({ id: String(d._id), name: d.name, slug: d.slug });

/** A PRODUCT_SLIDER's cards, from wherever its source points. */
async function sliderProducts(section: Doc) {
  const limit = section.product_limit ?? 12;
  const source = section.product_source ?? 'COLLECTION';
  if (source === 'MANUAL') {
    const cards = await storeCatalogService.productsByIds((section.product_ids ?? []).map(String));
    return { products: cards.slice(0, limit), collection: null, category: null };
  }
  if (source === 'COLLECTION') {
    const c = section.collection_id
      ? await StoreCollectionModel.findOne({ _id: section.collection_id, is_active: true }).lean()
      : null;
    if (!c) return { products: [], collection: null, category: null };
    const page = await storeCatalogService.search({ collection: c.slug, page_size: limit });
    return { products: page.items, collection: refOut(c), category: null };
  }
  if (source === 'CATEGORY') {
    const c = section.category_ids?.[0]
      ? await StoreCategoryModel.findOne({ _id: section.category_ids[0], is_active: true }).lean()
      : null;
    if (!c) return { products: [], collection: null, category: null };
    const page = await storeCatalogService.search({ category: c.slug, page_size: limit, sort: 'BESTSELLING' });
    return { products: page.items, collection: null, category: categoryOut(c) };
  }
  const page = await storeCatalogService.search({
    sort: SOURCE_SORT[source] ?? 'RELEVANCE',
    on_sale: source === 'DISCOUNT',
    page_size: limit,
  });
  return { products: page.items, collection: null, category: null };
}

/** The categories a CATEGORY_GRID or CATEGORY_ICONS block shows: the picked ones, else the top level. */
async function sectionCategories(section: Doc) {
  const filter = section.category_ids?.length
    ? { _id: { $in: section.category_ids }, is_active: true }
    : { parent_id: null, is_active: true };
  const categories = await StoreCategoryModel.find(filter).sort({ sort_order: 1, name: 1 }).limit(24).lean();
  return categories.map(categoryOut);
}

/** A home-page block with whatever it points at resolved. */
async function resolveSection(section: Doc) {
  const base = {
    id: String(section._id),
    kind: section.kind,
    title: section.title ?? '',
    subtitle: section.subtitle ?? '',
    items: (section.items ?? []).map((i: any) => ({
      id: String(i._id ?? ''),
      title: i.title ?? '',
      subtitle: i.subtitle ?? '',
      image_url: i.image_url ?? '',
      mobile_image_url: i.mobile_image_url ?? '',
      cta_label: i.cta_label ?? '',
      link: i.link ?? '',
    })),
    collection: null as null | { id: string; name: string; slug: string },
    products: [] as any[],
    categories: [] as any[],
    pet_types: [] as any[],
    brands: [] as any[],
    discount_tiers: (section.discount_tiers ?? []) as number[],
    ends_at: iso(section.ends_at),
  };
  switch (section.kind) {
    case 'FLASH_SALE': {
      // The storefront asks for each tab's products itself (storeSearch with
      // on_sale + min_discount_pct), so only the scope travels here.
      const collection = section.collection_id
        ? await StoreCollectionModel.findOne({ _id: section.collection_id, is_active: true }).lean()
        : null;
      return collection
        ? { ...base, collection: { id: String(collection._id), name: collection.name, slug: collection.slug } }
        : base;
    }
    case 'COLLECTION_CAROUSEL': {
      const collection = section.collection_id
        ? await StoreCollectionModel.findOne({ _id: section.collection_id, is_active: true }).lean()
        : null;
      if (!collection) return base;
      const page = await storeCatalogService.search({
        collection: collection.slug,
        page_size: section.product_limit ?? 12,
      });
      return {
        ...base,
        collection: { id: String(collection._id), name: collection.name, slug: collection.slug },
        products: page.items,
      };
    }
    case 'CATEGORY_GRID':
    case 'CATEGORY_ICONS':
      return { ...base, categories: await sectionCategories(section) };
    case 'PRODUCT_SLIDER': {
      const slider = await sliderProducts(section);
      return {
        ...base,
        products: slider.products,
        collection: slider.collection,
        categories: slider.category ? [slider.category] : [],
      };
    }
    case 'PET_TYPES': {
      const pets = await StorePetTypeModel.find({ is_active: true }).sort({ sort_order: 1, name: 1 }).lean();
      return { ...base, pet_types: pets.map(petOut) };
    }
    case 'BRANDS':
      return { ...base, brands: await shelfBrands(24) };
    default:
      return base;
  }
}

/** A section shows when it is active and today sits inside its window. */
const inWindow = (s: { starts_at?: Date | null; ends_at?: Date | null }, now: number) =>
  (!s.starts_at || s.starts_at.getTime() <= now) && (!s.ends_at || s.ends_at.getTime() >= now);

export const storeStorefrontService = {
  async settings() {
    return publicSettingsOut(await getStoreSettings());
  },

  async navigation() {
    const [pets, categories, collections, pages] = await Promise.all([
      StorePetTypeModel.find({ is_active: true }).sort({ sort_order: 1, name: 1 }).lean(),
      StoreCategoryModel.find({ is_active: true }).sort({ sort_order: 1, name: 1 }).lean(),
      StoreCollectionModel.find({ is_active: true }).sort({ sort_order: 1, name: 1 }).lean(),
      StorePageModel.find({ is_active: true, show_in_footer: true }).sort({ sort_order: 1, title: 1 }).lean(),
    ]);
    return {
      pet_types: pets.map(petOut),
      categories: categoryTree(categories),
      collections: collections.map((c) => ({
        id: String(c._id),
        name: c.name,
        slug: c.slug,
        image_url: c.image_url ?? '',
      })),
      pages: pages.map(pageLinkOut),
    };
  },

  /** One of the store's own pages by slug; null when there is none or it is switched off. */
  async page(slug: string) {
    const page = await StorePageModel.findOne({ slug: String(slug ?? '').toLowerCase().trim(), is_active: true }).lean();
    if (!page) return null;
    return {
      ...pageLinkOut(page),
      content_html: page.content_html ?? '',
      seo_title: page.seo_title ?? '',
      seo_description: page.seo_description ?? '',
      updated_at: iso(page.updated_at) ?? '',
    };
  },

  /** The operator's pincode list alone — instant, no courier call. */
  async pincodeServiceable(pincode: string) {
    const clean = String(pincode ?? '').replaceAll(/\D/g, '');
    const settings = await getStoreSettings();
    const restricted = settings.serviceable_pincodes_enabled && settings.serviceable_pincodes.length > 0;
    return { pincode: clean, restricted, serviceable: /^\d{6}$/.test(clean) && isPincodeServed(settings, clean) };
  },

  async home() {
    const now = Date.now();
    const sections = await StoreHomeSectionModel.find({ is_active: true }).sort({ sort_order: 1, _id: 1 }).lean();
    const live = sections.filter((s) => inWindow(s, now));
    return Promise.all(live.map(resolveSection));
  },

  async petType(slug: string) {
    const pet = await StorePetTypeModel.findOne({ slug, is_active: true }).lean();
    if (!pet) return null;
    const categories = await StoreCategoryModel.find({ is_active: true, pet_type_ids: pet._id })
      .sort({ sort_order: 1, name: 1 })
      .lean();
    return { ...petOut(pet), categories: categories.map(categoryOut) };
  },

  async category(slug: string) {
    const category = await StoreCategoryModel.findOne({ slug, is_active: true }).lean();
    if (!category) return null;
    const [children, parent] = await Promise.all([
      StoreCategoryModel.find({ parent_id: category._id, is_active: true }).sort({ sort_order: 1, name: 1 }).lean(),
      category.parent_id ? StoreCategoryModel.findById(category.parent_id).lean() : null,
    ]);
    return {
      ...categoryOut(category),
      parent: parent ? categoryOut(parent) : null,
      children: children.map(categoryOut),
    };
  },

  async collection(slug: string) {
    const c = await StoreCollectionModel.findOne({ slug, is_active: true }).lean();
    if (!c) return null;
    return {
      id: String(c._id),
      name: c.name,
      slug: c.slug,
      description: c.description ?? '',
      image_url: c.image_url ?? '',
      banner_url: c.banner_url ?? '',
      seo_title: c.seo_title ?? '',
      seo_description: c.seo_description ?? '',
    };
  },

  brands: () => shelfBrands(200),

  /** "Deliver to 560001?" — the courier's answer for this product, before buying. */
  async deliveryCheck(productId: string, variantId: string | null, pincode: string) {
    const clean = String(pincode ?? '').replaceAll(/\D/g, '');
    const settings = await getStoreSettings();
    const empty = {
      pincode: clean,
      checked: false,
      serviceable: false,
      etd: '',
      courier_name: '',
      cod_available: false,
    };
    if (!/^\d{6}$/.test(clean)) return empty;
    // The operator's own list answers before the courier is asked.
    if (!isPincodeServed(settings, clean)) return { ...empty, checked: true };
    const id = toObjectId(productId);
    const product = id ? await StoreProductModel.findById(id).lean() : null;
    if (!product) return empty;
    const warehouse = product.pickup_location_id
      ? await BrandPickupLocationModel.findById(product.pickup_location_id).select('pincode').lean()
      : null;
    if (!warehouse?.pincode) return empty;
    const variant = findVariant(product as any, variantId ?? '');
    const parcel = parcelOf(product, variant);
    const lane = {
      pickupPincode: String(warehouse.pincode),
      deliveryPincode: clean,
      weightKg: parcel.weight_kg,
      lengthCm: parcel.length_cm,
      breadthCm: parcel.breadth_cm,
      heightCm: parcel.height_cm,
      declaredValue: unitPriceOf(product as any, variant).price,
    };
    const codAllowed =
      settings.cod_enabled && listingOf(product).cod_available && !settings.cod_blocked_pincodes.includes(clean);
    try {
      const [prepaid, cod] = await Promise.all([
        getServiceability(lane),
        codAllowed ? getServiceability({ ...lane, cod: true }) : null,
      ]);
      return {
        pincode: clean,
        checked: true,
        serviceable: !!prepaid,
        etd: prepaid?.etd ?? '',
        courier_name: prepaid?.courier_name ?? '',
        cod_available: !!cod,
      };
    } catch (error) {
      logs.server.warn('store', 'deliveryCheck', { error, pincode: clean });
      return empty;
    }
  },

  /** Every public URL key, for the storefront's sitemap.xml. */
  async sitemap() {
    const brandIds = await StoreProductModel.distinct('brand_id', listedFilter({ brand_id: { $ne: null } }));
    const [products, categories, collections, pets, brands, pages] = await Promise.all([
      StoreProductModel.find(listedFilter()).select('store.slug updated_at').lean(),
      StoreCategoryModel.find({ is_active: true }).select('slug updated_at').lean(),
      StoreCollectionModel.find({ is_active: true }).select('slug updated_at').lean(),
      StorePetTypeModel.find({ is_active: true }).select('slug updated_at').lean(),
      StoreBrandModel.find({ _id: { $in: brandIds }, is_active: true }).select('slug updated_at').lean(),
      StorePageModel.find({ is_active: true }).select('slug updated_at').lean(),
    ]);
    const row = (kind: string) => (d: any) => ({
      kind,
      slug: kind === 'PRODUCT' ? d.store?.slug ?? '' : d.slug,
      updated_at: iso(d.updated_at),
    });
    return [
      ...products.map(row('PRODUCT')),
      ...categories.map(row('CATEGORY')),
      ...collections.map(row('COLLECTION')),
      ...pets.map(row('PET_TYPE')),
      ...brands.map(row('BRAND')),
      ...pages.map(row('PAGE')),
    ].filter((r) => r.slug);
  },

  cardsFor,
};
