import type { ComponentType } from 'react';

import type { StoreHomeSectionKind } from '../../../graphql/catalog';
import { CollectionSection, NewsletterSection, PromoBannersSection, UspStripSection } from './ContentSections';
import { FlashSale } from './flash-sale';
import { HeroSlider } from './hero-slider';
import { CategoryIconsSection, ProductSliderSection } from './SliderSections';
import { BrandsSection, CategoryGridSection, PetTypesSection } from './TileSections';
import type { SectionProps } from './types';

/** Which component draws each kind of home section the operator arranges. */
export const SECTION_RENDERERS: Record<StoreHomeSectionKind, ComponentType<SectionProps>> = {
  HERO_SLIDER: HeroSlider,
  FLASH_SALE: FlashSale,
  PET_TYPES: PetTypesSection,
  CATEGORY_GRID: CategoryGridSection,
  COLLECTION_CAROUSEL: CollectionSection,
  PROMO_BANNERS: PromoBannersSection,
  BRANDS: BrandsSection,
  USP_STRIP: UspStripSection,
  NEWSLETTER: NewsletterSection,
  PRODUCT_SLIDER: ProductSliderSection,
  CATEGORY_ICONS: CategoryIconsSection,
};

export { FreeDeliveryBanner } from './ContentSections';
export type { SectionProps } from './types';
