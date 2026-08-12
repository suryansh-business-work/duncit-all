export const paymentTypeDefs = /* GraphQL */ `
  enum PaymentStatus {
    PENDING
    SUCCESS
    FAILED
    REFUNDED
  }

  enum PaymentTargetType {
    POD
    PRODUCT
    OTHER
  }

  "Structured billing block snapshotted on a payment (drives the invoice bill-to)."
  type BillingDetails {
    name: String!
    email: String!
    phone: String!
    gstin: String!
    line1: String!
    line2: String!
    landmark: String!
    city: String!
    state: String!
    pincode: String!
    country: String!
  }

  "Structured billing address entered at checkout (may differ from the main address)."
  input CheckoutBillingInput {
    "Billing contact email — may differ from the main contact email; both print on the invoice."
    email: String
    gstin: String
    line1: String!
    line2: String
    landmark: String
    city: String!
    state: String!
    pincode: String!
    country: String
  }

  type Payment {
    id: ID!
    payment_id: String!
    invoice_no: String
    user_id: ID!
    user_name: String!
    user_email: String!
    user_phone: String
    "Legacy one-line billing address, composed from the structured billing block."
    billing_address: String!
    billing: BillingDetails!
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
    coupon_code: String
    coupon_discount: Float!
    "Duncit Coins spent on this payment (1 coin = 1 rupee off the gross)."
    coins_redeemed: Float!
    status: PaymentStatus!
    gateway: String!
    gateway_ref: String
    paid_at: String
    created_at: String!
    updated_at: String!
    finalize_state: String!
    needs_refund: Boolean!
    coins_earned: Float!
  }

  enum PaymentStepStatus {
    PENDING
    DONE
    SKIPPED
    FAILED
  }

  "One step of the post-payment finalization pipeline, in execution order."
  type PaymentStep {
    key: String!
    "Human label for the Finance detail table."
    label: String!
    status: PaymentStepStatus!
    "Why it was skipped, or the failure message."
    detail: String!
    "Ids of the documents this step created."
    refs: [String!]!
    at: String
  }

  "A thing checkout was supposed to create, verified by reading it back from the database."
  type PaymentArtifact {
    key: String!
    label: String!
    "True only when the document was actually found in the database — this is what draws the green tick."
    created: Boolean!
    "How many documents of this kind exist for the payment."
    count: Int!
    "Human-readable ids (ticket code, order no, membership id...)."
    refs: [String!]!
    "Set when the artifact is not applicable to this payment (e.g. no products bought)."
    not_applicable: Boolean!
  }

  "One Duncit Coin ledger movement caused by this payment."
  type PaymentCoinLine {
    type: String!
    amount: Float!
    balance_after: Float!
    source: String!
    reason: String!
    earn_pct: Float!
    at: String!
  }

  "The coupon applied at checkout, resolved against the live coupon record."
  type PaymentCouponInfo {
    code: String!
    discount: Float!
    discount_type: String!
    discount_value: Float!
    title: String!
    "False when the coupon record has since been deleted."
    still_exists: Boolean!
  }

  "The pod booking this payment produced."
  type PaymentPodBooking {
    pod_id: ID!
    pod_title: String!
    pod_date_time: String
    seats: Int!
    membership_id: ID
    membership_status: String
    ticket_code: String
    ticket_status: String
  }

  "One product order this payment produced."
  type PaymentProductOrderLine {
    id: ID!
    order_no: String!
    fulfilment_method: String!
    fulfilment_status: String!
    total: Float!
    item_count: Int!
    awb: String
  }

  "Everything checkout did for one payment — for the Finance Payment Logs detail page."
  type PaymentDetail {
    payment: Payment!
    finalize_state: String!
    finalize_attempts: Int!
    finalized_at: String
    finalize_error: String
    needs_refund: Boolean!
    steps: [PaymentStep!]!
    artifacts: [PaymentArtifact!]!
    coins: [PaymentCoinLine!]!
    coupon: PaymentCouponInfo
    pod_booking: PaymentPodBooking
    product_orders: [PaymentProductOrderLine!]!
    "Gross before coupon + coins, taken from the frozen checkout metadata."
    original_total: Float!
    "Coins spent on this payment (1 coin = 1 rupee off the gross)."
    coins_redeemed: Float!
    "Coins this payment earned the buyer back."
    coins_earned: Float!
  }

  "Server-side table page for the shared table engine (paymentsTable)."
  type PaymentTablePage {
    rows: [Payment!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "Filter-wide KPI totals for the Payment Logs cards (SUCCESS payments only, no row cap)."
  type PaymentTotals {
    count: Int!
    gross: Float!
    fee: Float!
    gst: Float!
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
    "Seats being booked (default 1). The ticket price is charged per seat; add-on products are charged once."
    seats: Int
  }

  input CheckoutProductSelectionInput {
    product_id: ID!
    quantity: Int!
    "Chosen variant for products with a variant matrix — price and stock resolve from it."
    variant_id: ID
    "Optional per-product fulfilment override; falls back to the checkout-level method."
    fulfilment_method: FulfilmentMethod
  }

  input DummyCheckoutInput {
    pod_id: ID
    amount: Float!
    "Seats being booked (default 1). The ticket price is charged per seat; add-on products are charged once."
    seats: Int
    selected_products: [CheckoutProductSelectionInput!]
    description: String
    "Buyer's full name for the invoice bill-to (falls back to the profile name)."
    contact_name: String
    contact_email: String!
    contact_phone: String
    contact_phone_extension: String!
    contact_phone_number: String!
    "Structured billing address (preferred). Legacy free-text still accepted."
    billing: CheckoutBillingInput
    billing_address: String
    checkout_url: String!
    coupon_code: String
    "Duncit Coins to spend (1 coin = 1 rupee off). Clamped server-side to the live balance and to the bill."
    redeem_coins: Int
    simulate_failure: Boolean
    "How the add-on products are delivered (default PICKUP)."
    fulfilment_method: FulfilmentMethod
    "Delivery address, required when any product ships."
    shipping_address: OrderShippingAddressInput
  }

  input PaymentFilterInput {
    status: PaymentStatus
    user_id: ID
    pod_id: ID
    search: String
  }

  "Live checkout — same contact/billing fields as the dummy flow (no simulate_failure)."
  input RazorpayOrderInput {
    pod_id: ID
    amount: Float!
    "Seats being booked (default 1). The ticket price is charged per seat; add-on products are charged once."
    seats: Int
    selected_products: [CheckoutProductSelectionInput!]
    description: String
    contact_name: String
    contact_email: String!
    contact_phone: String
    contact_phone_extension: String!
    contact_phone_number: String!
    billing: CheckoutBillingInput
    billing_address: String
    checkout_url: String!
    coupon_code: String
    "Duncit Coins to spend (1 coin = 1 rupee off). Clamped server-side to the live balance and to the bill."
    redeem_coins: Int
    fulfilment_method: FulfilmentMethod
    shipping_address: OrderShippingAddressInput
  }

  """
  Everything the client needs to open the Razorpay checkout sheet. When a coupon
  makes the total zero, free=true + payment is the completed (free) booking and the
  sheet is skipped.
  """
  type RazorpayOrder {
    payment_doc_id: ID!
    key_id: String!
    order_id: String!
    amount: Int!
    currency: String!
    name: String!
    description: String!
    prefill_email: String!
    prefill_contact: String!
    currency_symbol: String!
    total: Float!
    free: Boolean!
    payment: Payment
  }

  input VerifyRazorpayInput {
    payment_doc_id: ID!
    razorpay_order_id: String!
    razorpay_payment_id: String!
    razorpay_signature: String!
  }

  "One cart line for the standalone product checkout — each keeps its own pod (the pod's per-pod stock gate still applies)."
  input ProductCartItemInput {
    product_id: ID!
    pod_id: ID!
    quantity: Int!
    variant_id: ID
    "Optional per-line fulfilment override; falls back to the cart-level method."
    fulfilment_method: FulfilmentMethod
  }

  "Standalone product-cart checkout (no pod ticket). Shipping is quoted live from ShipRocket and charged on top."
  input ProductCheckoutInput {
    items: [ProductCartItemInput!]!
    description: String
    contact_name: String
    contact_email: String!
    contact_phone: String
    contact_phone_extension: String!
    contact_phone_number: String!
    billing: CheckoutBillingInput
    billing_address: String
    checkout_url: String!
    coupon_code: String
    "Cart-level default fulfilment method (default PICKUP)."
    fulfilment_method: FulfilmentMethod
    "Delivery address, required when any product ships."
    shipping_address: OrderShippingAddressInput
    "Destination pincode for the ShipRocket rate; falls back to shipping_address.pincode."
    delivery_pincode: String
    "Duncit Coins to spend (1 coin = 1 rupee off). Clamped server-side to the live balance and to the bill."
    redeem_coins: Int
  }

  input DummyProductCheckoutInput {
    items: [ProductCartItemInput!]!
    description: String
    contact_name: String
    contact_email: String!
    contact_phone: String
    contact_phone_extension: String!
    contact_phone_number: String!
    billing: CheckoutBillingInput
    billing_address: String
    checkout_url: String!
    coupon_code: String
    fulfilment_method: FulfilmentMethod
    shipping_address: OrderShippingAddressInput
    delivery_pincode: String
    "Duncit Coins to spend (1 coin = 1 rupee off). Clamped server-side to the live balance and to the bill."
    redeem_coins: Int
    simulate_failure: Boolean
  }

  input ProductShippingQuoteInput {
    items: [ProductCartItemInput!]!
    delivery_pincode: String!
  }

  "One (pod, warehouse) group's delivery estimate in a product-cart shipping quote — each group ships (and is charged) separately."
  type ProductShippingQuoteLine {
    "The pod this shipment group belongs to (null/empty when the cart line carried no pod)."
    pod_id: ID
    warehouse_id: ID!
    pickup_pincode: String!
    courier_name: String!
    charge: Float!
    "True when priced live by ShipRocket; false when it fell back to the manual delivery charge."
    quoted: Boolean!
    "True when every line in this warehouse group met its product's free-delivery threshold (charge = 0)."
    free: Boolean!
  }

  type ProductShippingQuote {
    total: Float!
    currency_symbol: String!
    "True when every warehouse group was priced live by ShipRocket."
    all_quoted: Boolean!
    lines: [ProductShippingQuoteLine!]!
  }

  extend type Query {
    payments(filter: PaymentFilterInput, limit: Int): [Payment!]!
    "Aggregated totals over EVERY payment matching the filter (no row cap), SUCCESS only."
    paymentTotals(filter: PaymentFilterInput): PaymentTotals!
    paymentsTable(query: TableQueryInput): PaymentTablePage!
    payment(payment_doc_id: ID!): Payment
    "Full audit of one payment: what it charged, what it created, and what failed."
    paymentDetail(payment_doc_id: ID!): PaymentDetail!
    myPayments: [Payment!]!
    "One of the caller's own payments. Null when it does not exist or is not theirs — the checkout confirmation poll reads this instead of the whole history."
    myPayment(payment_doc_id: ID!): Payment
    checkoutQuote(input: CheckoutQuoteInput!): CheckoutQuote!
    paymentInvoicePdfBase64(payment_doc_id: ID!): String!
    "Live ShipRocket delivery estimate for a product cart (preview only; the charged amount is recomputed server-side at checkout)."
    productShippingQuote(input: ProductShippingQuoteInput!): ProductShippingQuote!
  }

  extend type Mutation {
    dummyCheckout(input: DummyCheckoutInput!): Payment!
    createRazorpayOrder(input: RazorpayOrderInput!): RazorpayOrder!
    verifyRazorpayPayment(input: VerifyRazorpayInput!): Payment!
    refundPayment(payment_doc_id: ID!, reason: String): Payment!
    "Standalone product-cart checkout via the dummy gateway."
    dummyProductCheckout(input: DummyProductCheckoutInput!): Payment!
    "Standalone product-cart checkout via Razorpay (step 1; verify with verifyRazorpayPayment)."
    createRazorpayProductOrder(input: ProductCheckoutInput!): RazorpayOrder!
  }
`;
