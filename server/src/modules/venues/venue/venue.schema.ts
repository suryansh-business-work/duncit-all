export const venueTypeDefs = /* GraphQL */ `
  enum VenueStatus {
    DRAFT
    SUBMITTED
    APPROVED
    REJECTED
  }

  type VenueDocument {
    type: String!
    url: String!
    uploaded_at: String!
  }

  input VenueDocumentInput {
    type: String!
    url: String!
  }

  type VenueOperatingHours {
    open: String!
    close: String!
  }

  type VenueRules {
    buffer_minutes: Int!
    min_notice_minutes: Int!
    max_advance_days: Int!
    max_bookings_per_slot: Int!
    allow_instant_booking: Boolean!
    allow_waitlist: Boolean!
    booking_approval_required: Boolean!
    allow_multiple_bookings: Boolean!
  }

  type VenueAutoExtend {
    enabled: Boolean!
    template_id: ID
    horizon_days: Int!
    until: String!
  }

  type VenueSettings {
    operating_hours: VenueOperatingHours!
    weekly_off_days: [Int!]!
    holidays: [String!]!
    rules: VenueRules!
    auto_extend: VenueAutoExtend!
  }

  input VenueOperatingHoursInput {
    open: String!
    close: String!
  }

  input VenueRulesInput {
    buffer_minutes: Int
    min_notice_minutes: Int
    max_advance_days: Int
    max_bookings_per_slot: Int
    allow_instant_booking: Boolean
    allow_waitlist: Boolean
    booking_approval_required: Boolean
    allow_multiple_bookings: Boolean
  }

  input VenueAutoExtendInput {
    enabled: Boolean
    template_id: ID
    horizon_days: Int
    until: String
  }

  input VenueSettingsInput {
    operating_hours: VenueOperatingHoursInput
    weekly_off_days: [Int!]
    holidays: [String!]
    rules: VenueRulesInput
    auto_extend: VenueAutoExtendInput
  }

  type Venue {
    id: ID!
    owner_user_id: ID!
    venue_name: String!
    venue_type: String!
    capacity: Int!
    description: String!
    amenities: [String!]!
    cover_image_url: String!
    gallery: [String!]!
    location_id: ID
    country: String!
    country_code: String!
    address_line1: String!
    address_line2: String!
    city: String!
    state: String!
    state_code: String!
    locality: String!
    postal_code: String!
    lat: Float
    lng: Float
    documents: [VenueDocument!]!
    gstin: String!
    pan: String!
    bank_account: BankAccountVerification!
    owner_name: String!
    owner_email: String!
    owner_phone: String!
    owner_dob: String
    owner_address: String!
    tags: [String!]!
    venue_share_pct: Float!
    venue_commission_pct: Float!
    settings: VenueSettings!
    step_completed: Int!
    status: VenueStatus!
    is_active: Boolean!
    reviewer_notes: String!
    submitted_at: String
    approved_at: String
    rejected_at: String
    created_at: String!
    updated_at: String!
  }

  input VenueStep1Input {
    venue_name: String!
    venue_type: String!
    capacity: Int!
    description: String
    amenities: [String!]
    cover_image_url: String
    gallery: [String!]
    location_id: ID
    country: String
    country_code: String
    address_line1: String!
    address_line2: String
    city: String!
    state: String!
    state_code: String
    locality: String
    postal_code: String!
    lat: Float
    lng: Float
    tags: [String!]
  }

  input VenueStep2Input {
    documents: [VenueDocumentInput!]!
    gstin: String
    pan: String
  }

  input VenueStep3Input {
    owner_name: String!
    owner_email: String!
    owner_phone: String!
    owner_dob: String
    owner_address: String
    bank_account: BankAccountVerificationInput
  }

  extend type Query {
    myVenue: Venue
    myVenues: [Venue!]!
    venues(status: VenueStatus): [Venue!]!
    venue(venue_doc_id: ID!): Venue
    publicVenues: [Venue!]!
  }

  extend type Mutation {
    submitVenueStep1(input: VenueStep1Input!): Venue!
    submitVenueStep2(input: VenueStep2Input!): Venue!
    submitVenueStep3(input: VenueStep3Input!): Venue!
    submitVenueFinal: Venue!
    approveVenue(venue_doc_id: ID!, notes: String, tags: [String!]): Venue!
    rejectVenue(venue_doc_id: ID!, notes: String!): Venue!
    adminCreateVenue(
      owner_user_id: ID!
      step1: VenueStep1Input!
      step2: VenueStep2Input!
      step3: VenueStep3Input!
      submit: Boolean
    ): Venue!
    adminUpdateVenue(
      venue_doc_id: ID!
      step1: VenueStep1Input!
      step2: VenueStep2Input!
      step3: VenueStep3Input!
      status: VenueStatus
    ): Venue!
    setVenueActive(venue_doc_id: ID!, active: Boolean!): Venue!
    setVenueDeductions(venue_doc_id: ID!, venue_share_pct: Float!, venue_commission_pct: Float!): Venue!
    "Owner (or admin) updates operating hours, weekly-off, holidays + booking rules."
    updateVenueSettings(venue_doc_id: ID!, input: VenueSettingsInput!): Venue!
    deleteVenue(venue_doc_id: ID!): Boolean!
  }
`;
