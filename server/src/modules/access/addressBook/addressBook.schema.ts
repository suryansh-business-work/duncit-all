export const addressBookTypeDefs = /* GraphQL */ `
  "A saved address in the user's address book (Profile Settings › Addresses)."
  type UserAddress {
    id: ID!
    label: String!
    name: String!
    phone: String!
    email: String!
    line1: String!
    line2: String!
    landmark: String!
    city: String!
    state: String!
    pincode: String!
    country: String!
    is_default: Boolean!
    created_at: String!
    updated_at: String!
  }

  input UserAddressInput {
    label: String
    name: String
    phone: String
    email: String
    line1: String!
    line2: String
    landmark: String
    city: String!
    state: String!
    pincode: String!
    country: String
    is_default: Boolean
  }

  extend type Query {
    "The signed-in user's saved addresses (default first, then newest)."
    myAddresses: [UserAddress!]!
  }

  extend type Mutation {
    "Create (no id) or update (with id) one of my saved addresses."
    saveMyAddress(id: ID, input: UserAddressInput!): UserAddress!
    deleteMyAddress(id: ID!): Boolean!
    setDefaultMyAddress(id: ID!): UserAddress!
  }
`;
