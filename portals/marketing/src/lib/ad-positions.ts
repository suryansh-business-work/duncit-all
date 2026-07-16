/**
 * Shared ad-position vocabulary for the Ads approval queue and Ads settings.
 * Mirrors the server `AdPosition` enum and the `AdPricing` per-day price fields.
 */
export type AdPosition =
  | 'AUTO'
  | 'HOME_BOTTOM'
  | 'SIDEBAR'
  | 'EXPLORE_SCROLL'
  | 'STATUS'
  | 'VENUE_LIST'
  | 'CLUB_LIST'
  | 'POD_LIST'
  | 'POD_DETAILS';

export type AdPricingPriceField =
  | 'auto_per_day'
  | 'home_bottom_per_day'
  | 'sidebar_per_day'
  | 'explore_scroll_per_day'
  | 'status_per_day'
  | 'venue_list_per_day'
  | 'club_list_per_day'
  | 'pod_list_per_day'
  | 'pod_details_per_day';

export interface AdPositionMeta {
  position: AdPosition;
  label: string;
  priceField: AdPricingPriceField;
}

/** One entry per placement, in display order (drives pricing fields + filters). */
export const AD_POSITIONS: ReadonlyArray<AdPositionMeta> = [
  { position: 'AUTO', label: 'Auto (all placements)', priceField: 'auto_per_day' },
  { position: 'HOME_BOTTOM', label: 'Home Bottom', priceField: 'home_bottom_per_day' },
  { position: 'SIDEBAR', label: 'Sidebar', priceField: 'sidebar_per_day' },
  { position: 'EXPLORE_SCROLL', label: 'Explore Scroll', priceField: 'explore_scroll_per_day' },
  { position: 'STATUS', label: 'Status', priceField: 'status_per_day' },
  { position: 'VENUE_LIST', label: 'Venue List', priceField: 'venue_list_per_day' },
  { position: 'CLUB_LIST', label: 'Club List', priceField: 'club_list_per_day' },
  { position: 'POD_LIST', label: 'Pod List', priceField: 'pod_list_per_day' },
  { position: 'POD_DETAILS', label: 'Pod Details', priceField: 'pod_details_per_day' },
];

const POSITION_LABELS = new Map<string, string>(AD_POSITIONS.map((p) => [p.position, p.label]));

/** Friendly display label for a raw `AdPosition` enum value. */
export const adPositionLabel = (position: string): string =>
  POSITION_LABELS.get(position) ?? position;

/** Money display using the row's own currency symbol (server-provided). */
export const formatAdMoney = (symbol: string, amount: number): string =>
  `${symbol}${amount.toLocaleString()}`;
