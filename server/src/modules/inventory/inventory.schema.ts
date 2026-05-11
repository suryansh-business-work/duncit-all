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

  type InventoryProduct {
    id: ID!
    product_name: String!
    sku: String!
    barcode: String!
    short_description: String!
    description: String!

    category_id: ID
    brand_name: String!
    product_type: ProductType!
    unit_type: UnitType!

    image_url: String!
    images: [String!]!

    min_order_qty: Int!
    max_order_qty: Int!
    low_stock_alert: Int!
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
    is_active: Boolean
  }

  input StockMovementInput {
    type: StockMovementType!
    quantity: Int!
    reason: String
  }

  extend type Query {
    inventoryProducts(search: String, activeOnly: Boolean, status: InventoryStatus): [InventoryProduct!]!
    inventoryProduct(product_doc_id: ID!): InventoryProduct
    inventoryActivityLogs(product_doc_id: ID!, limit: Int): [InventoryActivityLog!]!
    inventoryStockMovements(product_doc_id: ID!, limit: Int): [InventoryStockMovement!]!
    inventoryAnalytics(product_doc_id: ID!, days: Int): [InventoryAnalyticsPoint!]!
  }

  extend type Mutation {
    createInventoryProduct(input: InventoryProductInput!): InventoryProduct!
    updateInventoryProduct(product_doc_id: ID!, input: UpdateInventoryProductInput!): InventoryProduct!
    deleteInventoryProduct(product_doc_id: ID!): Boolean!
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
