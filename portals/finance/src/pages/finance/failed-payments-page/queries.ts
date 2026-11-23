import { gql } from '@apollo/client';
import type {
  FailedPaymentAiSummary,
  FailedPaymentDetail,
  FailedPaymentEvidenceLink,
  FailedPaymentRefundPreview,
  FailedPaymentReviewDecision,
  FailedPaymentRow,
  PaymentEvent,
} from '@duncit/gql-types';

export type { FailedPaymentAiSummary, FailedPaymentDetail, FailedPaymentRefundPreview, FailedPaymentRow, PaymentEvent };

/** Finance › Failed Payments: one page of cases, with the colour and action hints the server works out. */
export const FAILED_PAYMENTS_TABLE = gql`
  query FailedPaymentsTable($query: TableQueryInput) {
    failedPaymentsTable(query: $query) {
      total
      page
      page_size
      rows {
        id
        payment_doc_id
        payment_id
        payment_source
        user_id
        user_name
        user_email
        user_phone
        pod_id
        pod_title
        amount
        currency_symbol
        razorpay_payment_id
        razorpay_order_id
        error_code
        error_description
        attempts
        sources
        claim_count
        ticket_id
        ticket_no
        verification_status
        review_decision
        refund_status
        refund_amount
        razorpay_refund_id
        resolution_state
        highlight
        can_refund
        needs_review
        can_mark_not_refundable
        created_at
        updated_at
      }
    }
  }
`;

/** Every field the detail page renders — the mutations answer with the same shape. */
const DETAIL_FIELDS = gql`
  fragment FailedPaymentDetailFields on FailedPaymentDetail {
    id
    payment_doc_id
    payment_id
    payment_source
    amount
    currency_symbol
    pod_id
    pod_title
    razorpay_payment_id
    razorpay_order_id
    user { id name email phone }
    booking { exists booked_razorpay_payment_id payment_status finalize_state needs_refund paid_at }
    latest_error { code description reason source step reported_by at }
    retry_shown
    attempts
    sources
    claims {
      evidence_type
      transaction_id
      submitted_at
      files { file_ref mime kind }
    }
    verification {
      status
      confidence
      extracted { payment_id utr amount date status payee }
      matched_fields
      matched_payment_id
      razorpay_status
      razorpay_amount_paise
      checked_at
      notes
    }
    review { decision note by_name at }
    refund {
      status
      razorpay_refund_id
      razorpay_payment_id
      amount
      attempted_at
      refunded_at
      error
      initiated_by_name
    }
    ticket { id ticket_no status }
    resolution { state at by_name note }
    highlight
    can_refund
    needs_review
    can_mark_not_refundable
    refundable_amount
    ai_summary { recommendation summary reasons generated_at generated_by_name error stale }
    revision
    created_at
    updated_at
  }
`;

export const FAILED_PAYMENT = gql`
  query FailedPayment($id: ID!) {
    failedPayment(id: $id) {
      ...FailedPaymentDetailFields
    }
  }
  ${DETAIL_FIELDS}
`;

export const FAILED_PAYMENT_EVENTS = gql`
  query FailedPaymentEvents($caseId: ID!) {
    failedPaymentEvents(case_id: $caseId) {
      id
      type
      source
      actor_name
      details { key value }
      created_at
    }
  }
`;

/** Asked for only when someone opens a file: the link is short-lived and must never be cached. */
export const FAILED_PAYMENT_EVIDENCE_LINK = gql`
  query FailedPaymentEvidenceLink($caseId: ID!, $fileRef: String!) {
    failedPaymentEvidenceLink(case_id: $caseId, file_ref: $fileRef) {
      url
      expires_at
      kind
    }
  }
`;

export const REVIEW_FAILED_PAYMENT = gql`
  mutation ReviewFailedPayment(
    $caseId: ID!
    $decision: FailedPaymentReviewDecision!
    $note: String!
    $clientRequestId: String
  ) {
    reviewFailedPayment(case_id: $caseId, decision: $decision, note: $note, client_request_id: $clientRequestId) {
      ...FailedPaymentDetailFields
    }
  }
  ${DETAIL_FIELDS}
`;

export const INITIATE_FAILED_PAYMENT_REFUND = gql`
  mutation InitiateFailedPaymentRefund($caseId: ID!, $clientRequestId: String!) {
    initiateFailedPaymentRefund(case_id: $caseId, client_request_id: $clientRequestId) {
      ...FailedPaymentDetailFields
    }
  }
  ${DETAIL_FIELDS}
`;

export const MARK_FAILED_PAYMENT_NOT_REFUNDABLE = gql`
  mutation MarkFailedPaymentNotRefundable($caseId: ID!, $note: String!, $clientRequestId: String) {
    markFailedPaymentNotRefundable(case_id: $caseId, note: $note, client_request_id: $clientRequestId) {
      ...FailedPaymentDetailFields
    }
  }
  ${DETAIL_FIELDS}
`;

export const REVERIFY_FAILED_PAYMENT = gql`
  mutation ReverifyFailedPayment($caseId: ID!) {
    reverifyFailedPayment(case_id: $caseId) {
      ...FailedPaymentDetailFields
    }
  }
  ${DETAIL_FIELDS}
`;

/** What a refund would send right now. Never cached: it is Razorpay's live answer. */
export const FAILED_PAYMENT_REFUND_PREVIEW = gql`
  query FailedPaymentRefundPreview($caseId: ID!) {
    failedPaymentRefundPreview(case_id: $caseId) {
      refundable
      amount
      razorpay_payment_id
      reason
    }
  }
`;

/** The AI refund note; an unchanged case answers from its cached note unless force is set. */
export const SUMMARIZE_FAILED_PAYMENT = gql`
  mutation SummarizeFailedPayment($caseId: ID!, $force: Boolean) {
    summarizeFailedPayment(case_id: $caseId, force: $force) {
      ...FailedPaymentDetailFields
    }
  }
  ${DETAIL_FIELDS}
`;

export interface FailedPaymentRefundPreviewData {
  failedPaymentRefundPreview: FailedPaymentRefundPreview;
}

export interface SummarizeFailedPaymentData {
  summarizeFailedPayment: FailedPaymentDetail;
}

export interface FailedPaymentsTableData {
  failedPaymentsTable: { rows: FailedPaymentRow[]; total: number; page: number; page_size: number };
}
export interface FailedPaymentData {
  failedPayment: FailedPaymentDetail | null;
}
export interface FailedPaymentEventsData {
  failedPaymentEvents: PaymentEvent[];
}
export interface FailedPaymentEvidenceLinkData {
  failedPaymentEvidenceLink: FailedPaymentEvidenceLink;
}
export interface ReviewFailedPaymentVars {
  caseId: string;
  decision: FailedPaymentReviewDecision;
  note: string;
  clientRequestId?: string | null;
}

/**
 * What every row action needs from a case. A table row and the detail page both
 * carry these, so one set of dialogs serves both screens.
 */
export interface FailedPaymentTarget {
  id: string;
  amount: number;
  currency_symbol: string;
  razorpay_payment_id?: string | null;
  user_name: string;
  /** Exact refund the server would send now, when the detail page knows it. */
  refundable_amount?: number | null;
}
