export const policyTypeDefs = /* GraphQL */ `
  type Policy {
    id: ID!
    "Permanent, globally unique handle (POL-000001). Never edited, never reused."
    policy_no: String!
    slug: String!
    title: String!
    "What kind of policy this is — the grouping the dashboard counts by."
    policy_type: String!
    content: String!
    is_active: Boolean!
    "Whether accepting this is a condition of creating an account."
    requires_signup_acceptance: Boolean!
    sort_order: Int!
    created_at: String!
    updated_at: String!
  }

  type PolicyTypeCount {
    policy_type: String!
    count: Int!
  }

  type PolicyStats {
    total: Int!
    by_type: [PolicyTypeCount!]!
  }

  "Server-side table page over the by-type aggregate (policyStatsTable)."
  type PolicyTypeCountTablePage {
    rows: [PolicyTypeCount!]!
    total: Int!
    page: Int!
    page_size: Int!
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
    policy_type: String
    content: String
    is_active: Boolean
    "Omitted means true — every policy gates signup until Legal says otherwise."
    requires_signup_acceptance: Boolean
    sort_order: Int
  }

  input UpdatePolicyInput {
    slug: String
    title: String
    policy_type: String
    content: String
    is_active: Boolean
    requires_signup_acceptance: Boolean
    sort_order: Int
  }

  extend type Query {
    policies(filter: PolicyFilterInput): [Policy!]!
    policiesTable(query: TableQueryInput): PolicyTablePage!
    policyStats: PolicyStats!
    policyStatsTable(query: TableQueryInput): PolicyTypeCountTablePage!
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
    "One-time repair: give an id to any policy that has none."
    backfillPolicyIds: EntityIdBackfillResult!
  }
`;
