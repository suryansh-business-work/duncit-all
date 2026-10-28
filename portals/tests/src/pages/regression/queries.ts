import { gql } from '@apollo/client';
import type {
  RegressionCounts,
  RegressionCoverageDelta,
  RegressionItem,
  RegressionReport,
  RegressionSuiteDelta,
} from '@duncit/gql-types';

/** The regression pages' GraphQL, with row types narrowed to each selection. */

const COUNT_FIELDS = 'regressed fixed still_failing new_failing new_tests removed_tests';

export const REGRESSION_REPORTS_TABLE = gql`
  query RegressionReportsTable($query: TableQueryInput) {
    regressionReportsTable(query: $query) {
      rows {
        id
        kind
        status
        run_no
        base_run_no
        branch
        workflow
        created_at
        counts { ${COUNT_FIELDS} }
        coverage_total { lines_delta }
      }
      total
      page
      page_size
    }
  }
`;

export type RegressionReportRow = Pick<
  RegressionReport,
  'id' | 'kind' | 'status' | 'run_no' | 'base_run_no' | 'branch' | 'workflow' | 'created_at'
> & { counts: RegressionCounts; coverage_total: Pick<RegressionCoverageDelta, 'lines_delta'> | null };

const DELTA_FIELDS = `
  workspace
  lines_before lines_after lines_delta
  branches_before branches_after branches_delta
  functions_before functions_after functions_delta
  statements_before statements_after statements_delta
`;

export const REGRESSION_REPORT = gql`
  query RegressionReport($id: ID!) {
    regressionReport(id: $id) {
      id
      kind
      status
      run_id
      run_no
      base_run_id
      base_run_no
      branch
      workflow
      created_at
      items_kept
      truncated
      items_purged
      skipped_workspaces
      counts { ${COUNT_FIELDS} }
      coverage_total { ${DELTA_FIELDS} }
      coverage_workspaces { ${DELTA_FIELDS} }
      suites {
        suite
        status_before
        status_after
        changed
        passed_before
        passed_after
        passed_delta
        failed_before
        failed_after
        failed_delta
        tests_before
        tests_after
      }
    }
  }
`;

export type RegressionReportDetail = Pick<
  RegressionReport,
  | 'id'
  | 'kind'
  | 'status'
  | 'run_id'
  | 'run_no'
  | 'base_run_id'
  | 'base_run_no'
  | 'branch'
  | 'workflow'
  | 'created_at'
  | 'items_kept'
  | 'truncated'
  | 'items_purged'
  | 'skipped_workspaces'
> & {
  counts: RegressionCounts;
  coverage_total: RegressionCoverageDelta | null;
  coverage_workspaces: RegressionCoverageDelta[];
  suites: RegressionSuiteDelta[];
};

export const REGRESSION_ITEMS_TABLE = gql`
  query RegressionReportItemsTable($report_id: ID!, $query: TableQueryInput) {
    regressionReportItemsTable(report_id: $report_id, query: $query) {
      rows {
        id
        bucket
        workspace
        file
        full_name
        title
        failure_message
      }
      total
      page
      page_size
    }
  }
`;

export type RegressionItemRow = Pick<
  RegressionItem,
  'id' | 'bucket' | 'workspace' | 'file' | 'full_name' | 'title' | 'failure_message'
>;
