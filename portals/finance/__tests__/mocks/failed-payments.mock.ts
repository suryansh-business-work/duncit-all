import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import type { FailedPaymentDetail, FailedPaymentRow, PaymentEvent } from '@duncit/gql-types';
import {
  FAILED_PAYMENT,
  FAILED_PAYMENTS_TABLE,
  FAILED_PAYMENT_EVENTS,
  FAILED_PAYMENT_EVIDENCE_LINK,
  INITIATE_FAILED_PAYMENT_REFUND,
  MARK_FAILED_PAYMENT_NOT_REFUNDABLE,
  REVERIFY_FAILED_PAYMENT,
  REVIEW_FAILED_PAYMENT,
} from '../../src/pages/finance/failed-payments-page/queries';

type Vars = Record<string, unknown>;
const capture = (onCall: (v: Vars) => void) => (variables: Vars) => {
  onCall(variables);
  return true;
};

/** A green case: Razorpay captured it, the amount matches, no booking used it. */
export const makeFailedPaymentRow = (over: Partial<FailedPaymentRow> = {}): FailedPaymentRow => ({
  __typename: 'FailedPaymentRow',
  id: 'fp1',
  payment_doc_id: 'pd1',
  payment_id: 'DUN-PAY-9001',
  user_id: 'u1',
  user_name: 'Riya Sharma',
  user_email: 'riya@duncit.com',
  user_phone: '+919800000000',
  pod_id: 'pod1',
  pod_title: 'Sunrise Yoga',
  amount: 499,
  currency_symbol: '₹',
  razorpay_payment_id: 'pay_RZP123',
  razorpay_order_id: 'order_RZP9',
  error_code: 'BAD_REQUEST_ERROR',
  error_description: 'Payment failed at the bank',
  attempts: 2,
  sources: ['CLIENT_REPORT', 'CLAIM'],
  claim_count: 1,
  ticket_id: 'tk1',
  ticket_no: 'ST-AB12CD',
  verification_status: 'MATCHED',
  review_decision: null,
  refund_status: 'NONE',
  refund_amount: null,
  resolution_state: 'OPEN',
  highlight: 'GREEN',
  can_refund: true,
  needs_review: false,
  can_mark_not_refundable: false,
  created_at: '2026-11-20T10:00:00.000Z',
  updated_at: '2026-11-20T10:05:00.000Z',
  ...over,
});

export const makeFailedPaymentDetail = (over: Partial<FailedPaymentDetail> = {}): FailedPaymentDetail => ({
  __typename: 'FailedPaymentDetail',
  id: 'fp1',
  payment_doc_id: 'pd1',
  payment_id: 'DUN-PAY-9001',
  amount: 499,
  currency_symbol: '₹',
  pod_id: 'pod1',
  pod_title: 'Sunrise Yoga',
  razorpay_payment_id: 'pay_RZP123',
  razorpay_order_id: 'order_RZP9',
  user: { __typename: 'FailedPaymentUser', id: 'u1', name: 'Riya Sharma', email: 'riya@duncit.com', phone: '+919800000000' },
  booking: {
    __typename: 'FailedPaymentBooking',
    exists: false,
    booked_razorpay_payment_id: null,
    payment_status: 'PENDING',
    finalize_state: 'NOT_STARTED',
    needs_refund: false,
    paid_at: null,
  },
  latest_error: {
    __typename: 'FailedPaymentError',
    code: 'BAD_REQUEST_ERROR',
    description: 'Payment failed at the bank',
    reason: 'payment_failed',
    source: 'bank',
    step: 'payment_authorization',
    reported_by: 'CLIENT',
    at: '2026-11-20T10:00:00.000Z',
  },
  retry_shown: true,
  attempts: 2,
  sources: ['CLIENT_REPORT', 'CLAIM'],
  claims: [
    {
      __typename: 'FailedPaymentClaim',
      evidence_type: 'SCREENSHOT',
      transaction_id: null,
      submitted_at: '2026-11-20T10:03:00.000Z',
      files: [
        { __typename: 'FailedPaymentEvidenceFile', file_ref: 'ref-img-1', mime: 'image/png', kind: 'IMAGE' },
        { __typename: 'FailedPaymentEvidenceFile', file_ref: 'ref-pdf-1', mime: 'application/pdf', kind: 'PDF' },
        { __typename: 'FailedPaymentEvidenceFile', file_ref: 'ref-doc-1', mime: 'text/plain', kind: 'OTHER' },
      ],
    },
    {
      __typename: 'FailedPaymentClaim',
      evidence_type: 'TRANSACTION_ID',
      transaction_id: 'pay_RZP123',
      submitted_at: '2026-11-20T10:04:00.000Z',
      files: [],
    },
  ],
  verification: {
    __typename: 'FailedPaymentVerification',
    status: 'MATCHED',
    confidence: 0.92,
    extracted: {
      __typename: 'FailedPaymentExtracted',
      payment_id: 'pay_RZP123',
      utr: '412345678901',
      amount: 499,
      date: '2026-11-20',
      status: 'Debited',
      payee: 'Duncit',
    },
    matched_fields: ['payment_id', 'status', 'amount', 'no_booking'],
    matched_payment_id: 'pay_RZP123',
    razorpay_status: 'captured',
    razorpay_amount_paise: 49900,
    checked_at: '2026-11-20T10:05:00.000Z',
    notes: 'Matched on the Razorpay payment id.',
  },
  review: null,
  refund: {
    __typename: 'FailedPaymentRefund',
    status: 'NONE',
    razorpay_refund_id: null,
    razorpay_payment_id: null,
    amount: null,
    attempted_at: null,
    refunded_at: null,
    error: null,
    initiated_by_name: null,
  },
  ticket: { __typename: 'FailedPaymentTicket', id: 'tk1', ticket_no: 'ST-AB12CD', status: 'OPEN' },
  resolution: { __typename: 'FailedPaymentResolution', state: 'OPEN', at: null, by_name: null, note: null },
  highlight: 'GREEN',
  can_refund: true,
  needs_review: false,
  can_mark_not_refundable: false,
  refundable_amount: 499,
  revision: 3,
  created_at: '2026-11-20T10:00:00.000Z',
  updated_at: '2026-11-20T10:05:00.000Z',
  ...over,
});

