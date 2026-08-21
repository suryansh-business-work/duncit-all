import gql from 'graphql-tag';

export const aiPromptTypeDefs = gql`
  """
  Which half of the AI Library a prompt belongs to.
  """
  enum AiPromptKind {
    "Declared in the server catalogue and read back by a call site on every request. Editing its body changes what the product sends to the model. Cannot be created or deleted from a portal — only reset."
    CODE
    "Authored in the AI portal. Owned by nobody in code, fully editable, and served by the public GET feed."
    AI
  }

  """
  Which turn of the conversation a prompt is. A CODE feature ships up to two: the
  standing SYSTEM instruction and the per-call USER payload.
  """
  enum AiPromptRole {
    SYSTEM
    USER
  }

  """
  One \`{{placeholder}}\` the call site fills in at request time. A CODE prompt
  declares these in the catalogue; an AI prompt has them read out of its body.
  """
  type AiPromptVariable {
    "Placeholder name, without the braces."
    name: String!
    label: String!
    description: String!
    "Dropping a required placeholder breaks the feature silently, so the editor refuses to save a body that lost one."
    required: Boolean!
    "Stand-in the portal's preview renders with."
    example: String!
  }

  "Where a code prompt is wired in — read-only, it describes the call site."
  type AiPromptUsage {
    "Repo-relative file that sends it."
    file: String!
    "The surface a person is looking at when it runs."
    surface: String!
    "What they did to trigger it."
    trigger: String!
  }

  """
  A prompt in the AI Library. \`token_count\` is derived from \`content\` on
  every read, so it stays in sync with edits.
  """
  type AiPrompt {
    id: ID!
    "Stable catalogue id of a code prompt; null for portal-authored ones."
    key: String
    kind: AiPromptKind!
    role: AiPromptRole!
    name: String!
    description: String
    content: String!
    category: String!
    "Model this prompt is sent to; empty means the configured default."
    target_model: String!
    variables: [AiPromptVariable!]!
    "Usage-log task keys this prompt bills to, for joining spend back to it."
    tasks: [String!]!
    usage: [AiPromptUsage!]!
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
    kind: AiPromptKind
  }

  input CreateAiPromptInput {
    "Feed address for this prompt, slugged from the name when left out. Cannot be changed later."
    key: String
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
    "Creates an AI prompt. Code prompts come from the catalogue and cannot be created here."
    createAiPrompt(input: CreateAiPromptInput!): AiPrompt!
    "On a code prompt only the body, note and target model are applied — the rest belongs to the catalogue."
    updateAiPrompt(id: ID!, input: UpdateAiPromptInput!): AiPrompt!
    "Deleting a code prompt is refused — reset it instead."
    deleteAiPrompt(id: ID!): Boolean!
    "Restore a code prompt's shipped default body."
    resetAiPrompt(id: ID!): AiPrompt!
  }
`;
