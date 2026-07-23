import gql from 'graphql-tag';

export const telemetryTypeDefs = gql`
  type TelemetrySettings {
    "Master switch for shipping logs to SigNoz (OTLP)."
    signoz_enabled: Boolean!
    "Levels written to the DB (the rest only ship to SigNoz)."
    persisted_levels: [String!]!
    "Days a persisted log/bug is kept before the daily cleanup deletes it (1..90)."
    retention_days: Int!
    updated_at: String
  }

  input UpdateTelemetrySettingsInput {
    signoz_enabled: Boolean
    persisted_levels: [String!]
    retention_days: Int
  }

  type TelemetryError {
    name: String!
    message: String!
    stack: String
  }

  type TelemetryLog {
    id: ID!
    app: String!
    portal: String
    platform: String!
    os: String
    environment: String!
    "Normalized surface key (mWeb / mobileApp:ios / portal:crm / server)."
    source: String!
    level: String!
    page: String!
    component: String!
    url: String
    host: String
    error: TelemetryError
    created_at: String!
  }

  type TelemetryLogTablePage {
    rows: [TelemetryLog!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type BugEnvCounts {
    localhost: Int!
    staging: Int!
    production: Int!
  }

  type Bug {
    id: ID!
    fingerprint: String!
    title: String!
    error_name: String!
    message: String!
    page: String!
    source: String!
    app: String!
    portal: String
    platform: String!
    os: String
    occurrence_count: Int!
    first_seen_at: String!
    last_seen_at: String!
    env_counts: BugEnvCounts!
    last_url: String
    last_host: String
    last_stack: String
    "OPEN | RESOLVED | IGNORED"
    status: String!
    resolved_at: String
    created_at: String!
  }

  type BugTablePage {
    rows: [Bug!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type TelemetryCountBucket {
    key: String!
    count: Int!
  }

  type TelemetrySeriesPoint {
    date: String!
    count: Int!
  }

  type TelemetryDashboard {
    range_days: Int!
    total_logs: Int!
    active_bugs: Int!
    by_level: [TelemetryCountBucket!]!
    by_source: [TelemetryCountBucket!]!
    by_environment: [TelemetryCountBucket!]!
    series: [TelemetrySeriesPoint!]!
    top_bugs: [Bug!]!
  }

  extend type Query {
    telemetrySettings: TelemetrySettings!
    telemetryDashboard(range_days: Int): TelemetryDashboard!
    telemetryLogsTable(query: TableQueryInput): TelemetryLogTablePage!
    bugsTable(query: TableQueryInput): BugTablePage!
    bug(id: ID!): Bug
  }

  extend type Mutation {
    updateTelemetrySettings(input: UpdateTelemetrySettingsInput!): TelemetrySettings!
    updateBugStatus(bug_id: ID!, status: String!): Bug!
  }
`;
