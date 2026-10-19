import type { ComponentType } from 'react';

import type { StoreHomeSectionKind } from '../../../graphql/catalog';
import { CollectionSection, NewsletterSection } from './ContentSections';
import { EarnPromoSection } from './EarnPromoSection';
import { FlashSale } from './flash-sale';
import { HeroSlider } from './hero-slider';
import { PetTypesSection } from './pet-types';
import { PromoBannersSection } from './PromoBannersSection';
import { RangeShowcaseSection } from './RangeShowcaseSection';
import { CategoryIconsSection, ProductSliderSection } from './SliderSections';
import { BrandsSection, CategoryGridSection } from './TileSections';
import type { SectionProps } from './types';
import { UspStripSection } from './UspStripSection';

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
  RANGE_SHOWCASE: RangeShowcaseSection,
  EARN_PROMO: EarnPromoSection,
};

export { FreeDeliveryBanner } from './ContentSections';
export type { SectionProps } from './types';
