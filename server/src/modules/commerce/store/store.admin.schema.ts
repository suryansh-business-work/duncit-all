/**
 * The pet store's OPERATOR API — what ecomm-portal.duncit.com reads and writes.
 * Every field here needs ECOMM_MANAGER (or SUPER_ADMIN).
 */
export const storeAdminTypeDefs = /* GraphQL */ `
  type StoreSettings {
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
    "The Tech-portal Razorpay account online payments use; empty = the default one."
    razorpay_account: String!
    cod_enabled: Boolean!
    cod_fee: Float!
    cod_min_order: Float!
    cod_max_order: Float!
    cod_requires_otp: Boolean!
    cod_blocked_pincodes: [String!]!
    prepaid_discount_pct: Float!
    min_order_value: Float!
    free_shipping_above: Float!
    flat_shipping_fee: Float!
    max_qty_per_line: Int!
    returns_enabled: Boolean!
    return_window_days: Int!
    return_reasons: [String!]!
    cancel_reasons: [String!]!
    restock_on_cancel: Boolean!
    autoship_enabled: Boolean!
    autoship_discount_pct: Float!
    autoship_frequencies: [Int!]!
    seo_title: String!
    seo_description: String!
    og_image_url: String!
    shipping_policy_html: String!
    returns_policy_html: String!
    terms_html: String!
    about_html: String!
    social_links: [StoreSocialLink!]!
    updated_at: String!
  }

  input StoreSocialLinkInput {
    label: String!
    url: String!
  }

  "Every field optional — only what is sent changes."
  input StoreSettingsInput {
    store_enabled: Boolean
    store_name: String
    tagline: String
    logo_url: String
    favicon_url: String
    support_email: String
    support_phone: String
    whatsapp_number: String
    announcement_enabled: Boolean
    announcement_text: String
    announcement_link: String
    guest_checkout_enabled: Boolean
    "A Tech-portal Razorpay entry id, or empty for the default one."
    razorpay_account: String
    cod_enabled: Boolean
    cod_fee: Float
    cod_min_order: Float
    cod_max_order: Float
    cod_requires_otp: Boolean
    cod_blocked_pincodes: [String!]
    prepaid_discount_pct: Float
    min_order_value: Float
    free_shipping_above: Float
    flat_shipping_fee: Float
    max_qty_per_line: Int
    returns_enabled: Boolean
    return_window_days: Int
    return_reasons: [String!]
    cancel_reasons: [String!]
    restock_on_cancel: Boolean
    autoship_enabled: Boolean
    autoship_discount_pct: Float
    "Weeks, 1-26."
    autoship_frequencies: [Int!]
    seo_title: String
    seo_description: String
    og_image_url: String
    shipping_policy_html: String
    returns_policy_html: String
    terms_html: String
    about_html: String
    social_links: [StoreSocialLinkInput!]
  }

  type StoreAdminPetType {
    id: ID!
    name: String!
    slug: String!
    icon_url: String!
    image_url: String!
    description: String!
    sort_order: Int!
    is_active: Boolean!
  }

  input StorePetTypeInput {
    name: String!
    slug: String
    icon_url: String
    image_url: String
    description: String
    is_active: Boolean
  }

  type StoreAdminCategory {
    id: ID!
    name: String!
    slug: String!
    parent_id: ID
    image_url: String!
    banner_url: String!
    description: String!
    pet_type_ids: [ID!]!
    sort_order: Int!
    is_active: Boolean!
    show_in_menu: Boolean!
    seo_title: String!
    seo_description: String!
  }

  input StoreCategoryInput {
    name: String!
    slug: String
    parent_id: ID
    image_url: String
    banner_url: String
    description: String
    pet_type_ids: [ID!]
    is_active: Boolean
    show_in_menu: Boolean
    seo_title: String
    seo_description: String
  }

  type StoreFacetOption {
    label: String!
    slug: String!
  }

  type StoreFacet {
    id: ID!
    name: String!
    slug: String!
    options: [StoreFacetOption!]!
    sort_order: Int!
    is_active: Boolean!
  }

  input StoreFacetOptionInput {
    label: String!
    slug: String
  }

  input StoreFacetInput {
    name: String!
    slug: String
    options: [StoreFacetOptionInput!]!
    is_active: Boolean
  }

  enum StoreCollectionMode {
    "Hand-picked products."
    MANUAL
    "Every listed product matching the rules."
    SMART
  }

  type StoreCollectionRules {
    pet_type_ids: [ID!]!
    category_ids: [ID!]!
    brand_ids: [ID!]!
    tags: [String!]!
    min_discount_pct: Float!
    max_price: Float!
    featured_only: Boolean!
    in_stock_only: Boolean!
  }

  type StoreAdminCollection {
    id: ID!
    name: String!
    slug: String!
    description: String!
    image_url: String!
    banner_url: String!
    mode: StoreCollectionMode!
    product_ids: [ID!]!
    rules: StoreCollectionRules!
    sort_order: Int!
    is_active: Boolean!
    seo_title: String!
    seo_description: String!
  }

  input StoreCollectionRulesInput {
    pet_type_ids: [ID!]
    category_ids: [ID!]
    brand_ids: [ID!]
    tags: [String!]
    min_discount_pct: Float
    max_price: Float
    featured_only: Boolean
    in_stock_only: Boolean
  }

  input StoreCollectionInput {
    name: String!
    slug: String
    description: String
    image_url: String
    banner_url: String
    mode: StoreCollectionMode!
    product_ids: [ID!]
    rules: StoreCollectionRulesInput
    is_active: Boolean
    seo_title: String
    seo_description: String
  }

  "Where a PRODUCT_SLIDER takes its products from."
  enum StoreSectionProductSource {
    MANUAL
    COLLECTION
    CATEGORY
    BESTSELLING
    NEWEST
    DISCOUNT
    FEATURED
  }

  type StoreAdminSection {
    id: ID!
    kind: StoreHomeSectionKind!
    title: String!
    subtitle: String!
    items: [StoreSectionItem!]!
    collection_id: ID
    category_ids: [ID!]!
    product_limit: Int!
    discount_tiers: [Int!]!
    product_source: StoreSectionProductSource!
    product_ids: [ID!]!
    sort_order: Int!
    is_active: Boolean!
    starts_at: String
    ends_at: String
  }

  input StoreSectionItemInput {
    title: String
    subtitle: String
    image_url: String
    mobile_image_url: String
    cta_label: String
    link: String
  }

  input StoreSectionInput {
    kind: StoreHomeSectionKind!
    title: String
    subtitle: String
    items: [StoreSectionItemInput!]
    collection_id: ID
    category_ids: [ID!]
    product_limit: Int
    "FLASH_SALE tabs, 1-90 percent."
    discount_tiers: [Int!]
    product_source: StoreSectionProductSource
    "MANUAL slider: the picked products, in order."
    product_ids: [ID!]
    is_active: Boolean
    starts_at: String
    ends_at: String
  }

  "DRAFT is saved but not on the store; PUBLISHED is on sale; ARCHIVED is retired."
  enum StoreProductStatus {
    DRAFT
    PUBLISHED
    ARCHIVED
  }

  type StoreAdminProductRow {
    id: ID!
    product_name: String!
    sku: String!
    brand_id: ID
    brand_name: String!
    image_url: String!
    price: Float!
    mrp: Float!
    available: Int!
    variant_count: Int!
    status: StoreProductStatus!
    "False until a Duncit warehouse is picked — a product cannot be published without one."
    has_warehouse: Boolean!
    slug: String!
    title: String!
    badge: String!
    featured: Boolean!
    sort_rank: Int!
    pet_type_ids: [ID!]!
    category_ids: [ID!]!
    sold_count: Int!
    view_count: Int!
    wishlist_count: Int!
    published_at: String
    updated_at: String!
  }

  type StoreAdminProductTablePage {
    rows: [StoreAdminProductRow!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type StoreAdminProductVariant {
    id: ID!
    option_label: String!
    sku: String!
    price: Float!
    mrp: Float!
    stock: Int!
    images: [String!]!
    weight_kg: Float!
    length_cm: Float!
    breadth_cm: Float!
    height_cm: Float!
  }

  type StoreFacetValue {
    facet_id: ID!
    values: [String!]!
  }

  "One ecomm product, everything the editor page shows and saves back."
  type StoreAdminProduct {
    id: ID!
    product_name: String!
    sku: String!
    brand_id: ID
    brand_name: String!
    image_url: String!
    price: Float!
    mrp: Float!
    available: Int!
    variant_count: Int!
    status: StoreProductStatus!
    has_warehouse: Boolean!
    slug: String!
    title: String!
    badge: String!
    featured: Boolean!
    sort_rank: Int!
    pet_type_ids: [ID!]!
    category_ids: [ID!]!
    sold_count: Int!
    view_count: Int!
    wishlist_count: Int!
    published_at: String
    updated_at: String!
    short_description: String!
    description: String!
    images: [String!]!
    stock: Int!
    low_stock_alert: Int!
    weight_kg: Float!
    length_cm: Float!
    breadth_cm: Float!
    height_cm: Float!
    warehouse_id: ID
    "What the variants differ by, e.g. Size."
    variant_option: String!
    variants: [StoreAdminProductVariant!]!
    facet_values: [StoreFacetValue!]!
    highlights: [String!]!
    specifications: [StoreSpec!]!
    ingredients: String!
    feeding_guide: String!
    care_instructions: String!
    seo_title: String!
    seo_description: String!
    search_keywords: [String!]!
    video_url: String!
    cod_available: Boolean!
    returnable: Boolean!
    return_window_days: Int
    max_per_order: Int!
  }

  input StoreFacetValueInput {
    facet_id: ID!
    values: [String!]!
  }

  input StoreSpecInput {
    label: String!
    value: String!
  }

  input StoreAdminVariantInput {
    "An existing variant's id — omitted for a new one."
    id: ID
    option_label: String!
    sku: String
    price: Float!
    mrp: Float
    stock: Int!
    images: [String!]
    weight_kg: Float
    length_cm: Float
    breadth_cm: Float
    height_cm: Float
  }

  input StoreAdminProductInput {
    product_name: String!
    "Blank mints a PET-XXXXXX code."
    sku: String
    brand_id: ID
    short_description: String
    description: String
    images: [String!]
    "Ignored when there are variants — each variant carries its own price."
    price: Float
    stock: Int
    low_stock_alert: Int
    weight_kg: Float
    length_cm: Float
    breadth_cm: Float
    height_cm: Float
    warehouse_id: ID
    variant_option: String
    variants: [StoreAdminVariantInput!]
    slug: String
    title: String
    pet_type_ids: [ID!]
    category_ids: [ID!]
    facet_values: [StoreFacetValueInput!]
    mrp: Float
    highlights: [String!]
    specifications: [StoreSpecInput!]
    ingredients: String
    feeding_guide: String
    care_instructions: String
    badge: String
    featured: Boolean
    sort_rank: Int
    seo_title: String
    seo_description: String
    search_keywords: [String!]
    video_url: String
    cod_available: Boolean
    returnable: Boolean
    "Null uses the store default."
    return_window_days: Int
    max_per_order: Int
  }

  "One of Duncit's own warehouses — where a store product ships from."
  type StoreWarehouse {
    id: ID!
    nickname: String!
    city: String!
    pincode: String!
    is_default: Boolean!
    "Registered with ShipRocket, so parcels can be picked up from it."
    shiprocket_ready: Boolean!
  }

  enum StoreRazorpayMode {
    LIVE
    TEST
    UNKNOWN
  }

  "A Razorpay account from the Tech portal's RAZORPAY entries. Never carries a secret."
  type StoreRazorpayAccount {
    id: ID!
    name: String!
    "The key id, shortened — which account this is at a glance."
    key_hint: String!
    mode: StoreRazorpayMode!
    is_default: Boolean!
    is_active: Boolean!
  }

  type StoreAdminBrand {
    id: ID!
    name: String!
    slug: String!
    logo_url: String!
    tagline: String!
    description: String!
    sort_order: Int!
    is_active: Boolean!
  }

  input StoreBrandInput {
    name: String!
    slug: String
    logo_url: String
    tagline: String
    description: String
    is_active: Boolean
  }

  type StoreOrderTablePage {
    rows: [ProductOrder!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type StoreAdminPayment {
    id: ID!
    payment_id: String!
    invoice_no: String!
    status: String!
    gateway: String!
    total: Float!
    coupon_code: String!
    coupon_discount: Float!
    coins_redeemed: Int!
    prepaid_discount: Float!
    cod_fee: Float!
    refunded_amount: Float!
    paid_at: String
  }

  type StoreAdminOrder {
    order: ProductOrder!
    payment: StoreAdminPayment
    return_ids: [ID!]!
    customer_order_count: Int!
    is_guest: Boolean!
  }

  type StoreReturnTablePage {
    rows: [StoreReturn!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input StoreReturnUpdateInput {
    status: StoreReturnStatus!
    "Shown to the buyer in the update email."
    note: String
    refund_amount: Float
    refund_mode: StoreRefundMode
    "On RECEIVED: put the units back into stock."
    restock: Boolean
  }

  type StoreCustomerRow {
    id: ID!
    email: String!
    name: String!
    phone: String!
    is_guest: Boolean!
    user_id: ID
    orders: Int!
    cancelled: Int!
    spent: Float!
    last_order_at: String!
    first_order_at: String!
  }

  type StoreCustomerTablePage {
    rows: [StoreCustomerRow!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type StoreCartRow {
    id: ID!
    email: String!
    phone: String!
    is_guest: Boolean!
    item_count: Int!
    value: Float!
    items: [String!]!
    last_activity_at: String!
    reminded_at: String
    created_at: String!
  }

  type StoreCartTablePage {
    rows: [StoreCartRow!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type StoreStockAlertRow {
    id: ID!
    email: String!
    product_id: ID!
    product_name: String!
    variant_id: String!
    notified_at: String
    created_at: String!
  }

  type StoreStockAlertTablePage {
    rows: [StoreStockAlertRow!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type StoreReviewRow {
    id: ID!
    product_id: ID!
    product_name: String!
    user_name: String!
    rating: Int!
    comment: String!
    images: [String!]!
    seller_reply: String!
    created_at: String!
  }

  type StoreReviewTablePage {
    rows: [StoreReviewRow!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type StoreDashboardPoint {
    date: String!
    orders: Int!
    revenue: Float!
  }

  type StoreTopProduct {
    product_id: ID!
    name: String!
    image_url: String!
    units: Int!
    revenue: Float!
  }

  type StoreStatusCount {
    status: String!
    count: Int!
  }

  type StoreDashboard {
    days: Int!
    orders: Int!
    cancelled: Int!
    delivered: Int!
    revenue: Float!
    average_order_value: Float!
    units: Int!
    cod_share_pct: Int!
    customers: Int!
    new_customers: Int!
    series: [StoreDashboardPoint!]!
    top_products: [StoreTopProduct!]!
    statuses: [StoreStatusCount!]!
    to_ship: Int!
    returns_open: Int!
    out_of_stock: Int!
    low_stock: Int!
    abandoned_carts: Int!
    listed_products: Int!
  }

  "An Autoship subscription as the console lists it."
  type StoreAdminSubscriptionRow {
    id: ID!
    buyer_name: String!
    buyer_email: String!
    product_id: ID!
    product_name: String!
    variant_label: String!
    qty: Int!
    frequency_weeks: Int!
    mode: StoreSubscriptionMode!
    status: StoreSubscriptionStatus!
    next_run_at: String
    last_run_at: String
    last_order_no: String!
    run_count: Int!
    "Consecutive automatic cycles that could not be booked."
    failures: Int!
    created_at: String!
  }

  type StoreSubscriptionTablePage {
    rows: [StoreAdminSubscriptionRow!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  extend type Query {
    storeAdminSettings: StoreSettings!
    storeAdminPetTypes: [StoreAdminPetType!]!
    storeAdminCategories: [StoreAdminCategory!]!
    storeAdminFacets: [StoreFacet!]!
    storeAdminCollections: [StoreAdminCollection!]!
    storeAdminCollection(id: ID!): StoreAdminCollection!
    "What a collection shows on the store right now."
    storeAdminCollectionPreview(slug: String!): [StoreProductCard!]!
    "Cards for picked product ids, in the order given."
    storeAdminPickerProducts(ids: [ID!]!): [StoreProductCard!]!
    storeAdminSections: [StoreAdminSection!]!
    storeAdminProductsTable(query: TableQueryInput): StoreAdminProductTablePage!
    storeAdminProduct(id: ID!): StoreAdminProduct!
    storeAdminWarehouses: [StoreWarehouse!]!
    storeAdminBrands: [StoreAdminBrand!]!
    "The Razorpay accounts the store can take online payments with."
    storeAdminRazorpayAccounts: [StoreRazorpayAccount!]!
    storeOrdersTable(query: TableQueryInput): StoreOrderTablePage!
    storeAdminOrder(id: ID!): StoreAdminOrder!
    storeCustomerOrders(email: String!): [ProductOrder!]!
    storeReturnsTable(query: TableQueryInput): StoreReturnTablePage!
    storeAdminReturn(id: ID!): StoreReturn!
    storeReturnsForOrder(order_id: ID!): [StoreReturn!]!
    storeCustomersTable(query: TableQueryInput): StoreCustomerTablePage!
    storeCartsTable(query: TableQueryInput, abandoned_only: Boolean): StoreCartTablePage!
    storeStockAlertsTable(query: TableQueryInput): StoreStockAlertTablePage!
    storeReviewsTable(query: TableQueryInput): StoreReviewTablePage!
    storeCouponsTable(query: TableQueryInput): CouponTablePage!
    storeDashboard(days: Int): StoreDashboard!
    storeSubscriptionsTable(query: TableQueryInput): StoreSubscriptionTablePage!
  }

  extend type Mutation {
    storeSaveSettings(input: StoreSettingsInput!): StoreSettings!
    storeSavePetType(id: ID, input: StorePetTypeInput!): StoreAdminPetType!
    storeDeletePetType(id: ID!): Boolean!
    storeReorderPetTypes(ids: [ID!]!): Boolean!
    storeSaveCategory(id: ID, input: StoreCategoryInput!): StoreAdminCategory!
    storeDeleteCategory(id: ID!): Boolean!
    storeReorderCategories(ids: [ID!]!): Boolean!
    storeSaveFacet(id: ID, input: StoreFacetInput!): StoreFacet!
    storeDeleteFacet(id: ID!): Boolean!
    storeReorderFacets(ids: [ID!]!): Boolean!
    storeSaveCollection(id: ID, input: StoreCollectionInput!): StoreAdminCollection!
    storeDeleteCollection(id: ID!): Boolean!
    storeReorderCollections(ids: [ID!]!): Boolean!
    storeSaveSection(id: ID, input: StoreSectionInput!): StoreAdminSection!
    storeDeleteSection(id: ID!): Boolean!
    storeReorderSections(ids: [ID!]!): Boolean!
    "Create (no id) or update an ecomm product. DRAFT saves what is filled in; PUBLISHED first checks it can be sold, then puts it on the store."
    storeSaveProduct(id: ID, input: StoreAdminProductInput!, status: StoreProductStatus!): StoreAdminProduct!
    "Publish, move to draft or archive many at once. Answers how many changed — a product not ready to publish is skipped."
    storeSetProductStatus(ids: [ID!]!, status: StoreProductStatus!): Int!
    storeSaveBrand(id: ID, input: StoreBrandInput!): StoreAdminBrand!
    storeDeleteBrand(id: ID!): Boolean!
    storeReorderBrands(ids: [ID!]!): Boolean!
    "Add pet types / categories to many products at once."
    storeBulkFile(product_ids: [ID!]!, pet_type_ids: [ID!], category_ids: [ID!]): Int!
    storeUpdateOrderStatus(id: ID!, status: FulfilmentStatus!, note: String): ProductOrder!
    storeAddOrderNote(id: ID!, text: String!): ProductOrder!
    storeAdminCancelOrder(id: ID!, reason: String!, refund_mode: StoreRefundMode!): ProductOrder!
    storeMarkCodCollected(id: ID!): ProductOrder!
    storeCreateShipment(id: ID!): ProductOrder!
    storeRefreshTracking(id: ID!): ProductOrder!
    storeUpdateReturn(id: ID!, input: StoreReturnUpdateInput!): StoreReturn!
    storeRemindCart(id: ID!): Boolean!
    "Email everyone whose product is back. Answers how many were sent."
    storeSendBackInStock: Int!
    storeDeleteReview(id: ID!): Boolean!
    storeReplyReview(id: ID!, reply: String!): Boolean!
    "Create (no id) or update a STORE-scoped coupon."
    storeSaveCoupon(id: ID, input: CreateCouponInput!): Coupon!
    storeDeleteCoupon(id: ID!): Boolean!
    storeAdminSetSubscriptionStatus(id: ID!, status: StoreSubscriptionStatus!): StoreAdminSubscriptionRow!
  }
`;
