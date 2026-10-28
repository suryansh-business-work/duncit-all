import { gql } from '@apollo/client';
import type {
  UnitTestCase,
  UnitTestCounts,
  UnitTestCoverage,
  UnitTestCoveragePoint,
  UnitTestFile,
  UnitTestInventorySummary,
  UnitTestRun,
  UnitTestRunRef,
  UnitTestRunStartResult,
  UnitTestTriggerConfig,
  UnitTestWorkspace,
} from '@duncit/gql-types';

/**
 * The Unit Tests pages' GraphQL. Each document asks for exactly what its page
 * renders; the row types below are the generated schema types narrowed to the
 * same selection, so a field used but not fetched is a type error.
 */

const COVERAGE_FIELDS = `
  lines { covered total pct }
  branches { covered total pct }
  functions { covered total pct }
  statements { covered total pct }
`;

const COUNT_FIELDS = 'suites suites_failed tests passed failed skipped todo duration_ms';

export const UNIT_RUNS_TABLE = gql`
  query UnitTestRunsTable($query: TableQueryInput) {
    unitTestRunsTable(query: $query) {
      rows {
        id
        run_no
        status
        trigger
        workflow
        branch
        commit_sha
        github_run_url
        triggered_by
        started_at
        duration_ms
        lines_pct
        error_message
        totals { tests passed failed skipped }
        created_at
      }
      total
      page
      page_size
    }
  }
`;

export type UnitRunRow = Pick<
  UnitTestRun,
  | 'id'
  | 'run_no'
  | 'status'
  | 'trigger'
  | 'workflow'
  | 'branch'
  | 'commit_sha'
  | 'github_run_url'
  | 'triggered_by'
  | 'started_at'
  | 'duration_ms'
  | 'lines_pct'
  | 'error_message'
  | 'created_at'
> & { totals: Pick<UnitTestCounts, 'tests' | 'passed' | 'failed' | 'skipped'> };

export const UNIT_RUN = gql`
  query UnitTestRun($id: ID!) {
    unitTestRun(id: $id) {
      id
      run_no
      status
      trigger
      workflow
      branch
      commit_sha
      github_run_url
      triggered_by
      started_at
      finished_at
      duration_ms
      error_message
      details_purged
      regression_report_id
      totals { ${COUNT_FIELDS} }
      coverage { ${COVERAGE_FIELDS} }
      workspaces {
        name
        dir
        group
        runner
        status
        error
        ${COUNT_FIELDS}
        coverage { ${COVERAGE_FIELDS} }
      }
    }
  }
`;

export type UnitWorkspaceRow = Pick<
  UnitTestWorkspace,
  'name' | 'dir' | 'group' | 'runner' | 'status' | 'error' | keyof UnitTestCounts
> & { coverage: UnitTestCoverage | null };

export type UnitRunDetail = Pick<
  UnitTestRun,
  | 'id'
  | 'run_no'
  | 'status'
  | 'trigger'
  | 'workflow'
  | 'branch'
  | 'commit_sha'
  | 'github_run_url'
  | 'triggered_by'
  | 'started_at'
  | 'finished_at'
  | 'duration_ms'
  | 'error_message'
  | 'details_purged'
  | 'regression_report_id'
> & { totals: UnitTestCounts; coverage: UnitTestCoverage | null; workspaces: UnitWorkspaceRow[] };

export const UNIT_CASES_TABLE = gql`
  query UnitTestCasesTable($run_id: ID!, $query: TableQueryInput) {
    unitTestCasesTable(run_id: $run_id, query: $query) {
      rows {
        id
        workspace
        file
        ancestor_titles
        title
        full_name
        status
        duration_ms
        failure_message
      }
      total
      page
      page_size
    }
  }
`;

export type UnitCaseRow = Pick<
  UnitTestCase,
  'id' | 'workspace' | 'file' | 'ancestor_titles' | 'title' | 'full_name' | 'status' | 'duration_ms' | 'failure_message'
>;

const FILE_ROW_FIELDS = `
  id
  workspace
  path
  kind
  status
  tests
  passed
  failed
  duration_ms
  mocks
  gql_mocks
  mock_count
  titles
  failure_message
`;

export type UnitFileRow = Pick<
  UnitTestFile,
  | 'id'
  | 'workspace'
  | 'path'
  | 'kind'
  | 'status'
  | 'tests'
  | 'passed'
  | 'failed'
  | 'duration_ms'
  | 'mocks'
  | 'gql_mocks'
  | 'mock_count'
  | 'titles'
  | 'failure_message'
>;

export const UNIT_FILES_TABLE = gql`
  query UnitTestFilesTable($run_id: ID!, $query: TableQueryInput) {
    unitTestFilesTable(run_id: $run_id, query: $query) {
      rows { ${FILE_ROW_FIELDS} }
      total
      page
      page_size
    }
  }
`;

export const UNIT_INVENTORY = gql`
  query UnitTestInventory($query: TableQueryInput) {
    unitTestInventory(query: $query) {
      rows { ${FILE_ROW_FIELDS} }
      total
      page
      page_size
    }
  }
`;

export const UNIT_INVENTORY_SUMMARY = gql`
  query UnitTestInventorySummary {
    unitTestInventorySummary {
      run { id run_no finished_at branch workflow status }
      kinds { kind files tests not_run }
      files_with_mocks
      top_mocks { name files }
      top_gql_mocks { name files }
    }
  }
`;

export type InventorySummary = Pick<
  UnitTestInventorySummary,
  'kinds' | 'files_with_mocks' | 'top_mocks' | 'top_gql_mocks'
> & { run: UnitTestRunRef };

export const UNIT_COVERAGE_TREND = gql`
  query UnitTestCoverageTrend($limit: Int) {
    unitTestCoverageTrend(limit: $limit) {
      id
      run_no
      finished_at
      coverage {
        lines { pct }
        branches { pct }
        functions { pct }
      }
    }
  }
`;

type PctOnly = { pct?: number | null };
export type TrendPoint = Pick<UnitTestCoveragePoint, 'id' | 'run_no' | 'finished_at'> & {
  coverage: { lines: PctOnly; branches: PctOnly; functions: PctOnly } | null;
};

export const UNIT_TRIGGER_CONFIG = gql`
  query UnitTestTriggerConfig {
    unitTestTriggerConfig {
      can_start
      blocked_reason
      branch
      live_run_no
    }
  }
`;

export type TriggerConfig = Pick<UnitTestTriggerConfig, 'can_start' | 'blocked_reason' | 'branch' | 'live_run_no'>;

export const START_UNIT_RUN = gql`
  mutation StartUnitTestRun {
    startUnitTestRun {
      run { id run_no }
      actions_url
    }
  }
`;

export type StartUnitRunResult = Pick<UnitTestRunStartResult, 'actions_url'> & {
  run: Pick<UnitTestRun, 'id' | 'run_no'>;
};
