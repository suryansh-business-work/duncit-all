export const catalogDeletionTypeDefs = /* GraphQL */ `
  enum CatalogDeletionKind {
    PRODUCT
    BRAND
  }

  "What happens to orders still running when a brand/product is deleted."
  enum CatalogDeletionMode {
    "Let every running order be delivered first; the deletion waits for them."
    WAIT_FOR_ORDERS
    "Cancel the running orders now, with a full refund and an apology to each buyer."
    CANCEL_AND_REFUND
  }

  enum CatalogDeletionStatus {
    PENDING
    APPROVED
    REJECTED
    WITHDRAWN
    COMPLETED
  }

  type CatalogDeletionEvent {
    action: String!
    note: String!
    by: String!
    at: String!
  }

  "A partner's request to delete a live pod-shop brand or product (Products portal › Delete Requests)."
  type CatalogDeletionRequest {
    id: ID!
    request_no: String!
    kind: CatalogDeletionKind!
    brand_id: ID!
    product_id: ID
    "The brand request this product request was raised under."
    parent_id: ID
    brand_name: String!
    product_name: String!
    mode: CatalogDeletionMode!
    reason: String!
    "When the deletion becomes due (start of the picked day, admin time zone)."
    scheduled_for: String!
    status: CatalogDeletionStatus!
    open_orders_at_request: Int!
    requested_by_name: String!
    reviewed_by: String!
    reviewed_at: String
    review_note: String!
    cancelled_orders: Int!
    failed_refunds: Int!
    "Why the due deletion has not run yet, e.g. '2 order(s) still running'."
    blocked_reason: String!
    last_checked_at: String
    completed_at: String
    events: [CatalogDeletionEvent!]!
    created_at: String!
    updated_at: String!
  }

  type CatalogDeletionTablePage {
    rows: [CatalogDeletionRequest!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "The notice window a deletion date must fall in."
  type CatalogDeletionWindow {
    min_days: Int!
    max_days: Int!
    "First and last day that can be picked, yyyy-MM-dd."
    earliest: String!
    latest: String!
    updated_at: String!
  }

  "A running order on the item being deleted."
  type CatalogDeletionOrder {
    id: ID!
    order_no: String!
    fulfilment_status: FulfilmentStatus!
    fulfilment_method: FulfilmentMethod!
    created_at: String!
    total: Float!
    currency_symbol: String!
    "Units of the deleted item on this order."
    units: Int!
  }

  type CatalogDeletionProduct {
    id: ID!
    product_name: String!
    is_active: Boolean!
  }

  "What deleting it would touch, right now."
  type CatalogDeletionImpact {
    open_orders: Int!
    open_returns: Int!
    "The oldest 50 running orders; open_orders is the exact count."
    orders: [CatalogDeletionOrder!]!
    "For a brand: the products that go with it."
    products: [CatalogDeletionProduct!]!
  }

  type CatalogDeletionPreview {
    kind: CatalogDeletionKind!
    brand_name: String!
    product_name: String!
    window: CatalogDeletionWindow!
    impact: CatalogDeletionImpact!
  }

  type CatalogDeletionDetail {
    request: CatalogDeletionRequest!
    impact: CatalogDeletionImpact!
  }

  input RequestCatalogDeletionInput {
    kind: CatalogDeletionKind!
    "The product's id for PRODUCT, the brand's for BRAND."
    target_id: ID!
    mode: CatalogDeletionMode!
    "yyyy-MM-dd inside the window."
    scheduled_for: String!
    reason: String
  }

  input UpdateCatalogDeletionWindowInput {
    min_days: Int!
    max_days: Int!
  }

  extend type Query {
    "Partner: the warning shown before deleting — running orders, open returns, the date window."
    catalogDeletionPreview(kind: CatalogDeletionKind!, target_id: ID!): CatalogDeletionPreview!
    "Partner: their deletion requests (optionally one brand's)."
    myCatalogDeletionRequests(brand_id: ID): [CatalogDeletionRequest!]!
    "The window a deletion date must fall in."
    catalogDeletionWindow: CatalogDeletionWindow!
    "Products team: the request queue, one kind at a time; parent_id lists a brand request's products."
    catalogDeletionRequestsTable(kind: CatalogDeletionKind!, query: TableQueryInput, parent_id: ID): CatalogDeletionTablePage!
    catalogDeletionRequest(id: ID!): CatalogDeletionDetail!
  }

  extend type Mutation {
    "Partner: ask to delete a live brand or product. It leaves the shop at once."
    requestCatalogDeletion(input: RequestCatalogDeletionInput!): CatalogDeletionRequest!
    "Partner: withdraw an open request — the item goes back on sale."
    withdrawCatalogDeletion(id: ID!): CatalogDeletionRequest!
    "Products team: approve (CANCEL_AND_REFUND cancels running orders) or reject (note required)."
    reviewCatalogDeletion(id: ID!, approve: Boolean!, note: String): CatalogDeletionRequest!
    "Products team: change the notice window (whole days, 1–365, min ≤ max)."
    updateCatalogDeletionWindow(input: UpdateCatalogDeletionWindowInput!): CatalogDeletionWindow!
  }
`;
