/**
 * The pod fields, written once.
 *
 * GraphQL cannot share a field set between a type and an input, so the list
 * lives here and both shapes interpolate it. Two hand-kept copies drift, and
 * the failure is silent: the client keeps sending a field the type no longer
 * returns, or reads one the input never accepted.
 *
 * It stops at the expense list, which is the one field whose TYPE differs
 * between the two shapes — an output type cannot appear in an input. That line
 * is written out beside each shape instead of parameterising this block:
 * `scripts/verify-gql-schema.mjs` reads these files as TEXT and resolves only a
 * bare ${CONSTANT}, so turning this into a function call made it SKIP the whole
 * block, and every podCalculator field silently vanished from the schema every
 * client document is validated against.
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

/** Shared by the expense type and its input, for the same reason. */
const EXPENSE_FIELDS = `
    expense_key: String!
    label: String!
    "Cost for ONE pod. The pod_count projection multiplies it."
    amount: Float!
    "DUNCIT, HOST or VENUE — anything else is stored as DUNCIT."
    borne_by: String!
`;

export const podCalculatorTypeDefs = /* GraphQL */ `
  """
  One cost line against a pod.

  It is not a share of the collection: the side named in borne_by pays it out of
  what it was already paid, so every payout above stays put and only that side's
  net is smaller.
  """
  type PodCalculatorExpense {${EXPENSE_FIELDS}  }

  "One pod inside a saved calculation — the Pod Profit Calculator's inputs, named identically."
  type PodCalculatorPod {${POD_FIELDS}    "Costs against ONE pod, each charged to the side that carries it."
    expenses: [PodCalculatorExpense!]!
  }

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

  input PodCalculatorExpenseInput {${EXPENSE_FIELDS}  }

  input PodCalculatorPodInput {${POD_FIELDS}    "Costs against ONE pod, each charged to the side that carries it."
    expenses: [PodCalculatorExpenseInput!]!
  }

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

