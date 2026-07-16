import { gql } from '@apollo/client';
import type { AdMediaType, AdPosition, AdPricingRateKey, AdRequestStatus } from './ad-options';

/** Row shape for the My Ads table. */
export interface AdRequestRow {
  id: string;
  trace_id: string;
  ad_title: string;
  ad_type: AdMediaType;
  position: AdPosition;
  start_at: string;
  duration_days: number;
  estimated_cost: number;
  currency_symbol: string;
  status: AdRequestStatus;
  created_at: string;
}

/** Full shape for the Ad Details page. */
export interface AdRequestDetail extends AdRequestRow {
  ad_description: string;
  media_url: string;
  end_at: string;
  redirect_url?: string | null;
  target_audience?: string | null;
  marketing_remarks?: string | null;
  approved_cost?: number | null;
  submitted_by_name: string;
  reviewed_at?: string | null;
  updated_at: string;
}

/** Per-position per-day prices, plus the display currency symbol. */
export type AdPricing = Record<AdPricingRateKey, number> & { currency_symbol: string };

export const AD_PRICING = gql`
  query AdPricing {
    adPricing {
      auto_per_day
      home_bottom_per_day
      sidebar_per_day
      explore_scroll_per_day
      status_per_day
      venue_list_per_day
      club_list_per_day
      pod_list_per_day
      pod_details_per_day
      currency_symbol
    }
  }
`;

/** Server-side table page (search/sort/filter/paginate) for the advertiser's own requests. */
export const MY_ADS_TABLE = gql`
  query MyAdRequestsTable($query: TableQueryInput) {
    myAdRequestsTable(query: $query) {
      total
      rows {
        id
        trace_id
        ad_title
        ad_type
        position
        start_at
        duration_days
        estimated_cost
        currency_symbol
        status
        created_at
      }
    }
  }
`;

export const AD_REQUEST = gql`
  query AdRequest($id: ID!) {
    adRequest(id: $id) {
      id
      trace_id
      ad_title
      ad_description
      ad_type
      media_url
      position
      start_at
      duration_days
      end_at
      redirect_url
      target_audience
      status
      marketing_remarks
      estimated_cost
      approved_cost
      currency_symbol
      submitted_by_name
      reviewed_at
      created_at
      updated_at
    }
  }
`;

export const SUBMIT_AD_REQUEST = gql`
  mutation SubmitAdRequest($input: SubmitAdRequestInput!) {
    submitAdRequest(input: $input) {
      id
      trace_id
    }
  }
`;
