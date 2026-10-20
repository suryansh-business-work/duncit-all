import type { ProductSource, SectionKind } from './queries';

/** What each kind of home section is called. */
export const SECTION_KIND_KEYS: Record<SectionKind, string> = {
  HERO_SLIDER: 'ecommPortal.homePage.kindHeroSlider',
  PET_TYPES: 'ecommPortal.homePage.kindPetTypes',
  CATEGORY_GRID: 'ecommPortal.homePage.kindCategoryGrid',
  CATEGORY_ICONS: 'ecommPortal.homePage.kindCategoryIcons',
  COLLECTION_CAROUSEL: 'ecommPortal.homePage.kindCollectionCarousel',
  PRODUCT_SLIDER: 'ecommPortal.homePage.kindProductSlider',
  FLASH_SALE: 'ecommPortal.homePage.kindFlashSale',
  PROMO_BANNERS: 'ecommPortal.homePage.kindPromoBanners',
  RANGE_SHOWCASE: 'ecommPortal.homePage.kindRangeShowcase',
  BRANDS: 'ecommPortal.homePage.kindBrands',
  USP_STRIP: 'ecommPortal.homePage.kindUspStrip',
  EARN_PROMO: 'ecommPortal.homePage.kindEarnPromo',
  NEWSLETTER: 'ecommPortal.homePage.kindNewsletter',
  FREE_DELIVERY: 'ecommPortal.homePage.kindFreeDelivery',
  PAGE_INTRO: 'ecommPortal.homePage.kindPageIntro',
};

/** What each kind draws, in one line — under its name in the kind picker. */
export const SECTION_KIND_HINT_KEYS: Record<SectionKind, string> = {
  HERO_SLIDER: 'ecommPortal.homePage.hintHeroSlider',
  PET_TYPES: 'ecommPortal.homePage.hintPetTypes',
  CATEGORY_GRID: 'ecommPortal.homePage.hintCategoryGrid',
  CATEGORY_ICONS: 'ecommPortal.homePage.hintCategoryIcons',
  COLLECTION_CAROUSEL: 'ecommPortal.homePage.hintCollectionCarousel',
  PRODUCT_SLIDER: 'ecommPortal.homePage.hintProductSlider',
  FLASH_SALE: 'ecommPortal.homePage.hintFlashSale',
  PROMO_BANNERS: 'ecommPortal.homePage.hintPromoBanners',
  RANGE_SHOWCASE: 'ecommPortal.homePage.hintRangeShowcase',
  BRANDS: 'ecommPortal.homePage.hintBrands',
  USP_STRIP: 'ecommPortal.homePage.hintUspStrip',
  EARN_PROMO: 'ecommPortal.homePage.hintEarnPromo',
  NEWSLETTER: 'ecommPortal.homePage.hintNewsletter',
  FREE_DELIVERY: 'ecommPortal.homePage.hintFreeDelivery',
  PAGE_INTRO: 'ecommPortal.homePage.hintPageIntro',
};

export const SECTION_KINDS = Object.keys(SECTION_KIND_KEYS) as SectionKind[];

/** Kinds built from slides / banners / tiles / points the operator writes. */
export const ITEM_KINDS: ReadonlySet<SectionKind> = new Set<SectionKind>([
  'HERO_SLIDER',
  'PROMO_BANNERS',
  'USP_STRIP',
  'PET_TYPES',
  'RANGE_SHOWCASE',
  'EARN_PROMO',
  'FREE_DELIVERY',
  'PAGE_INTRO',
]);

/** Kinds whose items the store draws with a separate phone picture. */
export const MOBILE_IMAGE_KINDS: ReadonlySet<SectionKind> = new Set<SectionKind>(['HERO_SLIDER', 'PROMO_BANNERS']);

/** Kinds whose item list may be left empty — the store then fills the band itself. */
export const OPTIONAL_ITEM_KINDS: ReadonlySet<SectionKind> = new Set<SectionKind>(['PET_TYPES', 'FREE_DELIVERY', 'PAGE_INTRO']);

/**
 * Kinds whose one optional item is only the band's button: the item fields
 * each uses. Every other item kind edits all of them, as many items as it likes.
 */
export const BUTTON_ITEM_FIELDS: Partial<Record<SectionKind, readonly string[]>> = {
  FREE_DELIVERY: ['cta_label', 'link'],
  PAGE_INTRO: ['eyebrow', 'cta_label', 'link'],
};

/** A line over the item editor, for the kinds whose items need explaining. */
export const ITEM_HINT_KEYS: Partial<Record<SectionKind, string>> = {
  PET_TYPES: 'ecommPortal.homePage.petTypesItemsHint',
  FREE_DELIVERY: 'ecommPortal.homePage.buttonItemHint',
  PAGE_INTRO: 'ecommPortal.homePage.pageIntroItemHint',
};

/** A line under the section's title, for the kinds whose title works differently. */
export const TITLE_HINT_KEYS: Partial<Record<SectionKind, string>> = {
  FREE_DELIVERY: 'ecommPortal.homePage.freeDeliveryTitleHint',
};

/** Kinds that show a chosen set of categories (none chosen = the top level). */
export const CATEGORY_KINDS: ReadonlySet<SectionKind> = new Set<SectionKind>(['CATEGORY_GRID', 'CATEGORY_ICONS']);

/** Where a product slider's products come from. */
export const PRODUCT_SOURCE_KEYS: Record<ProductSource, string> = {
  MANUAL: 'ecommPortal.homePage.sourceManual',
  COLLECTION: 'ecommPortal.homePage.sourceCollection',
  CATEGORY: 'ecommPortal.homePage.sourceCategory',
  BESTSELLING: 'ecommPortal.homePage.sourceBestselling',
  NEWEST: 'ecommPortal.homePage.sourceNewest',
  DISCOUNT: 'ecommPortal.homePage.sourceDiscount',
  FEATURED: 'ecommPortal.homePage.sourceFeatured',
};

export const PRODUCT_SOURCES = Object.keys(PRODUCT_SOURCE_KEYS) as ProductSource[];
