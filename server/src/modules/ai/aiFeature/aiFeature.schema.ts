import gql from 'graphql-tag';

export const aiFeatureTypeDefs = gql`
  """
  One AI feature of the product — an entry in the OpenAI task catalogue — with
  its On/Off switch and what it used and cost over the requested range.
  """
  type AiFeature {
    "Stable catalogue key, e.g. moderation.pod. Also the task its calls are logged under."
    key: String!
    label: String!
    "Owning area — Moderation, CRM, Admin Tools …"
    module: String!
    description: String!
    "What the product does instead while this feature is switched off."
    when_off: String!
    "False when an admin switched it off in the AI portal. A feature never switched is on."
    enabled: Boolean!
    updated_by_name: String
    updated_at: String
    range_days: Int!
    calls: Int!
    failed_calls: Int!
    "Calls that never left — no key configured, or the feature switched off."
    skipped_calls: Int!
    prompt_tokens: Int!
    completion_tokens: Int!
    total_tokens: Int!
    "USD, summed from each call's cost as priced when it was made."
    cost_usd: Float!
    avg_duration_ms: Int!
    "Calls on a model with no rate card entry — cost_usd is a floor when this is above 0."
    unpriced_calls: Int!
    last_called_at: String
    "The AI Library code prompts this feature runs on, read from the prompt catalogue."
    prompts: [AiFeaturePrompt!]!
    "Why the feature runs on no code prompt, when it has none."
    prompts_note: String
  }

  "One AI Library code prompt an AI feature runs on."
  type AiFeaturePrompt {
    "Catalogue key of the prompt; the AI Library opens it by this key."
    key: String!
    name: String!
    role: AiPromptRole!
    "False until the server has seeded the prompt into the library (it does so on boot)."
    in_library: Boolean!
    "False when the live body in the library differs from the code default: edited in the portal, or the default changed after it was seeded."
    matches_default: Boolean!
  }

  "One day of AI feature calls, in the admin's time zone."
  type AiFeatureDay {
    "yyyy-MM-dd"
    date: String!
    calls: Int!
    failed_calls: Int!
    skipped_calls: Int!
    total_tokens: Int!
    cost_usd: Float!
    avg_duration_ms: Int!
  }

  "The AI features of one owning area, and what they used."
  type AiFeatureArea {
    module: String!
    features: Int!
    enabled: Int!
    calls: Int!
    failed_calls: Int!
    total_tokens: Int!
    cost_usd: Float!
    avg_duration_ms: Int!
  }

  """
  The AI Features dashboard over one range. Totals and areas are summed from
  \`features\`, so they always match the AI Features table.
  """
  type AiFeaturesDashboard {
    range_days: Int!
    features_total: Int!
    features_enabled: Int!
    "Features called at least once in the range."
    features_used: Int!
    calls: Int!
    failed_calls: Int!
    skipped_calls: Int!
    prompt_tokens: Int!
    completion_tokens: Int!
    total_tokens: Int!
    cost_usd: Float!
    avg_duration_ms: Int!
    unpriced_calls: Int!
    by_area: [AiFeatureArea!]!
    "One entry per day of the range, zero-filled."
    series: [AiFeatureDay!]!
    features: [AiFeature!]!
  }

  extend type Query {
    "Every AI feature with its switch and usage. range_days defaults to 30, max 90."
    aiFeatures(range_days: Int): [AiFeature!]!
    aiFeature(key: String!, range_days: Int): AiFeature!
    "Usage, cost, tokens and performance of every AI feature over the range (default 30, max 90)."
    aiFeaturesDashboard(range_days: Int): AiFeaturesDashboard!
  }

  extend type Mutation {
    "Switch one AI feature on or off. Audited in the table change log."
    setAiFeatureEnabled(key: String!, enabled: Boolean!): AiFeature!
  }
`;
