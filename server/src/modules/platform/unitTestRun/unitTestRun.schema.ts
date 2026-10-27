import gql from 'graphql-tag';

export const unitTestRunTypeDefs = gql`
  """
  QUEUED belongs to a run started from the Tests console: the dispatch answers
  with no run id, so the row is written first and the workflow claims it.
  A QUEUED or RUNNING row whose workflow died is closed as CANCELLED by the
  sweeper, with the reason in error_message.
  """
  enum UnitTestRunStatus {
    QUEUED
    RUNNING
    PASSED
    FAILED
    CANCELLED
  }

  "What started a unit run."
  enum UnitTestRunTrigger {
    "A push to staging or main (sonar.yml)."
    PUSH
    "The nightly coverage workflow."
    SCHEDULE
    "Run now in the Tests console."
    PORTAL
    "Started by hand from the GitHub Actions tab."
    MANUAL
  }

  "Which workflow ran the suites."
  enum UnitTestWorkflow {
    SONAR
    COVERAGE
  }

  enum UnitTestRunner {
    VITEST
    JEST
    OTHER
  }

  """
  REUSED: sonar.yml found the workspace's code unchanged since a run it had
  cached, so the suites were not run again and the results are that run's.
  ERROR: the workspace produced no results — it timed out or died first.
  """
  enum UnitTestWorkspaceStatus {
    PASSED
    FAILED
    ERROR
    REUSED
    NO_TESTS
  }

  enum UnitTestFileKind {
    VITEST
    JEST
    CYPRESS_COMPONENT
    CYPRESS_E2E
  }

  "NOT_RUN: the run never executed the file — a Cypress spec, or a suite outside its runner's config."
  enum UnitTestFileStatus {
    PASSED
    FAILED
    SKIPPED
    NOT_RUN
  }

  enum UnitTestCaseStatus {
    PASSED
    FAILED
    SKIPPED
    TODO
  }

  "Covered of total. pct is null when nothing was measured — 0 of 0 is not 0%."
  type UnitTestCoverageMetric {
    covered: Int!
    total: Int!
    pct: Float
  }

  type UnitTestCoverage {
    lines: UnitTestCoverageMetric!
    branches: UnitTestCoverageMetric!
    functions: UnitTestCoverageMetric!
    "Only workspaces whose coverage config writes json-summary measure statements."
    statements: UnitTestCoverageMetric!
  }

  type UnitTestCounts {
    "Test files executed."
    suites: Int!
    "Test files that failed, including those that died before any test ran."
    suites_failed: Int!
    tests: Int!
    passed: Int!
    failed: Int!
    skipped: Int!
    todo: Int!
    "The suites' own time, summed — not wall-clock."
    duration_ms: Int!
  }

  type UnitTestWorkspace {
    name: String!
    "Repo-relative directory."
    dir: String!
    "The matrix group or surface that ran it."
    group: String!
    runner: UnitTestRunner!
    status: UnitTestWorkspaceStatus!
    has_results: Boolean!
    exit_code: Int
    "Why there are no results. Empty otherwise."
    error: String!
    coverage: UnitTestCoverage
    suites: Int!
    suites_failed: Int!
    tests: Int!
    passed: Int!
    failed: Int!
    skipped: Int!
    todo: Int!
    duration_ms: Int!
  }

  type UnitTestRun {
    id: ID!
    "Permanent, human-readable id (DUN-UT-000001)."
    run_no: String!
    status: UnitTestRunStatus!
    trigger: UnitTestRunTrigger!
    workflow: UnitTestWorkflow!
    branch: String!
    commit_sha: String!
    github_run_id: String!
    github_run_attempt: Int!
    "Empty until the workflow claims the row."
    github_run_url: String!
    "The console account that pressed Run now. Empty for every other trigger."
    requested_by: String!
    triggered_by: String!
    started_at: String
    finished_at: String
    "Wall-clock time from claim to finish."
    duration_ms: Float
    totals: UnitTestCounts!
    coverage: UnitTestCoverage
    "coverage.lines as a percentage."
    lines_pct: Float
    workspaces: [UnitTestWorkspace!]!
    error_message: String!
    "The run's files and test cases were pruned by retention; the summary is kept."
    details_purged: Boolean!
    created_at: String
    "The run's regression report, once one has been built."
    regression_report_id: ID
  }

  type UnitTestRunTablePage {
    rows: [UnitTestRun!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type UnitTestCase {
    id: ID!
    workspace: String!
    file: String!
    "The describe blocks the test sits in, outermost first."
    ancestor_titles: [String!]!
    "The test's own description."
    title: String!
    full_name: String!
    status: UnitTestCaseStatus!
    duration_ms: Int
    "Terminal colours stripped, cut to 4,000 characters. Empty unless FAILED."
    failure_message: String!
  }

  type UnitTestCaseTablePage {
    rows: [UnitTestCase!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type UnitTestFile {
    id: ID!
    workspace: String!
    path: String!
    kind: UnitTestFileKind!
    status: UnitTestFileStatus!
    tests: Int!
    passed: Int!
    failed: Int!
    skipped: Int!
    todo: Int!
    duration_ms: Int!
    "Module specifiers the file mocks (vi.mock, jest.mock, doMock)."
    mocks: [String!]!
    "GraphQL operations or documents the file stubs."
    gql_mocks: [String!]!
    mock_count: Int!
    has_mocks: Boolean!
    "The it(...) titles of a file that was not run, read from its source."
    titles: [String!]!
    "Why the whole file failed before any test ran."
    failure_message: String!
  }

  type UnitTestFileTablePage {
    rows: [UnitTestFile!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "Which run a derived page was read from."
  type UnitTestRunRef {
    id: ID!
    run_no: String!
    finished_at: String
    branch: String!
    workflow: UnitTestWorkflow!
    status: UnitTestRunStatus!
  }

  type UnitTestInventoryPage {
    "The latest finished run with its detail intact. Null before any run has finished."
    run: UnitTestRunRef
    rows: [UnitTestFile!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type UnitTestKindCount {
    kind: UnitTestFileKind!
    files: Int!
    tests: Int!
    not_run: Int!
  }

  type UnitTestMockCount {
    name: String!
    files: Int!
  }

  type UnitTestInventorySummary {
    run: UnitTestRunRef!
    kinds: [UnitTestKindCount!]!
    files_with_mocks: Int!
    top_mocks: [UnitTestMockCount!]!
    top_gql_mocks: [UnitTestMockCount!]!
  }

  "One finished run on the trend chart."
  type UnitTestCoveragePoint {
    id: ID!
    run_no: String!
    finished_at: String
    branch: String!
    workflow: UnitTestWorkflow!
    status: UnitTestRunStatus!
    totals: UnitTestCounts!
    coverage: UnitTestCoverage
  }

  type UnitTestSettings {
    "How many finished runs keep their files and test cases."
    retention_runs: Int!
    min_retention_runs: Int!
    max_retention_runs: Int!
  }

  """
  Whether Run now can work from this server. blocked_reason is LOCAL (a local
  server — CI cannot report to it), GITHUB (no GitHub token configured) or
  LIVE (a console-started run is still going); empty when it can.
  """
  type UnitTestTriggerConfig {
    can_start: Boolean!
    blocked_reason: String!
    "The branch Run now dispatches on — the one this environment deploys from."
    branch: String!
    repository: String!
    live_run_no: String
  }

  type UnitTestRunStartResult {
    run: UnitTestRun!
    "The workflow's run list on GitHub, for this branch."
    actions_url: String!
  }

  input UpdateUnitTestSettingsInput {
    retention_runs: Int!
  }

  input ClaimUnitTestRunInput {
    workflow: UnitTestWorkflow!
    "Set when the console dispatched the run; claims its QUEUED row."
    dispatch_id: String
    github_run_id: String!
    github_run_attempt: Int
    github_run_url: String
    branch: String
    commit_sha: String
    "Only read when the claim opens a new row."
    trigger: UnitTestRunTrigger
    triggered_by: String
  }

  input UnitTestCoverageMetricInput {
    covered: Int
    total: Int
  }

  input UnitTestCoverageInput {
    lines: UnitTestCoverageMetricInput
    branches: UnitTestCoverageMetricInput
    functions: UnitTestCoverageMetricInput
    statements: UnitTestCoverageMetricInput
  }

  input UnitTestWorkspaceInput {
    name: String!
    dir: String
    group: String
    runner: UnitTestRunner!
    status: UnitTestWorkspaceStatus!
    has_results: Boolean!
    exit_code: Int
    error: String
    coverage: UnitTestCoverageInput
    suites: Int
    suites_failed: Int
    tests: Int
    passed: Int
    failed: Int
    skipped: Int
    todo: Int
    duration_ms: Float
  }

  input ReportUnitTestWorkspacesInput {
    run_id: ID!
    "At most 500."
    workspaces: [UnitTestWorkspaceInput!]!
  }

  input UnitTestFileInput {
    workspace: String!
    path: String!
    kind: UnitTestFileKind!
    status: UnitTestFileStatus!
    tests: Int
    passed: Int
    failed: Int
    skipped: Int
    todo: Int
    duration_ms: Float
    mocks: [String!]
    gql_mocks: [String!]
    titles: [String!]
    failure_message: String
  }

  input ReportUnitTestFilesInput {
    run_id: ID!
    "At most 500."
    files: [UnitTestFileInput!]!
  }

  input UnitTestCaseInput {
    workspace: String!
    file: String!
    "0 for the first test a file names this way, 1 for the second, and so on."
    ordinal: Int
    ancestor_titles: [String!]
    title: String!
    full_name: String!
    status: UnitTestCaseStatus!
    duration_ms: Float
    failure_message: String
  }

  input ReportUnitTestCasesInput {
    run_id: ID!
    "At most 500."
    cases: [UnitTestCaseInput!]!
  }

  input FinishUnitTestRunInput {
    run_id: ID!
    "Absent derives it from the workspaces: any red or broken workspace fails the run."
    status: UnitTestRunStatus
    duration_ms: Float
    error_message: String
  }

  extend type Query {
    "Every unit run, newest first. Tests/Tech managers."
    unitTestRunsTable(query: TableQueryInput): UnitTestRunTablePage!
    unitTestRun(id: ID!): UnitTestRun
    "One run's test cases. Filter on status, workspace, file; search title and full name."
    unitTestCasesTable(run_id: ID!, query: TableQueryInput): UnitTestCaseTablePage!
    "One run's test files. Filter on kind, status, workspace, has_mocks."
    unitTestFilesTable(run_id: ID!, query: TableQueryInput): UnitTestFileTablePage!
    "The test files of the latest finished run that still has its detail."
    unitTestInventory(query: TableQueryInput): UnitTestInventoryPage!
    "Files per kind and the most-mocked modules, for the same run as unitTestInventory."
    unitTestInventorySummary: UnitTestInventorySummary
    "Finished runs' totals and coverage, oldest first. limit defaults to 30, at most 200."
    unitTestCoverageTrend(limit: Int): [UnitTestCoveragePoint!]!
    unitTestSettings: UnitTestSettings!
    unitTestTriggerConfig: UnitTestTriggerConfig!
  }

  extend type Mutation {
    """
    Run the coverage workflow now, on this environment's branch. Writes a
    QUEUED row, then dispatches; the row is removed again if GitHub refuses.
    One console-started run at a time.
    """
    startUnitTestRun: UnitTestRunStartResult!
    updateUnitTestSettings(input: UpdateUnitTestSettingsInput!): UnitTestSettings!
    """
    CI only: open or find the row a workflow run attempt reports into. The same
    attempt always lands on the same row.
    """
    claimUnitTestRun(input: ClaimUnitTestRunInput!): UnitTestRun!
    "CI only: per-workspace summaries, replacing what each workspace said before. Answers how many were written."
    reportUnitTestWorkspaces(input: ReportUnitTestWorkspacesInput!): Int!
    "CI only: a chunk of the run's test files, upserted. Answers how many were written."
    reportUnitTestFiles(input: ReportUnitTestFilesInput!): Int!
    "CI only: a chunk of the run's test cases, upserted. Answers how many were written."
    reportUnitTestCases(input: ReportUnitTestCasesInput!): Int!
    "CI only: close the run and build its regression report in the background."
    finishUnitTestRun(input: FinishUnitTestRunInput!): UnitTestRun!
  }
`;
