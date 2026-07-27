import gql from 'graphql-tag';

export const aiPromptTypeDefs = gql`
  """
  A reusable prompt in the AI Prompt Library. \`token_count\` is derived from
  \`content\` on every read, so it stays in sync with edits. A row with a
  \`key\` is a SYSTEM prompt: it powers a shipped AI feature, is seeded from the
  server catalog and cannot be deleted — only its body is operator-owned.
  """
  type AiPrompt {
    id: ID!
    "Stable catalog id of a system prompt; null for operator-created prompts."
    key: String
    is_system: Boolean!
    name: String!
    description: String
    content: String!
    category: String!
    target_model: String!
    "Placeholder names the feature fills in at call time, without the braces."
    variables: [String!]!
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
    is_system: Boolean
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
    "Deleting a system prompt is refused — reset it instead."
    deleteAiPrompt(id: ID!): Boolean!
    "Restore a system prompt's shipped default body."
    resetAiPrompt(id: ID!): AiPrompt!
  }
`;
