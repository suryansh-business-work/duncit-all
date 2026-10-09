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
    "Days after delivery this line may be returned (the product's setting when bought). 0 = not returnable."
    return_window_days: Int!
  }

  "Where money going back to the buyer stands."
  enum OrderRefundStatus {
    NONE
    "Sent to Razorpay with no answer yet."
    PENDING
    "Razorpay accepted the refund."
    PROCESSED
    "Nothing to send to a gateway (test-mode or free payment) — recorded in the ledger only."
    RECORDED
    "Razorpay refused it — Finance pays it out by hand, or an operator retries."
    FAILED
  }

  type OrderRefund {
    status: OrderRefundStatus!
    amount: Float!
    coins: Int!
    razorpay_refund_id: String!
    refunded_at: String
    error: String!
    initiated_by: String!
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

  "A ShipRocket document: the shipping label, the GST invoice or the pickup manifest."
  enum ShipmentDocumentKind {
    LABEL
    INVOICE
    MANIFEST
  }

  "A ShipRocket document itself — for a console to print in place or save under this name."
  type ShipmentFile {
    filename: String!
    mime: String!
    content_base64: String!
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
    "When the buyer got the goods — the return window counts from here."
    delivered_at: String
    "Money going back after a cancellation."
    refund: OrderRefund!
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
    "Admin › User details › Shop Orders: one member's pod-shop orders."
    userProductOrdersTable(user_id: ID!, query: TableQueryInput): ProductOrderTablePage!
    "Partner: pod-shop orders of the caller's own brands (one brand when brand_id is given)."
    brandProductOrdersTable(query: TableQueryInput, brand_id: ID): ProductOrderTablePage!
    "Partner: one order of the caller's own brands."
    brandProductOrder(id: ID!): ProductOrder
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
    "Ops: one PDF (label, invoice or manifest) for the given orders, as a file to print or save."
    productOrderShipmentFile(ids: [ID!]!, kind: ShipmentDocumentKind!): ShipmentFile!
    "Products portal: cancel a pod-shop order outright — courier stopped, stock back, full refund, apology sent to the buyer."
    forceCancelProductOrder(id: ID!, reason: String!): ProductOrder!
    "Products portal: retry a cancelled order's refund that Razorpay refused."
    retryProductOrderRefund(id: ID!): ProductOrder!
    "Partner: book, or resume booking, the ShipRocket shipment of an own-brand order."
    brandBookProductOrderShipment(id: ID!): ProductOrder!
    "Partner: pull the latest tracking of an own-brand order."
    brandRefreshProductOrderTracking(id: ID!): ProductOrder!
    "Partner: correct an own-brand order's ship-to before ShipRocket has it."
    brandUpdateProductOrderAddress(id: ID!, address: OrderShippingAddressInput!): ProductOrder!
    "Partner: one PDF (label, invoice or manifest) for own-brand orders."
    brandProductOrderShipmentFile(ids: [ID!]!, kind: ShipmentDocumentKind!): ShipmentFile!
  }
`;
