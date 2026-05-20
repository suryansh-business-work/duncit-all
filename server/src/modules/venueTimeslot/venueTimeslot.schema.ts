export const venueTimeslotTypeDefs = /* GraphQL */ `
  enum TimeslotRecurrenceKind {
    WEEKLY
    MONTHLY
    SPECIFIC_DATES
  }

  type MonthNthWeekday {
    nth: Int!
    weekday: Int!
  }

  input MonthNthWeekdayInput {
    nth: Int!
    weekday: Int!
  }

  type VenueTimeslotTemplate {
    id: ID!
    venue_id: ID!
    label: String!
    duration_minutes: Int!
    capacity: Int!
    start_time: String!
    end_time: String!
    recurrence_kind: TimeslotRecurrenceKind!
    weekdays: [Int!]!
    month_days: [Int!]!
    month_nth_weekday: MonthNthWeekday
    specific_dates: [String!]!
    valid_from: String
    valid_until: String
    timezone: String!
    is_active: Boolean!
    created_at: String!
    updated_at: String!
  }

  input VenueTimeslotTemplateInput {
    label: String
    duration_minutes: Int!
    capacity: Int!
    start_time: String!
    end_time: String!
    recurrence_kind: TimeslotRecurrenceKind!
    weekdays: [Int!]
    month_days: [Int!]
    month_nth_weekday: MonthNthWeekdayInput
    specific_dates: [String!]
    valid_from: String
    valid_until: String
    timezone: String
    is_active: Boolean
  }

  type VenueTimeslotBlock {
    id: ID!
    venue_id: ID!
    template_id: ID
    from: String!
    to: String!
    reason: String!
    created_at: String!
  }

  input BlockVenueTimeslotInput {
    template_id: ID
    from: String!
    to: String!
    reason: String!
  }

  type VenueTimeslotOverride {
    id: ID!
    venue_id: ID!
    template_id: ID!
    occurrence_date: String!
    capacity_override: Int
    is_cancelled: Boolean!
    note: String!
  }

  type VenueTimeslotInstance {
    template_id: ID!
    label: String!
    start_at: String!
    end_at: String!
    capacity: Int!
    is_blocked: Boolean!
    block_reason: String
    is_cancelled: Boolean!
    note: String
  }

  extend type Query {
    myVenueTimeslotTemplates(venue_id: ID!): [VenueTimeslotTemplate!]!
    myVenueTimeslotBlocks(venue_id: ID!, from: String, to: String): [VenueTimeslotBlock!]!
    venueTimeslotInstances(venue_id: ID!, from: String!, to: String!): [VenueTimeslotInstance!]!
    venueTimeslotOverrides(venue_id: ID!, from: String, to: String): [VenueTimeslotOverride!]!
  }

  extend type Mutation {
    createVenueTimeslotTemplate(
      venue_id: ID!
      input: VenueTimeslotTemplateInput!
    ): VenueTimeslotTemplate!
    updateVenueTimeslotTemplate(
      template_id: ID!
      input: VenueTimeslotTemplateInput!
    ): VenueTimeslotTemplate!
    deleteVenueTimeslotTemplate(template_id: ID!): Boolean!
    setVenueTimeslotTemplateActive(template_id: ID!, active: Boolean!): VenueTimeslotTemplate!
    blockVenueTimeslot(venue_id: ID!, input: BlockVenueTimeslotInput!): VenueTimeslotBlock!
    unblockVenueTimeslot(block_id: ID!): Boolean!
    overrideVenueTimeslotCapacity(
      venue_id: ID!
      template_id: ID!
      occurrence_date: String!
      capacity_override: Int
      is_cancelled: Boolean
      note: String
    ): VenueTimeslotOverride!
    clearVenueTimeslotOverride(override_id: ID!): Boolean!
  }
`;
