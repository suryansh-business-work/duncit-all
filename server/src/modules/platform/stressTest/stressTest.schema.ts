import gql from 'graphql-tag';

export const stressTestTypeDefs = gql`
  """
  QUEUED: dispatched, no runner yet. RUNNING: generating load. STOPPING: a
  person or a guardrail asked it to stop and the runners are winding down.
  COMPLETED / ABORTED / FAILED are terminal — ABORTED is a deliberate stop,
  FAILED is the run itself breaking.
  """
  enum StressRunStatus {
    QUEUED
    RUNNING
    STOPPING
    COMPLETED
    ABORTED
    FAILED
  }

  type StressProfile {
    virtual_users: Int!
    browser_bots: Int!
    runners: Int!
    ramp_up_seconds: Int!
    hold_seconds: Int!
    ramp_down_seconds: Int!
    think_time_ms: Int!
    journeys: [String!]!
  }

  type StressPeaks {
    virtual_users: Float!
    browser_bots: Float!
    rps: Float!
    p95_ms: Float!
    error_rate_pct: Float!
    host_cpu_pct: Float!
    host_memory_pct: Float!
    event_loop_lag_ms: Float!
    real_users: Float!
  }

  type StressSummary {
    requests: Float!
    errors: Float!
    error_rate_pct: Float!
    avg_rps: Float!
    avg_ms: Float!
    p50_ms: Float!
    p95_ms: Float!
    p99_ms: Float!
    navigations: Float!
    navigation_errors: Float!
    avg_page_load_ms: Float!
  }

  type StressEndpoint {
    key: String!
    requests: Float!
    errors: Float!
    avg_ms: Float!
    p50_ms: Float!
    p95_ms: Float!
    p99_ms: Float!
  }

  "LOW / MEDIUM / HIGH — a bottleneck's weight, an upgrade's urgency, or the verdict's confidence."
  enum StressLevel {
    LOW
    MEDIUM
    HIGH
  }

  enum StressVerdictGrade {
    HEALTHY
    STRAINED
    OVERLOADED
    INCONCLUSIVE
  }

  type StressVerdictItem {
    title: String!
    detail: String!
    level: StressLevel!
  }

  "OpenAI's reading of a finished run. User counts are estimated REAL concurrent people, not virtual users."
  type StressVerdict {
    grade: StressVerdictGrade!
    headline: String!
    safe_concurrent_users: Int!
    "0 when the run never pushed the setup past healthy."
    breaking_point_users: Int!
    confidence: StressLevel!
    capacity_reasoning: String!
    bottlenecks: [StressVerdictItem!]!
    upgrades: [StressVerdictItem!]!
    watch_points: [String!]!
    model: String!
    generated_by: String!
    generated_at: String
  }

  "One line of a run's log."
  type StressEvent {
    at: String!
    level: String!
    source: String!
    message: String!
  }

  type StressRun {
    id: ID!
    run_no: String!
    status: StressRunStatus!
    "production or staging — a run always targets the environment it was started from."
    environment: String!
    target_mweb_url: String!
    target_graphql_url: String!
    profile: StressProfile!
    triggered_by: String!
    workflow_run_url: String!
    ref: String!
    started_at: String
    ended_at: String
    stop_requested_at: String
    stop_reason: String!
    "True when the host ran out of CPU or memory and the run was terminated."
    terminated: Boolean!
    last_report_at: String
    duration_seconds: Int
    peaks: StressPeaks!
    summary: StressSummary
    endpoints: [StressEndpoint!]!
    shards_finished: Int!
    events: [StressEvent!]!
    error_message: String!
    verdict: StressVerdict
    created_at: String
  }

  type StressRunTablePage {
    rows: [StressRun!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type StressStatusCount {
    code: String!
    count: Float!
  }

  type StressLoadSample {
    active_vus: Float!
    active_bots: Float!
    rps: Float!
    error_rate_pct: Float!
    p50_ms: Float!
    p95_ms: Float!
    p99_ms: Float!
    requests: Float!
    errors: Float!
    navigations: Float!
    page_load_ms: Float!
  }

  type StressServerSample {
    host_cpu_pct: Float!
    host_memory_pct: Float!
    load_avg_1: Float!
    event_loop_lag_ms: Float!
    heap_used_mb: Float!
    rss_mb: Float!
    rps_total: Float!
    rps_stress: Float!
    in_flight: Float!
    server_p95_ms: Float!
    status_5xx: Float!
    sockets: Float!
    real_users: Float!
    visitors: Float!
  }

  type StressContainerSample {
    name: String!
    cpu_pct: Float!
    memory_mb: Float!
    memory_pct: Float!
  }

  "One point of a run's time series, taken every five seconds while it is live."
  type StressSample {
    at: String!
    load: StressLoadSample!
    server: StressServerSample!
    containers: [StressContainerSample!]!
  }

  "What one bot is doing right now."
  type StressBot {
    bot: String!
    kind: String!
    journey: String!
    page: String!
    status: String!
    load_ms: Float!
    at: String!
  }

  "A runner's newest report. Held in memory only — read while a run is live."
  type StressShard {
    shard: Int!
    phase: String!
    elapsed_seconds: Float!
    active_vus: Float!
    active_bots: Float!
    requests: Float!
    errors: Float!
    p95_ms: Float!
    status_counts: [StressStatusCount!]!
    bots: [StressBot!]!
    received_at: String!
  }

  type ServerPulseSurface {
    surface: String!
    users: Int!
  }

  "This server's live pulse — how busy it is right now and who is behind the traffic."
  type ServerPulse {
    at: String!
    host_cpu_pct: Float!
    host_memory_pct: Float!
    load_avg_1: Float!
    event_loop_lag_ms: Float!
    event_loop_p99_ms: Float!
    heap_used_mb: Float!
    rss_mb: Float!
    rps_total: Float!
    rps_stress: Float!
    in_flight: Int!
    server_p95_ms: Float!
    status_5xx: Int!
    sockets: Int!
    "Signed-in accounts seen in the last minute (stress traffic excluded)."
    real_users: Int!
    "Anonymous visitors seen in the last minute (stress traffic excluded)."
    visitors: Int!
    users_by_surface: [ServerPulseSurface!]!
    uptime_seconds: Int!
  }

  type StressSettings {
    max_virtual_users: Int!
    max_browser_bots: Int!
    max_runners: Int!
    max_duration_minutes: Int!
    abort_error_rate_pct: Int!
    abort_p95_ms: Int!
    abort_host_cpu_pct: Int!
    abort_host_memory_pct: Int!
    abort_breach_samples: Int!
    sample_retention_days: Int!
    updated_at: String
  }

  type StressTriggerConfig {
    configured: Boolean!
    "LOCAL (a local server cannot be reached by GitHub), TARGET (a staging server whose URLs are not staging), GITHUB (not configured), or empty."
    blocked_reason: String!
    environment: String!
    requires_confirmation: Boolean!
    confirm_text: String!
    can_start: Boolean!
    live_run_no: String
    target_mweb_url: String!
    target_graphql_url: String!
    repository: String!
    ref: String!
    journeys: [String!]!
    limits: StressSettings!
  }

  type StressClaimResult {
    accepted: Boolean!
    reason: String!
    run_no: String!
    traffic_key: String
    profile: StressProfile
    target_mweb_url: String
    target_graphql_url: String
    started_at: String
  }

  type StressReportResult {
    stop: Boolean!
    reason: String!
  }

  input TriggerStressRunInput {
    virtual_users: Int!
    browser_bots: Int!
    runners: Int!
    ramp_up_seconds: Int!
    hold_seconds: Int!
    ramp_down_seconds: Int!
    think_time_ms: Int!
    journeys: [String!]!
    "Required against production: the literal confirm_text from stressTriggerConfig."
    confirm_text: String
  }

  input UpdateStressSettingsInput {
    max_virtual_users: Int!
    max_browser_bots: Int!
    max_runners: Int!
    max_duration_minutes: Int!
    abort_error_rate_pct: Int!
    abort_p95_ms: Int!
    abort_host_cpu_pct: Int!
    abort_host_memory_pct: Int!
    abort_breach_samples: Int!
    sample_retention_days: Int!
  }

  input ClaimStressRunInput {
    dispatch_id: String!
    shard: Int!
    workflow_run_id: String
    workflow_run_url: String
  }

  input StressStatusCountInput {
    code: String!
    count: Float!
  }

  input StressBotInput {
    bot: String!
    kind: String!
    journey: String
    page: String
    status: String
    load_ms: Float
    at: String
  }

  input StressEventInput {
    level: String!
    message: String!
  }

  input ReportStressRunInput {
    dispatch_id: String!
    shard: Int!
    phase: String!
    elapsed_seconds: Float!
    active_vus: Float!
    active_bots: Float!
    window_seconds: Float!
    requests: Float!
    errors: Float!
    p50_ms: Float!
    p95_ms: Float!
    p99_ms: Float!
    navigations: Float!
    page_load_ms: Float!
    status_counts: [StressStatusCountInput!]
    bots: [StressBotInput!]
    events: [StressEventInput!]
  }

  input StressSummaryInput {
    requests: Float!
    errors: Float!
    error_rate_pct: Float!
    avg_rps: Float!
    avg_ms: Float!
    p50_ms: Float!
    p95_ms: Float!
    p99_ms: Float!
    navigations: Float!
    navigation_errors: Float!
    avg_page_load_ms: Float!
  }

  input StressEndpointInput {
    key: String!
    requests: Float!
    errors: Float!
    avg_ms: Float!
    p50_ms: Float!
    p95_ms: Float!
    p99_ms: Float!
  }

  input FinishStressRunInput {
    dispatch_id: String!
    shard: Int!
    "COMPLETED, ABORTED or FAILED."
    outcome: String!
    error: String
    summary: StressSummaryInput!
    endpoints: [StressEndpointInput!]
  }

  extend type Query {
    "Every stress run, newest first (Tech > Stress Testing > Runs)."
    stressRunsTable(query: TableQueryInput): StressRunTablePage!
    stressRun(id: ID!): StressRun!
    "A run's time series, oldest first."
    stressRunSamples(id: ID!): [StressSample!]!
    "What each runner is doing right now. Empty once a run has ended."
    stressRunShards(id: ID!): [StressShard!]!
    stressTriggerConfig: StressTriggerConfig!
    stressSettings: StressSettings!
    "This server's live pulse. Tech/Super admin only."
    serverPulse: ServerPulse!
  }

  extend type Mutation {
    "Start a stress run against this server's own environment. Production needs SUPER_ADMIN and confirm_text."
    triggerStressRun(input: TriggerStressRunInput!): StressRun!
    "Ask a live run to stop."
    stopStressRun(id: ID!): StressRun!
    deleteStressRun(id: ID!): Boolean!
    "Ask OpenAI for the verdict on a finished run — capacity, bottlenecks, upgrades. Replaces an earlier verdict."
    generateStressVerdict(id: ID!): StressRun!
    updateStressSettings(input: UpdateStressSettingsInput!): StressSettings!
    "CI: a runner claims its shard of a dispatched run."
    claimStressRun(input: ClaimStressRunInput!): StressClaimResult!
    "CI: a runner's periodic report. The answer says whether to stop."
    reportStressRun(input: ReportStressRunInput!): StressReportResult!
    "CI: a runner's final report."
    finishStressRun(input: FinishStressRunInput!): Boolean!
  }
`;