export const makePaymentEvent = (over: Partial<PaymentEvent> = {}): PaymentEvent => ({
  __typename: 'PaymentEvent',
  id: 'ev1',
  type: 'CLIENT_FAILURE_REPORTED',
  source: 'CLIENT',
  actor_name: null,
  details: [{ __typename: 'PaymentEventDetail', key: 'error_code', value: 'BAD_REQUEST_ERROR' }],
  created_at: '2026-11-20T10:00:00.000Z',
  ...over,
});

export const failedPaymentsTableMock = (rows: FailedPaymentRow[], onCall: (v: Vars) => void = () => undefined): MockedResponse => ({
  request: { query: FAILED_PAYMENTS_TABLE, variables: capture(onCall) },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      failedPaymentsTable: { __typename: 'FailedPaymentTablePage', total: rows.length, page: 1, page_size: 25, rows },
    },
  },
});

export const failedPaymentsTableErrorMock = (message: string): MockedResponse => ({
  request: { query: FAILED_PAYMENTS_TABLE, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { errors: [new GraphQLError(message)] },
});

export const failedPaymentMock = (detail: FailedPaymentDetail | null, id = 'fp1'): MockedResponse => ({
  request: { query: FAILED_PAYMENT, variables: { id } },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { failedPayment: detail } },
});

export const failedPaymentErrorMock = (message: string, id = 'fp1'): MockedResponse => ({
  request: { query: FAILED_PAYMENT, variables: { id } },
  result: { errors: [new GraphQLError(message)] },
});

export const failedPaymentEventsMock = (events: PaymentEvent[], caseId = 'fp1'): MockedResponse => ({
  request: { query: FAILED_PAYMENT_EVENTS, variables: { caseId } },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { failedPaymentEvents: events } },
});

export const failedPaymentEventsErrorMock = (message: string, caseId = 'fp1'): MockedResponse => ({
  request: { query: FAILED_PAYMENT_EVENTS, variables: { caseId } },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { errors: [new GraphQLError(message)] },
});

export const evidenceLinkMock = (fileRef: string, kind: string, url: string, caseId = 'fp1'): MockedResponse => ({
  request: { query: FAILED_PAYMENT_EVIDENCE_LINK, variables: { caseId, fileRef } },
  result: {
    data: {
      failedPaymentEvidenceLink: { __typename: 'FailedPaymentEvidenceLink', url, kind, expires_at: '2026-11-20T10:15:00.000Z' },
    },
  },
});

export const evidenceLinkErrorMock = (fileRef: string, message: string, caseId = 'fp1'): MockedResponse => ({
  request: { query: FAILED_PAYMENT_EVIDENCE_LINK, variables: { caseId, fileRef } },
  result: { errors: [new GraphQLError(message)] },
});

type MutationName =
  | 'initiateFailedPaymentRefund'
  | 'reviewFailedPayment'
  | 'markFailedPaymentNotRefundable'
  | 'reverifyFailedPayment';

const DOCS = {
  initiateFailedPaymentRefund: INITIATE_FAILED_PAYMENT_REFUND,
  reviewFailedPayment: REVIEW_FAILED_PAYMENT,
  markFailedPaymentNotRefundable: MARK_FAILED_PAYMENT_NOT_REFUNDABLE,
  reverifyFailedPayment: REVERIFY_FAILED_PAYMENT,
} as const;

/** One answer to a decision mutation: the fresh case, or the server's refusal. */
export const failedPaymentMutationMock = (
  name: MutationName,
  answer: FailedPaymentDetail | string,
  onCall: (v: Vars) => void = () => undefined,
): MockedResponse => ({
  request: { query: DOCS[name], variables: capture(onCall) },
  result: typeof answer === 'string' ? { errors: [new GraphQLError(answer)] } : { data: { [name]: answer } },
});
