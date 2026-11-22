export const appInsightsTypeDefs = /* GraphQL */ `
  "The app stores App Insights reads (Analytics > App Insights)."
  enum AppInsightStore {
    "Google Play Console — bulk reports in the developer account's Cloud Storage bucket."
    GOOGLE_PLAY
    "App Store Connect — Analytics Reports and customer reviews."
    APP_STORE
  }

  "How one store's integration stands."
  enum AppInsightStatus {
    "The last sync succeeded."
    CONNECTED
    "Credentials are missing or unusable — set them in Tech > Environment Variables."
    DISCONNECTED
    "A sync is running."
    SYNCING
    "The last sync failed; last_error says why."
    ERROR
    "Configured, but no sync has finished yet."
    PENDING
  }

  "What a history row is split by."
  enum AppInsightDimension {
    TOTAL
    COUNTRY
    VERSION
  }

  enum AppInsightSyncTrigger {
    SCHEDULE
    MANUAL
  }

  enum AppInsightSyncOutcome {
    RUNNING
    SUCCESS
    FAILED
  }

  "One store's integration. Never carries a credential."
  type AppInsightIntegration {
    store: AppInsightStore!
    configured: Boolean!
    "The Environment Variables fields still blank (service_account_json, package_name, reports_bucket, issuer_id, key_id, private_key, bundle_id)."
    missing: [String!]!
    "Why a value that is set cannot be used, e.g. a key that is not JSON."
    problem: String
    status: AppInsightStatus!
    last_success_at: String
    last_attempt_at: String
    last_error: String
    "The first and last store day the history holds (yyyy-MM-dd)."
    first_day: String
    last_day: String
    "Tech > Environment Variables, opened on this store's entry."
    setup_url: String
  }

  "One sync of one store."
  type AppInsightSyncLog {
    id: ID!
    store: AppInsightStore!
    trigger: AppInsightSyncTrigger!
    outcome: AppInsightSyncOutcome!
    started_at: String!
    finished_at: String
    duration_ms: Float
    "Report files or instances (and review pages) read this time."
    sources_read: Int!
    "Already read and unchanged, so skipped."
    sources_skipped: Int!
    rows_written: Int!
    api_calls: Int!
    retries: Int!
    message: String!
  }

  "One store day, for one slice. A metric the store does not report is null."
  type AppInsightDailyRow {
    id: ID!
    store: AppInsightStore!
    day: String!
    dimension: AppInsightDimension!
    "Empty for TOTAL; a country code; an app version (version code on Google Play)."
    key: String!
    "Google Play: users installing on their first device."
    new_installs: Float
    device_installs: Float
    uninstalls: Float
    user_uninstalls: Float
    "Google Play: device upgrades. App Store: update downloads."
    updates: Float
    "Google Play: devices active in the last 30 days. App Store: devices with a session that day."
    active_devices: Float
    total_installs: Float
    install_events: Float
    uninstall_events: Float
    update_events: Float
    crashes: Float
    anrs: Float
    rating_daily_avg: Float
    rating_total_avg: Float
    "App Store: first-time downloads."
    first_downloads: Float
    redownloads: Float
    installs: Float
    deletions: Float
    sessions: Float
    reviews_1: Float
    reviews_2: Float
    reviews_3: Float
    reviews_4: Float
    reviews_5: Float
  }

  extend type Query {
    "Both stores' integrations: configured, status, last sync and the days held."
    appInsightsStatus: [AppInsightIntegration!]!
    "Recent syncs, newest first (at most 200)."
    appInsightsSyncLogs(store: AppInsightStore, limit: Int): [AppInsightSyncLog!]!
    "The stored history for one store over a range of at most a year (yyyy-MM-dd, inclusive)."
    appInsightsDaily(
      store: AppInsightStore!
      from: String!
      to: String!
      dimension: AppInsightDimension
    ): [AppInsightDailyRow!]!
  }

  extend type Mutation {
    "Sync now: starts a sync of the given store, or both, in the background, and returns the integrations."
    syncAppInsights(store: AppInsightStore): [AppInsightIntegration!]!
  }
`;
