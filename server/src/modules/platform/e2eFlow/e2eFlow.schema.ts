import gql from 'graphql-tag';

export const e2eFlowTypeDefs = gql`
  "One step of a sub flow: what the person does, and what should happen."
  type E2eFlowStep {
    action: String!
    "Empty when the step has no stated outcome."
    expected: String!
  }

  "A journey inside a flow, e.g. User Login inside User Authentication."
  type E2eSubFlow {
    id: ID!
    name: String!
    description: String!
    steps: [E2eFlowStep!]!
  }

  """
  A main flow the Tech team documents for the e2e suite, e.g. User
  Authentication. Tech > E2E Tests > Flows.
  """
  type E2eFlow {
    id: ID!
    name: String!
    description: String!
    sub_flows: [E2eSubFlow!]!
    sub_flow_count: Int!
    "The portal account that added it."
    created_by: String!
    created_at: String
    updated_at: String
  }

  type E2eFlowTablePage {
    rows: [E2eFlow!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input E2eFlowInput {
    name: String!
    description: String
  }

  input E2eFlowStepInput {
    action: String!
    expected: String
  }

  input E2eSubFlowInput {
    name: String!
    description: String
    "At least one step."
    steps: [E2eFlowStepInput!]!
  }

  extend type Query {
    "Every documented flow (Tech portal E2E Flows table). Tech/Super admin only."
    e2eFlowsTable(query: TableQueryInput): E2eFlowTablePage!
    "One flow with its sub flows, or null when it does not exist. Tech/Super admin only."
    e2eFlow(id: ID!): E2eFlow
  }

  extend type Mutation {
    createE2eFlow(input: E2eFlowInput!): E2eFlow!
    updateE2eFlow(id: ID!, input: E2eFlowInput!): E2eFlow!
    "Delete a flow and every sub flow inside it."
    deleteE2eFlow(id: ID!): Boolean!
    "Add a sub flow. Answers with the whole flow."
    createE2eSubFlow(flow_id: ID!, input: E2eSubFlowInput!): E2eFlow!
    "Replace a sub flow's name, description and steps. Answers with the whole flow."
    updateE2eSubFlow(flow_id: ID!, sub_flow_id: ID!, input: E2eSubFlowInput!): E2eFlow!
    "Remove a sub flow. Answers with the whole flow."
    deleteE2eSubFlow(flow_id: ID!, sub_flow_id: ID!): E2eFlow!
  }
`;
