import gql from 'graphql-tag';

export const managedOptionTypeDefs = gql`
  "A flat, admin-managed CRM option (venue Amenity or Event Suitability)."
  type CrmManagedOption {
    id: ID!
    name: String!
    group: CrmManagedOptionGroup!
    sort_order: Int!
    is_active: Boolean!
    created_at: String
    updated_at: String
  }

  enum CrmManagedOptionGroup {
    AMENITY
    EVENT_SUITABILITY
  }

  input CreateCrmManagedOptionInput {
    name: String!
    group: CrmManagedOptionGroup!
    sort_order: Int
    is_active: Boolean
  }

  input UpdateCrmManagedOptionInput {
    name: String
    sort_order: Int
    is_active: Boolean
  }

  extend type Query {
    crmManagedOptions(group: CrmManagedOptionGroup!, include_inactive: Boolean): [CrmManagedOption!]!
  }

  extend type Mutation {
    createCrmManagedOption(input: CreateCrmManagedOptionInput!): CrmManagedOption!
    updateCrmManagedOption(id: ID!, input: UpdateCrmManagedOptionInput!): CrmManagedOption!
    deleteCrmManagedOption(id: ID!): Boolean!
  }
`;
