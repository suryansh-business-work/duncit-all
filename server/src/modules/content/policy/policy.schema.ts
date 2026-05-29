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
    policy(policy_doc_id: ID!): Policy
    policyBySlug(slug: String!): Policy
    publicPolicies: [Policy!]!
  }

  extend type Mutation {
    createPolicy(input: CreatePolicyInput!): Policy!
    updatePolicy(policy_doc_id: ID!, input: UpdatePolicyInput!): Policy!
    deletePolicy(policy_doc_id: ID!): Boolean!
  }
`;
