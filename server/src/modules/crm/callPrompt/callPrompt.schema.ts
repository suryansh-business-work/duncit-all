import gql from 'graphql-tag';

export const callPromptTypeDefs = gql`
  """
  A reusable Static Content block for AI Calls. The agent picks one when placing
  an "AI Call" and the Servam AI speaks in this context.
  """
  type CrmCallPrompt {
    id: ID!
    name: String!
    description: String
    context: String!
    language: String!
    is_active: Boolean!
    created_by: String
    created_at: String
    updated_at: String
  }

  input CrmCallPromptFilter {
    is_active: Boolean
    search: String
  }

  "Server-side table page for the shared table engine (crmCallPromptsTable)."
  type CrmCallPromptTablePage {
    rows: [CrmCallPrompt!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input CreateCrmCallPromptInput {
    name: String!
    description: String
    context: String!
    language: String
    is_active: Boolean
  }

  input UpdateCrmCallPromptInput {
    name: String
    description: String
    context: String
    language: String
    is_active: Boolean
  }

  extend type Query {
    crmCallPrompts(filter: CrmCallPromptFilter): [CrmCallPrompt!]!
    crmCallPromptsTable(query: TableQueryInput): CrmCallPromptTablePage!
    crmCallPrompt(id: ID!): CrmCallPrompt
  }

  extend type Mutation {
    createCrmCallPrompt(input: CreateCrmCallPromptInput!): CrmCallPrompt!
    updateCrmCallPrompt(id: ID!, input: UpdateCrmCallPromptInput!): CrmCallPrompt!
    deleteCrmCallPrompt(id: ID!): Boolean!
  }
`;
