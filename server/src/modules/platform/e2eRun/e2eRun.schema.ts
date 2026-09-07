import gql from 'graphql-tag';

export const e2eRunTypeDefs = gql`
  """
  QUEUED belongs to a run started from the Tech portal or by the nightly
  schedule: dispatching a workflow answers with no run id, so the row is written
  first and the runner claims it by dispatch_id. A QUEUED row that never becomes
  RUNNING means GitHub accepted the dispatch and never scheduled it.

  RUNNING is written when the workflow starts and replaced in place when it
  finishes. A row can sit RUNNING forever if the runner was cancelled or killed
  — nothing is left to report it — so treat an old RUNNING row as unknown.
  """
  enum E2eRunStatus {
    QUEUED
    RUNNING
    SUCCESS
    FAILED
  }

  "What started a run."
  enum E2eRunTrigger {
    "The nightly schedule in Tech > E2E Tests > Settings."
    SCHEDULE
    "Someone pressed Run tests in the Tech portal."
    PORTAL
    "Someone started the workflow by hand from the GitHub Actions tab."
    MANUAL
  }

  """
  One suite's outcome. SKIPPED is not a failure — it is what a leg the operator
  did not select reports, and telling it apart from PASSED is the difference
  between "the admin suite is green" and "nobody ran the admin suite".
  """
  enum E2eSuiteStatus {
    RUNNING
    PASSED
    FAILED
    SKIPPED
  }

  "Which part of the platform a suite drives."
  enum E2eSuiteGroup {
    PORTAL
    APP
    SHARED
  }

  enum E2eScheduleFrequency {
    DAILY
    WEEKLY
  }

  "A suite that can be asked for, as offered by the Tech portal's picker."
  type E2eSuite {
    "The matrix leg's name — this is what travels in the workflow input."
    key: String!
    label: String!
    group: E2eSuiteGroup!
  }

  """
  What one leg of the matrix did. The counts come from the JUnit report Cypress
  writes; a leg that produced none still reports its status, so a suite that died
  before Cypress started is a red row rather than a missing one.
  """
  type E2eSuiteResult {
    key: String!
    status: E2eSuiteStatus!
    specs: Int
    tests: Int
    passed: Int
    failed: Int
    skipped: Int
    duration_seconds: Int
    "Why it failed, in the runner's own words. Empty on every other status."
    error: String!
    "The GitHub job this leg ran as, so a red row leads straight to its log."
    job_url: String!
    reported_at: String
  }

  "A stage the workflow entered, stamped when it got there."
  type E2eRunStage {
    name: String!
    at: String!
  }

  "The run's arithmetic, summed from the suite results as they land."
  type E2eRunTotals {
    suites: Int!
    suites_passed: Int!
    suites_failed: Int!
    suites_skipped: Int!
    tests: Int!
    passed: Int!
    failed: Int!
    skipped: Int!
  }

  """
  One end-to-end run of the suite — made by the E2E GitHub Actions workflow,
  nightly on the configured schedule or on demand from Tech > E2E Tests. The row
  is the store of record; the GitHub run log expires, this does not.
  """
  type E2eRun {
    id: ID!
    "Permanent human-readable id (DUN-E2E-000001)."
    run_no: String!
    status: E2eRunStatus!
    trigger_source: E2eRunTrigger!
    "Who started it — the portal account, the scheduler, or the GitHub actor."
    triggered_by: String!
    "The branch the suite ran against."
    ref: String!
    commit_sha: String!
    """
    Which suites were asked for. EMPTY MEANS EVERY SUITE, the same convention
    the workflow's filter uses, so "all" is one shape rather than a list that
    has to be kept in step with the matrix.
    """
    requested_suites: [String!]!
    "What each leg did, in the order the legs reported."
    results: [E2eSuiteResult!]!
    totals: E2eRunTotals!
    workflow_run_id: String!
    workflow_run_url: String!
    """
    Correlates the row the portal wrote at dispatch with the reports the runner
    sends afterwards. Empty on a run started by hand from the Actions tab, which
    has a run id from its first report and needs no other join key.
    """
    dispatch_id: String!
    duration_seconds: Int
    "What the workflow is doing now. Empty once the run is over."
    stage: String!
    stages: [E2eRunStage!]!
    "Why the run failed. Empty on every other status."
    error_message: String!
    "Who the CI authenticated as when it reported."
    reported_by: String!
    """
    The dynamic half of this run's identity — ddMMyyyyHHmm in the platform's own
    timezone. This is how you find, weeks later, the account a run created.
    """
    identity_stamp: String!
    "The account the suite signs IN as. The same address on every run."
    login_email: String!
    "The account the suite signs UP as. Unique to this run."
    signup_email: String!
    identity_phone: String!
    "Which channel this run was announced on, when it was."
    slack_channel: String
    slack_ts: String
    "Why the Slack post did not happen, when it did not."
    slack_error: String
    created_at: String
  }

  type E2eRunTablePage {
    rows: [E2eRun!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  """
  The nightly schedule and the identity the suite runs as.

  time_of_day is wall-clock time in the platform's configured timezone, not the
  server's UTC — an operator picking 03:00 means their own quiet hour. The
  schedule lives HERE rather than in the workflow's own cron so that changing it
  is a setting rather than a commit; the workflow has no schedule trigger of its
  own, which is also why there is never a doubled run.
  """
  type E2eRunSettings {
    enabled: Boolean!
    frequency: E2eScheduleFrequency!
    "Wall-clock HH:mm in the platform's timezone."
    time_of_day: String!
    "0-6, Sunday first. Only read when frequency is WEEKLY."
    weekday: Int!
    "The branch scheduled runs are dispatched against."
    ref: String!
    "Which suites a scheduled run asks for. Empty means every one of them."
    suites: [String!]!
    "How many runs to keep. Older rows are pruned after each scheduled run."
    keep_last: Int!
    "The local part the run identities are built from, e.g. suryansh."
    email_prefix: String!
    email_domain: String!
    """
    Whether a password has been saved. The password itself is never returned —
    it goes to the runner and nowhere else.
    """
    password_set: Boolean!
    identity_phone: String!
    """
    Slack channel ID a finished run announces to. Stored on the SLACK env entry
    beside the bot token, so Environment Variables shows it too. Empty means the
    result is recorded here and announced nowhere.
    """
    slack_channel: String
    "False when no Slack bot token is configured, which is why the picker is empty."
    slack_configured: Boolean!
    """
    What the next run's addresses would look like, built with the current time
    so the operator can see the shape before saving. Empty until a prefix and a
    domain are set.
    """
    login_email_preview: String!
    signup_email_preview: String!
    last_run_at: String
    "When the schedule next fires, or null when it is off."
    next_run_at: String
    "When CI last reported any run. Null means the workflow has never reached us."
    last_reported_at: String
    "Which account the last report authenticated as."
    last_reported_by: String
  }

  "Whether the portal can start runs, and what it would run."
  type E2eTriggerConfig {
    """
    False when no GitHub token is configured. The Run tests button is disabled
    rather than hidden, so the reason is discoverable.
    """
    configured: Boolean!
    "owner/repo runs are dispatched against. Empty when not configured."
    repository: String!
    "The branch a run defaults to."
    default_ref: String!
    """
    Where a dispatched run reports back to — this server. A run always records
    itself in the portal it was started from.
    """
    reports_to: String!
  }

  input TriggerE2eRunInput {
    """
    Which suites to run. An empty list runs every one of them, which is what the
    nightly schedule does.
    """
    suites: [String!]
    "Branch or tag to run against. Defaults to the configured schedule branch."
    ref: String
  }

  "Where a dispatched run can be watched while the runner picks it up."
  type TriggerE2eRunResult {
    run: E2eRun!
    """
    The workflow's run list on GitHub, filtered to this branch. A dispatch
    answers before a run exists, so this is the only link available until the
    workflow sends its first report.
    """
    actions_url: String!
  }

  """
  The account the suite should use. Handed to the runner and to nobody else:
  the password never travels as a workflow input, because a dispatch input is
  shown in the run's own UI.
  """
  type E2eRunCredentials {
    stamp: String!
    login_email: String!
    signup_email: String!
    password: String!
    phone: String!
  }

  "What a workflow gets when it claims its run."
  type E2eRunStart {
    run: E2eRun!
    """
    Null when no identity has been configured, which is legal — every suite in
    this repo stubs its GraphQL and none of them signs in, so a missing identity
    must not stop the suite from running.
    """
    credentials: E2eRunCredentials
    "The suites this run should execute. Empty means every one of them."
    suites: [String!]!
  }

  input StartE2eRunInput {
    """
    The dispatch this run is fulfilling, when the portal or the scheduler
    started it. Claims the QUEUED row that already exists instead of opening a
    second one.
    """
    dispatch_id: String
    workflow_run_id: String
    workflow_run_url: String
    ref: String
    commit_sha: String
    "The GitHub actor who started a run by hand from the Actions tab."
    triggered_by: String
    "Which suites the workflow was asked for. Only read when opening a new row."
    suites: [String!]
  }

  input E2eSuiteResultInput {
    key: String!
    status: E2eSuiteStatus!
    specs: Int
    tests: Int
    passed: Int
    failed: Int
    skipped: Int
    duration_seconds: Int
    error: String
    job_url: String
  }

  input ReportE2eRunInput {
    dispatch_id: String
    workflow_run_id: String
    workflow_run_url: String
    """
    The run's own status. Absent leaves it alone, which is what a leg reporting
    only its own result sends — one suite finishing does not end the run.
    """
    status: E2eRunStatus
    "What the workflow is doing right now. Each distinct value is appended to the stage list."
    stage: String
    """
    One leg's outcome. Reported as each leg ends, so the table fills in while
    the run is still going rather than all at once at the end.
    """
    suite: E2eSuiteResultInput
    "Why the run failed. Ignored unless status is FAILED."
    error_message: String
    duration_seconds: Int
    ref: String
    commit_sha: String
  }

  input UpdateE2eRunSettingsInput {
    enabled: Boolean!
    frequency: E2eScheduleFrequency!
    time_of_day: String!
    weekday: Int!
    ref: String!
    suites: [String!]!
    keep_last: Int!
    email_prefix: String!
    email_domain: String!
    """
    Absent leaves the saved password alone; an empty string clears it. There is
    no way to read it back, so a form that always sent this field would wipe it
    every time it was opened and saved.
    """
    password: String
    identity_phone: String!
    """
    Slack channel ID finished runs announce to. Empty clears it. Written onto
    the SLACK env entry rather than this feature's own settings, so every Slack
    channel the platform posts to is configured in one place.
    """
    slack_channel: String
  }

  extend type Query {
    "Every e2e run, newest first (Tech portal E2E Tests table)."
    e2eRunsTable(query: TableQueryInput): E2eRunTablePage!
    e2eRunSettings: E2eRunSettings!
    "The suites a run can be asked for."
    e2eSuiteCatalogue: [E2eSuite!]!
    e2eTriggerConfig: E2eTriggerConfig!
  }

  extend type Mutation {
    """
    Start a run from the portal. Tech/Super admin only.

    Writes a QUEUED row, then dispatches the E2E workflow with the operator's
    suite selection as an input. The row is written FIRST and deleted again if
    GitHub refuses the dispatch, so a run the operator can see always
    corresponds to one GitHub accepted.
    """
    triggerE2eRun(input: TriggerE2eRunInput!): TriggerE2eRunResult!
    """
    Claim the run this workflow is fulfilling and collect the identity it should
    test with. Called once, by the workflow, before any suite runs.

    This is where the credentials are handed over rather than through a workflow
    input, because dispatch inputs are displayed on the run's own page and a
    password does not belong there.
    """
    startE2eRun(input: StartE2eRunInput!): E2eRunStart!
    """
    Record progress, one suite's result, or the run's outcome. Tech/Super admin
    only — the workflow authenticates with the same TECH_MANAGER JWT the build
    workflows use.

    Reports are keyed on dispatch_id then workflow_run_id, so every leg of the
    matrix and the final gate all write to ONE row rather than twenty.
    """
    reportE2eRun(input: ReportE2eRunInput!): E2eRun!
    updateE2eRunSettings(input: UpdateE2eRunSettingsInput!): E2eRunSettings!
    "Delete a run. Tech/Super admin only."
    deleteE2eRun(id: ID!): Boolean!
  }
`;
