export const multiPodCalculatorTypeDefs = /* GraphQL */ `
  "One pod inside a saved comparison — the Pod Profit Calculator's inputs, named identically."
  type MultiPodCalculatorPod {
    pod_key: String!
    name: String!
    pod_amount: Float!
    no_of_spots: Int!
    gst_percent: Float!
    platform_fee_percent: Float!
    venue_amount: Float!
    host_commission_percent: Float!
    venue_commission_percent: Float!
    club_admin_percent: Float!
  }

  """
  A saved multi-pod comparison in the Finance portal's Pod Profit Calculator.

  It stores INPUTS only. Every payout figure is derived by the one calculator
  the single-pod tab runs on, so a change to the finance waterfall reaches saved
  comparisons without a migration and without a second copy of the maths here.
  """
  type MultiPodCalculator {
    id: ID!
    name: String!
    pods: [MultiPodCalculatorPod!]!
    created_by: ID
    created_at: String!
    updated_at: String!
  }

  input MultiPodCalculatorPodInput {
    pod_key: String!
    name: String!
    pod_amount: Float!
    no_of_spots: Int!
    gst_percent: Float!
    platform_fee_percent: Float!
    venue_amount: Float!
    host_commission_percent: Float!
    venue_commission_percent: Float!
    club_admin_percent: Float!
  }

  input SaveMultiPodCalculatorInput {
    name: String!
    pods: [MultiPodCalculatorPodInput!]!
  }

  extend type Query {
    multiPodCalculators: [MultiPodCalculator!]!
    multiPodCalculator(calculator_doc_id: ID!): MultiPodCalculator
  }

  extend type Mutation {
    createMultiPodCalculator(input: SaveMultiPodCalculatorInput!): MultiPodCalculator!
    updateMultiPodCalculator(
      calculator_doc_id: ID!
      input: SaveMultiPodCalculatorInput!
    ): MultiPodCalculator!
    deleteMultiPodCalculator(calculator_doc_id: ID!): Boolean!
  }
`;
