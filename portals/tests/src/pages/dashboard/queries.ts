import { gql } from '@apollo/client';
import type { TestsOverview } from '@duncit/gql-types';

const COVERAGE_METRIC = `pct covered total`;

/** Every reading the dashboard shows, in one request. */
export const TESTS_OVERVIEW = gql`
  query TestsOverview {
    testsOverview {
      score
      band
      signals { signal value weight contribution }
      unit {
        run_id status branch finished_at tests passed failed skipped duration_ms
        coverage {
          lines { ${COVERAGE_METRIC} }
          statements { ${COVERAGE_METRIC} }
          functions { ${COVERAGE_METRIC} }
          branches { ${COVERAGE_METRIC} }
        }
        workspaces { workspace lines branches }
      }
      coverage_trend { run_id finished_at lines branches }
      e2e { run_id run_no status ref finished_at tests passed failed skipped suites suites_failed workflow_run_url }
      stress { run_id run_no status terminated grade ended_at }
      scenario { flows sub_flows looks_good needs_review not_reviewed pct }
      regressions { report_id kind status regressed fixed new_failing created_at }
      manual {
        total open_bugs pass_rate executed_last_7_days
        by_category { key count }
        by_priority { key count }
      }
      generated_at
    }
  }
`;

/** The document selects every field of the type, so the generated type is exact. */
export interface TestsOverviewData {
  testsOverview: TestsOverview;
}
