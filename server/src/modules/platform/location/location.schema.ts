export const locationTypeDefs = /* GraphQL */ `
  type LocationZone {
    zone_name: String!
    zone_code: String
    pincode: String
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
    created_at: String!
    updated_at: String!
  }

  input LocationFilterInput {
    search: String
    is_active: Boolean
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
  }

  extend type Query {
    locations(filter: LocationFilterInput): [Location!]!
    location(location_doc_id: ID!): Location
  }

  extend type Mutation {
    createLocation(input: CreateLocationInput!): Location!
    updateLocation(location_doc_id: ID!, input: UpdateLocationInput!): Location!
    deleteLocation(location_doc_id: ID!): Boolean!
  }
`;
