import gql from 'graphql-tag';

export const telemetryTypeDefs = gql`
  type TelemetrySettings {
    "Master switch for shipping logs to SigNoz (OTLP)."
    signoz_enabled: Boolean!
    "Levels written to the DB (the rest only ship to SigNoz)."
    persisted_levels: [String!]!
    "Days a persisted log/bug is kept before the daily cleanup deletes it (1..90)."
    retention_days: Int!
    """
    The secret inside the read-only JSON feed URLs (/telemetry/logs.json?key=…).
    Those routes carry no login, so this string is the only thing guarding every
    stack trace, address and email the platform has recorded. Rotate it the
    moment a copied URL leaves safe hands.
    """
    public_api_key: String!
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

  """
  The account behind a log. Server-resolved from the request's verified token
  and that account's record — never from anything the sender put in the body.
  """
  type TelemetryUser {
    id: ID!
    name: String
    email: String
    phone: String
    roles: [String!]!
  }

  "The machine the surface was running on, as it described itself."
  type TelemetryClient {
    app_version: String
    device_model: String
    device_os_version: String
    locale: String
    timezone: String
    screen: String
    viewport: String
    network: String
    referrer: String
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
    "Extra structured context the caller attached, JSON-stringified."
    data_json: String
    "Signed-in account id, denormalized so the table can filter on one person."
    user_id: String
    user: TelemetryUser
    client: TelemetryClient
    "Duncit device id (x-duid) and the surface's per-tab / per-launch id."
    duid: String
    session_id: String
    "Read off the request by the server, so neither can be forged by a body."
    ip: String
    user_agent: String
    created_at: String!
  }

  input TelemetryUserImportInput {
    id: String
    name: String
    email: String
    phone: String
    roles: [String!]
  }

  input TelemetryClientImportInput {
    app_version: String
    device_model: String
    device_os_version: String
    locale: String
    timezone: String
    screen: String
    viewport: String
    network: String
    referrer: String
  }

  input TelemetryErrorImportInput {
    name: String
    message: String
    stack: String
  }

  """
  One log row from an export file. Matched on the id it already carries, so
  importing the same file twice adds nothing the second time.
  """
  input TelemetryLogImportInput {
    id: String
    app: String!
    portal: String
    platform: String
    os: String
    environment: String
    source: String
    level: String!
    page: String!
    component: String!
    url: String
    host: String
    error: TelemetryErrorImportInput
    data_json: String
    user: TelemetryUserImportInput
    client: TelemetryClientImportInput
    duid: String
    session_id: String
    ip: String
    user_agent: String
    created_at: String
  }

  type TelemetryLogImportResult {
    created: Int!
    "Rows already present under the same id, so nothing was written for them."
    skipped: Int!
    """
    Rows whose own timestamp is already past the retention window. They landed,
    but the next daily cleanup deletes them again — reported so a restore that
    will not survive says so at the time, not the next morning.
    """
    expiring: Int!
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
    "The person who hit it most recently — the one worth calling back."
    last_user: TelemetryUser
    last_environment: String
    last_app_version: String
    last_user_agent: String
    last_duid: String
    last_session_id: String
    last_ip: String
    """
    The machine the latest occurrence ran on. Kept on the bug rather than left
    to the occurrence list: occurrences fall out of the retention window while
    the bug survives, and "only on Android 9, offline" must not go with them.
    """
    last_client: TelemetryClient
    """
    How many distinct accounts have hit this bug. Exact up to 50 distinct
    users, approximate beyond: the ids behind it are kept as a bounded sample,
    so past the cap a returning user whose id aged out counts twice.
    """
    affected_user_count: Int!
    "Bounded, most-recent-first sample of the ids behind that count."
    affected_user_ids: [String!]!
    "Occurrences with nobody signed in — a crash on the login screen."
    anonymous_count: Int!
    "OPEN | RESOLVED | IGNORED"
    status: String!
    resolved_at: String
    "User id of whoever marked it resolved."
    resolved_by: String
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

  input BugEnvCountsInput {
    localhost: Int
    staging: Int
    production: Int
  }

  "One bug from an export file. Matched on fingerprint: existing rows are overwritten."
  input BugImportInput {
    fingerprint: String!
    title: String!
    error_name: String
    message: String
    page: String!
    source: String!
    app: String
    portal: String
    platform: String
    os: String
    occurrence_count: Int
    first_seen_at: String
    last_seen_at: String
    env_counts: BugEnvCountsInput
    last_url: String
    last_host: String
    last_stack: String
    last_user: TelemetryUserImportInput
    last_environment: String
    last_app_version: String
    last_user_agent: String
    last_duid: String
    last_session_id: String
    affected_user_count: Int
    affected_user_ids: [String!]
    anonymous_count: Int
    status: String
  }

  type BugImportResult {
    created: Int!
    updated: Int!
  }

  extend type Query {
    telemetrySettings: TelemetrySettings!
    telemetryDashboard(range_days: Int): TelemetryDashboard!
    telemetryLogsTable(query: TableQueryInput): TelemetryLogTablePage!
    bugsTable(query: TableQueryInput): BugTablePage!
    bug(id: ID!): Bug
    "Recent persisted error logs that roll up into this bug (same fingerprint)."
    bugOccurrences(bug_id: ID!, limit: Int): [TelemetryLog!]!
    "Every bug, unpaginated, for the JSON export."
    bugsExport: [Bug!]!
    """
    One level's logs for the JSON export, newest first. Bounded (20k rows) —
    a busy day of info is six figures of rows, and an export that tried to be
    complete would time out instead of producing anything.
    """
    telemetryLogsExport(level: String, limit: Int): [TelemetryLog!]!
  }

  extend type Mutation {
    updateTelemetrySettings(input: UpdateTelemetrySettingsInput!): TelemetrySettings!
    updateBugStatus(bug_id: ID!, status: String!): Bug!
    "Delete the given bugs. Returns how many actually went."
    deleteBugs(ids: [ID!]!): Int!
    """
    Delete every bug ever rolled up — the whole collection, not a filtered view.
    Deleting a filtered set is what deleteBugs is for.
    """
    deleteAllBugs: Int!
    "Upsert bugs from an export file, matched on fingerprint."
    importBugs(bugs: [BugImportInput!]!): BugImportResult!
    "Load logs from an export file, matched on the id each row carries."
    importTelemetryLogs(logs: [TelemetryLogImportInput!]!): TelemetryLogImportResult!
    """
    Mint a new key for the public JSON feeds. Every URL copied before this
    stops working the moment it returns — which is the entire point.
    """
    rotateTelemetryApiKey: TelemetrySettings!
  }
`;
