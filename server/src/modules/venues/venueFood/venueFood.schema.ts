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
    "The venue's automatic discount on QR orders."
    discount_pct: Int!
    discount_amount: Float!
    "The venue's coupon the order was placed with; null when it had none."
    coupon_code: String
    "The coupon's own percent; 0 without a coupon."
    coupon_pct: Int!
    "What the coupon took off, after the automatic discount and the caps; 0 without a coupon."
    coupon_discount_amount: Float!
    "What was charged: subtotal less discount_amount less coupon_discount_amount."
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

  "Why a coupon code cannot be used on an order."
  enum VenueFoodCouponRejection {
    "No such code at this venue, or it is switched off."
    INVALID
    NOT_STARTED
    EXPIRED
    MIN_ORDER_NOT_MET
    USAGE_LIMIT_REACHED
    PER_PERSON_LIMIT_REACHED
    "The order already carries the largest discount it can take, so the code would take nothing off."
    NO_DISCOUNT
  }

  "What a coupon code does to a cart. When ok is false the amounts are the cart's without the code."
  type VenueFoodCouponPreview {
    ok: Boolean!
    "Null when ok."
    reason: VenueFoodCouponRejection
    "A sentence for the guest; null when ok."
    message: String
    "The code as the venue wrote it; null unless ok."
    coupon_code: String
    coupon_pct: Int!
    "The subtotal the code needs; 0 when it needs none or is not ok."
    min_order_amount: Float!
    subtotal: Float!
    discount_pct: Int!
    discount_amount: Float!
    coupon_discount_amount: Float!
    total: Float!
    currency_symbol: String!
  }

  "A coupon a venue gives its own food guests. The venue funds it; it is valid for that venue's food orders only."
  type VenueFoodCoupon {
    id: ID!
    venue_id: ID!
    "Unique within the venue. Upper case."
    code: String!
    description: String!
    discount_pct: Int!
    "Rupees. Compared with the order subtotal, before any discount."
    min_order_amount: Float!
    valid_from: String
    valid_until: String
    "Total paid orders the code may discount; null for no cap."
    max_uses: Int
    "Paid orders one mobile number may use it on; null for no cap."
    per_phone_limit: Int
    "Orders currently paid with this coupon."
    used_count: Int!
    is_active: Boolean!
    created_at: String!
    updated_at: String!
  }

  "Server-side table page for the shared table engine."
  type VenueFoodCouponTablePage {
    rows: [VenueFoodCoupon!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input CreateVenueFoodCouponInput {
    venue_id: ID!
    "3-30 characters: A-Z, 0-9, - or _. Stored upper case."
    code: String!
    description: String
    "A whole number from 1 to the venue food discount ceiling (VenueRegistrationConfig.food_discount_max_pct)."
    discount_pct: Int!
    "Rupees."
    min_order_amount: Float
    "ISO date-time."
    valid_from: String
    valid_until: String
    max_uses: Int
    per_phone_limit: Int
    is_active: Boolean
  }

  "A field left out is left as it is. Null clears valid_from, valid_until, max_uses and per_phone_limit."
  input UpdateVenueFoodCouponInput {
    code: String
    description: String
    discount_pct: Int
    min_order_amount: Float
    valid_from: String
    valid_until: String
    max_uses: Int
    per_phone_limit: Int
    is_active: Boolean
  }

  input PreviewVenueFoodCouponInput {
    venue_id: ID!
    coupon_code: String!
    items: [VenueFoodOrderLineInput!]!
    "Lets the per-person limit be checked before the order is placed."
    customer_phone: String
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
    "A coupon of this venue. Applying, changing or removing it is a new checkout attempt and needs a new client_key."
    coupon_code: String
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
    "Public: what a coupon code would do to a cart. Places nothing and counts nothing."
    previewVenueFoodCoupon(input: PreviewVenueFoodCouponInput!): VenueFoodCouponPreview!
    "Venue owner / venues console: the food coupons of one venue."
    venueFoodCouponsTable(venue_id: ID!, query: TableQueryInput): VenueFoodCouponTablePage!
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
    "Venue owner / venues console: create a food coupon for a venue."
    createVenueFoodCoupon(input: CreateVenueFoodCouponInput!): VenueFoodCoupon!
    "Venue owner / venues console: edit a food coupon."
    updateVenueFoodCoupon(coupon_id: ID!, input: UpdateVenueFoodCouponInput!): VenueFoodCoupon!
    "Venue owner / venues console: switch a food coupon on or off."
    setVenueFoodCouponActive(coupon_id: ID!, is_active: Boolean!): VenueFoodCoupon!
    "Venue owner / venues console: delete a food coupon. Orders that used it keep their record of it."
    deleteVenueFoodCoupon(coupon_id: ID!): Boolean!
  }
`;
