import gql from 'graphql-tag';

export const aiPromptTypeDefs = gql`
  """
  A reusable prompt in the AI Prompt Library. \`token_count\` is derived from
  \`content\` on every read, so it stays in sync with edits.
  """
  type AiPrompt {
    id: ID!
    name: String!
    description: String
    content: String!
    category: String!
    target_model: String!
    token_count: Int!
    is_active: Boolean!
    created_by: String
    created_at: String
    updated_at: String
  }

  input AiPromptFilter {
    is_active: Boolean
    category: String
    search: String
  }

  input CreateAiPromptInput {
    name: String!
    description: String
    content: String!
    category: String
    target_model: String
    is_active: Boolean
  }

  input UpdateAiPromptInput {
    name: String
    description: String
    content: String
    category: String
    target_model: String
    is_active: Boolean
  }

  extend type Query {
    aiPrompts(filter: AiPromptFilter): [AiPrompt!]!
    aiPrompt(id: ID!): AiPrompt
  }

  extend type Mutation {
    createAiPrompt(input: CreateAiPromptInput!): AiPrompt!
    updateAiPrompt(id: ID!, input: UpdateAiPromptInput!): AiPrompt!
    deleteAiPrompt(id: ID!): Boolean!
  }
`;
