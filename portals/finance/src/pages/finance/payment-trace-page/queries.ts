import { gql } from '@apollo/client';
import type { PaymentTrace } from '@duncit/gql-types';

export type { PaymentTrace };

/** Finance › Payment Trace: every payment one id belongs to and every log it appears in. */
export const PAYMENT_TRACE = gql`
  query PaymentTrace($ref: String!) {
    paymentTrace(ref: $ref) {
      ref
      found
      payments {
        id
        payment_id
        invoice_no
        source
        status
        finalize_state
        amount
        currency_symbol
        description
        user_name
        razorpay_payment_id
        razorpay_order_id
        razorpay_refund_ids
        matched_on
        created_at
        paid_at
      }
      steps { payment_id key status detail at }
      events {
        id
        payment_id
        type
        source
        actor_name
        details { key value }
        created_at
      }
      webhooks {
        id
        event
        razorpay_payment_id
        razorpay_order_id
        razorpay_refund_id
        status
        amount
        outcome
        error
        received_at
      }
      failed_cases { id payment_id verification_status refund_status resolution_state created_at }
      gateway_refunds {
        id
        payment_id
        source
        status
        amount
        razorpay_refund_id
        razorpay_payment_id
        reason
        last_error
        created_at
        processed_at
      }
      shop_orders { id payment_id order_no channel fulfilment_status total refund_status created_at }
      food_orders {
        id
        order_no
        venue_name
        status
        payment_status
        amount
        currency_symbol
        razorpay_payment_id
        razorpay_order_id
        razorpay_refund_id
        created_at
      }
    }
  }
`;

export interface PaymentTraceData {
  paymentTrace: PaymentTrace;
}
