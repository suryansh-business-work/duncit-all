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
  BRANDS: 'ecommPortal.homePage.kindBrands',
  USP_STRIP: 'ecommPortal.homePage.kindUspStrip',
  NEWSLETTER: 'ecommPortal.homePage.kindNewsletter',
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
  BRANDS: 'ecommPortal.homePage.hintBrands',
  USP_STRIP: 'ecommPortal.homePage.hintUspStrip',
  NEWSLETTER: 'ecommPortal.homePage.hintNewsletter',
};

export const SECTION_KINDS = Object.keys(SECTION_KIND_KEYS) as SectionKind[];

/** Kinds built from slides / banners / points the operator writes. */
export const ITEM_KINDS: ReadonlySet<SectionKind> = new Set<SectionKind>(['HERO_SLIDER', 'PROMO_BANNERS', 'USP_STRIP']);

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
