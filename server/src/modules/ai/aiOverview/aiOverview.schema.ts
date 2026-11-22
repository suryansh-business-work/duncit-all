import gql from 'graphql-tag';

export const aiOverviewTypeDefs = gql`
  "One window's OpenAI usage, summed from the usage log."
  type AiOverviewTotals {
    "Every OpenAI call, including the failed ones and the ones that never left."
    calls: Int!
    "Calls that came back with an answer."
    success_calls: Int!
    "Calls OpenAI refused, timed out or answered with an error."
    failed_calls: Int!
    "Calls that never left: no API key configured, or the feature switched off."
    skipped_calls: Int!
    "Percent of calls that failed, to one decimal."
    error_rate: Float!
    "Input tokens sent."
    prompt_tokens: Int!
    "Output tokens returned."
    completion_tokens: Int!
    "Input plus output tokens."
    total_tokens: Int!
    "USD, summed from each call's cost as priced when it was made."
    cost_usd: Float!
    "Average time a call took, in milliseconds, across every call."
    avg_duration_ms: Int!
    "Distinct people whose actions made at least one call."
    active_users: Int!
    "Calls on a model with no rate card entry; cost_usd is a minimum when this is above 0."
    unpriced_calls: Int!
  }

  """
  Each headline figure against the previous window of the same length, as a
  percent change to one decimal. Null when the previous window had none, so
  there is no baseline to compare with.
  """
  type AiOverviewChange {
    "Percent change in calls."
    calls: Float
    "Percent change in cost."
    cost_usd: Float
    "Percent change in tokens."
    total_tokens: Float
    "Percent change in active users."
    active_users: Float
    "Percent change in average response time."
    avg_duration_ms: Float
    "Change of the error rate in percentage points (current minus previous)."
    error_rate_points: Float
  }

  "One day of AI calls in the admin's time zone. Days with no calls are zeros, never missing."
  type AiOverviewDay {
    "yyyy-MM-dd"
    date: String!
    "Every call that day."
    calls: Int!
    "Calls answered that day."
    success_calls: Int!
    "Calls that failed that day."
    failed_calls: Int!
    "Calls that never left that day."
    skipped_calls: Int!
    "Input plus output tokens that day."
    total_tokens: Int!
    "USD spent that day."
    cost_usd: Float!
    "Average call time that day, in milliseconds."
    avg_duration_ms: Int!
    "Distinct people whose actions made a call that day."
    active_users: Int!
  }

  "One OpenAI model's use and performance over the window."
  type AiOverviewModel {
    "Model name as recorded on the call; blank for calls that never reached a model."
    model: String!
    "Calls made on this model."
    calls: Int!
    "Calls on this model that failed."
    failed_calls: Int!
    "Percent of this model's calls that failed, to one decimal."
    failure_rate: Float!
    "Input plus output tokens on this model."
    total_tokens: Int!
    "USD spent on this model."
    cost_usd: Float!
    "Average call time on this model, in milliseconds."
    avg_duration_ms: Int!
  }

  "One AI feature (OpenAI task catalogue entry) that was used in the window."
  type AiOverviewFeature {
    "Catalogue key, e.g. moderation.pod; AI Features opens the feature by it."
    key: String!
    "Feature name."
    label: String!
    "Owning area — Moderation, CRM, Admin Tools …"
    module: String!
    "Calls this feature made."
    calls: Int!
    "Calls this feature made that failed."
    failed_calls: Int!
    "Input plus output tokens this feature used."
    total_tokens: Int!
    "USD this feature cost."
    cost_usd: Float!
    "Average call time of this feature, in milliseconds."
    avg_duration_ms: Int!
  }

  "One owning area's AI features that were used in the window, summed."
  type AiOverviewModule {
    "Owning area — Moderation, CRM, Admin Tools …"
    module: String!
    "Calls the area's features made."
    calls: Int!
    "Calls the area's features made that failed."
    failed_calls: Int!
    "Input plus output tokens the area's features used."
    total_tokens: Int!
    "USD the area's features cost."
    cost_usd: Float!
    "Average call time across the area's calls, in milliseconds."
    avg_duration_ms: Int!
  }

  "A person whose actions made AI calls, named at read time. Only the name is exposed."
  type AiOverviewUser {
    "Account id."
    user_id: ID!
    "Current display name; blank for a deleted account."
    name: String!
    "Calls made on this person's behalf."
    calls: Int!
    "Input plus output tokens of those calls."
    total_tokens: Int!
    "USD those calls cost."
    cost_usd: Float!
  }

  "How many rows have one value of a status, risk or channel."
  type AiOverviewCount {
    "The value as stored, e.g. HIGH, FAILED, WHATSAPP."
    key: String!
    "How many rows have it."
    count: Int!
  }

  "AI Monitoring image checks made in the window."
  type AiOverviewMonitoring {
    "Images checked."
    scanned: Int!
    "Images passed to a person for review."
    flagged: Int!
    "Images blocked."
    blocked: Int!
    "Checks that failed before reaching a verdict."
    failed: Int!
    "Checks by AI risk verdict, every verdict listed."
    by_risk: [AiOverviewCount!]!
  }

  "Live automation runs started in the window, and the flows switched on."
  type AiOverviewAutomation {
    "Live runs started (test runs excluded)."
    runs: Int!
    "Runs that finished every step."
    completed: Int!
    "Runs that stopped on an error."
    failed: Int!
    "Runs still going: mid-step, or waiting on a reply or a delay."
    in_progress: Int!
    "Runs by state, every state listed."
    by_status: [AiOverviewCount!]!
    "Runs by channel, every channel listed."
    by_channel: [AiOverviewCount!]!
    "Flows switched on (ACTIVE)."
    active_flows: Int!
    "Every flow, whatever its state."
    total_flows: Int!
  }

  "One recent OpenAI call. Never the prompt or the answer — open the log for those."
  type AiOverviewActivity {
    "Usage log id; openAiUsageLog opens the full row."
    id: ID!
    "Catalogue task key."
    task: String!
    "Feature name the call was made for."
    task_label: String!
    "Owning area."
    module: String!
    "Model the call used; blank when it never left."
    model: String!
    "SUCCESS, FAILED or SKIPPED."
    status: String!
    "Input plus output tokens."
    total_tokens: Int!
    "USD the call cost."
    cost_usd: Float!
    "How long the call took, in milliseconds."
    duration_ms: Int!
    "Why a failed or skipped call produced nothing, trimmed to one line."
    error_message: String!
    "ISO timestamp of the call."
    created_at: String!
  }

  """
  The AI portal Dashboard over one window: OpenAI calls, tokens, cost, speed and
  failures against the previous window of the same length, daily trends, the
  models, features and areas behind them, the most active people, AI Monitoring
  image checks, automation runs, feature switches and the latest calls.
  """
  type AiOverviewDashboard {
    "Days in the window (default 30, at most 90)."
    range_days: Int!
    "ISO start of the window."
    from: String!
    "ISO end of the window (when it was read)."
    to: String!
    "ISO time this answer was computed."
    generated_at: String!
    "This window's totals."
    totals: AiOverviewTotals!
    "The previous window of the same length, for comparison."
    previous: AiOverviewTotals!
    "Change of each headline figure against the previous window."
    change: AiOverviewChange!
    "One entry per day of the window, zero-filled."
    series: [AiOverviewDay!]!
    "Models by calls, busiest first (top 20)."
    by_model: [AiOverviewModel!]!
    "AI features used in the window."
    by_feature: [AiOverviewFeature!]!
    "Owning areas of the features used, most expensive first."
    by_module: [AiOverviewModule!]!
    "AI features in the catalogue."
    features_total: Int!
    "AI features switched on."
    features_enabled: Int!
    "The ten people whose actions made the most AI calls."
    top_users: [AiOverviewUser!]!
    "AI Monitoring image checks."
    monitoring: AiOverviewMonitoring!
    "Automation runs and flows."
    automation: AiOverviewAutomation!
    "The ten latest OpenAI calls, newest first."
    recent: [AiOverviewActivity!]!
  }

  extend type Query {
    "The AI portal Dashboard: usage, cost, performance, users, monitoring and automation over the last range_days days (default 30, max 90). SUPER_ADMIN or AI_MANAGER."
    aiOverviewDashboard(range_days: Int): AiOverviewDashboard!
  }
`;
