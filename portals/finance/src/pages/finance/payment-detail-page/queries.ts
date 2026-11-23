import { gql } from '@apollo/client';
import { formatMoney, type PaymentRentalLine } from '@duncit/utils';
import type { PaymentEvent } from '../failed-payments-page/queries';

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
      round_off
      total
      currency_symbol
      coupon_code
      coupon_discount
      smart_incentive_amount
      smart_incentive_pct
      status
      gateway
      gateway_ref
      razorpay_payment_id
      razorpay_order_id
      razorpay_refund_ids
      paid_at
      created_at
      rental_lines {
        item_id
        name
        quantity
        rent
        deposit
      }
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
    refunds {
      kind
      state
      amount
      coins
      entries {
        id
        ref
        source
        status
        state
        amount
        coins
        razorpay_refund_id
        razorpay_refund_ids
        razorpay_payment_id
        initiated_by
        reason
        error
        attempts
        requested_at
        processed_at
        due_at
        can_refund
      }
      events {
        id
        type
        source
        actor_name
        details {
          key
          value
        }
        created_at
      }
    }
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

/**
 * Send one owed refund back to the payment's own source with a note on record.
 * Answers with the whole audit (the same fragment), so the page refreshes from
 * the reply instead of racing a refetch against the write.
 */
export const REFUND_PAYMENT_TO_SOURCE = gql`
  mutation RefundPaymentToSource($input: RefundPaymentToSourceInput!) {
    refundPaymentToSource(input: $input) {
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
  /** What rounding the bill up to a whole rupee added — inside `total`, outside the tax lines. */
  round_off?: number | null;
  total: number;
  currency_symbol: string;
  coupon_code: string | null;
  coupon_discount: number;
  /** Rupees the member's unlocked Smart Incentive took off the ticket price, frozen at checkout (0 when none). */
  smart_incentive_amount: number;
  /** That offer's percentage (0 when none). */
  smart_incentive_pct: number;
  status: string;
  gateway: string;
  gateway_ref: string | null;
  /** Razorpay's own ids, as its dashboard shows them (null/empty for other gateways). */
  razorpay_payment_id?: string | null;
  razorpay_order_id?: string | null;
  razorpay_refund_ids?: string[];
  /** Rented items on a pod payment, frozen at checkout (empty when none). */
  rental_lines?: PaymentRentalLine[];
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

/** The kind of refund a section of the Refund area is, as the server names it. */
export type PaymentRefundKind =
  | 'COIN'
  | 'POD_PAYMENT'
  | 'PAYMENT'
  | 'POD_SHOP'
  | 'ECOMM'
  | 'FAILED_PAYMENT'
  | 'RENTAL';

/** PENDING = owed or on its way (yellow), COMPLETED = back with the buyer, FAILED = refused (red). */
export type PaymentRefundState = 'PENDING' | 'COMPLETED' | 'FAILED';

/** One refund inside a section: a gateway refund, an order, a return, a case or a coin ledger row. */
export interface PaymentRefundEntry {
  id: string;
  ref: string | null;
  /** Why it was sent (FINANCE_REFUND, POD_CANCELLATION, BACKOUT, RENTAL, HELD, RECORDED, CANCELLATION, RETURN, CASE, LEDGER). */
  source: string;
  /** The refund engine's own status, for the label. */
  status: string;
  state: PaymentRefundState;
  amount: number;
  coins: number;
  /** The first (primary) Razorpay refund id. */
  razorpay_refund_id: string | null;
  /** Every refund id behind the row. */
  razorpay_refund_ids: string[];
  razorpay_payment_id: string | null;
  initiated_by: string | null;
  reason: string | null;
  error: string | null;
  attempts: number;
  requested_at: string | null;
  processed_at: string | null;
  due_at: string | null;
  can_refund: boolean;
}

export interface PaymentRefundSection {
  kind: PaymentRefundKind;
  state: PaymentRefundState;
  amount: number;
  coins: number;
  entries: PaymentRefundEntry[];
  events: PaymentEvent[];
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
  /** The cart before EVERY discount: ticket gross + products, ahead of the Smart Incentive, coupon and coins. */
  original_total: number;
  coins_redeemed: number;
  coins_earned: number;
  /** Every refund the payment has seen, one section per kind, in the server's order. Optional so older fixtures stay valid. */
  refunds?: PaymentRefundSection[] | null;
}
