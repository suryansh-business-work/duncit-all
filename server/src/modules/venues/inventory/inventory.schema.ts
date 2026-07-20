export const inventoryTypeDefs = /* GraphQL */ `
  enum InventoryStatus {
    ACTIVE
    DRAFT
    OUT_OF_STOCK
    ARCHIVED
  }
  enum InventoryVisibility {
    PUBLIC
    INTERNAL
  }
  enum ProductListingReviewStatus {
    PENDING
    APPROVED
    DENIED
  }
  enum ProductListingDeliveryTarget {
    HOST
    VENUE
    SHIPROCKET
  }
  enum ProductType {
    CONSUMABLE
    MERCHANDISE
    EQUIPMENT
  }
  enum UnitType {
    BOTTLE
    PIECE
    PACKET
    BOX
    KG
    LITRE
    METER
    OTHER
  }
  enum StockMovementType {
    IN
    OUT
    RESERVE
    RELEASE
    DAMAGE
    ADJUST
  }
  enum InventoryActivityAction {
    CREATE
    UPDATE
    ARCHIVE
    RESTORE
    DUPLICATE
    DELETE
  }

  "One resolved option value on a variant, e.g. { name: 'Size', value: 'M' }."
  type VariantOptionValue {
    name: String!
    value: String!
  }

  input VariantOptionValueInput {
    name: String!
    value: String!
  }

  "A product-level option definition, e.g. { name: 'Size', values: ['S','M','L'] }."
  type ProductOption {
    name: String!
    values: [String!]!
  }

  input ProductOptionInput {
    name: String!
    values: [String!]!
  }

  type ProductVariant {
    id: ID!
    option_label: String!
    option_values: [VariantOptionValue!]!
    sku: String!
    color: String!
    size_label: String!
    description: String!
    unit_cost: Float!
    inventory_count: Int!
    images: [String!]!
    height_cm: Float!
    breadth_cm: Float!
    length_cm: Float!
    weight_kg: Float!
  }

  input ProductVariantInput {
    option_label: String
    option_values: [VariantOptionValueInput!]
    sku: String
    color: String
    size_label: String
    description: String
    unit_cost: Float
    inventory_count: Int
    images: [String!]
    height_cm: Float
    breadth_cm: Float
    length_cm: Float
    weight_kg: Float
  }

  "One Super/Category/Sub taxonomy row a product is sold in (a product may have several)."
  type ProductCategory {
    super_category_id: ID
    category_id: ID
    sub_category_id: ID
    super_category_name: String!
    category_name: String!
    sub_category_name: String!
  }

  input ProductCategoryInput {
    super_category_id: ID!
    category_id: ID!
    sub_category_id: ID!
    super_category_name: String
    category_name: String
    sub_category_name: String
  }

  type InventoryProduct {
    id: ID!
    product_name: String!
    sku: String!
    options: [ProductOption!]!
    variants: [ProductVariant!]!
    categories: [ProductCategory!]!
    barcode: String!
    short_description: String!
    description: String!

    category_id: ID
    brand_id: ID
    super_category_id: ID
    sub_category_id: ID
    brand_name: String!
    product_type: ProductType!
    unit_type: UnitType!

    image_url: String!
    images: [String!]!

    min_order_qty: Int!
    max_order_qty: Int!
    low_stock_alert: Int!
    notify_low_stock: Boolean!
    inventory_count: Int!
    reserved_count: Int!
    damaged_count: Int!
    requested_count: Int!
    available_count: Int!

    vendor_name: String!
    supplier_contact: String!

    unit_cost: Float!
    purchase_price: Float!
    selling_price: Float!
    tax_percent: Float!
    discount_percent: Float!

    weight_volume: String!
    expiry_date: String
    manufacturing_date: String
    batch_number: String!
    storage_instructions: String!

    status: InventoryStatus!
    visibility: InventoryVisibility!
    tags: [String!]!

    pod_available: Boolean!
    host_request_allowed: Boolean!
    delivery_available: Boolean!
    delivery_charge: Float!

    listing_review_status: ProductListingReviewStatus!
    listing_review_notes: String!
    listing_submitted_by_id: String
    listing_submitted_by_name: String!
    listing_reviewed_by_id: String
    listing_reviewed_by_name: String!
    is_duncit_delivery_partner: Boolean!
    ownership: ProductOwnership!
    size_label: String!
    height_cm: Float!
    length_cm: Float!
    breadth_cm: Float!
    weight_kg: Float!
    color: String!
    commission_pct: Float!
    delivery_target: ProductListingDeliveryTarget!

    is_active: Boolean!

    last_updated_by_id: String
    last_updated_by_name: String!

    created_at: String!
    updated_at: String!
  }

  type InventoryActivityLog {
    id: ID!
    product_id: ID!
    user_id: String
    user_name: String!
    action: InventoryActivityAction!
    changed_fields: [String!]!
    notes: String!
    created_at: String!
  }

  type InventoryStockMovement {
    id: ID!
    product_id: ID!
    user_id: String
    user_name: String!
    type: StockMovementType!
    quantity: Int!
    reason: String!
    balance_after: Int!
    created_at: String!
  }

  type InventoryAnalyticsPoint {
    date: String!
    in_qty: Int!
    out_qty: Int!
    net_qty: Int!
  }

  type InventoryLinkedPod {
    id: ID!
    pod_id: String!
    pod_title: String!
    club_id: String!
    is_active: Boolean!
  }

  input InventoryProductInput {
    product_name: String!
    sku: String
    barcode: String
    short_description: String
    description: String
    category_id: ID
    brand_name: String
    product_type: ProductType
    unit_type: UnitType
    image_url: String
    images: [String!]
    min_order_qty: Int
    max_order_qty: Int
    low_stock_alert: Int
    inventory_count: Int
    reserved_count: Int
    damaged_count: Int
    vendor_name: String
    supplier_contact: String
    unit_cost: Float!
    purchase_price: Float
    selling_price: Float
    tax_percent: Float
    discount_percent: Float
    weight_volume: String
    expiry_date: String
    manufacturing_date: String
    batch_number: String
    storage_instructions: String
    status: InventoryStatus
    visibility: InventoryVisibility
    tags: [String!]
    pod_available: Boolean
    host_request_allowed: Boolean
    delivery_available: Boolean
    delivery_charge: Float
    height_cm: Float
    length_cm: Float
    breadth_cm: Float
    weight_kg: Float
    is_active: Boolean
  }

  input UpdateInventoryProductInput {
    product_name: String
    sku: String
    barcode: String
    short_description: String
    description: String
    category_id: ID
    brand_name: String
    product_type: ProductType
    unit_type: UnitType
    image_url: String
    images: [String!]
    min_order_qty: Int
    max_order_qty: Int
    low_stock_alert: Int
    inventory_count: Int
    reserved_count: Int
    damaged_count: Int
    vendor_name: String
    supplier_contact: String
    unit_cost: Float
    purchase_price: Float
    selling_price: Float
    tax_percent: Float
    discount_percent: Float
    weight_volume: String
    expiry_date: String
    manufacturing_date: String
    batch_number: String
    storage_instructions: String
    status: InventoryStatus
    visibility: InventoryVisibility
    tags: [String!]
    pod_available: Boolean
    host_request_allowed: Boolean
    delivery_available: Boolean
    delivery_charge: Float
    height_cm: Float
    length_cm: Float
    breadth_cm: Float
    weight_kg: Float
    is_active: Boolean
  }

  input StockMovementInput {
    type: StockMovementType!
    quantity: Int!
    reason: String
  }

  "Server-side table page for the shared table engine (DUNCIT TABLE CONTRACT v1)."
  type InventoryProductTablePage {
    rows: [InventoryProduct!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input ProductListingInput {
    "Legacy delivery-partner flag. No longer collected from brands (defaults to false); kept optional for backward compatibility."
    is_duncit_delivery_partner: Boolean
    brand_id: ID!
    "Primary category triple (kept for back-compat; mirrors categories[0])."
    super_category_id: ID!
    category_id: ID!
    sub_category_id: ID!
    "Full list of Super/Category/Sub rows the product is sold in. When present, categories[0] backfills the single fields above."
    categories: [ProductCategoryInput!]
    product_name: String!
    image_url: String!
    images: [String!]
    description: String!
    size_label: String
    height_cm: Float
    length_cm: Float
    breadth_cm: Float
    weight_kg: Float
    color: String
    inventory_count: Int!
    unit_cost: Float!
    "Product-level option definitions (e.g. Size, Colour); variants are their combinations."
    options: [ProductOptionInput!]
    "Optional per-variant rows (colour/size/etc.). The flat fields above stay the product default/primary variant."
    variants: [ProductVariantInput!]
    commission_pct: Float!
    delivery_target: ProductListingDeliveryTarget!
  }

  extend type Query {
    inventoryProducts(search: String, activeOnly: Boolean, status: InventoryStatus, ownership: ProductOwnership): [InventoryProduct!]!
    "Server-side table sibling of inventoryProducts (shared table engine)."
    inventoryProductsTable(query: TableQueryInput): InventoryProductTablePage!
    "Approved products of one external brand — the e-commerce marketplace list."
    marketplaceBrandProducts(brand_doc_id: ID!): [InventoryProduct!]!
    "Server-side table sibling of marketplaceBrandProducts (shared table engine)."
    marketplaceBrandProductsTable(brand_doc_id: ID!, query: TableQueryInput): InventoryProductTablePage!
    productListingRequests(status: ProductListingReviewStatus): [InventoryProduct!]!
    "Server-side table sibling of productListingRequests (shared table engine)."
    productListingRequestsTable(query: TableQueryInput): InventoryProductTablePage!
    myProductListings(brand_id: ID): [InventoryProduct!]!
    "Server-side table sibling of myProductListings — always scoped to the caller's own listings."
    myProductListingsTable(brand_id: ID, query: TableQueryInput): InventoryProductTablePage!
    availablePodProducts(super_category_id: ID, category_id: ID, sub_category_id: ID): [InventoryProduct!]!
    inventoryProduct(product_doc_id: ID!): InventoryProduct
    "Public read of a single product (any signed-in user) — powers the product-detail view on a pod's shop."
    publicInventoryProduct(product_doc_id: ID!): InventoryProduct
    inventoryActivityLogs(product_doc_id: ID!, limit: Int): [InventoryActivityLog!]!
    inventoryStockMovements(product_doc_id: ID!, limit: Int): [InventoryStockMovement!]!
    inventoryAnalytics(product_doc_id: ID!, days: Int): [InventoryAnalyticsPoint!]!
    inventoryProductLinkedPods(product_doc_id: ID!): [InventoryLinkedPod!]!
  }

  extend type Mutation {
    createInventoryProduct(input: InventoryProductInput!): InventoryProduct!
    submitProductListing(input: ProductListingInput!): InventoryProduct!
    updateMyProductListing(product_doc_id: ID!, input: ProductListingInput!): InventoryProduct!
    updateMyProductListingQuantity(product_doc_id: ID!, inventory_count: Int!): InventoryProduct!
    "Update a listing's low-stock threshold + notify toggle without re-triggering approval."
    updateMyProductSettings(product_doc_id: ID!, low_stock_alert: Int!, notify_low_stock: Boolean!): InventoryProduct!
    deleteMyProductListing(product_doc_id: ID!): Boolean!
    reviewProductListing(
      product_doc_id: ID!
      status: ProductListingReviewStatus!
      notes: String
      commission_pct: Float
    ): InventoryProduct!
    updateInventoryProduct(product_doc_id: ID!, input: UpdateInventoryProductInput!): InventoryProduct!
    deleteInventoryProduct(product_doc_id: ID!): Boolean!
    permanentlyDeleteInventoryProduct(product_doc_id: ID!): Boolean!
    archiveInventoryProduct(product_doc_id: ID!): InventoryProduct!
    restoreInventoryProduct(product_doc_id: ID!): InventoryProduct!
    duplicateInventoryProduct(product_doc_id: ID!): InventoryProduct!
    recordInventoryStockMovement(
      product_doc_id: ID!
      input: StockMovementInput!
    ): InventoryProduct!
    generateInventorySku: String!
  }
`;
