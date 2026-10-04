export const podShopReturnTypeDefs = /* GraphQL */ `
  enum PodShopReturnStatus {
    REQUESTED
    APPROVED
    REJECTED
    PICKUP_SCHEDULED
    RECEIVED
    REFUNDED
    CANCELLED
  }

  "Where a return's reverse-pickup parcel is."
  enum ReturnPickupState {
    NONE
    BOOKED
    PICKUP_SCHEDULED
    IN_TRANSIT
    DELIVERED
    CANCELLED
    FAILED
  }

  type PodShopReturnItem {
    product_id: ID!
    variant_id: String!
    name: String!
    variant_label: String!
    image_url: String!
    qty: Int!
    unit_cost: Float!
  }

  type PodShopReturnEvent {
    status: PodShopReturnStatus!
    note: String!
    by: String!
    at: String!
  }

  type PodShopReturnPickup {
    awb: String!
    courier_name: String!
    status: ReturnPickupState!
    tracking_status: String!
    "ShipRocket's refusal on the last booking attempt — empty when booking went through."
    last_error: String!
  }

  "A pod-shop buyer sending goods back inside the brand's return window."
  type PodShopReturn {
    id: ID!
    return_no: String!
    order_id: ID!
    order_no: String!
    buyer_id: ID
    buyer_name: String!
    buyer_email: String!
    brand_ids: [ID!]!
    items: [PodShopReturnItem!]!
    reason: String!
    comments: String!
    status: PodShopReturnStatus!
    "Goods value being returned, at the order's prices."
    gross: Float!
    decision_note: String!
    events: [PodShopReturnEvent!]!
    pickup: PodShopReturnPickup!
    refund: OrderRefund!
    created_at: String!
    updated_at: String!
  }

  type PodShopReturnTablePage {
    rows: [PodShopReturn!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "How much of one order line the buyer can still send back, and until when."
  type ReturnableLine {
    product_id: ID!
    variant_id: String!
    returnable_qty: Int!
    "Null when the product was not returnable when bought."
    returnable_until: String
  }

  extend type ProductOrder {
    "Pod shop only: what the buyer may still return on this order."
    returnable: [ReturnableLine!]!
  }

  input PodShopReturnItemInput {
    product_id: ID!
    variant_id: String
    qty: Int!
  }

  input RequestPodShopReturnInput {
    order_id: ID!
    items: [PodShopReturnItemInput!]!
    reason: String!
    comments: String
  }

  extend type Query {
    "The signed-in buyer's pod-shop returns."
    myPodShopReturns: [PodShopReturn!]!
    "Products team: every return (optionally one brand's). Partner: their own brands' returns."
    podShopReturnsTable(query: TableQueryInput, brand_id: ID): PodShopReturnTablePage!
  }

  extend type Mutation {
    "Buyer: ask to return items of a delivered pod-shop order. One return per brand on the order."
    requestPodShopReturn(input: RequestPodShopReturnInput!): [PodShopReturn!]!
    "Buyer: withdraw a return nobody has decided yet."
    cancelMyPodShopReturn(id: ID!): PodShopReturn!
    "Brand owner or Products team: accept — a SHIP order gets a ShipRocket reverse pickup on the brand's account."
    approvePodShopReturn(id: ID!, note: String): PodShopReturn!
    rejectPodShopReturn(id: ID!, note: String!): PodShopReturn!
    retryPodShopReturnPickup(id: ID!): PodShopReturn!
    "The goods are back (handed in at the venue, or the courier scan never came)."
    markPodShopReturnReceived(id: ID!): PodShopReturn!
    "Goods checked: back in stock, and the buyer refunded through Razorpay."
    refundPodShopReturn(id: ID!): PodShopReturn!
    retryPodShopReturnRefund(id: ID!): PodShopReturn!
  }
`;
