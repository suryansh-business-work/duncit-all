import type { StatusChipColor } from '@duncit/ui';
import type { PodBannerSlideKind, PodBannerStyle, PodPromoBannerStyle, PodPromoPriceFilter, PodPromoSource, PodPromoStatus } from './queries';

/**
 * Every enum the Pod promotions page renders, mapped to its Localization key.
 * The keys are written out in full — never assembled from the enum — so the
 * translation gate can see that each one is used.
 */
export const PROMO_STATUSES: readonly PodPromoStatus[] = ['PLANNED', 'BANNER_READY', 'SCHEDULED', 'PUBLISHED', 'SKIPPED', 'FAILED', 'CANCELLED'];

export const PROMO_STATUS_LABEL: Record<PodPromoStatus, string> = {
  PLANNED: 'marketing.podPromo.statusPlanned',
  BANNER_READY: 'marketing.podPromo.statusBannerReady',
  SCHEDULED: 'marketing.podPromo.statusScheduled',
  PUBLISHED: 'marketing.podPromo.statusPublished',
  SKIPPED: 'marketing.podPromo.statusSkipped',
  FAILED: 'marketing.podPromo.statusFailed',
  CANCELLED: 'marketing.podPromo.statusCancelled',
};

export const PROMO_STATUS_COLOR: Record<PodPromoStatus, StatusChipColor> = {
  PLANNED: 'default',
  BANNER_READY: 'info',
  SCHEDULED: 'primary',
  PUBLISHED: 'success',
  SKIPPED: 'default',
  FAILED: 'error',
  CANCELLED: 'warning',
};

export const PROMO_SOURCES: readonly PodPromoSource[] = ['AUTO', 'MANUAL'];

export const PROMO_SOURCE_LABEL: Record<PodPromoSource, string> = {
  AUTO: 'marketing.podPromo.sourceAuto',
  MANUAL: 'marketing.podPromo.sourceManual',
};

export const PRICE_FILTERS: readonly PodPromoPriceFilter[] = ['ALL', 'PAID', 'FREE'];

export const PRICE_FILTER_LABEL: Record<PodPromoPriceFilter, string> = {
  ALL: 'marketing.podPromo.priceAll',
  PAID: 'marketing.podPromo.pricePaid',
  FREE: 'marketing.podPromo.priceFree',
};

export const BANNER_STYLES: readonly PodPromoBannerStyle[] = ['PORTRAIT', 'SQUARE'];

export const BANNER_STYLE_LABEL: Record<PodPromoBannerStyle, string> = {
  PORTRAIT: 'marketing.podPromo.stylePortrait',
  SQUARE: 'marketing.podPromo.styleSquare',
};

/** A promotion still in one of these has a post that has not gone out, so it can be cancelled or re-bannered. */
const OPEN: ReadonlySet<PodPromoStatus> = new Set(['PLANNED', 'BANNER_READY', 'SCHEDULED']);

export const isOpenPromo = (status: PodPromoStatus): boolean => OPEN.has(status);

/** The server holds the same bounds; the form says so first. */
export const SETTINGS_LIMITS = {
  days_before: { min: 1, max: 30 },
  post_hour: { min: 0, max: 23 },
  min_days_until_start: { min: 0, max: 30 },
  cta_text: { max: 40 },
  utm_prefix: { max: 30 },
} as const;

/** Every hour of the day, for the post-hour picker. */
export const HOURS: readonly number[] = Array.from({ length: 24 }, (_, hour) => hour);

/** The five banner looks, in the order the pickers list them. */
export const BANNER_THEMES: readonly PodBannerStyle[] = ['FESTIVE_BOLD', 'ELEGANT_SERIF', 'SPORT_NIGHT', 'PLAYFUL_PASTEL', 'CALM_WELLNESS'];

export const BANNER_THEME_LABEL: Record<PodBannerStyle, string> = {
  FESTIVE_BOLD: 'marketing.podPromo.themeFestiveBold',
  ELEGANT_SERIF: 'marketing.podPromo.themeElegantSerif',
  SPORT_NIGHT: 'marketing.podPromo.themeSportNight',
  PLAYFUL_PASTEL: 'marketing.podPromo.themePlayfulPastel',
  CALM_WELLNESS: 'marketing.podPromo.themeCalmWellness',
};

export const SLIDE_KIND_LABEL: Record<PodBannerSlideKind, string> = {
  COVER: 'marketing.podPromo.slideCover',
  DETAILS: 'marketing.podPromo.slideDetails',
  HOST: 'marketing.podPromo.slideHost',
  VENUE: 'marketing.podPromo.slideVenue',
  BOOK: 'marketing.podPromo.slideBook',
};
