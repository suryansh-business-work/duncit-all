import type { MockedResponse } from '@apollo/client/testing';
import type { AdPricing, AdRequest } from '@duncit/gql-types';
import { AD_PRICING, UPDATE_AD_PRICING } from '../../src/pages/ads-settings-page/queries';
import { REVIEW_AD_REQUEST } from '../../src/pages/ads-approvals-page/queries';
import type { AdRequestRow } from '../../src/pages/ads-approvals-page/helpers';
import type { AdPricing as AdPricingNumbers } from '../../src/pages/ads-settings-page/ads-pricing-form';

/**
 * Ads mocks. Row data is fed to the (mocked) `@duncit/table` via props, so it is
 * typed against the app-level `AdRequestRow` projection of the schema `AdRequest`
 * type. GraphQL responses that flow through `MockedProvider` are typed against
 * the generated `@duncit/gql-types` `AdPricing`/`AdRequest` shapes and carry
 * `__typename`, so the mock cache matches production (no `addTypename` escape).
 */
export const makeAdRequestRow = (over: Partial<AdRequestRow> = {}): AdRequestRow => ({
  id: 'a1',
  trace_id: 'AD-1',
  ad_title: 'Big Sale',
  ad_description: 'A great deal',
  ad_type: 'IMAGE',
  media_url: 'https://cdn/i.png',
  position: 'HOME_BOTTOM',
  start_at: '2026-01-01T00:00:00.000Z',
  duration_days: 7,
  end_at: '2026-01-08T00:00:00.000Z',
  redirect_url: 'https://cdn/go',
  target_audience: 'All',
  status: 'PENDING',
  marketing_remarks: null,
  estimated_cost: 1400,
  approved_cost: null,
  currency_symbol: '₹',
  submitted_by: 'u1',
  submitted_by_name: 'Advertiser',
  reviewed_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

/** Plain numeric pricing sheet (feeds `fromAdPricing` for form initial values). */
export const adPricingNumbers: AdPricingNumbers = {
  auto_per_day: 500,
  home_bottom_per_day: 750,
  sidebar_per_day: 400,
  explore_scroll_per_day: 350,
  status_per_day: 300,
  venue_list_per_day: 250,
  club_list_per_day: 250,
  pod_list_per_day: 200,
  pod_details_per_day: 200,
  currency_symbol: '₹',
};

/** Schema `AdPricing` object (carries `__typename`) for GraphQL responses. */
export const makeAdPricing = (over: Partial<AdPricing> = {}): AdPricing => ({
  __typename: 'AdPricing',
  ...adPricingNumbers,
  ...over,
});

export const adPricingMock = (over: Partial<AdPricing> = {}): MockedResponse => ({
  request: { query: AD_PRICING },
  variableMatcher: () => true,
  result: { data: { adPricing: makeAdPricing(over) } },
  maxUsageCount: 20,
});

export const adPricingErrorMock = (message = 'Pricing unavailable'): MockedResponse => ({
  request: { query: AD_PRICING },
  variableMatcher: () => true,
  error: new Error(message),
  maxUsageCount: 20,
});

/** AD_PRICING that never resolves — keeps the page in its loading state. */
export const adPricingLoadingMock = (): MockedResponse => ({
  request: { query: AD_PRICING },
  variableMatcher: () => true,
  result: { data: { adPricing: makeAdPricing() } },
  delay: Infinity,
  maxUsageCount: 20,
});

export const updateAdPricingMock = (
  over: { fail?: boolean; message?: string } = {},
): MockedResponse =>
  over.fail
    ? {
        request: { query: UPDATE_AD_PRICING },
        variableMatcher: () => true,
        result: { errors: [{ message: over.message ?? 'Update failed' }] },
        maxUsageCount: 20,
      }
    : {
        request: { query: UPDATE_AD_PRICING },
        variableMatcher: () => true,
        result: { data: { updateAdPricing: makeAdPricing() } },
        maxUsageCount: 20,
      };

type ReviewResult = Pick<
  AdRequest,
  'id' | 'status' | 'approved_cost' | 'marketing_remarks' | 'reviewed_at'
> & { __typename: 'AdRequest' };

const reviewedRow: ReviewResult = {
  __typename: 'AdRequest',
  id: 'a1',
  status: 'APPROVED',
  approved_cost: 1400,
  marketing_remarks: '',
  reviewed_at: '2026-02-01T00:00:00.000Z',
};

export const reviewAdRequestMock = (
  over: { fail?: boolean; message?: string } = {},
): MockedResponse =>
  over.fail
    ? {
        request: { query: REVIEW_AD_REQUEST },
        variableMatcher: () => true,
        result: { errors: [{ message: over.message ?? 'Review broke' }] },
        maxUsageCount: 20,
      }
    : {
        request: { query: REVIEW_AD_REQUEST },
        variableMatcher: () => true,
        result: { data: { reviewAdRequest: reviewedRow } },
        maxUsageCount: 20,
      };
