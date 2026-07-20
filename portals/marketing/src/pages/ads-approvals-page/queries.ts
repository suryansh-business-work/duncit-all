import { gql } from '@apollo/client';

/** Full AdRequest selection — table rows keep feeding the ReviewDialog. */
const AD_REQUEST_ROW_FIELDS = gql`
  fragment AdRequestRowFields on AdRequest {
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

/** Server-side table page (search/sort/filter/paginate) for the approval queue. */
export const ADS_TABLE = gql`
  query AdRequestsTable($query: TableQueryInput) {
    adRequestsTable(query: $query) {
      total
      rows {
        ...AdRequestRowFields
      }
    }
  }
  ${AD_REQUEST_ROW_FIELDS}
`;

/** Approve freezes approved_cost from current pricing; only PENDING is reviewable. */
export const REVIEW_AD_REQUEST = gql`
  mutation ReviewAdRequest($id: ID!, $approve: Boolean!, $remarks: String) {
    reviewAdRequest(id: $id, approve: $approve, remarks: $remarks) {
      id
      status
      approved_cost
      marketing_remarks
      reviewed_at
    }
  }
`;
