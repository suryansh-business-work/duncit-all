import gql from 'graphql-tag';

export const testsOverviewTypeDefs = gql`
  "One kind of testing the confidence score reads, as a 0-100 signal."
  enum TestsConfidenceSignalKey {
    UNIT_PASS_RATE
    CODE_COVERAGE
    E2E_PASS_RATE
    SCENARIO_COVERAGE
    STRESS_HEALTH
    REGRESSION_FREE
    MANUAL_PASS_RATE
  }

  "Where a confidence score falls against the bands in Tests → Settings. UNKNOWN: no signal has data yet."
  enum TestsConfidenceBand {
    HIGH
    MEDIUM
    LOW
    UNKNOWN
  }

  type TestsConfidenceSignal {
    signal: TestsConfidenceSignalKey!
    "0-100, or null when that kind of testing has no data yet (left out of the score)."
    value: Float
    weight: Int!
    "Points this signal adds to the score; null when it was left out."
    contribution: Float
  }

  type TestsCoverageMetric {
    pct: Float
    covered: Int
    total: Int
  }

  type TestsCoverage {
    lines: TestsCoverageMetric!
    statements: TestsCoverageMetric!
    functions: TestsCoverageMetric!
    branches: TestsCoverageMetric!
  }

  type TestsWorkspaceCoverage {
    workspace: String!
    lines: Float
    branches: Float
  }

  "The latest finished unit test run."
  type TestsUnitSummary {
    run_id: ID!
    status: String!
    branch: String
    finished_at: String
    tests: Int!
    passed: Int!
    failed: Int!
    skipped: Int!
    duration_ms: Float
    coverage: TestsCoverage!
    workspaces: [TestsWorkspaceCoverage!]!
  }

  "One finished unit run's total coverage, for the trend chart."
  type TestsCoveragePoint {
    run_id: ID!
    finished_at: String
    lines: Float
    branches: Float
  }

  "The latest finished E2E sweep."
  type TestsE2eSummary {
    run_id: ID!
    run_no: String!
    status: String!
    ref: String
    finished_at: String
    tests: Int!
    passed: Int!
    failed: Int!
    skipped: Int!
    suites: Int!
    suites_failed: Int!
    workflow_run_url: String
  }

  "The latest stress run on this environment that ran to an end."
  type TestsStressSummary {
    run_id: ID!
    run_no: String!
    status: String!
    terminated: Boolean!
    "The AI verdict's grade, when one was asked for."
    grade: String
    ended_at: String
  }

  "How much of the E2E flow catalogue a person has reviewed as ready to automate."
  type TestsScenarioCoverage {
    flows: Int!
    sub_flows: Int!
    looks_good: Int!
    needs_review: Int!
    not_reviewed: Int!
    pct: Float
  }

  "The latest regression report of one kind (UNIT or E2E)."
  type TestsRegressionSummary {
    report_id: ID!
    kind: String!
    status: String!
    regressed: Int!
    fixed: Int!
    new_failing: Int!
    created_at: String
  }

  type TestsCount {
    key: String!
    count: Int!
  }

  "The manual test board at a glance."
  type TestsManualSummary {
    total: Int!
    open_bugs: Int!
    "PASSED / (PASSED + FAILED), 0-100; null before anything was executed."
    pass_rate: Float
    executed_last_7_days: Int!
    by_category: [TestsCount!]!
    by_priority: [TestsCount!]!
  }

  "The Tests console's dashboard: the confidence score and every reading behind it."
  type TestsOverview {
    score: Float
    band: TestsConfidenceBand!
    signals: [TestsConfidenceSignal!]!
    unit: TestsUnitSummary
    coverage_trend: [TestsCoveragePoint!]!
    e2e: TestsE2eSummary
    stress: TestsStressSummary
    scenario: TestsScenarioCoverage!
    regressions: [TestsRegressionSummary!]!
    manual: TestsManualSummary
    generated_at: String!
  }

  type TestsSignalWeight {
    signal: TestsConfidenceSignalKey!
    weight: Int!
  }

  "How the confidence score is weighed and banded."
  type TestsSettings {
    weights: [TestsSignalWeight!]!
    high_min: Int!
    medium_min: Int!
    regression_penalty: Int!
    updated_by: String
    updated_at: String
  }

  input TestsSignalWeightInput {
    signal: TestsConfidenceSignalKey!
    weight: Int!
  }

  input UpdateTestsSettingsInput {
    weights: [TestsSignalWeightInput!]!
    high_min: Int!
    medium_min: Int!
    regression_penalty: Int!
  }

  "Which kind of testing a live run belongs to."
  enum TestsLiveRunKind {
    UNIT
    E2E
    STRESS
  }

  "A run that is queued or going right now, and what the console needs to draw how far along it is."
  type TestsLiveRun {
    kind: TestsLiveRunKind!
    run_id: ID!
    "The run's permanent id, e.g. DUN-E2E-000071."
    run_no: String!
    "QUEUED or RUNNING; a stress run can also be STOPPING."
    status: String!
    "The branch the run tests."
    ref: String!
    "What the run says it is doing now, in the runner's own words. Null when it does not say."
    stage: String
    "When a runner picked it up. Null while it is still queued."
    started_at: String
    "How long it should take, in seconds: a stress run's own plan, or the median of the last finished runs of the same shape. Null when there is nothing to go by."
    expected_seconds: Int
    "True when expected_seconds is the run's own plan, false when it is estimated from earlier runs."
    planned: Boolean!
  }

  "Every live run, and the server's clock to measure them against."
  type TestsLiveRuns {
    runs: [TestsLiveRun!]!
    "The server's time when it answered, so elapsed time does not depend on the viewer's clock."
    server_now: String!
  }

  extend type Query {
    "The confidence score, coverage, scenario coverage and the latest of every kind of run."
    testsOverview: TestsOverview!
    testsSettings: TestsSettings!
    "Every unit, E2E and stress run that is queued or going right now, with how long each should take. Read-only."
    testsLiveRuns: TestsLiveRuns!
  }

  extend type Mutation {
    updateTestsSettings(input: UpdateTestsSettingsInput!): TestsSettings!
  }
`;
