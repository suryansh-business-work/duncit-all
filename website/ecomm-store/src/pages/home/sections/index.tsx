import type { ComponentType } from 'react';

import type { StoreHomeSectionKind } from '../../../graphql/catalog';
import { CollectionSection, NewsletterSection } from './ContentSections';
import { EarnPromoSection } from './EarnPromoSection';
import { FlashSale } from './flash-sale';
import { FreeDeliverySection } from './FreeDeliverySection';
import { HeroSlider } from './hero-slider';
import { PageIntroSection } from './PageIntroSection';
import { PetTypesSection } from './pet-types';
import { PromoBannersSection } from './PromoBannersSection';
import { RangeShowcaseSection } from './RangeShowcaseSection';
import { CategoryIconsSection, ProductSliderSection } from './SliderSections';
import { BrandsSection, CategoryGridSection } from './TileSections';
import type { SectionProps } from './types';
import { UspStripSection } from './UspStripSection';

/** Which component draws each kind of section the operator arranges, on any arranged page. */
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
  FREE_DELIVERY: FreeDeliverySection,
  PAGE_INTRO: PageIntroSection,
};

/** One arranged section through its renderer; a kind this build does not know draws nothing. */
export function Section(props: Readonly<SectionProps>) {
  const Renderer = SECTION_RENDERERS[props.section.kind];
  return Renderer ? <Renderer {...props} /> : null;
}

export type { SectionProps } from './types';
