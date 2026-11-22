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
    "Set when an AI prompt was archived; archived prompts are off the tabs, the feed and their public link."
    archived_at: String
    "Every recorded interaction with this prompt, all time (views, copies, public visits, feed hits)."
    total_hits: Int!
    created_by: String
    created_at: String
    updated_at: String
    "Code prompts only: false when the live body differs from the catalogue default (edited here, or the default changed after seeding). Null for AI prompts."
    matches_default: Boolean
  }

  "How many prompts of each kind share one value (a category, a model)."
  type AiLibraryCount {
    "The shared value; an empty model means the configured default."
    key: String!
    code: Int!
    ai: Int!
  }

  "One prompt in the AI Library dashboard, with the usage of the AI features it serves."
  type AiLibraryPromptStat {
    id: ID!
    key: String
    kind: AiPromptKind!
    role: AiPromptRole!
    name: String!
    category: String!
    target_model: String!
    token_count: Int!
    is_active: Boolean!
    matches_default: Boolean
    updated_at: String
    "AI feature keys this prompt runs under."
    features: [String!]!
    "Calls, tokens and cost of those features over the range. A feature served by two prompt pairs counts in both."
    calls: Int!
    failed_calls: Int!
    total_tokens: Int!
    cost_usd: Float!
  }

  "The AI Library at a glance, with usage over one range (default 30 days, max 90)."
  type AiLibraryDashboard {
    range_days: Int!
    code_prompts: Int!
    system_prompts: Int!
    user_prompts: Int!
    ai_prompts: Int!
    active_ai_prompts: Int!
    "Code prompts whose live body differs from the catalogue default."
    edited_code_prompts: Int!
    "Catalogue prompts the library has no row for yet; the server seeds them on boot."
    missing_code_prompts: Int!
    features_total: Int!
    "AI features that run on at least one code prompt."
    features_with_prompt: Int!
    by_category: [AiLibraryCount!]!
    by_model: [AiLibraryCount!]!
    prompts: [AiLibraryPromptStat!]!
  }

  input AiPromptFilter {
    is_active: Boolean
    category: String
    search: String
    kind: AiPromptKind
    "True lists only archived prompts; otherwise archived prompts are left out."
    archived: Boolean
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
    "Prompt counts, drift from the code defaults, and the usage of the features each prompt serves."
    aiLibraryDashboard(range_days: Int): AiLibraryDashboard!
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
