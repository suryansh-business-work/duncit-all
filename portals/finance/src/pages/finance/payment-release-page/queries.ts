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
        attended_seats
        booked_seats
        attended_total
      }
    }
  }
`;

/** Same selection as PAYMENT_RELEASE_REQUESTS rows (the review dialog needs the
 * full breakdown), for the server-paged table query. */
const RELEASE_ROW_FIELDS = gql`
  fragment PaymentReleaseRowFields on PaymentReleaseRequest {
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
      attended_seats
      booked_seats
      attended_total
    }
  }
`;

export const PAYMENT_RELEASE_REQUESTS_TABLE = gql`
  query PaymentReleaseRequestsTable($query: TableQueryInput) {
    paymentReleaseRequestsTable(query: $query) {
      total
      rows {
        ...PaymentReleaseRowFields
      }
    }
  }
  ${RELEASE_ROW_FIELDS}
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

export type ReleaseKind = 'VENUE_BILLING' | 'HOST_PAYMENT' | 'CLUB_ADMIN';
export type ReleaseStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** Row shape for the payment-release table (fields the columns touch — rows
 * also carry the approval/breakdown fields the review dialog reads). */
export interface PaymentReleaseRow {
  id: string;
  release_id: string;
  kind: ReleaseKind;
  status: ReleaseStatus;
  pod_id: string;
  pod_title: string;
  beneficiary_name: string;
  beneficiary_email: string;
  amount_requested: number;
  bill_url: string | null;
  evidence_media: { url: string; type: string }[] | null;
  notes: string | null;
  requested_at: string;
}
/** The pod's coin movement, for the release review's explanatory line. Live
 * rather than from the frozen settlement snapshot: coins were never part of
 * that record and back-filling one would rewrite money history. */
export const POD_COIN_TOTALS = gql`
  query PodCoinTotals($podId: ID!) {
    podFinanceBreakdown(pod_id: $podId) {
      pod_id
      coins_redeemed_total
      coins_earned_total
    }
  }
`;
