/**
 * The pod fields, written once.
 *
 * GraphQL cannot share a field set between a type and an input, so the list
 * lives here and both shapes interpolate it. Two hand-kept copies drift, and
 * the failure is silent: the client keeps sending a field the type no longer
 * returns, or reads one the input never accepted.
 */
const POD_FIELDS = `
    pod_key: String!
    name: String!
    pod_amount: Float!
    no_of_spots: Int!
    "How many identical pods this row stands for, the projection multiplier."
    pod_count: Int!
    gst_percent: Float!
    platform_fee_percent: Float!
    venue_amount: Float!
    host_commission_percent: Float!
    venue_commission_percent: Float!
    club_admin_percent: Float!
`;

export const podCalculatorTypeDefs = /* GraphQL */ `
  "One pod inside a saved calculation — the Pod Profit Calculator's inputs, named identically."
  type PodCalculatorPod {${POD_FIELDS}  }

  """
  A saved calculation in the Finance portal's Pod Profit Calculator.

  It stores INPUTS only. Every payout figure is derived by the same finance
  engine that quotes and settles real pods, so a change to the waterfall reaches
  saved calculations without a migration and without a second copy of the maths.

  The kind field is which tab saved it: SINGLE is one pod, MULTI is a
  comparison. One collection serves both because a single-pod calculation IS a
  comparison with one pod in it — the kind only keeps the two lists apart.
  """
  type PodCalculator {
    id: ID!
    name: String!
    kind: String!
    pods: [PodCalculatorPod!]!
    created_by: ID
    created_at: String!
    updated_at: String!
  }

  input PodCalculatorPodInput {${POD_FIELDS}  }

  input SavePodCalculatorInput {
    name: String!
    "SINGLE or MULTI. Only read on create — a calculation never changes tabs."
    kind: String
    pods: [PodCalculatorPodInput!]!
  }

  extend type Query {
    podCalculators(kind: String!): [PodCalculator!]!
    podCalculator(calculator_doc_id: ID!): PodCalculator
    "The saved calculation as a PDF report, base64-encoded for the browser to save."
    podCalculatorPdfBase64(calculator_doc_id: ID!): String!
  }

  extend type Mutation {
    createPodCalculator(input: SavePodCalculatorInput!): PodCalculator!
    updatePodCalculator(calculator_doc_id: ID!, input: SavePodCalculatorInput!): PodCalculator!
    deletePodCalculator(calculator_doc_id: ID!): Boolean!
    "Emails the same PDF report as an attachment. Errors when it reached nobody."
    emailPodCalculator(calculator_doc_id: ID!, to: String!): Boolean!
  }
`;

