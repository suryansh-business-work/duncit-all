export const venueSlotTypeDefs = /* GraphQL */ `
  enum VenueSlotStatus {
    AVAILABLE
    BOOKED
    BLOCKED
  }

  type VenueSlot {
    id: ID!
    venue_id: ID!
    venue_name: String
    start_at: String!
    end_at: String!
    status: VenueSlotStatus!
    booked_by_pod_id: ID
    booked_pod_title: String
    notes: String!
    created_at: String!
  }

  input CreateVenueSlotInput {
    start_at: String!
    end_at: String!
    notes: String
  }

  input BulkCreateVenueSlotsInput {
    venue_id: ID!
    slots: [CreateVenueSlotInput!]!
  }

  input UpdateVenueSlotInput {
    start_at: String
    end_at: String
    notes: String
    block: Boolean
  }

  extend type Query {
    venueSlots(venue_id: ID!, from: String, to: String): [VenueSlot!]!
    venueAvailableSlots(venue_id: ID!, from: String): [VenueSlot!]!
    "Onboarding/admin: all slots for any venue (role-gated, no owner check)."
    adminVenueSlots(venue_id: ID!, from: String, to: String): [VenueSlot!]!
  }

  extend type Mutation {
    createVenueSlots(input: BulkCreateVenueSlotsInput!): [VenueSlot!]!
    updateVenueSlot(slot_id: ID!, input: UpdateVenueSlotInput!): VenueSlot!
    deleteVenueSlot(slot_id: ID!): Boolean!
    "Onboarding/admin slot management for any venue (role-gated)."
    adminCreateVenueSlots(input: BulkCreateVenueSlotsInput!): [VenueSlot!]!
    adminUpdateVenueSlot(slot_id: ID!, input: UpdateVenueSlotInput!): VenueSlot!
    adminDeleteVenueSlot(slot_id: ID!): Boolean!
  }
`;
