import { gql } from '@apollo/client';
import { formatMoney } from '@duncit/utils';
import type { TableFetch } from '@duncit/table';

/** The whole audit, as one fragment: the detail query reads it and the retry
 * mutation answers with it, so a re-run refreshes the page from its own reply
 * instead of racing a refetch against the write it just made. */
export const PAYMENT_DETAIL_FIELDS = gql`
  fragment PaymentDetailFields on PaymentDetail {
    payment {
      id
      payment_id
      invoice_no
      target_type
      user_name
      user_email
      user_phone
      billing {
        name
        email
        phone
        gstin
        line1
        line2
        landmark
        city
        state
        pincode
        country
      }
      description
      subtotal
      platform_fee_pct
      platform_fee_amount
      gst_pct
      gst_amount
      total
      currency_symbol
      coupon_code
      coupon_discount
      status
      gateway
      gateway_ref
      paid_at
      created_at
    }
    finalize_state
    finalize_attempts
    finalized_at
    finalize_error
    needs_refund
    can_retry_finalize
    retryable_step_keys
    steps {
      key
      label
      status
      detail
      refs
      at
      segment
      can_retry
    }
    artifacts {
      key
      label
      created
      count
      refs
      not_applicable
      segment
      retry_key
    }
    coins {
      type
      amount
      balance_after
      source
      reason
      earn_pct
      at
    }
    coupon {
      code
      discount
      discount_type
      discount_value
      title
      still_exists
    }
    pod_booking {
      pod_id
      pod_title
      pod_date_time
      seats
      membership_id
      membership_status
      ticket_code
      ticket_status
    }
    product_orders {
      id
      order_no
      fulfilment_method
      fulfilment_status
      total
      item_count
      awb
    }
    gift_card {
      id
      code
      recipient_name
      recipient_email
      scope_name
      initial_amount
      balance
      status
      expires_at
      redeemed_at
    }
    original_total
    coins_redeemed
    coins_earned
  }
`;

export const PAYMENT_DETAIL = gql`
  query PaymentDetail($id: ID!) {
    paymentDetail(payment_doc_id: $id) {
      ...PaymentDetailFields
    }
  }
  ${PAYMENT_DETAIL_FIELDS}
`;

/** Omit `stepKeys` to re-run everything the payment still owes. */
export const RETRY_PAYMENT_STEPS = gql`
  mutation RetryPaymentSteps($id: ID!, $stepKeys: [String!]) {
    retryPaymentSteps(payment_doc_id: $id, step_keys: $stepKeys) {
      ...PaymentDetailFields
    }
  }
  ${PAYMENT_DETAIL_FIELDS}
`;

export const money = (symbol: string, value: number) =>
  formatMoney(value, { symbol, decimals: 2, grouping: false });

/** Which part of checkout a row belongs to — the detail page's tabs. */
export type PaymentSegment = 'PAYMENT' | 'POD' | 'PRODUCT' | 'GIFT_CARD';

export interface PaymentBilling {
  name: string;
  email: string;
  phone: string;
  gstin: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

/** The Payment fields this page selects (a subset of the Payment type). */
export interface DetailPayment {
  id: string;
  payment_id: string;
  invoice_no: string | null;
  target_type: string;
  user_name: string;
  user_email: string;
  user_phone: string | null;
  billing: PaymentBilling;
  description: string;
  subtotal: number;
  platform_fee_pct: number;
  platform_fee_amount: number;
  gst_pct: number;
  gst_amount: number;
  total: number;
  currency_symbol: string;
  coupon_code: string | null;
  coupon_discount: number;
  status: string;
  gateway: string;
  gateway_ref: string | null;
  paid_at: string | null;
  created_at: string;
}

export type PaymentStepStatus = 'PENDING' | 'DONE' | 'SKIPPED' | 'FAILED';

export interface PaymentStep {
  key: string;
  label: string;
  status: PaymentStepStatus;
  detail: string;
  refs: string[];
  at: string | null;
  segment: PaymentSegment;
  can_retry: boolean;
}

export interface PaymentArtifact {
  key: string;
  label: string;
  created: boolean;
  count: number;
  refs: string[];
  not_applicable: boolean;
  segment: PaymentSegment;
  /** The step that would re-create this row, when one can. */
  retry_key: string | null;
}

export interface PaymentCoinLine {
  type: string;
  amount: number;
  balance_after: number;
  source: string;
  reason: string;
  earn_pct: number;
  at: string;
}

export interface PaymentCouponInfo {
  code: string;
  discount: number;
  discount_type: string;
  discount_value: number;
  title: string;
  still_exists: boolean;
}

export interface PaymentPodBooking {
  pod_id: string;
  pod_title: string;
  pod_date_time: string | null;
  seats: number;
  membership_id: string | null;
  membership_status: string | null;
  ticket_code: string | null;
  ticket_status: string | null;
}

export interface PaymentProductOrderLine {
  id: string;
  order_no: string;
  fulfilment_method: string;
  fulfilment_status: string;
  total: number;
  item_count: number;
  awb: string | null;
}

export interface PaymentGiftCardInfo {
  id: string;
  code: string;
  recipient_name: string;
  recipient_email: string;
  scope_name: string;
  initial_amount: number;
  balance: number;
  status: string;
  expires_at: string | null;
  redeemed_at: string | null;
}

export interface PaymentDetail {
  payment: DetailPayment;
  finalize_state: string;
  finalize_attempts: number;
  finalized_at: string | null;
  finalize_error: string | null;
  needs_refund: boolean;
  can_retry_finalize: boolean;
  retryable_step_keys: string[];
  steps: PaymentStep[];
  artifacts: PaymentArtifact[];
  coins: PaymentCoinLine[];
  coupon: PaymentCouponInfo | null;
  pod_booking: PaymentPodBooking | null;
  product_orders: PaymentProductOrderLine[];
  gift_card: PaymentGiftCardInfo | null;
  original_total: number;
  coins_redeemed: number;
  coins_earned: number;
}

/**
 * DuncitTable's only data path is a server bridge, but these rows arrive whole
 * with the detail query — so the "fetch" is an in-memory search + slice. The
 * columns declare `sortable: false` because this fetch ignores q.sortBy, and a
 * live sort affordance that does nothing would lie about that.
 */
export function staticTableFetch<T>(
  rows: readonly T[],
  searchOf: (row: T) => string,
): TableFetch<T> {
  return (q) => {
    const term = q.search.trim().toLowerCase();
    const filtered = term ? rows.filter((row) => searchOf(row).toLowerCase().includes(term)) : rows;
    const start = (q.page - 1) * q.pageSize;
    return Promise.resolve({ rows: filtered.slice(start, start + q.pageSize), total: filtered.length });
  };
}
