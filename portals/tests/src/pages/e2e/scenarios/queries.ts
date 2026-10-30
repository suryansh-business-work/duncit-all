import { gql } from '@apollo/client';
import type { E2eRunStatus, E2eRunTotals } from '../queries';

/** How a scenario ended. SKIPPED never ran — a failed hook blocked it. */
export type E2eScenarioState = 'PASSED' | 'FAILED' | 'PENDING' | 'SKIPPED';

export interface E2eScenarioRow {
  id: string;
  suite: string;
  project: string;
  spec: string;
  title_path: string[];
  title: string;
  state: E2eScenarioState;
  duration_ms: number | null;
  error: string;
}

/** Just what the scenario page's header shows. */
export interface E2eRunHead {
  id: string;
  run_no: string;
  status: E2eRunStatus;
  ref: string;
  totals: E2eRunTotals;
}

export const E2E_RUN_HEAD = gql`
  query E2eRunHead($id: ID!) {
    e2eRun(id: $id) {
      id
      run_no
      status
      ref
      totals {
        suites
        suites_passed
        suites_failed
        suites_skipped
        tests
        passed
        failed
        skipped
      }
    }
  }
`;

export const E2E_SCENARIOS_TABLE = gql`
  query E2eScenarioResultsTable($run_id: ID!, $query: TableQueryInput) {
    e2eScenarioResultsTable(run_id: $run_id, query: $query) {
      rows {
        id
        suite
        project
        spec
        title_path
        title
        state
        duration_ms
        error
      }
      total
      page
      page_size
    }
  }
`;
