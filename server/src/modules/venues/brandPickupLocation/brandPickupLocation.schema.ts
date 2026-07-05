export const brandPickupLocationTypeDefs = /* GraphQL */ `
  enum PickupOwnerKind {
    DUNCIT
    BRAND
  }

  type BrandPickupLocation {
    id: ID!
    owner_kind: PickupOwnerKind!
    brand_id: ID
    nickname: String!
    contact_name: String!
    phone: String!
    email: String!
    address_line1: String!
    address_line2: String!
    city: String!
    state: String!
    pincode: String!
    country: String!
    is_default: Boolean!
    shiprocket_registered: Boolean!
    shiprocket_pickup_id: String!
    created_at: String!
    updated_at: String!
  }

  input BrandPickupLocationInput {
    owner_kind: PickupOwnerKind!
    brand_id: ID
    nickname: String!
    contact_name: String
    phone: String
    email: String
    address_line1: String
    address_line2: String
    city: String
    state: String
    pincode: String
    country: String
    is_default: Boolean
  }

  extend type Query {
    "Pickup/warehouse locations for a Duncit or brand owner (Products portal)."
    brandPickupLocations(owner_kind: PickupOwnerKind, brand_doc_id: ID): [BrandPickupLocation!]!
  }

  extend type Mutation {
    saveBrandPickupLocation(id: ID, input: BrandPickupLocationInput!): BrandPickupLocation!
    deleteBrandPickupLocation(id: ID!): Boolean!
    setDefaultBrandPickupLocation(id: ID!): BrandPickupLocation!
    "Register the location with ShipRocket so SHIP orders can pick up from it."
    registerBrandPickupWithShiprocket(id: ID!): BrandPickupLocation!
  }
`;
