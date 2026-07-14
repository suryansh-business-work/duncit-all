import gql from 'graphql-tag';

export const podPlanTypeDefs = gql`
  type PodPlan {
    id: ID!
    key: String!
    name: String!
    description: String!
    image_url: String!
    features: [String!]!
    price_label: String!
    is_coming_soon: Boolean!
    sort_order: Int!
    is_active: Boolean!
    created_at: String
    updated_at: String
  }

  "Server-side table page for the shared table engine (podPlansTable)."
  type PodPlanTablePage {
    rows: [PodPlan!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input PodPlanInput {
    key: String!
    name: String!
    description: String
    image_url: String
    features: [String!]
    price_label: String
    is_coming_soon: Boolean
    sort_order: Int
    is_active: Boolean
  }

  input PodPlanUpdateInput {
    name: String
    description: String
    image_url: String
    features: [String!]
    price_label: String
    is_coming_soon: Boolean
    sort_order: Int
    is_active: Boolean
  }

  extend type Query {
    podPlans: [PodPlan!]!
    podPlansTable(query: TableQueryInput): PodPlanTablePage!
    publicPodPlans: [PodPlan!]!
  }

  extend type Mutation {
    createPodPlan(input: PodPlanInput!): PodPlan!
    updatePodPlan(plan_id: ID!, input: PodPlanUpdateInput!): PodPlan!
    deletePodPlan(plan_id: ID!): Boolean!
  }
`;
