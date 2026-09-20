/**
 * The pet store's PUBLIC API — what ecomm.duncit.com reads and writes.
 *
 * Browsing needs no account. A cart and a wishlist are addressed by the
 * signed-in account, or by `cart_token` (a random id the storefront keeps in
 * the browser) for a guest. Orders are read by their account, or by the
 * `access_key` a guest checkout hands back.
 */
export const storeTypeDefs = /* GraphQL */ `
  type StoreSocialLink {
    label: String!
    url: String!
  }

  "The store's public settings: identity, checkout rules and its own pages."
  type StorePublicSettings {
    store_enabled: Boolean!
    store_name: String!
    tagline: String!
    logo_url: String!
    favicon_url: String!
    support_email: String!
    support_phone: String!
    whatsapp_number: String!
    announcement_enabled: Boolean!
    announcement_text: String!
    announcement_link: String!
    guest_checkout_enabled: Boolean!
    cod_enabled: Boolean!
    cod_fee: Float!
    cod_requires_otp: Boolean!
    prepaid_discount_pct: Float!
    min_order_value: Float!
    free_shipping_above: Float!
    max_qty_per_line: Int!
    autoship_enabled: Boolean!
    autoship_discount_pct: Float!
    "Delivery intervals a subscription may choose, in weeks."
    autoship_frequencies: [Int!]!
    returns_enabled: Boolean!
    return_window_days: Int!
    return_reasons: [String!]!
    cancel_reasons: [String!]!
    seo_title: String!
    seo_description: String!
    og_image_url: String!
    shipping_policy_html: String!
    returns_policy_html: String!
    terms_html: String!
    about_html: String!
    social_links: [StoreSocialLink!]!
    currency_symbol: String!
    "On: no Razorpay account is configured and Finance's test switch is on, so checkout captures without taking money."
    dummy_mode: Boolean!
    "On: delivery is limited to an operator-kept pincode list (storePincodeServiceable says which)."
    serviceable_pincodes_enabled: Boolean!
    "The festive window open right now, if any — the store swaps its logo, favicon and background for it."
    active_occasion: StoreActiveOccasion
  }

  type StoreActiveOccasion {
    slug: String!
    label: String!
    logo_url: String!
    favicon_url: String!
    background_url: String!
    background_color: String!
    announcement_text: String!
    ends_at: String!
  }

  "One of the store's own pages, as the footer and menu link it."
  type StorePageLink {
    id: ID!
    title: String!
    slug: String!
  }

  type StorePage {
    id: ID!
    title: String!
    slug: String!
    content_html: String!
    seo_title: String!
    seo_description: String!
    updated_at: String!
  }

  type StoreFaq {
    question: String!
    answer: String!
  }

  "Whether the store delivers to a pincode, by the operator's list alone (the courier is asked at checkout)."
  type StorePincodeCheck {
    pincode: String!
    serviceable: Boolean!
    "False when the store serves every pincode the courier can reach."
    restricted: Boolean!
  }

  input StoreSupportTicketInput {
    name: String!
    email: String!
    phone: String
    subject: String!
    category: TicketCategory
    message: String!
    "The order it is about, when there is one — goes into the subject."
    order_no: String
  }

  type StoreSupportTicketResult {
    ticket_no: String!
  }

  type StorePetType {
    id: ID!
    name: String!
    slug: String!
    icon_url: String!
    image_url: String!
    description: String!
  }

  type StoreCategory {
    id: ID!
    name: String!
    slug: String!
    parent_id: ID
    image_url: String!
    banner_url: String!
    description: String!
    pet_type_ids: [ID!]!
    seo_title: String!
    seo_description: String!
  }

  "A category in the header menu, with the categories beneath it."
  type StoreCategoryNode {
    id: ID!
    name: String!
    slug: String!
    parent_id: ID
    image_url: String!
    description: String!
    pet_type_ids: [ID!]!
    show_in_menu: Boolean!
    children: [StoreCategoryNode!]!
  }

  type StoreCollectionLink {
    id: ID!
    name: String!
    slug: String!
    image_url: String!
  }

  type StoreNavigation {
    pet_types: [StorePetType!]!
    categories: [StoreCategoryNode!]!
    collections: [StoreCollectionLink!]!
    "The store's own pages that show in the footer, in order."
    pages: [StorePageLink!]!
  }

  "A product as a shelf card."
  type StoreProductCard {
    id: ID!
    slug: String!
    title: String!
    brand_id: ID
    brand_name: String!
    image_url: String!
    hover_image_url: String!
    price: Float!
    "Compare-at price; 0 when there is none."
    mrp: Float!
    discount_pct: Int!
    has_variants: Boolean!
    in_stock: Boolean!
    low_stock: Boolean!
    badge: String!
    featured: Boolean!
    rating: Float!
    rating_count: Int!
    short_description: String!
    "A short offer line, e.g. Buy 2, get 1 free; blank when there is none."
    offer_text: String!
  }

  type StoreFacetOptionCount {
    label: String!
    slug: String!
    count: Int!
    selected: Boolean!
  }

  type StoreFacetPanel {
    id: ID!
    name: String!
    slug: String!
    options: [StoreFacetOptionCount!]!
  }

  type StoreBrandCount {
    id: ID!
    name: String!
    count: Int!
    selected: Boolean!
  }

  type StorePetCount {
    id: ID!
    name: String!
    slug: String!
    count: Int!
    selected: Boolean!
  }

  enum StoreSort {
    RELEVANCE
    NEWEST
    PRICE_ASC
    PRICE_DESC
    BESTSELLING
    DISCOUNT
    RATING
  }

  type StoreSearchPage {
    items: [StoreProductCard!]!
    total: Int!
    page: Int!
    page_size: Int!
    sort: StoreSort!
    price_min: Float!
    price_max: Float!
    brands: [StoreBrandCount!]!
    facets: [StoreFacetPanel!]!
    pet_types: [StorePetCount!]!
  }

  input StoreFacetFilterInput {
    "The facet's slug."
    facet: String!
    "Option slugs — a product matches when it carries ANY of them."
    values: [String!]!
  }

  input StoreSearchInput {
    q: String
    "Pet type slug."
    pet_type: String
    "Category slug; its sub-categories are included."
    category: String
    "Collection slug."
    collection: String
    brand_ids: [ID!]
    facets: [StoreFacetFilterInput!]
    min_price: Float
    max_price: Float
    in_stock_only: Boolean
    on_sale: Boolean
    "At least this much off MRP (a flash sale tab)."
    min_discount_pct: Int
    sort: StoreSort
    page: Int
    page_size: Int
  }

  type StoreOptionValue {
    name: String!
    value: String!
  }

  type StoreVariant {
    id: ID!
    label: String!
    option_values: [StoreOptionValue!]!
    sku: String!
    price: Float!
    mrp: Float!
    discount_pct: Int!
    available: Int!
    in_stock: Boolean!
    images: [String!]!
    weight_kg: Float!
  }

  type StoreProductOption {
    name: String!
    values: [String!]!
  }

  type StoreBrandInfo {
    id: ID!
    name: String!
    "Public URL key — ecomm.duncit.com/brand/<slug>."
    slug: String!
    logo_url: String!
    tagline: String!
  }

  type StoreRef {
    id: ID!
    name: String!
    slug: String!
  }

  type StoreSpec {
    label: String!
    value: String!
  }

  type StoreFacetDisplay {
    name: String!
    values: [String!]!
  }

  "A product page."
  type StoreProduct {
    id: ID!
    slug: String!
    title: String!
    brand_id: ID
    brand_name: String!
    image_url: String!
    hover_image_url: String!
    price: Float!
    mrp: Float!
    discount_pct: Int!
    has_variants: Boolean!
    in_stock: Boolean!
    low_stock: Boolean!
    badge: String!
    featured: Boolean!
    rating: Float!
    rating_count: Int!
    short_description: String!
    offer_text: String!
    faqs: [StoreFaq!]!
    available: Int!
    images: [String!]!
    video_url: String!
    description: String!
    highlights: [String!]!
    specifications: [StoreSpec!]!
    ingredients: String!
    feeding_guide: String!
    care_instructions: String!
    options: [StoreProductOption!]!
    variants: [StoreVariant!]!
    default_variant_id: ID
    brand: StoreBrandInfo
    pet_types: [StoreRef!]!
    categories: [StoreRef!]!
    breadcrumbs: [StoreRef!]!
    facets: [StoreFacetDisplay!]!
    cod_available: Boolean!
    returnable: Boolean!
    return_window_days: Int!
    max_per_order: Int!
    min_order_qty: Int!
    weight_volume: String!
    tags: [String!]!
    seo_title: String!
    seo_description: String!
    "Reviews per star, index 0 = 1★ … index 4 = 5★."
    star_counts: [Int!]!
    sold_count: Int!
  }

  type StoreSuggestBrand {
    id: ID!
    name: String!
    slug: String!
    logo_url: String!
  }

  type StoreSuggest {
    products: [StoreProductCard!]!
    categories: [StoreRef!]!
    brands: [StoreSuggestBrand!]!
  }

  enum StoreHomeSectionKind {
    HERO_SLIDER
    PET_TYPES
    CATEGORY_GRID
    COLLECTION_CAROUSEL
    PROMO_BANNERS
    BRANDS
    USP_STRIP
    NEWSLETTER
    "A countdown sale: ends_at is the deadline, discount_tiers the tabs."
    FLASH_SALE
    "A product carousel from a collection, a category, hand-picked products or a best-seller/newest/discount list."
    PRODUCT_SLIDER
    "A row of round category icons."
    CATEGORY_ICONS
  }

  type StoreSectionItem {
    id: ID!
    title: String!
    subtitle: String!
    image_url: String!
    mobile_image_url: String!
    cta_label: String!
    link: String!
  }

  type StoreHomeSection {
    id: ID!
    kind: StoreHomeSectionKind!
    title: String!
    subtitle: String!
    items: [StoreSectionItem!]!
    collection: StoreRef
    products: [StoreProductCard!]!
    categories: [StoreCategory!]!
    pet_types: [StorePetType!]!
    brands: [StoreBrandInfo!]!
    "FLASH_SALE: the discount tabs, in percent."
    discount_tiers: [Int!]!
    "When the block stops showing; a FLASH_SALE counts down to it."
    ends_at: String
  }

  type StorePetTypePage {
    id: ID!
    name: String!
    slug: String!
    icon_url: String!
    image_url: String!
    description: String!
    categories: [StoreCategory!]!
  }

  type StoreCategoryPage {
    id: ID!
    name: String!
    slug: String!
    parent_id: ID
    image_url: String!
    banner_url: String!
    description: String!
    pet_type_ids: [ID!]!
    seo_title: String!
    seo_description: String!
    parent: StoreCategory
    children: [StoreCategory!]!
  }

  type StoreCollectionPage {
    id: ID!
    name: String!
    slug: String!
    description: String!
    image_url: String!
    banner_url: String!
    seo_title: String!
    seo_description: String!
  }

  "The courier's answer for one product to one pincode."
  type StoreDeliveryCheck {
    pincode: String!
    "False when the courier could not be asked (not configured, bad pincode)."
    checked: Boolean!
    serviceable: Boolean!
    "Estimated delivery date, as the courier words it."
    etd: String!
    courier_name: String!
    cod_available: Boolean!
  }

  enum StoreSitemapKind {
    PRODUCT
    CATEGORY
    COLLECTION
    PET_TYPE
    BRAND
    PAGE
  }

  type StoreSitemapEntry {
    kind: StoreSitemapKind!
    slug: String!
    updated_at: String
  }

  "Why a cart line cannot be bought as it stands."
  enum StoreLineIssue {
    UNAVAILABLE
    VARIANT_GONE
    OUT_OF_STOCK
    QTY_REDUCED
  }

  type StoreCartLine {
    product_id: ID!
    variant_id: String!
    variant_label: String!
    name: String!
    slug: String!
    image_url: String!
    brand_name: String!
    "Units that will be bought — capped by stock and the per-order limit."
    quantity: Int!
    requested_qty: Int!
    unit_price: Float!
    mrp: Float!
    discount_pct: Int!
    line_total: Float!
    available: Int!
    max_qty: Int!
    cod_available: Boolean!
    issue: StoreLineIssue
  }

  type StoreCart {
    id: ID!
    lines: [StoreCartLine!]!
    item_count: Int!
    items_total: Float!
    mrp_total: Float!
    savings: Float!
    coupon_code: String!
    coupon_discount: Float!
    coupon_error: String
    free_shipping_above: Float!
    amount_to_free_shipping: Float!
    min_order_value: Float!
    has_issues: Boolean!
  }

  enum StoreCheckoutMethod {
    "Razorpay (UPI, cards, net banking, wallets) — or captured at once in dummy mode."
    ONLINE
    COD
  }

  "Why Cash on Delivery is not on offer for a basket."
  enum StoreCodBlock {
    DISABLED
    PRODUCT
    PINCODE
    MIN_ORDER
    MAX_ORDER
    NOT_SERVICEABLE
  }

  input StoreQuoteInput {
    cart_token: String
    pincode: String
    payment_method: StoreCheckoutMethod
    coupon_code: String
    redeem_coins: Int
    email: String
    "When checkout came from an Autoship Order now — earns the autoship discount."
    autoship_id: ID
  }

  type StoreCheckoutQuote {
    lines: [StoreCartLine!]!
    items_total: Float!
    mrp_total: Float!
    savings: Float!
    coupon_code: String!
    coupon_discount: Float!
    coupon_error: String
    prepaid_discount: Float!
    autoship_discount: Float!
    shipping_total: Float!
    "True when every parcel was rated live by the courier."
    shipping_quoted: Boolean!
    serviceable: Boolean!
    etd: String!
    cod_fee: Float!
    coins_redeemed: Int!
    discount_total: Float!
    gst_amount: Float!
    total: Float!
    currency_symbol: String!
    cod_available: Boolean!
    cod_block: StoreCodBlock
    below_minimum: Boolean!
    has_issues: Boolean!
  }

  input StoreContactInput {
    name: String!
    email: String!
    phone_extension: String!
    phone_number: String!
  }

  input StoreAddressInput {
    name: String!
    phone: String!
    email: String
    line1: String!
    line2: String
    landmark: String
    city: String!
    state: String!
    pincode: String!
    country: String
  }

  input StorePlaceOrderInput {
    cart_token: String
    payment_method: StoreCheckoutMethod!
    coupon_code: String
    redeem_coins: Int
    contact: StoreContactInput!
    shipping_address: StoreAddressInput!
    billing_same_as_shipping: Boolean
    billing_address: StoreAddressInput
    gstin: String
    "From storeRequestCodOtp + storeVerifyCodOtp, when COD needs a verified phone."
    cod_challenge_id: ID
    checkout_url: String
    autoship_id: ID
  }

  enum StoreOrderResultStatus {
    PAID
    PENDING_PAYMENT
    COD_CONFIRMED
    FAILED
  }

  enum StorePaymentState {
    PAID
    PENDING
    FAILED
    REFUNDED
    REFUND_INITIATED
    COD_PENDING
    COD_COLLECTED
    CANCELLED
  }

  type StoreOrderItem {
    product_id: ID!
    variant_id: String!
    name: String!
    variant_label: String!
    image_url: String!
    qty: Int!
    unit_price: Float!
    line_total: Float!
    returned_qty: Int!
  }

  type StoreOrderAddress {
    name: String!
    phone: String!
    line1: String!
    line2: String!
    landmark: String!
    city: String!
    state: String!
    pincode: String!
    country: String!
  }

  type StoreOrderEvent {
    status: String!
    location: String!
    note: String!
    at: String!
  }

  "A pet-store order as its buyer reads it."
  type StoreOrder {
    id: ID!
    order_no: String!
    status: FulfilmentStatus!
    payment_method: OrderPaymentMethod!
    payment_state: StorePaymentState!
    invoice_no: String!
    items: [StoreOrderItem!]!
    items_total: Float!
    shipping_charge: Float!
    discount_total: Float!
    amount_paid: Float!
    cod_amount: Float!
    total: Float!
    currency_symbol: String!
    shipping_address: StoreOrderAddress
    courier_name: String!
    awb: String!
    tracking_url: String!
    "The courier's estimated delivery date, as ShipRocket phrased it ('' until a courier is assigned)."
    etd: String!
    events: [StoreOrderEvent!]!
    created_at: String!
    delivered_at: String
    cancelled_at: String
    cancel_reason: String!
    can_cancel: Boolean!
    can_return: Boolean!
    return_deadline: String
  }

  type StorePlaceOrderResult {
    status: StoreOrderResultStatus!
    payment_doc_id: ID!
    payment_id: String!
    total: Float!
    currency_symbol: String!
    "A guest's key to their order pages — keep it; empty for a signed-in buyer."
    access_key: String!
    orders: [StoreOrder!]!
    "Present when the Razorpay sheet has to be opened."
    razorpay: RazorpayOrder
  }

  input StoreVerifyPaymentInput {
    payment_doc_id: ID!
    razorpay_order_id: String!
    razorpay_payment_id: String!
    razorpay_signature: String!
    cart_token: String
    access_key: String
  }

  type StoreCodOtp {
    challenge_id: ID!
    expires_at: String!
    resend_after_seconds: Int!
    "Echoed only while no SMS/WhatsApp transport is wired."
    test_code: String
  }

  enum StoreReturnStatus {
    REQUESTED
    APPROVED
    REJECTED
    PICKUP_SCHEDULED
    RECEIVED
    REFUNDED
    CLOSED
  }

  enum StoreRefundMode {
    "Back to the original payment — paid out by Finance."
    ORIGINAL
    "Instantly as Duncit Coins (signed-in buyers only)."
    COINS
  }

  type StoreReturnItem {
    product_id: ID!
    variant_id: String!
    name: String!
    variant_label: String!
    image_url: String!
    qty: Int!
    unit_price: Float!
  }

  type StoreReturnEvent {
    status: StoreReturnStatus!
    note: String!
    by: String!
    at: String!
  }

  type StoreReturn {
    id: ID!
    return_no: String!
    order_id: ID!
    order_no: String!
    buyer_name: String!
    buyer_email: String!
    is_guest: Boolean!
    items: [StoreReturnItem!]!
    reason: String!
    comments: String!
    images: [String!]!
    status: StoreReturnStatus!
    "Where an operator may move it next."
    next_statuses: [StoreReturnStatus!]!
    refund_amount: Float!
    refund_mode: StoreRefundMode!
    refunded_at: String
    restocked: Boolean!
    admin_note: String!
    events: [StoreReturnEvent!]!
    created_at: String!
    updated_at: String!
  }

  input StoreReturnItemInput {
    product_id: ID!
    variant_id: String
    qty: Int!
  }

  input StoreReturnRequestInput {
    order_no: String!
    access_key: String
    items: [StoreReturnItemInput!]!
    reason: String!
    comments: String
    images: [String!]
  }

  input StoreReviewInput {
    product_id: ID!
    rating: Int!
    comment: String
    images: [String!]
  }

  enum StoreSubscriptionStatus {
    ACTIVE
    PAUSED
    CANCELLED
  }

  enum StoreSubscriptionMode {
    "We place a Cash-on-Delivery order automatically each cycle."
    COD_AUTO
    "We remind the buyer when it is due; they order it in one tap."
    REMIND
  }

  type StoreSubscriptionEvent {
    action: String!
    note: String!
    at: String!
  }

  "An Autoship subscription — one product every N weeks."
  type StoreSubscription {
    id: ID!
    "Null when the product is no longer on the shelf."
    product: StoreProductCard
    product_id: ID!
    variant_id: String!
    variant_label: String!
    qty: Int!
    frequency_weeks: Int!
    mode: StoreSubscriptionMode!
    status: StoreSubscriptionStatus!
    next_run_at: String
    last_run_at: String
    last_order_no: String!
    run_count: Int!
    unit_price: Float!
    discount_pct: Float!
    shipping_address: StoreOrderAddress
    events: [StoreSubscriptionEvent!]!
    created_at: String!
  }

  input StoreSubscriptionInput {
    product_id: ID!
    variant_id: String
    qty: Int!
    frequency_weeks: Int!
    mode: StoreSubscriptionMode!
    contact: StoreContactInput!
    shipping_address: StoreAddressInput!
    "COD_AUTO with cod_requires_otp: the verified phone challenge."
    cod_challenge_id: ID
  }

  input StoreSubscriptionUpdateInput {
    qty: Int
    frequency_weeks: Int
    mode: StoreSubscriptionMode
    shipping_address: StoreAddressInput
    cod_challenge_id: ID
  }

  extend type Query {
    storeSettings: StorePublicSettings!
    storeNavigation: StoreNavigation!
    storeHome: [StoreHomeSection!]!
    storeSearch(input: StoreSearchInput!): StoreSearchPage!
    "A product page by slug; null when it is not on the shelf."
    storeProduct(slug: String!): StoreProduct
    storeProductsByIds(ids: [ID!]!): [StoreProductCard!]!
    storeRelatedProducts(product_id: ID!, limit: Int): [StoreProductCard!]!
    storeSuggest(q: String!): StoreSuggest!
    storePetType(slug: String!): StorePetTypePage
    storeCategory(slug: String!): StoreCategoryPage
    storeCollection(slug: String!): StoreCollectionPage
    storeBrands: [StoreBrandInfo!]!
    "One of the store's own pages by slug; null when there is none (or it is switched off)."
    storePage(slug: String!): StorePage
    "Whether the operator's pincode list allows delivery there — instant, no courier call."
    storePincodeServiceable(pincode: String!): StorePincodeCheck!
    storeDeliveryCheck(product_id: ID!, variant_id: ID, pincode: String!): StoreDeliveryCheck!
    storeSitemap: [StoreSitemapEntry!]!
    storeProductReviews(product_id: ID!): [ProductReview!]!
    storeCart(cart_token: String): StoreCart!
    storeWishlist(cart_token: String): [StoreProductCard!]!
    storeWishlistIds(cart_token: String): [ID!]!
    storeCheckoutQuote(input: StoreQuoteInput!): StoreCheckoutQuote!
    storeOrderConfirmation(payment_doc_id: ID!, cart_token: String, access_key: String): StorePlaceOrderResult!
    "The signed-in buyer's pet-store orders."
    storeMyOrders: [StoreOrder!]!
    storeOrder(order_no: String!, access_key: String): StoreOrder!
    "A guest's lookup: order number + the email or phone it was placed with."
    storeTrackOrder(order_no: String!, contact: String!): StoreOrder!
    storeMyReturns: [StoreReturn!]!
    storeOrderReturns(order_no: String!, access_key: String): [StoreReturn!]!
    "The order's tax invoice as base64 PDF."
    storeInvoicePdf(order_no: String!, access_key: String): String!
    "The signed-in buyer's Autoship subscriptions."
    storeMySubscriptions: [StoreSubscription!]!
  }

  extend type Mutation {
    storeAddToCart(cart_token: String, product_id: ID!, variant_id: String, qty: Int!): StoreCart!
    "Set a line's quantity; 0 removes it."
    storeSetCartQty(cart_token: String, product_id: ID!, variant_id: String, qty: Int!): StoreCart!
    storeClearCart(cart_token: String): StoreCart!
    "Remember a coupon on the cart; an empty code removes it."
    storeApplyCoupon(cart_token: String, code: String): StoreCart!
    "After signing in: fold the guest cart + wishlist into the account's."
    storeMergeGuest(cart_token: String): StoreCart!
    "Save or un-save; answers with the wishlist's product ids."
    storeToggleWishlist(cart_token: String, product_id: ID!): [ID!]!
    storeSubscribeStockAlert(product_id: ID!, variant_id: String, email: String!): Boolean!
    storeRecordView(product_id: ID!): Boolean!
    "A shopper's question or complaint, filed as a support ticket tagged with the Pet Store source."
    storeCreateSupportTicket(input: StoreSupportTicketInput!): StoreSupportTicketResult!
    storeRequestCodOtp(cart_token: String, phone_extension: String!, phone_number: String!): StoreCodOtp!
    storeVerifyCodOtp(challenge_id: ID!, code: String!): Boolean!
    storePlaceOrder(input: StorePlaceOrderInput!): StorePlaceOrderResult!
    storeVerifyPayment(input: StoreVerifyPaymentInput!): StorePlaceOrderResult!
    storeCancelOrder(order_no: String!, reason: String!, access_key: String): StoreOrder!
    storeRequestReturn(input: StoreReturnRequestInput!): StoreReturn!
    "A signed-in buyer's review of a product they received."
    storeSubmitReview(input: StoreReviewInput!): ProductReview!
    storeCreateSubscription(input: StoreSubscriptionInput!): StoreSubscription!
    storeUpdateSubscription(id: ID!, input: StoreSubscriptionUpdateInput!): StoreSubscription!
    storePauseSubscription(id: ID!, paused: Boolean!): StoreSubscription!
    "Push the next delivery back by one cycle."
    storeSkipSubscription(id: ID!): StoreSubscription!
    storeCancelSubscription(id: ID!): StoreSubscription!
    "Put this delivery in the cart; check out with autoship_id for the discount."
    storeSubscriptionOrderNow(id: ID!, cart_token: String): StoreCart!
  }
`;
