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

  "What a guest said about a served order. Written once."
  type VenueFoodFeedback {
    "1 to 5."
    rating: Int!
    comment: String!
    images: [String!]!
    submitted_at: String!
  }

  "A food order placed by scanning a venue's QR. Paid to the venue's own Razorpay account."
  type VenueFoodOrder {
    id: ID!
    order_no: String!
    venue_id: ID!
    venue_name: String!
    "The venue's GST number as it was when the order was placed; empty when the venue has none."
    venue_gstin: String!
    "The venue's address as its invoice prints it."
    venue_address: String!
    "True once the money has arrived — the invoice can be downloaded."
    invoice_available: Boolean!
    served_at: String
    "The guest asked, at checkout, to hear about this venue's events."
    subscribe_events: Boolean!
    "Null until the guest rates the order."
    feedback: VenueFoodFeedback
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
    "How GST met the price when the order was placed. An order from before GST reads INCLUSIVE."
    tax_mode: FoodTaxMode!
    "The GST percent the order was priced with; 0 on an order from before GST."
    gst_pct: Int!
    "The value the GST is charged on — the bill without its GST. taxable_amount + tax_amount = total."
    taxable_amount: Float!
    "The GST inside (INCLUSIVE) or added to (EXCLUSIVE) the total."
    tax_amount: Float!
    "What was charged: subtotal less discount_amount less coupon_discount_amount, plus tax_amount when EXCLUSIVE."
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
    "The venue's GST, exactly as placing the order would apply it."
    tax_mode: FoodTaxMode!
    gst_pct: Int!
    taxable_amount: Float!
    tax_amount: Float!
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

  "A coupon a guest can pick at a venue's food checkout. Only what choosing needs — never its usage."
  type AvailableVenueFoodCoupon {
    code: String!
    description: String!
    discount_pct: Int!
    "Rupees of subtotal the code needs; 0 when it needs none."
    min_order_amount: Float!
    valid_until: String
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
    "The guest ticked 'tell me about events here'. They are subscribed once the order is paid."
    subscribe_events: Boolean
    "Minted once per checkout attempt (crypto.randomUUID). Repeating it returns the same order."
    client_key: String!
  }

  input SubmitVenueFoodFeedbackInput {
    order_id: ID!
    access_key: String
    "A whole number from 1 to 5."
    rating: Int!
    "Up to 500 characters."
    comment: String
    "Up to 3 photos, each uploaded with a pass from venueFoodFeedbackUploadPass."
    images: [String!]
  }

  type VenueFoodStatusCount {
    status: VenueFoodOrderStatus!
    count: Int!
  }

  type VenueFoodTopItem {
    name: String!
    quantity: Int!
    revenue: Float!
  }

  type VenueFoodDailyPoint {
    "yyyy-mm-dd in the configured time zone."
    date: String!
    orders: Int!
    revenue: Float!
  }

  type VenueFoodFeedbackRow {
    order_no: String!
    customer_name: String!
    rating: Int!
    comment: String!
    images: [String!]!
    submitted_at: String!
  }

  "A venue's food numbers over a window. Money is in rupees; revenue leaves out cancelled orders."
  type VenueFoodStats {
    "The window in days; 0 is all time."
    days: Int!
    currency_symbol: String!
    "Paid orders placed in the window, cancelled ones included."
    orders: Int!
    revenue: Float!
    average_order: Float!
    "What the automatic discount and the coupons took off, together."
    discount_given: Float!
    "GST inside the revenue — collected on the venue's behalf, cancelled orders left out."
    tax_collected: Float!
    coupon_orders: Int!
    served: Int!
    cancelled: Int!
    refunded: Float!
    invoice_downloads: Int!
    "Orders whose guest asked to hear about events."
    subscribe_opt_ins: Int!
    "People currently subscribed to this venue's events."
    subscribers: Int!
    "Scans of the venue page link (the A4 poster) in the window."
    page_scans: Int!
    "Scans of the table label link in the window."
    table_scans: Int!
    feedback_count: Int!
    "0 when nobody has rated yet; otherwise 1.0 to 5.0."
    average_rating: Float!
    status_counts: [VenueFoodStatusCount!]!
    top_items: [VenueFoodTopItem!]!
    daily: [VenueFoodDailyPoint!]!
    recent_feedback: [VenueFoodFeedbackRow!]!
  }

  "What guests rated a venue's food: one rating per served order, so this is the venue's, not a dish's."
  type VenueFoodRating {
    venue_id: ID!
    "0 when nobody has rated yet; otherwise 1.0 to 5.0, to one decimal."
    average: Float!
    "Rated orders."
    count: Int!
  }

  "Which of the caller's own food orders to list."
  enum MyVenueFoodOrderScope {
    "Paid and still with the kitchen, or placed within the last hour and still waiting for payment."
    CURRENT
    "Paid, and served or cancelled."
    PAST
  }

  "An order this device placed, with the key that proves it."
  input VenueFoodOrderKeyInput {
    order_id: ID!
    access_key: String!
  }

  input MyVenueFoodOrdersInput {
    scope: MyVenueFoodOrderScope!
    "Only this venue's orders."
    venue_id: ID
    "Up to 20 orders this device placed. A key that does not open its order is ignored."
    keys: [VenueFoodOrderKeyInput!]
    "1-based; default 1."
    page: Int
    "Default 10, at most 20."
    page_size: Int
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
    "Public: the coupons a guest can pick from at this venue's checkout right now, best first. Empty when the venue is not taking orders."
    availableVenueFoodCoupons(venue_id: ID!): [AvailableVenueFoodCoupon!]!
    "Venue owner / venues console: the food coupons of one venue."
    venueFoodCouponsTable(venue_id: ID!, query: TableQueryInput): VenueFoodCouponTablePage!
    "Public: the invoice of a paid order as a base64 PDF, for whoever holds its access key (or the account that placed it)."
    venueFoodOrderInvoicePdfBase64(order_id: ID!, access_key: String): String!
    "Public: the caller's own food orders — placed by the signed-in account, or proven by a key from this device. Newest first."
    myVenueFoodOrders(input: MyVenueFoodOrdersInput!): VenueFoodOrderTablePage!
    "Public: a venue's food rating — the average of its rated orders, and how many."
    venueFoodRating(venue_id: ID!): VenueFoodRating!
    "Venue owner / venues console: the food dashboard of one venue. days 0 = all time."
    venueFoodStats(venue_id: ID!, days: Int): VenueFoodStats!
  }

  extend type Mutation {
    "Public: place a food order at a venue and open its payment. No sign-in needed."
    placeVenueFoodOrder(input: PlaceVenueFoodOrderInput!): VenueFoodOrderPlacement!
    "Public: confirm the Razorpay payment of an order."
    verifyVenueFoodOrderPayment(input: VerifyVenueFoodOrderInput!): VenueFoodOrder!
    "Public: a one-shot pass to upload one feedback photo for a served, not yet rated order."
    venueFoodFeedbackUploadPass(order_id: ID!, access_key: String): ImagekitAuth!
    "Public: rate a served order. Once per order."
    submitVenueFoodFeedback(input: SubmitVenueFoodFeedbackInput!): VenueFoodOrder!
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
