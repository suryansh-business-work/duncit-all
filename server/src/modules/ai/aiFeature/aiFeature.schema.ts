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
  }

  extend type Query {
    "Every AI feature with its switch and usage. range_days defaults to 30, max 90."
    aiFeatures(range_days: Int): [AiFeature!]!
    aiFeature(key: String!, range_days: Int): AiFeature!
  }

  extend type Mutation {
    "Switch one AI feature on or off. Audited in the table change log."
    setAiFeatureEnabled(key: String!, enabled: Boolean!): AiFeature!
  }
`;
