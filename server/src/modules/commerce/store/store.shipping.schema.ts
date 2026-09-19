export const storeShippingTypeDefs = /* GraphQL */ `
  "The parcel declared to ShipRocket for an order — or, before booking, the one that will be."
  type OrderParcel {
    weight_kg: Float!
    length_cm: Float!
    breadth_cm: Float!
    height_cm: Float!
    volumetric_weight_kg: Float!
    "What the courier bills: the higher of the packed weight and the volumetric weight."
    chargeable_weight_kg: Float!
    "AUTO (built from the order's items) or OVERRIDE (an operator's correction)."
    source: String!
    "When it went to ShipRocket; null until the shipment is booked."
    sent_at: String
  }

  "An order's shipment as the ecomm portal works it."
  type StoreShipmentOps {
    shiprocket_order_id: String!
    shipment_id: String!
    "LOW_WALLET (courier not assigned — recharge) or NDR (failed delivery); empty when nothing is waiting."
    alert: String!
    alert_message: String!
    "The operator's answer to a failed delivery: re-attempt or return."
    ndr_action: String!
    ndr_actioned_at: String
    pickup_token: String!
    parcel: OrderParcel!
    parcel_sent: Boolean!
    "Items without complete packaging — booking waits for them unless the parcel is overridden."
    packaging_missing: [String!]!
    "What the ship-to address still needs before a courier will take it."
    address_problems: [String!]!
  }

  extend type StoreAdminOrder {
    shipment: StoreShipmentOps!
  }

  type StoreCourierOption {
    courier_company_id: String!
    courier_name: String!
    rate: Float!
    etd: String!
    cod: Boolean!
    rating: Float!
    recommended: Boolean!
  }

  input StoreParcelInput {
    weight_kg: Float!
    length_cm: Float!
    breadth_cm: Float!
    height_cm: Float!
  }

  enum StoreShipmentDocument {
    LABEL
    INVOICE
    MANIFEST
  }

  enum StoreNdrAction {
    REATTEMPT
    RETURN
  }

  "The ShipRocket account at a glance."
  type StoreShiprocketStatus {
    configured: Boolean!
    "The saved credentials were refused; nothing is retried until they change in the Tech portal."
    login_refused: Boolean!
    login_message: String!
    "Null when it could not be read."
    wallet_balance: Float
    webhook_key_set: Boolean!
    default_pickup: String!
    "Path to register as the ShipRocket webhook on the API host."
    webhook_path: String!
  }

  type StorePickupSyncRow {
    warehouse_id: ID!
    nickname: String!
    owner_kind: String!
    city: String!
    pincode: String!
    "READY, AWAITING_VERIFICATION or NOT_IN_SHIPROCKET."
    state: String!
    shiprocket_id: String!
  }

  type StoreShiprocketPickup {
    nickname: String!
    city: String!
    pincode: String!
    verified: Boolean!
  }

  type StorePickupSync {
    warehouses: [StorePickupSyncRow!]!
    "Pickup addresses on the ShipRocket account no warehouse uses."
    shiprocket_only: [StoreShiprocketPickup!]!
    synced_at: String!
  }

  type StoreCodLedgerRow {
    order_id: ID!
    order_no: String!
    buyer_name: String!
    cod_amount: Float!
    status: FulfilmentStatus!
    awb: String!
    delivered_at: String
    collected_at: String
  }

  type StoreCodLedger {
    rows: [StoreCodLedgerRow!]!
    "Cash due on delivered COD orders."
    total_cod: Float!
    collected: Float!
    outstanding: Float!
  }

  type StoreReturnPickupEvent {
    status: String!
    location: String!
    note: String!
    at: String!
  }

  "The courier leg of a return: a reverse pickup from the buyer to the warehouse."
  type StoreReturnPickup {
    sr_order_id: String!
    awb: String!
    courier_name: String!
    "'', BOOKED, PICKUP_SCHEDULED, IN_TRANSIT, DELIVERED, CANCELLED or FAILED."
    status: String!
    tracking_status: String!
    last_error: String!
    last_synced_at: String
    events: [StoreReturnPickupEvent!]!
  }

  extend type StoreReturn {
    pickup: StoreReturnPickup!
  }

  extend type Query {
    "Couriers that can carry a booked order, the recommended one first."
    storeShipmentCouriers(id: ID!): [StoreCourierOption!]!
    "Orders waiting on an operator: failed bookings, a low wallet, failed deliveries."
    storeShipmentAlerts: [ProductOrder!]!
    storeShiprocketStatus: StoreShiprocketStatus!
    "COD orders of the last N days and the cash collected on them."
    storeCodLedger(days: Int): StoreCodLedger!
  }

  extend type Mutation {
    "Book the shipment (or resume a half-booked one): order, courier + AWB, pickup."
    storeBookShipment(id: ID!, courier_id: String): ProductOrder!
    "Override the parcel before booking; omit input to go back to the computed one."
    storeSetParcel(id: ID!, input: StoreParcelInput): ProductOrder!
    "Correct the ship-to address before the shipment is booked."
    storeUpdateShippingAddress(id: ID!, input: StoreAddressInput!): ProductOrder!
    "One PDF (label, invoice or manifest) for the given orders. Answers its URL."
    storeShipmentDocument(ids: [ID!]!, kind: StoreShipmentDocument!): String!
    storeAnswerNdr(id: ID!, action: StoreNdrAction!, comments: String): ProductOrder!
    "Match warehouses to the ShipRocket account's pickup addresses."
    storeSyncPickupLocations: StorePickupSync!
    storeBookReturnPickup(id: ID!): StoreReturn!
    storeRestockReturn(id: ID!): StoreReturn!
  }
`;
