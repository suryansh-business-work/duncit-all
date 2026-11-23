export const giftCardOrderTypeDefs = /* GraphQL */ `
  "DIGITAL: codes emailed to the recipient. PHYSICAL: printed scratch cards delivered by courier."
  enum GiftCardDeliveryMode {
    DIGITAL
    PHYSICAL
  }

  enum GiftCardOrderPaymentStatus {
    PENDING
    PAID
    FAILED
    REFUNDED
  }

  """
  Where a gift card order is. Digital: PENDING → PROCESSING → DELIVERED (every
  card emailed). Physical: PENDING → PROCESSING (cards minted) → PRINTED → the
  courier's statuses, fed by ShipRocket.
  """
  enum GiftCardOrderFulfilmentStatus {
    PENDING
    PROCESSING
    PRINTED
    AWAITING_SHIPMENT
    AWB_ASSIGNED
    PICKUP_SCHEDULED
    SHIPPED
    OUT_FOR_DELIVERY
    DELIVERED
    NDR
    RTO
    RTO_DELIVERED
    LOST
    CANCELLED
    FAILED
  }

  "A design in the Loyalty gift card catalogue."
  type GiftCardDesign {
    id: ID!
    name: String!
    "Internal grouping label (e.g. Festive, Birthday) — never shown to members."
    category: String!
    front_image_url: String!
    back_image_url: String!
    "The one design members see and buy."
    is_default: Boolean!
    is_active: Boolean!
    "Blank printed cards of this design in hand."
    physical_stock: Int!
    sort_order: Int!
    created_at: String!
    updated_at: String!
  }

  "What members see of a design: its name and two faces."
  type GiftCardPublicDesign {
    id: ID!
    name: String!
    front_image_url: String!
    back_image_url: String!
  }

  "Everything the buy page needs, in one request."
  type GiftCardStorefront {
    "The default design. Null until the Loyalty team uploads one — the page then says gift cards are unavailable."
    design: GiftCardPublicDesign
    settings: GiftCardSettings!
    "Printed cards of the default design that can still be ordered (0 when physical delivery is off)."
    physical_available: Int!
    currency_symbol: String!
  }

  "The courier side of the gift card policy (Loyalty only)."
  type GiftCardShippingSettings {
    pickup_location: String!
    parcel_weight_kg: Float!
    parcel_length_cm: Float!
    parcel_breadth_cm: Float!
    parcel_height_cm: Float!
  }

  type GiftCardDesignTablePage {
    rows: [GiftCardDesign!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input GiftCardDesignInput {
    name: String
    category: String
    front_image_url: String
    back_image_url: String
    is_active: Boolean
    sort_order: Int
  }

  type GiftCardOrderAddress {
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

  input GiftCardOrderAddressInput {
    name: String
    phone: String
    line1: String
    line2: String
    landmark: String
    city: String
    state: String
    pincode: String
    country: String
  }

  type GiftCardOrderShipment {
    courier_name: String!
    "The courier's tracking number."
    awb: String!
    "The courier's own status line."
    tracking_status: String!
    "Expected delivery, as the courier states it."
    etd: String!
    pickup_scheduled_date: String!
    last_synced_at: String
  }

  type GiftCardOrderTrackingEvent {
    status: String!
    location: String!
    note: String!
    at: String!
  }

  "A gift card order as its buyer sees it. Never carries a card code or passcode."
  type GiftCardOrder {
    id: ID!
    order_no: String!
    delivery_mode: GiftCardDeliveryMode!
    design_name: String!
    design_front_url: String!
    design_back_url: String!
    "Face value of one card."
    amount: Float!
    quantity: Int!
    cards_value: Float!
    shipping_fee: Float!
    total: Float!
    currency_symbol: String!
    recipient_name: String!
    recipient_email: String!
    message: String!
    shipping_address: GiftCardOrderAddress
    payment_status: GiftCardOrderPaymentStatus!
    fulfilment_status: GiftCardOrderFulfilmentStatus!
    cards_issued: Int!
    paid_at: String
    emailed_at: String
    printed_at: String
    delivered_at: String
    created_at: String!
    updated_at: String!
    "Null until the courier is booked."
    shipment: GiftCardOrderShipment
    tracking_events: [GiftCardOrderTrackingEvent!]!
  }

  type GiftCardOrderPage {
    rows: [GiftCardOrder!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "A gift card order in the Loyalty console."
  type GiftCardAdminOrder {
    id: ID!
    order_no: String!
    delivery_mode: GiftCardDeliveryMode!
    design_id: ID
    design_name: String!
    design_front_url: String!
    design_back_url: String!
    amount: Float!
    quantity: Int!
    cards_value: Float!
    shipping_fee: Float!
    total: Float!
    currency_symbol: String!
    recipient_name: String!
    recipient_email: String!
    message: String!
    shipping_address: GiftCardOrderAddress
    payment_status: GiftCardOrderPaymentStatus!
    fulfilment_status: GiftCardOrderFulfilmentStatus!
    cards_issued: Int!
    paid_at: String
    emailed_at: String
    printed_at: String
    delivered_at: String
    created_at: String!
    updated_at: String!
    shipment: GiftCardOrderShipment
    tracking_events: [GiftCardOrderTrackingEvent!]!
    user_id: ID!
    buyer_name: String!
    buyer_email: String!
    buyer_phone: String!
    payment_id: String!
    "The payment document id — what the Finance payment page is addressed by."
    payment_doc_id: ID!
    "The scratch-card batch printed for a physical order (Loyalty > Physical Gift Cards)."
    physical_batch_id: ID
    "The virtual cards a digital order issued (Loyalty > Virtual Gift Cards)."
    gift_card_ids: [ID!]!
    "Paid while the design's stock could not cover it — print more before shipping."
    stock_short: Boolean!
    "The last courier booking refusal, until a booking succeeds."
    last_error: String!
    "LOW_WALLET or NDR when the courier side needs the team."
    shipment_alert: String!
    shipment_alert_message: String!
    shipment_sandbox: Boolean!
    label_available: Boolean!
  }

  type GiftCardAdminOrderTablePage {
    rows: [GiftCardAdminOrder!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "One line of an order's audit trail."
  type GiftCardOrderHistoryEntry {
    id: ID!
    action: String!
    note: String!
    "Who did it — empty for the courier feed and the payment system."
    actor_name: String!
    created_at: String!
  }

  type GiftCardAdminOrderDetail {
    order: GiftCardAdminOrder!
    history: [GiftCardOrderHistoryEntry!]!
  }

  "The order book at a glance (Loyalty > Gift Card Orders)."
  type GiftCardOrderStats {
    paid_orders: Int!
    paid_value: Float!
    pending_payment: Int!
    "Physical orders paid and waiting to be printed."
    to_print: Int!
    "Printed and waiting for the courier to be booked."
    to_ship: Int!
    in_transit: Int!
    delivered: Int!
    returned_or_lost: Int!
    "Stock short, a courier alert or a booking refusal."
    needs_attention: Int!
  }

  extend type Query {
    "The buy page: the default design, the sales policy, and printed stock. Signed-in only."
    giftCardStorefront: GiftCardStorefront!
    "The caller's gift card orders, newest first."
    myGiftCardOrders(page: Int, page_size: Int): GiftCardOrderPage!
    "One of the caller's gift card orders, with its tracking."
    myGiftCardOrder(order_no: String!): GiftCardOrder!
    "Loyalty > Gift Card Designs."
    giftCardDesignsTable(query: TableQueryInput): GiftCardDesignTablePage!
    giftCardDesign(id: ID!): GiftCardDesign!
    "Categories already used in the catalogue, for the design form."
    giftCardDesignCategories: [String!]!
    "Loyalty > Gift Card Orders. Every order, digital and physical."
    giftCardOrdersTable(query: TableQueryInput): GiftCardAdminOrderTablePage!
    giftCardOrderAdmin(id: ID!): GiftCardAdminOrderDetail!
    giftCardOrderStats: GiftCardOrderStats!
    "The courier side of the gift card policy."
    giftCardShippingSettings: GiftCardShippingSettings!
  }

  extend type Mutation {
    "Add a design. The first design ever added becomes the default."
    createGiftCardDesign(input: GiftCardDesignInput!): GiftCardDesign!
    updateGiftCardDesign(id: ID!, input: GiftCardDesignInput!): GiftCardDesign!
    "Make this the one design members see and buy."
    setDefaultGiftCardDesign(id: ID!): GiftCardDesign!
    "Correct a design's printed stock by delta (+ after a print run, − for damaged cards), with the reason."
    adjustGiftCardDesignStock(id: ID!, delta: Int!, reason: String!): GiftCardDesign!
    "A paid physical order's scratch cards are printed and packed."
    markGiftCardOrderPrinted(id: ID!): GiftCardAdminOrder!
    "Correct a physical order's delivery address before the courier is booked."
    updateGiftCardOrderAddress(id: ID!, input: GiftCardOrderAddressInput!): GiftCardAdminOrder!
    "Book (or resume booking) the courier for a printed order. Spends the ShipRocket wallet."
    bookGiftCardOrderShipment(id: ID!): GiftCardAdminOrder!
    "Pull the latest courier tracking for an order now."
    refreshGiftCardOrderTracking(id: ID!): GiftCardAdminOrder!
    "The shipping label as a base64 PDF."
    giftCardOrderLabelFile(id: ID!): String!
  }
`;
