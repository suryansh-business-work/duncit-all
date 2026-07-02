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

  type VenueSlot {
    id: ID!
    venue_id: ID!
    venue_name: String
    start_at: String!
    end_at: String!
    price: Int!
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
