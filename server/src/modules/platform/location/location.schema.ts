export const locationTypeDefs = /* GraphQL */ `
  type LocationZone {
    zone_name: String!
    zone_code: String
    pincode: String
    "Count of active clubs whose locality matches this zone in the parent city."
    active_club_count: Int!
  }

  input LocationZoneInput {
    zone_name: String!
    zone_code: String
    pincode: String
  }

  type Location {
    id: ID!
    location_id: String!
    location_name: String!
    country: String!
    country_code: String!
    state: String!
    state_code: String!
    city: String!
    location_image: String!
    location_pincode: String!
    location_zones: [LocationZone!]!
    is_active: Boolean!
    "Count of active clubs currently operating in this city (Home location selector)."
    active_club_count: Int!
    """
    Live in the app. Off: the city still shows in the location picker, but the
    app opens its subscribe-for-launch page instead of the feed.
    """
    is_launched: Boolean!
    "How many subscribers the city needs before launch — the goal the app shows. Default 2000."
    launch_target: Int!
    "Optional chat.whatsapp.com invite link shown on the subscribe page; empty when unset."
    whatsapp_group_url: String!
    "Signed-in members who asked to be told when this city launches."
    subscriber_count: Int!
    created_at: String!
    updated_at: String!
  }

  input LocationFilterInput {
    search: String
    is_active: Boolean
  }

  "Server-side table page for the shared table engine (locationsTable)."
  type LocationTablePage {
    rows: [Location!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input CreateLocationInput {
    location_name: String!
    location_id: String
    country: String!
    country_code: String!
    state: String!
    state_code: String!
    city: String!
    location_image: String!
    location_pincode: String!
    location_zones: [LocationZoneInput!]
    is_active: Boolean
    "Defaults to true."
    is_launched: Boolean
    "Defaults to 2000."
    launch_target: Int
    whatsapp_group_url: String
  }

  input UpdateLocationInput {
    location_name: String
    country: String
    country_code: String
    state: String
    state_code: String
    city: String
    location_image: String
    location_pincode: String
    location_zones: [LocationZoneInput!]
    is_active: Boolean
    is_launched: Boolean
    launch_target: Int
    whatsapp_group_url: String
  }

  extend type Query {
    locations(filter: LocationFilterInput): [Location!]!
    locationsTable(query: TableQueryInput): LocationTablePage!
    location(location_doc_id: ID!): Location
  }

  extend type Mutation {
    createLocation(input: CreateLocationInput!): Location!
    updateLocation(location_doc_id: ID!, input: UpdateLocationInput!): Location!
    deleteLocation(location_doc_id: ID!): Boolean!
  }
`;
