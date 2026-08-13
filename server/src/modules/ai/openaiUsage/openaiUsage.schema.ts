import gql from 'graphql-tag';

export const openAiUsageTypeDefs = gql`
  """
  One OpenAI request, as it happened — including the ones that failed and the
  ones that never left because no key is configured.
  """
  type OpenAiUsageLog {
    id: ID!
    "Catalogue key the spend is attributed to, e.g. moderation.pod."
    task: String!
    task_label: String!
    "Owning area — Moderation, CRM, Admin Tools …"
    module: String!
    "Context for this one call (entity, template key, lead id …)."
    detail: String!
    model: String!
    "SUCCESS | FAILED | SKIPPED"
    status: String!
    http_status: Int!
    prompt_tokens: Int!
    completion_tokens: Int!
    total_tokens: Int!
    "USD, priced at the rate card in force when the call was made."
    cost_usd: Float!
    "False when the model had no rate — the cost on this row is a floor, not a fact."
    priced: Boolean!
    duration_ms: Int!
    request_preview: String!
    response_preview: String!
    error_message: String!
    user_id: String
    created_at: String!
  }

  type OpenAiUsageLogTablePage {
    rows: [OpenAiUsageLog!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "Spend rolled up by one dimension — module or model."
  type OpenAiSpendBucket {
    key: String!
    calls: Int!
    tokens: Int!
    cost_usd: Float!
  }

  "Spend for one task in the catalogue."
  type OpenAiTaskSpend {
    task: String!
    label: String!
    module: String!
    calls: Int!
    tokens: Int!
    cost_usd: Float!
    "Calls that did not come back with an answer (failed or skipped)."
    failures: Int!
    avg_duration_ms: Int!
  }

  type OpenAiSpendPoint {
    date: String!
    calls: Int!
    tokens: Int!
    cost_usd: Float!
  }

  "USD per 1,000,000 tokens for one model. Editable — OpenAI re-prices models."
  type OpenAiModelPrice {
    id: ID!
    model: String!
    input_per_1m: Float!
    output_per_1m: Float!
    updated_at: String!
  }

  type OpenAiTaskOption {
    key: String!
    label: String!
    module: String!
  }

  "The task/module filter options, served from the server catalogue."
  type OpenAiTaskCatalogue {
    tasks: [OpenAiTaskOption!]!
    modules: [String!]!
  }

  type OpenAiUsageDashboard {
    range_days: Int!
    total_calls: Int!
    success_calls: Int!
    failed_calls: Int!
    skipped_calls: Int!
    prompt_tokens: Int!
    completion_tokens: Int!
    total_tokens: Int!
    total_cost_usd: Float!
    avg_duration_ms: Int!
    all_time_calls: Int!
    all_time_cost_usd: Float!
    by_task: [OpenAiTaskSpend!]!
    by_module: [OpenAiSpendBucket!]!
    by_model: [OpenAiSpendBucket!]!
    series: [OpenAiSpendPoint!]!
    "Models seen in this range that have no rate card entry — their spend reads as zero."
    unpriced_models: [String!]!
    prices: [OpenAiModelPrice!]!
  }

  input OpenAiModelPriceInput {
    model: String!
    input_per_1m: Float!
    output_per_1m: Float!
  }

  extend type Query {
    openAiUsageDashboard(range_days: Int): OpenAiUsageDashboard!
    openAiUsageLogsTable(query: TableQueryInput): OpenAiUsageLogTablePage!
    openAiUsageLog(id: ID!): OpenAiUsageLog
    openAiTaskCatalogue: OpenAiTaskCatalogue!
  }

  extend type Mutation {
    "Create or correct one model's rate. Past rows keep the cost they were written with."
    upsertOpenAiModelPrice(input: OpenAiModelPriceInput!): OpenAiModelPrice!
  }
`;
