import { gql } from '@apollo/client';

export const PAYMENT_RELEASE_REQUESTS = gql`
  query PaymentReleaseRequests($filter: PaymentReleaseFilterInput) {
    paymentReleaseRequests(filter: $filter) {
      id
      release_id
      kind
      status
      pod_id
      pod_title
      beneficiary_name
      beneficiary_email
      amount_requested
      bill_url
      evidence_media {
        url
        type
      }
      notes
      requested_at
      approval_type
      approved_amount
      approval_reason
      reviewed_at
      breakdown {
        version
        collected_total
        venue_bill
        gst_pct
        gst_amount
        duncit_pct
        duncit_amount
        payout_pct
        payout_amount
        net_amount
        platform_fee_pct
        platform_fee_amount
        pool_amount
        share_amount
        commission_pct
        commission_amount
        duncit_revenue
      }
    }
  }
`;

export const PUBLIC_FINANCE_SETTINGS = gql`
  query PublicFinanceSettings {
    publicFinanceSettings {
      currency_symbol
    }
  }
`;

export const REVIEW_PAYMENT_RELEASE = gql`
  mutation ReviewPaymentRelease($id: ID!, $input: ReviewPaymentReleaseInput!) {
    reviewPaymentReleaseRequest(request_id: $id, input: $input) {
      id
      status
      approval_type
      approved_amount
      approval_reason
      reviewed_at
    }
  }
`;

export type ReleaseKind = 'VENUE_BILLING' | 'HOST_PAYMENT';
export type ReleaseStatus = 'PENDING' | 'APPROVED' | 'REJECTED';