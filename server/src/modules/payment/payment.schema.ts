export const paymentTypeDefs = /* GraphQL */ `
  enum PaymentStatus {
    PENDING
    SUCCESS
    FAILED
    REFUNDED
  }

  enum PaymentTargetType {
    POD
    OTHER
  }

  type Payment {
    id: ID!
    payment_id: String!
    invoice_no: String
    user_id: ID!
    user_name: String!
    user_email: String!
    user_phone: String
    billing_address: String!
    checkout_url: String!
    target_type: PaymentTargetType!
    pod_id: ID
    pod: Pod
    description: String!
    subtotal: Float!
    platform_fee_pct: Float!
    platform_fee_amount: Float!
    gst_pct: Float!
    gst_amount: Float!
    total: Float!
    currency_symbol: String!
    status: PaymentStatus!
    gateway: String!
    gateway_ref: String
    paid_at: String
    created_at: String!
    updated_at: String!
  }

  type CheckoutQuote {
    subtotal: Float!
    platform_fee_pct: Float!
    platform_fee_amount: Float!
    gst_pct: Float!
    gst_amount: Float!
    total: Float!
    currency_symbol: String!
    dummy_mode: Boolean!
  }

  input CheckoutQuoteInput {
    pod_id: ID
    amount: Float!
  }

  input DummyCheckoutInput {
    pod_id: ID
    amount: Float!
    description: String
    contact_email: String!
    contact_phone: String
    contact_phone_extension: String!
    contact_phone_number: String!
    billing_address: String!
    checkout_url: String!
    simulate_failure: Boolean
  }

  input PaymentFilterInput {
    status: PaymentStatus
    user_id: ID
    pod_id: ID
    search: String
  }

  extend type Query {
    payments(filter: PaymentFilterInput, limit: Int): [Payment!]!
    payment(payment_doc_id: ID!): Payment
    myPayments: [Payment!]!
    checkoutQuote(input: CheckoutQuoteInput!): CheckoutQuote!
    paymentInvoicePdfBase64(payment_doc_id: ID!): String!
  }

  extend type Mutation {
    dummyCheckout(input: DummyCheckoutInput!): Payment!
    refundPayment(payment_doc_id: ID!, reason: String): Payment!
  }
`;
