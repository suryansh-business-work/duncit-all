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
      venue_slot_price
      include_slot_price
      venue_extra_amount
      venue_min_guests
      venue_pax
      venue_agreed_model
      venue_agreed_rate
    }
  }
`;

/** Payment Release, one row per pod request (server-paged). */
export const POD_PAYMENT_RELEASES_TABLE = gql`
  query PodPaymentReleasesTable($query: TableQueryInput) {
    podPaymentReleasesTable(query: $query) {
      total
      rows {
        id
        pod_id
        pod_title
        status
        total_requested
        release_count
        kinds
        has_bill
        media_count
        requested_at
      }
    }
  }
`;

const POD_RELEASE_DETAIL_FIELDS = gql`
  fragment PodPaymentReleaseDetailFields on PodPaymentReleaseDetail {
    summary {
      id
      pod_id
      pod_title
      status
      total_requested
      release_count
      requested_at
    }
    releases {
      ...PaymentReleaseRowFields
    }
  }
  ${RELEASE_ROW_FIELDS}
`;

/** One pod request with every payout on it — the Payment Release page. */
export const POD_PAYMENT_RELEASE = gql`
  query PodPaymentRelease($id: ID!) {
    podPaymentRelease(id: $id) {
      ...PodPaymentReleaseDetailFields
    }
    publicFinanceSettings {
      currency_symbol
    }
  }
  ${POD_RELEASE_DETAIL_FIELDS}
`;

/** Approve every payout still pending on the request, in full. */
export const APPROVE_POD_PAYMENT_RELEASE = gql`
  mutation ApprovePodPaymentRelease($id: ID!) {
    approvePodPaymentRelease(id: $id) {
      ...PodPaymentReleaseDetailFields
    }
  }
  ${POD_RELEASE_DETAIL_FIELDS}
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

export type ReleaseKind = 'VENUE_BILLING' | 'HOST_PAYMENT' | 'CLUB_ADMIN' | 'ECOMM_PAYMENT' | 'VENUE_RENTAL';
export type ReleaseStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** One pod request — a Payment Release table row. */
export interface PodPaymentReleaseRow {
  id: string;
  pod_id: string;
  pod_title: string;
  status: ReleaseStatus;
  total_requested: number;
  release_count: number;
  kinds: ReleaseKind[];
  has_bill: boolean;
  media_count: number;
  requested_at: string;
}

/** The settlement snapshot a release carries, as the request page reads it. */
export interface ReleaseBreakdown {
  version: number;
  venue_bill: number;
  share_amount: number;
  attended_seats: number;
  booked_seats: number;
  venue_slot_price: number;
  include_slot_price: boolean;
  /** Extra charges on the venue's bill, paid on top of the agreed amount (0 on older releases). */
  venue_extra_amount: number;
  /** An agreed per-guest booking's minimum guests (0 = none). */
  venue_min_guests: number;
  /** The guests the venue was charged for — on a per-guest booking, never fewer than its minimum. */
  venue_pax: number;
  /** The agreed offer's pricing model (VenueOfferModel) and rate; null before offers. */
  venue_agreed_model: string | null;
  venue_agreed_rate: number | null;
}

/** One request with every payout on it. */
export interface PodPaymentReleaseDetail {
  summary: Pick<
    PodPaymentReleaseRow,
    'id' | 'pod_id' | 'pod_title' | 'status' | 'total_requested' | 'release_count' | 'requested_at'
  >;
  releases: PaymentReleaseRow[];
}

/** One payout on a request (rows also carry the full breakdown the review
 * dialog reads). */
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
  approved_amount?: number | null;
  breakdown?: ReleaseBreakdown | null;
}
/** The pod's coin movement, multi-ticket and Smart Incentive discounts, for the
 * release review's explanatory lines. Live rather than from the frozen
 * settlement snapshot: none was ever part of that record and back-filling one
 * would rewrite money history. Each discount total is itself a sum of
 * per-payment snapshots, so it does not move when the pod's offers are edited. */
export const POD_COIN_TOTALS = gql`
  query PodCoinTotals($podId: ID!) {
    podFinanceBreakdown(pod_id: $podId) {
      pod_id
      coins_redeemed_total
      coins_earned_total
      ticket_discount_total
      smart_incentive_total
    }
  }
`;
