export const venueFoodTypeDefs = /* GraphQL */ `
  "Where the kitchen has got to with an order."
  enum VenueFoodOrderStatus {
    PLACED
    ACCEPTED
    PREPARING
    READY
    SERVED
    CANCELLED
  }

  enum VenueFoodPaymentStatus {
    PENDING
    PAID
    FAILED
    REFUND_PENDING
    REFUNDED
  }

  "A dish as it was when ordered."
  type VenueFoodOrderLine {
    item_id: ID!
    name: String!
    diet: VenueFoodDiet!
    unit_price: Float!
    quantity: Int!
    line_total: Float!
  }

  "A food order placed by scanning a venue's QR. Paid to the venue's own Razorpay account."
  type VenueFoodOrder {
    id: ID!
    order_no: String!
    venue_id: ID!
    venue_name: String!
    customer_name: String!
    customer_phone: String!
    table_label: String!
    note: String!
    items: [VenueFoodOrderLine!]!
    subtotal: Float!
    discount_pct: Int!
    discount_amount: Float!
    total: Float!
    currency_symbol: String!
    status: VenueFoodOrderStatus!
    payment_status: VenueFoodPaymentStatus!
    paid_at: String
    cancelled_at: String
    cancel_reason: String!
    created_at: String!
  }

  "What the browser hands Razorpay's checkout to collect the payment."
  type VenueFoodRazorpaySheet {
    key_id: String!
    order_id: String!
    "Paise."
    amount: Int!
    currency: String!
    name: String!
    description: String!
    prefill_contact: String!
  }

  type VenueFoodOrderPlacement {
    order: VenueFoodOrder!
    "Proves the order is the caller's on every later read. Keep it with the order id."
    access_key: String!
    "Null once the order is no longer waiting for payment."
    razorpay: VenueFoodRazorpaySheet
  }

  "Server-side table page for the shared table engine."
  type VenueFoodOrderTablePage {
    rows: [VenueFoodOrder!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input VenueFoodOrderLineInput {
    item_id: ID!
    quantity: Int!
  }

  input PlaceVenueFoodOrderInput {
    venue_id: ID!
    items: [VenueFoodOrderLineInput!]!
    customer_name: String!
    customer_phone: String!
    table_label: String
    note: String
    "Minted once per checkout attempt (crypto.randomUUID). Repeating it returns the same order."
    client_key: String!
  }

  input VerifyVenueFoodOrderInput {
    order_id: ID!
    access_key: String
    razorpay_order_id: String!
    razorpay_payment_id: String!
    razorpay_signature: String!
  }

  extend type Query {
    "Public: one order, for whoever holds its access key (or the account that placed it)."
    venueFoodOrder(order_id: ID!, access_key: String): VenueFoodOrder
    "Venue owner / venues console: the paid orders of one venue."
    venueFoodOrdersTable(venue_id: ID!, query: TableQueryInput): VenueFoodOrderTablePage!
  }

  extend type Mutation {
    "Public: place a food order at a venue and open its payment. No sign-in needed."
    placeVenueFoodOrder(input: PlaceVenueFoodOrderInput!): VenueFoodOrderPlacement!
    "Public: confirm the Razorpay payment of an order."
    verifyVenueFoodOrderPayment(input: VerifyVenueFoodOrderInput!): VenueFoodOrder!
    "Venue owner / venues console: move a paid order forward."
    setVenueFoodOrderStatus(order_id: ID!, status: VenueFoodOrderStatus!): VenueFoodOrder!
    "Venue owner / venues console: cancel a paid order and refund it in full."
    cancelVenueFoodOrder(order_id: ID!, reason: String!): VenueFoodOrder!
  }
`;
