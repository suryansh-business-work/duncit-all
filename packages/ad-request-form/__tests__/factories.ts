import { blankAdRequestValues, type AdRequestFormValues } from '../src/ad-request.types';
import type { AdPricing } from '../src/ad-options';

/** Valid ad-request form values, ready for `toSubmitAdRequestInput`. */
export const makeAdRequestFormValues = (over: Partial<AdRequestFormValues> = {}): AdRequestFormValues => ({
  ...blankAdRequestValues(),
  ad_title: 'Weekend Mega Sale',
  ad_description: 'Flat discounts across every listing this weekend only.',
  media_url: 'https://ik.imagekit.io/duncit/ads/banner.png',
  ...over,
});

/** Per-day ad pricing (all positions at ₹500/day) for the estimate card. */
export const makeAdPricing = (over: Partial<AdPricing> = {}): AdPricing => ({
  auto_per_day: 500,
  home_bottom_per_day: 500,
  sidebar_per_day: 500,
  explore_scroll_per_day: 500,
  status_per_day: 500,
  venue_list_per_day: 500,
  club_list_per_day: 500,
  pod_list_per_day: 500,
  pod_details_per_day: 500,
  currency_symbol: '₹',
  ...over,
});
