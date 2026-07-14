export const policyTypeDefs = /* GraphQL */ `
  type Policy {
    id: ID!
    slug: String!
    title: String!
    content: String!
    is_active: Boolean!
    sort_order: Int!
    created_at: String!
    updated_at: String!
  }

  "Server-side table page for the shared table engine (policiesTable)."
  type PolicyTablePage {
    rows: [Policy!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input PolicyFilterInput {
    is_active: Boolean
    search: String
  }

  input CreatePolicyInput {
    slug: String!
    title: String!
    content: String
    is_active: Boolean
    sort_order: Int
  }

  input UpdatePolicyInput {
    slug: String
    title: String
    content: String
    is_active: Boolean
    sort_order: Int
  }

  extend type Query {
    policies(filter: PolicyFilterInput): [Policy!]!
    policiesTable(query: TableQueryInput): PolicyTablePage!
    policy(policy_doc_id: ID!): Policy
    policyBySlug(slug: String!): Policy
    publicPolicies: [Policy!]!
    "The policy rendered as a downloadable PDF (base64)."
    policyPdfBase64(slug: String!): String!
  }

  extend type Mutation {
    createPolicy(input: CreatePolicyInput!): Policy!
    updatePolicy(policy_doc_id: ID!, input: UpdatePolicyInput!): Policy!
    deletePolicy(policy_doc_id: ID!): Boolean!
  }
`;
