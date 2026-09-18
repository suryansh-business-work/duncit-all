import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';
import { BrandPickupLocationModel } from '@modules/venues/brandPickupLocation/brandPickupLocation.model';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { getServiceability } from '@modules/commerce/shiprocket/shiprocket.gateway';
import { logs } from '@observability/log';
import {
  StoreCategoryModel,
  StorePetTypeModel,
  type IStoreCategory,
  type IStorePetType,
} from './storeTaxonomy.model';
import {
  StoreCollectionModel,
  StoreHomeSectionModel,
  type IStoreHomeSection,
} from './storeMerch.model';
import { getStoreSettings, type IStoreSettings } from './storeSettings.model';
import { cardsFor, listedFilter, storeCatalogService } from './store.catalog.service';
import { findVariant, listingOf } from './store.product';
import { iso, toObjectId } from './store.shared';

/**
 * Everything the storefront frames a shelf with: the header menu, the home
 * page, the landing copy for a pet / aisle / collection, the public settings,
 * the pincode check and the sitemap. Public reads.
 */

const petOut = (p: IStorePetType | any) => ({
  id: String(p._id),
  name: p.name,
  slug: p.slug,
  icon_url: p.icon_url ?? '',
  image_url: p.image_url ?? '',
  description: p.description ?? '',
});

const categoryOut = (c: IStoreCategory | any) => ({
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

/** The public slice of the store settings — no internal switches, no audit fields. */
export async function publicSettingsOut(s: IStoreSettings) {
  const fs = await getFinanceSettings();
  return {
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
  const ids = await InventoryProductModel.distinct('brand_id', await listedFilter({ brand_id: { $ne: null } }));
  const brands = await EcommBrandModel.find({ _id: { $in: ids }, is_active: true })
    .sort({ brand_name: 1 })
    .limit(limit)
    .lean();
  return brands.map((b) => ({
    id: String(b._id),
    name: b.brand_name,
    logo_url: b.logo_url ?? '',
    tagline: b.tagline ?? '',
  }));
}

/** A home-page block with whatever it points at resolved. */
async function resolveSection(section: IStoreHomeSection | any) {
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
  };
  switch (section.kind) {
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
    case 'CATEGORY_GRID': {
      const filter = section.category_ids?.length
        ? { _id: { $in: section.category_ids }, is_active: true }
        : { parent_id: null, is_active: true };
      const categories = await StoreCategoryModel.find(filter).sort({ sort_order: 1, name: 1 }).limit(24).lean();
      return { ...base, categories: categories.map(categoryOut) };
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
    const [pets, categories, collections] = await Promise.all([
      StorePetTypeModel.find({ is_active: true }).sort({ sort_order: 1, name: 1 }).lean(),
      StoreCategoryModel.find({ is_active: true }).sort({ sort_order: 1, name: 1 }).lean(),
      StoreCollectionModel.find({ is_active: true }).sort({ sort_order: 1, name: 1 }).lean(),
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
    };
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
    const id = toObjectId(productId);
    const product = id ? await InventoryProductModel.findById(id).lean() : null;
    if (!product) return empty;
    const warehouse = product.pickup_location_id
      ? await BrandPickupLocationModel.findById(product.pickup_location_id).select('pincode').lean()
      : null;
    if (!warehouse?.pincode) return empty;
    const variant = findVariant(product as any, variantId ?? '');
    const weightKg = Math.max(0.1, Number(variant?.weight_kg) || Number(product.weight_kg) || 0.5);
    const codAllowed =
      settings.cod_enabled && listingOf(product).cod_available && !settings.cod_blocked_pincodes.includes(clean);
    try {
      const [prepaid, cod] = await Promise.all([
        getServiceability({ pickupPincode: warehouse.pincode, deliveryPincode: clean, weightKg }),
        codAllowed
          ? getServiceability({ pickupPincode: warehouse.pincode, deliveryPincode: clean, weightKg, cod: true })
          : null,
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
    const [products, categories, collections, pets] = await Promise.all([
      InventoryProductModel.find(await listedFilter()).select('store.slug updated_at').lean(),
      StoreCategoryModel.find({ is_active: true }).select('slug updated_at').lean(),
      StoreCollectionModel.find({ is_active: true }).select('slug updated_at').lean(),
      StorePetTypeModel.find({ is_active: true }).select('slug updated_at').lean(),
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
    ].filter((r) => r.slug);
  },

  cardsFor,
};
