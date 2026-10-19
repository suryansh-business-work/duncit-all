import type { ImageFit } from '../../lib/image-fit';
import type { SectionKind } from './queries';

/** The two pictures a home-section item can carry. */
export interface ItemImagePreset {
  image: ImageFit;
  /** Only the kinds that draw a separate phone picture have one. */
  mobile?: ImageFit;
}

/**
 * The size each storefront slot draws its picture at — an upload is resized to
 * it first. Photos fill their box (`cover`); icons, cut-outs and artwork are
 * fitted whole on a transparent canvas (`contain`).
 */
export const ITEM_IMAGE_PRESETS: Partial<Record<SectionKind, ItemImagePreset>> = {
  HERO_SLIDER: {
    image: { width: 1600, height: 640, mode: 'cover' },
    mobile: { width: 900, height: 900, mode: 'cover' },
  },
  PROMO_BANNERS: {
    image: { width: 1200, height: 500, mode: 'cover' },
    mobile: { width: 900, height: 900, mode: 'cover' },
  },
  USP_STRIP: { image: { width: 160, height: 160, mode: 'contain' } },
  PET_TYPES: { image: { width: 640, height: 640, mode: 'contain' } },
  RANGE_SHOWCASE: { image: { width: 1200, height: 640, mode: 'contain' } },
  EARN_PROMO: { image: { width: 1200, height: 640, mode: 'contain' } },
};

/** A payment method's mark in the store footer. */
export const PAYMENT_BADGE_FIT: ImageFit = { width: 160, height: 64, mode: 'contain' };
