import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import type { AdRequest } from '@duncit/gql-types';
import {
  AD_REQUEST,
  MY_ADS_TABLE,
  SUBMIT_AD_REQUEST,
  type AdRequestDetail,
  type AdRequestRow,
} from '../../src/pages/ads/queries';
import { blankAdRequestValues, type AdRequestFormValues } from '@duncit/ad-request-form';

/**
 * Ad-request mocks. The `adRequest` detail query and the `myAdRequestsTable`
 * rows each select a subset of the generated `AdRequest` schema type, so every
 * factory return is a schema-synced `Pick<AdRequest, …>` (never `any`) — a
 * renamed or removed server field breaks typecheck here instead of drifting
 * silently. Each carries `__typename: 'AdRequest'` so the `MockedProvider`
 * cache matches production without the deprecated `addTypename={false}`.
 */
export type AdRequestDetailMock = Pick<
  AdRequest,
  | 'id'
  | 'trace_id'
  | 'ad_title'
  | 'ad_description'
  | 'ad_type'
  | 'media_url'
  | 'position'
  | 'start_at'
  | 'duration_days'
  | 'end_at'
  | 'redirect_url'
  | 'target_audience'
  | 'status'
  | 'marketing_remarks'
  | 'estimated_cost'
  | 'approved_cost'
  | 'currency_symbol'
  | 'submitted_by_name'
  | 'reviewed_at'
  | 'created_at'
  | 'updated_at'
> & { __typename: 'AdRequest' };

export type AdRequestRowMock = Pick<
  AdRequest,
  | 'id'
  | 'trace_id'
  | 'ad_title'
  | 'ad_type'
  | 'position'
  | 'start_at'
  | 'duration_days'
  | 'estimated_cost'
  | 'currency_symbol'
  | 'status'
  | 'created_at'
> & { __typename: 'AdRequest' };

export type SubmitAdRequestResultMock = Pick<AdRequest, 'id' | 'trace_id'> & {
  __typename: 'AdRequest';
};

/** A fully-populated ad-request detail (assignable to the app's AdRequestDetail). */
export const makeAdDetail = (over: Partial<AdRequestDetailMock> = {}): AdRequestDetailMock => ({
  __typename: 'AdRequest',
  id: 'ad1',
  trace_id: 'AD-1001',
  ad_title: 'Weekend Mega Sale',
  ad_description: 'Flat discounts across every listing this weekend only.',
  ad_type: 'IMAGE',
  media_url: 'https://ik.imagekit.io/duncit/ads/banner.png',
  position: 'HOME_BOTTOM',
  start_at: '2026-08-01T00:00:00.000Z',
  duration_days: 7,
  end_at: '2026-08-08T00:00:00.000Z',
  redirect_url: 'https://duncit.com/offer',
  target_audience: 'Young professionals in Indore',
  status: 'PENDING',
  marketing_remarks: 'Looks good — approved at the quoted rate.',
  estimated_cost: 3500,
  approved_cost: 3500,
  currency_symbol: '₹',
  submitted_by_name: 'Asha Advertiser',
  reviewed_at: '2026-07-11T10:00:00.000Z',
  created_at: '2026-07-10T09:30:00.000Z',
  updated_at: '2026-07-11T10:00:00.000Z',
  ...over,
});

/** A My Ads table row (assignable to the app's AdRequestRow). */
export const makeAdRow = (over: Partial<AdRequestRowMock> = {}): AdRequestRowMock => ({
  __typename: 'AdRequest',
  id: 'ad1',
  trace_id: 'AD-1001',
  ad_title: 'Weekend Mega Sale',
  ad_type: 'IMAGE',
  position: 'HOME_BOTTOM',
  start_at: '2026-08-01T00:00:00.000Z',
  duration_days: 7,
  estimated_cost: 3500,
  currency_symbol: '₹',
  status: 'LIVE',
  created_at: '2026-07-10T09:30:00.000Z',
  ...over,
});

/** Valid Create-Ad form values, ready for `toSubmitAdRequestInput`. */
export const makeAdRequestFormValues = (
  over: Partial<AdRequestFormValues> = {},
): AdRequestFormValues => ({
  ...blankAdRequestValues(),
  ad_title: 'Weekend Mega Sale',
  ad_description: 'Flat discounts across every listing this weekend only.',
  media_url: 'https://ik.imagekit.io/duncit/ads/banner.png',
  ...over,
});

/* ---- Apollo MockedResponse builders ---- */

export const adRequestMock = (
  ad: AdRequestDetailMock | null = makeAdDetail(),
  id = 'ad1',
): MockedResponse => ({
  request: { query: AD_REQUEST, variables: { id } },
  result: { data: { adRequest: ad } },
  maxUsageCount: 20,
});

export const myAdsTableMock = (
  rows: AdRequestRowMock[] = [makeAdRow()],
): MockedResponse => ({
  request: { query: MY_ADS_TABLE },
  variableMatcher: () => true,
  result: {
    data: { myAdRequestsTable: { __typename: 'AdRequestTablePage', total: rows.length, rows } },
  },
  maxUsageCount: 20,
});

export const submitAdRequestMock = (
  result: SubmitAdRequestResultMock | null = {
    __typename: 'AdRequest',
    id: 'ad9',
    trace_id: 'AD-9',
  },
): MockedResponse => ({
  request: { query: SUBMIT_AD_REQUEST },
  variableMatcher: () => true,
  result: { data: { submitAdRequest: result } },
  maxUsageCount: 20,
});

export const submitAdRequestErrorMock = (message = 'Server boom'): MockedResponse => ({
  request: { query: SUBMIT_AD_REQUEST },
  variableMatcher: () => true,
  result: { errors: [new GraphQLError(message)] },
  maxUsageCount: 20,
});
