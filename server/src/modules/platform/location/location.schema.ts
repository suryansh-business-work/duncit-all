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

  """
  The backdrop behind each of the four full-page sections of a city's launch
  waitlist page: the top (live count), Host, Venue Partner and Club Admin. A
  section plays its video and draws its image when the video cannot play or
  none is set. An empty string means not set.
  """
  type LaunchPageMedia {
    hero_video_url: String!
    hero_image_url: String!
    host_video_url: String!
    host_image_url: String!
    venue_video_url: String!
    venue_image_url: String!
    club_admin_video_url: String!
    club_admin_image_url: String!
  }

  "Replaces the whole set. A field left null or empty is unset: on a city it then falls back to the global media."
  input LaunchPageMediaInput {
    hero_video_url: String
    hero_image_url: String
    host_video_url: String
    host_image_url: String
    venue_video_url: String
    venue_image_url: String
    club_admin_video_url: String
    club_admin_image_url: String
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
    "This city's own launch page media; an empty field falls back to the global set on Branding."
    launch_media: LaunchPageMedia!
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
    launch_media: LaunchPageMediaInput
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
    launch_media: LaunchPageMediaInput
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
