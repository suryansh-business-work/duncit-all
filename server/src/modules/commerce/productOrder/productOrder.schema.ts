export const productOrderTypeDefs = /* GraphQL */ `
  enum FulfilmentMethod {
    SHIP
    PICKUP
  }

  enum ProductOwnership {
    DUNCIT
    BRAND
  }

  enum FulfilmentStatus {
    PENDING
    AWAITING_SHIPMENT
    AWB_ASSIGNED
    PICKUP_SCHEDULED
    SHIPPED
    OUT_FOR_DELIVERY
    DELIVERED
    READY_FOR_PICKUP
    PICKED_UP
    CANCELLED
    "Returning to origin."
    RTO
    "Back at the warehouse after a return to origin."
    RTO_DELIVERED
    "A delivery attempt failed and needs an answer (re-attempt or return)."
    NDR
    "Lost or destroyed by the courier."
    LOST
    FAILED
  }

  type OrderLineItem {
    product_id: ID!
    "Which variant of the product was bought — empty for variant-less products."
    variant_id: String!
    variant_label: String!
    variant_sku: String!
    name: String!
    sku: String!
    image_url: String!
    qty: Int!
    unit_cost: Float!
    gross: Float!
    ownership: ProductOwnership!
    brand_id: ID
    weight_kg: Float!
    length_cm: Float!
    breadth_cm: Float!
    height_cm: Float!
  }

  type OrderShippingAddress {
    name: String!
    phone: String!
    email: String!
    line1: String!
    line2: String!
    landmark: String!
    city: String!
    state: String!
    pincode: String!
    country: String!
  }

  type ShipRocketInfo {
    order_id: String!
    shipment_id: String!
    awb: String!
    courier_name: String!
    tracking_status: String!
    label_url: String!
    invoice_url: String!
    manifest_url: String!
    "The courier's estimated delivery date, as ShipRocket phrased it."
    etd: String!
    pickup_scheduled_date: String!
    last_synced_at: String
  }

  type OrderTrackingEvent {
    status: String!
    code: Int!
    location: String!
    note: String!
    at: String!
  }

  "Which shop sold an order."
  enum OrderChannel {
    POD_SHOP
    PET_STORE
  }

  "Paid up front, or collected by the courier on delivery."
  enum OrderPaymentMethod {
    PREPAID
    COD
  }

  "An operator's private note on an order."
  type OrderNote {
    id: ID!
    text: String!
    by_name: String!
    at: String!
  }

  type ProductOrder {
    id: ID!
    order_no: String!
    "Null for a pet-store guest checkout."
    buyer_id: ID
    buyer_name: String!
    buyer_email: String!
    buyer_phone: String
    pod_id: ID
    pod: Pod
    payment_id: ID!
    payment_ref: String!
    line_items: [OrderLineItem!]!
    currency_symbol: String!
    items_total: Float!
    shipping_charge: Float!
    total: Float!
    fulfilment_method: FulfilmentMethod!
    fulfilment_status: FulfilmentStatus!
    shipping_address: OrderShippingAddress
    pickup_venue_id: ID
    pickup_ref: String!
    pickup_location_id: String!
    shiprocket: ShipRocketInfo!
    tracking_events: [OrderTrackingEvent!]!
    last_error: String!
    channel: OrderChannel!
    payment_method: OrderPaymentMethod!
    "What the courier collects in cash (COD only)."
    cod_amount: Float!
    cod_collected_at: String
    "This order's share of the coupon, prepaid discount and coins."
    discount_total: Float!
    coins_share: Int!
    cancelled_at: String
    cancel_reason: String!
    cancelled_by: String!
    notes: [OrderNote!]!
    created_at: String!
    updated_at: String!
  }

  type OrderTracking {
    order_no: String!
    fulfilment_method: FulfilmentMethod!
    fulfilment_status: FulfilmentStatus!
    awb: String!
    courier_name: String!
    label_url: String!
    tracking_status: String!
    events: [OrderTrackingEvent!]!
  }

  input ProductOrderFilter {
    fulfilment_method: FulfilmentMethod
    fulfilment_status: FulfilmentStatus
    search: String
  }

  "Server-side table page for the shared table engine (productOrdersTable)."
  type ProductOrderTablePage {
    rows: [ProductOrder!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input OrderShippingAddressInput {
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

  extend type Query {
    "The signed-in buyer's product orders (optionally scoped to one pod)."
    myProductOrders: [ProductOrder!]!
    myProductOrdersForPod(pod_doc_id: ID!): [ProductOrder!]!
    "Ops: all pod-placed product orders (Products portal)."
    productOrders(filter: ProductOrderFilter): [ProductOrder!]!
    productOrdersTable(query: TableQueryInput): ProductOrderTablePage!
    productOrder(id: ID!): ProductOrder
    productOrderTracking(order_no: String!): OrderTracking
  }

  extend type Mutation {
    "Ops: advance an order's fulfilment status (manual)."
    advanceProductOrderStatus(id: ID!, status: FulfilmentStatus!, note: String): ProductOrder!
    "Ops: switch an order between SHIP and PICKUP."
    setProductOrderFulfilmentMethod(id: ID!, method: FulfilmentMethod!): ProductOrder!
    "Ops: create/retry the ShipRocket shipment for a SHIP order."
    createProductOrderShipment(id: ID!, pickup_location: String): ProductOrder!
    "Ops: pull the latest tracking from ShipRocket."
    refreshProductOrderTracking(id: ID!): ProductOrder!
  }
`;
