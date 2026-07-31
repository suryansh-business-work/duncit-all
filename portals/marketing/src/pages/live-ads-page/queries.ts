import { gql } from '@apollo/client';

/** Same selection as the approvals table so a row feeds the details dialog. */
const LIVE_AD_FIELDS = gql`
  fragment LiveAdFields on AdRequest {
    id
    trace_id
    ad_kind
    brand_name
    product_name
    product_image
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
    submitted_by
    submitted_by_name
    reviewed_at
    created_at
  }
`;

/** Only ads inside their window right now — LIVE is a date range, not a
 * stored status, so the server has its own query for it. */
export const LIVE_ADS_TABLE = gql`
  query LiveAdsTable($query: TableQueryInput) {
    liveAdsTable(query: $query) {
      total
      rows {
        ...LiveAdFields
      }
    }
  }
  ${LIVE_AD_FIELDS}
`;

export const STOP_AD_REQUEST = gql`
  mutation StopAdRequest($id: ID!) {
    stopAdRequest(id: $id) {
      id
      status
      end_at
    }
  }
`;

export const DELETE_AD_REQUEST = gql`
  mutation DeleteAdRequest($id: ID!) {
    deleteAdRequest(id: $id)
  }
`;
