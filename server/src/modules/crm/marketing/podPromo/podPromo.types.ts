/**
 * Pod promotions — every name the module shares, in one place.
 *
 * A promotion is one pod's carousel, caption, tracking link and scheduled
 * post. The planner (podPromo.planner.ts) makes one for each upcoming pod
 * that passes the settings' filters; a manager can also make one by hand.
 */
export const POD_PROMO_STATUSES = ['PLANNED', 'BANNER_READY', 'SCHEDULED', 'PUBLISHED', 'SKIPPED', 'FAILED', 'CANCELLED'] as const;
export type PodPromoStatus = (typeof POD_PROMO_STATUSES)[number];

/** Promotions still on their way out; a pod with one of these is not promoted twice. */
export const LIVE_PROMO_STATUSES: readonly PodPromoStatus[] = ['PLANNED', 'BANNER_READY', 'SCHEDULED', 'PUBLISHED'];
/** Promotions a person may start again: nothing is waiting or out. */
export const RESTARTABLE_STATUSES: readonly PodPromoStatus[] = ['SKIPPED', 'FAILED', 'CANCELLED'];

export const POD_PROMO_SOURCES = ['AUTO', 'MANUAL'] as const;
export type PodPromoSource = (typeof POD_PROMO_SOURCES)[number];

export const BANNER_SIZES = ['PORTRAIT', 'SQUARE'] as const;
export type BannerSize = (typeof BANNER_SIZES)[number];

export const BANNER_STYLES = ['FESTIVE_BOLD', 'ELEGANT_SERIF', 'SPORT_NIGHT', 'PLAYFUL_PASTEL', 'CALM_WELLNESS'] as const;
export type BannerStyle = (typeof BANNER_STYLES)[number];

export const SLIDE_KINDS = ['COVER', 'DETAILS', 'HOST', 'VENUE', 'BOOK'] as const;
export type SlideKind = (typeof SLIDE_KINDS)[number];

export const PRICE_FILTERS = ['ALL', 'PAID', 'FREE'] as const;
export type PriceFilter = (typeof PRICE_FILTERS)[number];

/** Instagram's Content Publishing API takes at most 3 collaborators on a feed post, reel or carousel. */
export const MAX_COLLABORATORS = 3;

/** The bounds the settings are held to; the portal form mirrors them. */
export const SETTINGS_LIMITS = {
  days_before: { min: 1, max: 30 },
  post_hour: { min: 0, max: 23 },
  min_days_until_start: { min: 0, max: 30 },
  cta_text: { max: 40 },
  utm_prefix: { max: 30 },
  account_ids: { max: 10 },
  filter_ids: { max: 100 },
} as const;

/** Who reads promotions, and who changes them. Editors may preview and make banners. */
export const READ_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'MARKETING_MANAGER', 'MARKETING_EDITOR', 'MARKETING_READER'];
export const EDIT_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'MARKETING_MANAGER', 'MARKETING_EDITOR'];
export const MANAGE_ROLES = ['SUPER_ADMIN', 'MARKETING_MANAGER'];

/** One rendered slide on the CDN. */
export interface BannerSlide {
  kind: SlideKind;
  url: string;
}

/** Everything a promotion's figures add up to. */
export interface PromoFigures {
  clicks: number;
  unique_visitors: number;
  signups: number;
  pod_views: number;
  checkouts: number;
  bookings: number;
  paid_bookings: number;
  payments: number;
  revenue: number;
  likes: number;
  comments: number;
  engagement: number;
  updated_at: Date | null;
}

export const EMPTY_FIGURES: PromoFigures = {
  clicks: 0,
  unique_visitors: 0,
  signups: 0,
  pod_views: 0,
  checkouts: 0,
  bookings: 0,
  paid_bookings: 0,
  payments: 0,
  revenue: 0,
  likes: 0,
  comments: 0,
  engagement: 0,
  updated_at: null,
};
