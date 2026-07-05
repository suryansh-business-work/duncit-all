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
    RTO
    FAILED
  }

  type OrderLineItem {
    product_id: ID!
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
    last_synced_at: String
  }

  type OrderTrackingEvent {
    status: String!
    code: Int!
    location: String!
    note: String!
    at: String!
  }

  type ProductOrder {
    id: ID!
    order_no: String!
    buyer_id: ID!
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
