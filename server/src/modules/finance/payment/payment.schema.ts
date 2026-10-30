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
    GIFT_CARD
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
    "What rounding the bill UP to a whole rupee added (0 ≤ x < 1; 0 when it was already whole or the payment predates the rule). Already inside total; never taxable and never part of a fee, commission or settlement."
    round_off: Float!
    currency_symbol: String!
    coupon_code: String
    coupon_discount: Float!
    "Duncit Coins spent on this payment (1 coin = 1 rupee off the gross)."
    coins_redeemed: Float!
    "Multi-ticket discount frozen at checkout: rupees taken off the ticket price (never add-on products) before the coupon and coins. 0 when no tier applied."
    ticket_discount_amount: Float!
    "Percentage of the multi-ticket tier that applied (0 when none)."
    ticket_discount_pct: Int!
    "The member's unlocked Smart Incentive, frozen at checkout: rupees taken off the ticket money after the multi-ticket discount and before the coupon and coins (host-funded). 0 when none applied."
    smart_incentive_amount: Float!
    "Percentage of the Smart Incentive that applied (0 when none)."
    smart_incentive_pct: Int!
    status: PaymentStatus!
    gateway: String!
    gateway_ref: String
    paid_at: String
    created_at: String!
    updated_at: String!
    finalize_state: String!
    needs_refund: Boolean!
    coins_earned: Float!
    "The rented items this pod payment carried, as checkout froze them (empty when none)."
    rental_lines: [PaymentRentalLine!]!
  }

  "One rented item on a pod payment, frozen at checkout: collected at the venue, its deposit settled there."
  type PaymentRentalLine {
    item_id: ID!
    name: String!
    image_url: String!
    unit: VenueRentalUnit!
    rate: Float!
    "1 for a SLOT item, the pod's hours for an HOUR item."
    units: Int!
    quantity: Int!
    rent: Float!
    "Refundable deposit for every unit of the line, handed back at the venue."
    deposit: Float!
  }

  enum PaymentStepStatus {
    PENDING
    DONE
    SKIPPED
    FAILED
  }

  """
  Which part of checkout a step or artifact belongs to — one per thing a
  checkout can buy, plus the PAYMENT work every checkout does whatever it bought.
  The Finance detail page draws a tab per purchase kind.
  """
  enum PaymentSegment {
    PAYMENT
    POD
    PRODUCT
    GIFT_CARD
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
    segment: PaymentSegment!
    "True when Finance can re-run this step on its own from the detail page."
    can_retry: Boolean!
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
    segment: PaymentSegment!
    "The pipeline step that would re-create this row; null when only re-running the whole booking core would."
    retry_key: String
  }

  "The gift card a GIFT_CARD payment bought, read back by its payment id."
  type PaymentGiftCard {
    id: ID!
    code: String!
    recipient_name: String!
    "Empty on a self-purchase — the buyer is the recipient."
    recipient_email: String!
    scope_name: String!
    initial_amount: Float!
    balance: Float!
    status: String!
    expires_at: String
    redeemed_at: String
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
    gift_card: PaymentGiftCard
    "True when the money landed but the booking core never did — the one state where the whole finalization can be re-run."
    can_retry_finalize: Boolean!
    "Every deferred step still owed. What the page's Retry all sends."
    retryable_step_keys: [String!]!
    "Gross before every discount (multi-ticket discount, coupon, coins), taken from the frozen checkout metadata."
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

  """
  One refund that has already been paid back to a buyer.

  Refunds have no collection of their own — each is recorded on the payment it
  reverses, by any of four flows (admin refund, pod cancellation, released
  cancellation hold, filled Backout). A payment merely HOLDING a refund has not
  paid anything back, so it is not one of these rows.
  """
  type UserRefund {
    id: ID!
    payment_id: String!
    invoice_no: String
    user_name: String!
    user_email: String!
    description: String!
    subtotal: Float!
    platform_fee_amount: Float!
    gst_amount: Float!
    "What the buyer was originally charged."
    total: Float!
    currency_symbol: String!
    status: String!
    gateway: String!
    "Money returned across every release on this booking. Falls back to the total for an admin refund, which returns the whole payment without writing a figure."
    refund_amount: Float!
    refund_reason: String
    "Who set the refund off — a pod-cancel initiator or SYSTEM. Null for an admin refund from the console."
    refund_initiated_by: String
    refunded_at: String
    paid_at: String
    created_at: String!
    "True when only part of the booking came back — the buyer kept the rest of their seats, so the payment is still SUCCESS."
    partial: Boolean!
  }

  "Server-side table page for the shared table engine (userRefundsTable)."
  type UserRefundTablePage {
    rows: [UserRefund!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "The checkout a payment came from. A pod booking that carried shop add-ons is still a POD_BOOKING."
  enum PaymentSource {
    POD_BOOKING
    "The pod shop's standalone cart (partner-brand products bought in the app)."
    POD_SHOP
    "The pet store, ecomm.duncit.com."
    ECOMM
    "Gift cards and anything else."
    OTHER
  }

  "The two shops Finance keeps separate ledgers for. They are different products and are never mixed."
  enum PaymentShop {
    "Partner-brand products bought in the app."
    POD_SHOP
    "The pet store, ecomm.duncit.com."
    ECOMM
  }

  "One payment whose bill was rounded up to a whole rupee (Finance › Round Offs)."
  type PaymentRoundOff {
    id: ID!
    payment_id: String!
    invoice_no: String
    user_name: String!
    user_email: String!
    description: String!
    source: PaymentSource!
    "The bill before rounding: total + coins_redeemed − round_off."
    bill_amount: Float!
    "What rounding the bill up to a whole rupee added (0 < x < 1)."
    round_off: Float!
    coins_redeemed: Float!
    "What was actually charged."
    total: Float!
    currency_symbol: String!
    status: PaymentStatus!
    gateway: String!
    paid_at: String
    created_at: String!
  }

  "Totals over EVERY payment the Round Offs filter matches — a server aggregate, never a sum of one page."
  type PaymentRoundOffSummary {
    count: Int!
    "Round-off on every matching payment, whatever its status."
    round_off_total: Float!
    "The part that reached Duncit as money: SUCCESS payments with something charged."
    collected_round_off_total: Float!
  }

  "Server-side table page for the shared table engine (paymentRoundOffsTable)."
  type PaymentRoundOffTablePage {
    rows: [PaymentRoundOff!]!
    total: Int!
    page: Int!
    page_size: Int!
    summary: PaymentRoundOffSummary!
  }

  enum ShopOrderRefundKind {
    "An order called off before delivery."
    CANCELLATION
    "Goods sent back after delivery."
    RETURN
  }

  "Where a refund's money went."
  enum ShopOrderRefundMode {
    "Back to the original payment method only."
    RAZORPAY
    "Duncit Coins only."
    COINS
    "Part to the original payment method, part as Duncit Coins."
    RAZORPAY_COINS
  }

  """
  One refund event at ORDER level — a cancelled order or a refunded return — in
  one shop. cash_amount returns to the original payment method; coins return to
  the buyer's Duncit Coin wallet.
  """
  type ShopOrderRefund {
    id: ID!
    kind: ShopOrderRefundKind!
    "The order number for a cancellation, the return number for a return."
    ref_no: String!
    order_no: String!
    order_id: ID!
    buyer_name: String!
    buyer_email: String!
    "The payment this refund reverses; null when that payment no longer exists."
    payment_doc_id: ID
    payment_ref: String!
    currency_symbol: String!
    order_total: Float!
    "Money going back to the original payment method."
    cash_amount: Float!
    "Duncit Coins going back to the buyer's wallet."
    coins: Int!
    "cash_amount + coins (1 coin = 1 rupee)."
    refund_value: Float!
    "Razorpay's refund id — pod shop only; the pet store's refunds are paid out by Finance."
    razorpay_refund_id: String!
    "PENDING, PROCESSED, RECORDED (ledger only, nothing sent to a gateway) or FAILED."
    status: String!
    mode: ShopOrderRefundMode!
    initiated_by: String!
    "Why the gateway refused, when it did."
    error: String!
    "True for a pet-store order cancelled before refunds were recorded on the order: the figures are worked out from the cancel rule, not read back."
    derived: Boolean!
    "True when Finance has to pay the cash out by hand: a refund Razorpay refused, or any pet-store cash refund."
    manual_payout: Boolean!
    event_at: String
  }

  "Totals over EVERY refund the filter matches — a server aggregate, never a sum of one page."
  type ShopOrderRefundSummary {
    count: Int!
    "Money going back to original payment methods."
    cash_total: Float!
    "Duncit Coins going back to wallets."
    coins_total: Int!
    "The part of cash_total Finance has to pay out by hand."
    manual_payout_total: Float!
  }

  "Server-side table page for the shared table engine (shopOrderRefundsTable)."
  type ShopOrderRefundTablePage {
    rows: [ShopOrderRefund!]!
    total: Int!
    page: Int!
    page_size: Int!
    summary: ShopOrderRefundSummary!
  }

  "Filter-wide KPI totals for the Payment Logs cards (SUCCESS payments only, no row cap)."
  type PaymentTotals {
    count: Int!
    gross: Float!
    fee: Float!
    gst: Float!
    "Multi-ticket discounts given on the matching payments — already off gross."
    ticket_discount_total: Float!
    "Smart Incentive discounts given on the matching payments — already off gross."
    smart_incentive_total: Float!
  }

  type CheckoutQuote {
    subtotal: Float!
    platform_fee_pct: Float!
    platform_fee_amount: Float!
    gst_pct: Float!
    gst_amount: Float!
    "The quoted amount rounded UP to a whole rupee — what a checkout with no coupon and no coins is charged."
    total: Float!
    "What that rounding added (0 when the amount was already whole). Inside total, outside subtotal and gst_amount."
    round_off: Float!
    currency_symbol: String!
    dummy_mode: Boolean!
    "Multi-ticket discount taken off the ticket price for the quoted seats (0 when no tier applies)."
    ticket_discount_amount: Float!
    "Percentage of the multi-ticket tier that applied (0 when none)."
    ticket_discount_pct: Int!
    "The caller's unlocked Smart Incentive taken off the ticket money (0 when none applies)."
    smart_incentive_amount: Float!
    "Percentage of that Smart Incentive (0 when none)."
    smart_incentive_pct: Int!
  }

  "Retired with recurring pods — kept so installed apps that still send it get a clear refusal."
  input RecurringCheckoutQuoteInput {
    pod_id: ID!
    date_pod_ids: [ID!]!
    seats: Int
    selected_products: [CheckoutProductSelectionInput!]
    selected_rentals: [CheckoutRentalSelectionInput!]
    coupon_code: String
    redeem_coins: Int
  }

  "Retired with recurring pods (see recurringCheckoutQuote)."
  type RecurringCheckoutQuote {
    dates: Int!
    currency_symbol: String!
    "Every ticket of every date at list price."
    ticket_gross: Float!
    "Multi-ticket discount across the dates."
    ticket_discount_amount: Float!
    ticket_discount_pct: Int!
    "Multi-date discount across the dates."
    multi_date_discount_amount: Float!
    multi_date_discount_pct: Int!
    "Products and rented items, charged once."
    add_ons_total: Float!
    coupon_code: String
    coupon_discount: Float!
    coins_redeemed: Int!
    subtotal: Float!
    platform_fee_amount: Float!
    gst_amount: Float!
    round_off: Float!
    "What the buyer pays."
    total: Float!
    "The bill before every discount."
    original_total: Float!
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

  "One rented item picked at pod checkout. The rate, deposit and stock come from the venue, never the client."
  input CheckoutRentalSelectionInput {
    item_id: ID!
    quantity: Int!
  }

  input DummyCheckoutInput {
    pod_id: ID
    date_pod_ids: [ID!] @deprecated(reason: "Recurring pods are retired; a non-empty list is refused.")
    amount: Float!
    "Seats being booked (default 1). The ticket price is charged per seat; add-on products are charged once."
    seats: Int
    selected_products: [CheckoutProductSelectionInput!]
    "Rented items for the pod (item id + quantity). Priced on the server and charged in full: no coupon or coins."
    selected_rentals: [CheckoutRentalSelectionInput!]
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
    date_pod_ids: [ID!] @deprecated(reason: "Recurring pods are retired; a non-empty list is refused.")
    amount: Float!
    "Seats being booked (default 1). The ticket price is charged per seat; add-on products are charged once."
    seats: Int
    selected_products: [CheckoutProductSelectionInput!]
    "Rented items for the pod (item id + quantity). Priced on the server and charged in full: no coupon or coins."
    selected_rentals: [CheckoutRentalSelectionInput!]
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

  """
  Buying a gift card. The card is charged at face value (no fee, no GST — tax
  applies when the goods are bought), and coupons/coins are deliberately not
  accepted: stored value must not buy stored value. The card itself is created
  only on payment success.
  """
  input GiftCardCheckoutInput {
    "The card's theme. SUPER/CATEGORY/SUB need scope_category_id; SHOP must not send one."
    scope_type: GiftCardScopeType!
    scope_category_id: ID
    "Face value in whole rupees, within the configured min/max."
    amount: Float!
    "Who the card is for. Empty means the buyer keeps it."
    recipient_email: String
    recipient_name: String
    "Personal note printed on the card and in the email."
    message: String
    contact_name: String
    contact_email: String!
    contact_phone: String
    contact_phone_extension: String!
    contact_phone_number: String!
    billing: CheckoutBillingInput
    billing_address: String
    checkout_url: String!
  }

  input DummyGiftCardCheckoutInput {
    scope_type: GiftCardScopeType!
    scope_category_id: ID
    amount: Float!
    recipient_email: String
    recipient_name: String
    message: String
    contact_name: String
    contact_email: String!
    contact_phone: String
    contact_phone_extension: String!
    contact_phone_number: String!
    billing: CheckoutBillingInput
    billing_address: String
    checkout_url: String!
    simulate_failure: Boolean
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

  "One account's Duncit Coin wallet, for the Admin user page."
  type UserFinanceCoins {
    balance: Float!
    lifetime_earned: Float!
    "Every coin the ledger has credited the account."
    credited: Float!
    "Every coin the ledger has debited: redeemed, expired or taken back."
    debited: Float!
  }

  """
  What one account has paid Duncit and got back (Admin › User › Payment &
  Refund Logs). Paid counts every captured payment, refunded ones included;
  net_business = paid_total - refunded_total.
  """
  type UserFinanceSummary {
    "Symbol of the account's latest payment; null when it has none."
    currency_symbol: String
    "Captured payments (SUCCESS or later REFUNDED)."
    payment_count: Int!
    failed_count: Int!
    paid_total: Float!
    "Payments with money paid back, part refunds included."
    refund_count: Int!
    refunded_total: Float!
    net_business: Float!
    "Coins spent at checkout on captured payments."
    coins_redeemed: Float!
    last_paid_at: String
    "Null when the caller cannot read Duncit Coin."
    coins: UserFinanceCoins
  }

  extend type Query {
    "Admin user page: what one account has paid, got refunded and holds in coins."
    userFinanceSummary(user_id: ID!): UserFinanceSummary!
    payments(filter: PaymentFilterInput, limit: Int): [Payment!]!
    "Aggregated totals over EVERY payment matching the filter (no row cap), SUCCESS only."
    paymentTotals(filter: PaymentFilterInput, "Narrow the totals to one shop's payments." shop: PaymentShop): PaymentTotals!
    paymentsTable(query: TableQueryInput): PaymentTablePage!
    "One shop's payment log. The shop is fixed server-side: the query input can only narrow it."
    shopPaymentsTable(shop: PaymentShop!, query: TableQueryInput): PaymentTablePage!
    "Payments whose bill was rounded up, with filter-wide totals. Accepts a derived 'source' filter (PaymentSource values)."
    paymentRoundOffsTable(query: TableQueryInput): PaymentRoundOffTablePage!
    "One shop's order-level refunds (cancellations and returns), with filter-wide totals."
    shopOrderRefundsTable(shop: PaymentShop!, query: TableQueryInput): ShopOrderRefundTablePage!
    "Every refund already paid back to a buyer, from all four refund flows."
    userRefundsTable(query: TableQueryInput): UserRefundTablePage!
    payment(payment_doc_id: ID!): Payment
    "Full audit of one payment: what it charged, what it created, and what failed."
    paymentDetail(payment_doc_id: ID!): PaymentDetail!
    myPayments: [Payment!]!
    "One of the caller's own payments. Null when it does not exist or is not theirs — the checkout confirmation poll reads this instead of the whole history."
    myPayment(payment_doc_id: ID!): Payment
    checkoutQuote(input: CheckoutQuoteInput!): CheckoutQuote!
    "Retired with recurring pods: always refused. Kept so installed apps get a clear message."
    recurringCheckoutQuote(input: RecurringCheckoutQuoteInput!): RecurringCheckoutQuote!
      @deprecated(reason: "Recurring pods are retired.")
    paymentInvoicePdfBase64(payment_doc_id: ID!): String!
    "Live ShipRocket delivery estimate for a product cart (preview only; the charged amount is recomputed server-side at checkout)."
    productShippingQuote(input: ProductShippingQuoteInput!): ProductShippingQuote!
  }

  extend type Mutation {
    dummyCheckout(input: DummyCheckoutInput!): Payment!
    createRazorpayOrder(input: RazorpayOrderInput!): RazorpayOrder!
    verifyRazorpayPayment(input: VerifyRazorpayInput!): Payment!
    refundPayment(payment_doc_id: ID!, reason: String): Payment!
    """
    Re-run the checkout work that did not land, and answer with the fresh audit.

    Omit step_keys to re-run everything the payment still owes; pass one to
    re-run a single row. A payment whose booking core never committed is re-run
    whole instead — every leg guards its own replay, so nothing is created twice.
    """
    retryPaymentSteps(payment_doc_id: ID!, step_keys: [String!]): PaymentDetail!
    "Standalone product-cart checkout via the dummy gateway."
    dummyProductCheckout(input: DummyProductCheckoutInput!): Payment!
    "Standalone product-cart checkout via Razorpay (step 1; verify with verifyRazorpayPayment)."
    createRazorpayProductOrder(input: ProductCheckoutInput!): RazorpayOrder!
    "Gift card purchase via the dummy gateway."
    dummyGiftCardCheckout(input: DummyGiftCardCheckoutInput!): Payment!
    "Gift card purchase via Razorpay (step 1; verify with verifyRazorpayPayment)."
    createRazorpayGiftCardOrder(input: GiftCardCheckoutInput!): RazorpayOrder!
  }
`;
