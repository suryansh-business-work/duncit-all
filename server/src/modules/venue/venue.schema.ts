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
    deleteVenue(venue_doc_id: ID!): Boolean!
  }
`;
