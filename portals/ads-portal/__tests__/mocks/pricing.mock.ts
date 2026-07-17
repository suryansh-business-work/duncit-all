import type { MockedResponse } from '@apollo/client/testing';
import type { AdPricing } from '@duncit/gql-types';
import { AD_PRICING } from '../../src/pages/ads/queries';

/**
 * Per-position per-day ad pricing. Typed against the generated `AdPricing`
 * schema type (assignable to the app's `AdPricing` alias), carrying
 * `__typename: 'AdPricing'` so the `MockedProvider` cache matches production.
 */
export const makeAdPricing = (over: Partial<AdPricing> = {}): AdPricing => ({
  __typename: 'AdPricing',
  auto_per_day: 900,
  home_bottom_per_day: 500,
  sidebar_per_day: 400,
  explore_scroll_per_day: 600,
  status_per_day: 700,
  venue_list_per_day: 300,
  club_list_per_day: 300,
  pod_list_per_day: 350,
  pod_details_per_day: 450,
  currency_symbol: '₹',
  ...over,
});

export const adPricingMock = (pricing: AdPricing = makeAdPricing()): MockedResponse => ({
  request: { query: AD_PRICING },
  result: { data: { adPricing: pricing } },
  maxUsageCount: 20,
});
