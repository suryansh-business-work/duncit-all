export const venueSlotTypeDefs = /* GraphQL */ `
  enum VenueSlotStatus {
    AVAILABLE
    PENDING
    BOOKED
    BLOCKED
  }

  "A PENDING slot hold awaiting the venue owner's decision, with pod + host contact."
  type VenueSlotRequest {
    slot_id: ID!
    venue_id: ID!
    venue_name: String!
    start_at: String!
    end_at: String!
    price: Int!
    requested_at: String!
    pod_id: ID!
    pod_title: String!
    pod_description: String!
    host_name: String!
    host_email: String!
    host_phone: String!
  }

  "The owner's answer to a booking request. NONE = still waiting."
  enum VenueSlotDecisionKind {
    NONE
    APPROVED
    DECLINED
  }

  """
  One booking request with the venue's money on it — powers the decision page
  the request email links to. Readable before AND after the decision, so a
  re-opened link shows the outcome instead of an error.
  """
  type VenueSlotDecision {
    slot_id: ID!
    venue_id: ID!
    venue_name: String!
    start_at: String!
    end_at: String!
    "The slot's gross price, before Duncit's venue commission."
    price: Int!
    "The venue space this slot is for ('' = whole venue)."
    space_label: String!
    requested_at: String!
    pod_id: ID!
    pod_title: String!
    pod_description: String!
    host_name: String!
    host_email: String!
    host_phone: String!
    decision: VenueSlotDecisionKind!
    decided_at: String
    "Set only when the owner declined and gave a reason."
    decline_reason: String!
    "Duncit's commission on the venue's side — the venue's only deduction."
    venue_commission_pct: Float!
    venue_commission_amount: Float!
    "What the venue takes home if the pod sells out; the slot price is a ceiling."
    venue_receives: Float!
  }

  type VenueSlot {
    id: ID!
    venue_id: ID!
    venue_name: String
    start_at: String!
    end_at: String!
    price: Int!
    "The venue space/capacity-item this slot is for ('' = whole venue)."
    space_label: String!
    "Guests this slot can hold (0 = unset/whole venue)."
    capacity: Int!
    status: VenueSlotStatus!
    booked_by_pod_id: ID
    booked_pod_title: String
    notes: String!
    created_at: String!
  }

  input CreateVenueSlotInput {
    start_at: String!
    end_at: String!
    price: Int
    notes: String
    "The venue space this slot is for ('' = whole venue). Slots in different spaces may share a time."
    space_label: String
    "Guests this slot holds (defaults to 0)."
    capacity: Int
  }

  input BulkCreateVenueSlotsInput {
    venue_id: ID!
    slots: [CreateVenueSlotInput!]!
  }

  input UpdateVenueSlotInput {
    start_at: String
    end_at: String
    price: Int
    notes: String
    block: Boolean
  }

  type BulkSlotResult {
    matched: Int!
    affected: Int!
    skipped: Int!
  }

  "Filter for bulk slot ops — only non-booked slots; from defaults to now so history is never touched."
  input BulkDeleteVenueSlotsInput {
    venue_id: ID!
    from: String
    to: String
    weekdays: [Int!]
  }

  input BulkUpdateVenueSlotsInput {
    venue_id: ID!
    from: String
    to: String
    weekdays: [Int!]
    set_price: Int
    block: Boolean
    shift_minutes: Int
    set_duration_minutes: Int
  }

  extend type Query {
    venueSlots(venue_id: ID!, from: String, to: String): [VenueSlot!]!
    venueAvailableSlots(venue_id: ID!, from: String): [VenueSlot!]!
    "Onboarding/admin: all slots for any venue (role-gated, no owner check)."
    adminVenueSlots(venue_id: ID!, from: String, to: String): [VenueSlot!]!
    "Owner: pending booking requests across their venues (or one venue)."
    venueSlotRequests(venue_id: ID): [VenueSlotRequest!]!

    "Owner: one request with its earnings, for the decision page linked from the request email."
    venueSlotDecision(slot_id: ID!): VenueSlotDecision!
  }

  extend type Mutation {
    createVenueSlots(input: BulkCreateVenueSlotsInput!): [VenueSlot!]!
    updateVenueSlot(slot_id: ID!, input: UpdateVenueSlotInput!): VenueSlot!
    deleteVenueSlot(slot_id: ID!): Boolean!
    "Bulk-manage a venue's upcoming non-booked slots (owner-scoped)."
    bulkDeleteVenueSlots(input: BulkDeleteVenueSlotsInput!): BulkSlotResult!
    bulkUpdateVenueSlots(input: BulkUpdateVenueSlotsInput!): BulkSlotResult!
    "Owner approves a pending booking request — the pod goes live."
    approveVenueSlotRequest(slot_id: ID!): VenueSlot!
    "Owner declines a pending booking request — the slot frees up again."
    declineVenueSlotRequest(slot_id: ID!, reason: String): VenueSlot!
    "Onboarding/admin slot management for any venue (role-gated)."
    adminCreateVenueSlots(input: BulkCreateVenueSlotsInput!): [VenueSlot!]!
    adminUpdateVenueSlot(slot_id: ID!, input: UpdateVenueSlotInput!): VenueSlot!
    adminDeleteVenueSlot(slot_id: ID!): Boolean!
  }
`;
