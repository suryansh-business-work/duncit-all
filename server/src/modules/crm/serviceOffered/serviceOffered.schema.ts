import gql from 'graphql-tag';

export const serviceOfferedTypeDefs = gql`
  "A Service Offered title scoped to the Super → Category → Sub taxonomy."
  type CrmServiceOffered {
    id: ID!
    title: String!
    slug: String!
    super_category_id: ID
    category_id: ID
    sub_category_id: ID
    super_category_name: String
    category_name: String
    sub_category_name: String
    applies_to_venue: Boolean!
    applies_to_host: Boolean!
    applies_to_ecomm: Boolean!
    is_active: Boolean!
    sort_order: Int!
    created_at: String
    updated_at: String
  }

  input CrmServiceOfferedFilter {
    super_category_id: ID
    category_id: ID
    sub_category_id: ID
    is_active: Boolean
    applies_to_venue: Boolean
    applies_to_host: Boolean
    applies_to_ecomm: Boolean
    search: String
  }

  "Server-side table page for the shared table engine (crmServicesOfferedTable)."
  type CrmServiceOfferedTablePage {
    rows: [CrmServiceOffered!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input CreateCrmServiceOfferedInput {
    super_category_id: ID!
    category_id: ID
    sub_category_id: ID
    applies_to_venue: Boolean
    applies_to_host: Boolean
    applies_to_ecomm: Boolean
    titles: [String!]!
  }

  input UpdateCrmServiceOfferedInput {
    title: String
    is_active: Boolean
    sort_order: Int
    applies_to_venue: Boolean
    applies_to_host: Boolean
    applies_to_ecomm: Boolean
  }

  extend type Query {
    crmServicesOffered(filter: CrmServiceOfferedFilter): [CrmServiceOffered!]!
    crmServicesOfferedTable(query: TableQueryInput): CrmServiceOfferedTablePage!
  }

  extend type Mutation {
    createCrmServicesOffered(input: CreateCrmServiceOfferedInput!): [CrmServiceOffered!]!
    updateCrmServiceOffered(id: ID!, input: UpdateCrmServiceOfferedInput!): CrmServiceOffered!
    deleteCrmServiceOffered(id: ID!): Boolean!
  }
`;
