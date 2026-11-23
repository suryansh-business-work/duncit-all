/**
 * Finance › Payment Trace: every payment one id belongs to and every log it
 * appears in. Read-only; see paymentTrace.service.ts.
 */
export const paymentTraceTypeDefs = /* GraphQL */ `
  "Which of a payment's ids the traced id equals. One id can match several (an old Duncit ref shaped like pay_…)."
  enum PaymentTraceMatch {
    DUNCIT_REF
    INVOICE
    DOCUMENT_ID
    RAZORPAY_PAYMENT
    RAZORPAY_ORDER
    RAZORPAY_REFUND
  }

  type PaymentTracePayment {
    "Payment document id (opens Payment Logs › detail)."
    id: ID!
    "Duncit reference (DPAY-…, or pay_… on older payments)."
    payment_id: String!
    invoice_no: String
    "Which checkout it came from: pod booking, pod shop, pet store, gift card / other."
    source: PaymentSource!
    status: String!
    finalize_state: String!
    "Rupees."
    amount: Float!
    currency_symbol: String!
    description: String!
    user_name: String!
    razorpay_payment_id: String
    razorpay_order_id: String
    razorpay_refund_ids: [String!]!
    matched_on: [PaymentTraceMatch!]!
    created_at: String!
    paid_at: String
  }

  "One finalization step of a payment (booking, invoice, email, shipment…)."
  type PaymentTraceStep {
    "Duncit reference of the payment it belongs to."
    payment_id: String!
    key: String!
    status: String!
    detail: String
    at: String
  }

  "One entry of a payment's event timeline."
  type PaymentTraceEvent {
    id: ID!
    payment_id: String!
    type: String!
    source: String!
    actor_name: String
    details: [PaymentEventDetail!]!
    created_at: String!
  }

  "One Razorpay webhook delivery that mentions the payment's Razorpay ids."
  type PaymentTraceWebhook {
    id: ID!
    event: String!
    razorpay_payment_id: String
    razorpay_order_id: String
    razorpay_refund_id: String
    status: String
    "Rupees."
    amount: Float
    outcome: String
    error: String
    received_at: String!
  }

  type PaymentTraceFailedCase {
    "Failed-payment case id (opens Failed Payments › detail)."
    id: ID!
    payment_id: String!
    verification_status: String!
    refund_status: String!
    resolution_state: String!
    created_at: String!
  }

  "One refund sent back through Razorpay for the payment."
  type PaymentTraceGatewayRefund {
    id: ID!
    payment_id: String!
    source: String!
    status: String!
    "Rupees."
    amount: Float!
    razorpay_refund_id: String
    razorpay_payment_id: String
    reason: String
    last_error: String
    created_at: String!
    processed_at: String
  }

  "A pod shop or pet store order the payment paid for."
  type PaymentTraceShopOrder {
    id: ID!
    payment_id: String!
    order_no: String!
    "POD_SHOP or PET_STORE."
    channel: String!
    fulfilment_status: String!
    "Rupees."
    total: Float!
    refund_status: String!
    created_at: String!
  }

  "A venue food order paid to the venue's own Razorpay account."
  type PaymentTraceFoodOrder {
    id: ID!
    order_no: String!
    venue_name: String!
    status: String!
    payment_status: String!
    "Rupees."
    amount: Float!
    currency_symbol: String!
    razorpay_payment_id: String
    razorpay_order_id: String
    razorpay_refund_id: String
    created_at: String!
  }

  type PaymentTrace {
    ref: String!
    "False when nothing anywhere carries this id."
    found: Boolean!
    payments: [PaymentTracePayment!]!
    steps: [PaymentTraceStep!]!
    events: [PaymentTraceEvent!]!
    webhooks: [PaymentTraceWebhook!]!
    failed_cases: [PaymentTraceFailedCase!]!
    gateway_refunds: [PaymentTraceGatewayRefund!]!
    shop_orders: [PaymentTraceShopOrder!]!
    food_orders: [PaymentTraceFoodOrder!]!
  }

  extend type Query {
    "Finance › Payment Trace: every payment an id (DPAY- ref, invoice no, payment document id, Razorpay pay_/order_/rfnd_) belongs to and every log it appears in. Exact match only."
    paymentTrace(ref: String!): PaymentTrace!
  }
`;
