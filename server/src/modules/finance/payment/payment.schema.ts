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
    status: PaymentStatus!
    gateway: String!
    gateway_ref: String
    paid_at: String
    created_at: String!
    updated_at: String!
  }

  "Server-side table page for the shared table engine (paymentsTable)."
  type PaymentTablePage {
    rows: [Payment!]!
    total: Int!
    page: Int!
    page_size: Int!
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
    simulate_failure: Boolean
  }

  input ProductShippingQuoteInput {
    items: [ProductCartItemInput!]!
    delivery_pincode: String!
  }

  "One warehouse's delivery estimate in a product-cart shipping quote."
  type ProductShippingQuoteLine {
    warehouse_id: ID!
    pickup_pincode: String!
    courier_name: String!
    charge: Float!
    "True when priced live by ShipRocket; false when it fell back to the manual delivery charge."
    quoted: Boolean!
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
    paymentsTable(query: TableQueryInput): PaymentTablePage!
    payment(payment_doc_id: ID!): Payment
    myPayments: [Payment!]!
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
