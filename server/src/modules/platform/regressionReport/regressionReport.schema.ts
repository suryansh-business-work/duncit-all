import gql from 'graphql-tag';

export const regressionReportTypeDefs = gql`
  "What a regression report compares: unit runs test by test, E2E runs suite by suite."
  enum RegressionKind {
    UNIT
    E2E
  }

  "REGRESSED when a test (or suite) that passed now fails, or a new one fails."
  enum RegressionStatus {
    CLEAN
    REGRESSED
  }

  enum RegressionBucket {
    "Passed in the previous run, fails now."
    REGRESSED
    "Failed in the previous run, passes now."
    FIXED
    "Failed in both."
    STILL_FAILING
    "Did not exist in the previous run, and fails."
    NEW_FAILING
    "Did not exist in the previous run, and does not fail."
    NEW_TESTS
    "Existed in the previous run, and is gone."
    REMOVED_TESTS
  }

  "How many tests (or suites, for E2E) landed in each bucket. Always exact."
  type RegressionCounts {
    regressed: Int!
    fixed: Int!
    still_failing: Int!
    new_failing: Int!
    new_tests: Int!
    removed_tests: Int!
  }

  "Coverage percentages before and after. Null where a side measured nothing."
  type RegressionCoverageDelta {
    "A workspace name, or empty for the run's total."
    workspace: String!
    lines_before: Float
    lines_after: Float
    lines_delta: Float
    branches_before: Float
    branches_after: Float
    branches_delta: Float
    functions_before: Float
    functions_after: Float
    functions_delta: Float
    statements_before: Float
    statements_after: Float
    statements_delta: Float
  }

  "One E2E suite in both runs. A status that is empty means the suite was not in that run."
  type RegressionSuiteDelta {
    suite: String!
    status_before: String!
    status_after: String!
    changed: Boolean!
    passed_before: Int
    passed_after: Int
    passed_delta: Int
    failed_before: Int
    failed_after: Int
    failed_delta: Int
    tests_before: Int
    tests_after: Int
  }

  type RegressionReport {
    id: ID!
    kind: RegressionKind!
    status: RegressionStatus!
    "The run this report is about."
    run_id: ID!
    run_no: String!
    "The run it was compared with: the previous finished run on the same branch."
    base_run_id: ID
    base_run_no: String!
    branch: String!
    "SONAR or COVERAGE for a unit report; empty for E2E."
    workflow: String!
    counts: RegressionCounts!
    "Items kept for the bucket tables. Every regression is kept; the other buckets are capped."
    items_kept: Int!
    "True when a bucket held more items than it keeps."
    truncated: Boolean!
    "True once retention removed the item lists; the counts remain."
    items_purged: Boolean!
    "Workspaces left out because one of the runs has no results for them."
    skipped_workspaces: [String!]!
    coverage_total: RegressionCoverageDelta
    coverage_workspaces: [RegressionCoverageDelta!]!
    "E2E only: every suite in either run."
    suites: [RegressionSuiteDelta!]!
    created_at: String!
  }

  type RegressionReportTablePage {
    rows: [RegressionReport!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "One unit test in a bucket."
  type RegressionItem {
    id: ID!
    bucket: RegressionBucket!
    workspace: String!
    file: String!
    full_name: String!
    title: String!
    "The failure in the newer run. Empty for a passing or removed test."
    failure_message: String!
  }

  type RegressionItemTablePage {
    rows: [RegressionItem!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  extend type Query {
    "Every regression report, newest first. Filter on kind, status, branch. Tests/Tech managers."
    regressionReportsTable(query: TableQueryInput): RegressionReportTablePage!
    regressionReport(id: ID!): RegressionReport
    "A unit report's tests, one bucket at a time (filter on bucket)."
    regressionReportItemsTable(report_id: ID!, query: TableQueryInput): RegressionItemTablePage!
  }
`;
