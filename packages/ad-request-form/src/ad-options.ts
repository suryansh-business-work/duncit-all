/**
 * Ads domain vocabulary shared by the Ads portal, the shared Ad Request form and
 * the Partner portal's "Run ad" flow. Reusable configuration only — no business
 * data lives here.
 */
import type { StatusColorMap } from '@duncit/ui';
import { formatMoney } from '@duncit/utils';

export const AD_MEDIA_TYPE_VALUES = ['IMAGE', 'VIDEO'] as const;
export type AdMediaType = (typeof AD_MEDIA_TYPE_VALUES)[number];

export const AD_MEDIA_TYPE_OPTIONS: ReadonlyArray<{ value: AdMediaType; label: string }> = [
  { value: 'IMAGE', label: 'Image' },
  { value: 'VIDEO', label: 'Video' },
];

export const AD_POSITION_VALUES = [
  'AUTO',
  'HOME_BOTTOM',
  'SIDEBAR',
  'EXPLORE_SCROLL',
  'STATUS',
  'VENUE_LIST',
  'CLUB_LIST',
  'POD_LIST',
  'POD_DETAILS',
] as const;
export type AdPosition = (typeof AD_POSITION_VALUES)[number];

export const AD_POSITION_OPTIONS: ReadonlyArray<{ value: AdPosition; label: string }> = [
  { value: 'AUTO', label: 'Auto (all placements)' },
  { value: 'HOME_BOTTOM', label: 'Home Bottom' },
  { value: 'SIDEBAR', label: 'Sidebar' },
  { value: 'EXPLORE_SCROLL', label: 'Explore Scroll' },
  { value: 'STATUS', label: 'Status' },
  { value: 'VENUE_LIST', label: 'Venue List' },
  { value: 'CLUB_LIST', label: 'Club List' },
  { value: 'POD_LIST', label: 'Pod List' },
  { value: 'POD_DETAILS', label: 'Pod Details' },
];

export const adPositionLabel = (position: string): string =>
  AD_POSITION_OPTIONS.find((option) => option.value === position)?.label ?? position;

export const adTypeLabel = (type: string): string =>
  AD_MEDIA_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;

export const AD_STATUS_VALUES = ['PENDING', 'APPROVED', 'REJECTED', 'LIVE', 'EXPIRED'] as const;
export type AdRequestStatus = (typeof AD_STATUS_VALUES)[number];

export const AD_STATUS_OPTIONS: ReadonlyArray<{ value: AdRequestStatus; label: string }> = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'LIVE', label: 'Live' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'EXPIRED', label: 'Expired' },
];

export const AD_STATUS_COLORS: StatusColorMap = {
  PENDING: 'warning',
  APPROVED: 'info',
  LIVE: 'success',
  REJECTED: 'error',
  EXPIRED: 'default',
};

export type AdPricingRateKey =
  | 'auto_per_day'
  | 'home_bottom_per_day'
  | 'sidebar_per_day'
  | 'explore_scroll_per_day'
  | 'status_per_day'
  | 'venue_list_per_day'
  | 'club_list_per_day'
  | 'pod_list_per_day'
  | 'pod_details_per_day';

export const AD_PRICING_KEY_BY_POSITION: Readonly<Record<AdPosition, AdPricingRateKey>> = {
  AUTO: 'auto_per_day',
  HOME_BOTTOM: 'home_bottom_per_day',
  SIDEBAR: 'sidebar_per_day',
  EXPLORE_SCROLL: 'explore_scroll_per_day',
  STATUS: 'status_per_day',
  VENUE_LIST: 'venue_list_per_day',
  CLUB_LIST: 'club_list_per_day',
  POD_LIST: 'pod_list_per_day',
  POD_DETAILS: 'pod_details_per_day',
};

/** The per-day pricing shape the estimate reads (mirrors the AdPricing query). */
export type AdPricing = Record<AdPricingRateKey, number> & { currency_symbol: string };

/** Money display for ad costs: whole amounts show no decimals, fractional show 2. */
export const formatAdCost = (value: number, symbol: string): string =>
  formatMoney(value, { symbol, decimals: Number.isInteger(value) ? 0 : 2 });
