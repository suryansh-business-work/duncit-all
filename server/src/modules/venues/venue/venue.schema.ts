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

  "Category the venue wants to host pods in (shared pods Category taxonomy)."
  type VenueCategory {
    super_category_id: ID
    category_id: ID
    sub_category_id: ID
    super_category_name: String!
    category_name: String!
    sub_category_name: String!
  }

  input VenueCategoryInput {
    super_category_id: ID!
    category_id: ID!
    sub_category_id: ID!
  }

  "One named capacity the venue offers (e.g. 'Banquet hall' seats 120)."
  type VenueCapacityItem {
    label: String!
    capacity: Int!
  }

  input VenueCapacityItemInput {
    label: String!
    capacity: Int!
  }

  "Registration option catalogs — clients render these instead of hardcoding."
  type VenueRegistrationConfig {
    venue_types: [String!]!
    doc_types: [String!]!
    capacity_item_limit: Int!
    amenities: [String!]!
    facilities: [String!]!
    security: [String!]!
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
    capacity_items: [VenueCapacityItem!]!
    venue_category: VenueCategory!
    description: String!
    amenities: [String!]!
    facilities: [String!]!
    security: [String!]!
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
    "Count of live (non-deleted) pods hosted at this venue (resolved)."
    pod_count: Int!
    reviewer_notes: String!
    submitted_at: String
    approved_at: String
    rejected_at: String
    created_at: String!
    updated_at: String!
  }

  "Server-side table page for the shared table engine (venuesTable / myVenuesTable)."
  type VenueTablePage {
    rows: [Venue!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input VenueStep1Input {
    venue_name: String!
    venue_type: String!
    capacity: Int!
    capacity_items: [VenueCapacityItemInput!]
    venue_category: VenueCategoryInput
    description: String
    amenities: [String!]
    facilities: [String!]
    security: [String!]
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

  """
  The only fields an owner may change on an APPROVED venue: description,
  images, capacity list, owner contact details, and appended (never replaced)
  documents. Everything else is locked after approval.
  """
  input UpdateApprovedVenueInput {
    description: String
    cover_image_url: String
    gallery: [String!]
    capacity_items: [VenueCapacityItemInput!]
    add_documents: [VenueDocumentInput!]
    owner_name: String
    owner_phone: String
    owner_dob: String
    owner_address: String
  }

  extend type Query {
    "Without venue_id: the owner's current application. With venue_id: that venue (must be the owner's)."
    myVenue(venue_id: ID): Venue
    myVenues: [Venue!]!
    "Owner-scoped table page over the caller's venues (shared table engine)."
    myVenuesTable(query: TableQueryInput): VenueTablePage!
    venues(status: VenueStatus): [Venue!]!
    "Admin/onboarding table page over all venues (shared table engine)."
    venuesTable(query: TableQueryInput): VenueTablePage!
    venue(venue_doc_id: ID!): Venue
    publicVenues: [Venue!]!
    "APPROVED, active venues that auto-match a club by location (+ locality) + Super/Sub category (admin Club form). Empty when no location is given."
    matchingVenues(location_id: ID!, locality: String, super_category_id: ID, category_id: ID): [Venue!]!
    venueRegistrationConfig: VenueRegistrationConfig!
  }

  extend type Mutation {
    "venue_id targets a specific editable (DRAFT/REJECTED) venue of the owner; omitted = current draft (created if needed)."
    submitVenueStep1(input: VenueStep1Input!, venue_id: ID): Venue!
    submitVenueStep2(input: VenueStep2Input!, venue_id: ID): Venue!
    submitVenueStep3(input: VenueStep3Input!, venue_id: ID): Venue!
    submitVenueFinal(venue_id: ID): Venue!
    "Owner edits the editable subset of an APPROVED venue (documents append-only)."
    updateApprovedVenue(venue_id: ID!, input: UpdateApprovedVenueInput!): Venue!
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
    "Developer-only permanent delete. Re-confirm with your own email + password. Cannot be undone; blocked if the venue still has live pods/booked slots."
    deleteVenue(venue_doc_id: ID!, email: String!, password: String!): Boolean!
  }
`;
