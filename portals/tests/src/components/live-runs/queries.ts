import { gql } from '@apollo/client';
import type { TestsLiveRun, TestsLiveRunKind, TestsLiveRuns } from '@duncit/gql-types';

/** Every unit, E2E and stress run that is queued or going, and the server's clock. */
export const TESTS_LIVE_RUNS = gql`
  query TestsLiveRuns {
    testsLiveRuns {
      runs { kind run_id run_no status ref stage started_at expected_seconds planned }
      server_now
    }
  }
`;

/** The document selects every field of the type, so the generated type is exact. */
export interface TestsLiveRunsData {
  testsLiveRuns: TestsLiveRuns;
}

export type { TestsLiveRun, TestsLiveRunKind };

/** Where each kind of run opens. E2E runs have no page of their own; their table is the way in. */
export const RUN_PATH: Readonly<Record<TestsLiveRunKind, (runId: string) => string>> = {
  UNIT: (runId) => `/unit/runs/${runId}`,
  E2E: () => '/e2e/runs',
  STRESS: (runId) => `/stress-testing/runs/${runId}`,
};

/*
 * Every label key written out as a literal, once, so the translation gate sees
 * each one rendered and a renamed enum value fails loudly here.
 */
export const KIND_KEYS: Readonly<Record<TestsLiveRunKind, string>> = {
  UNIT: 'tests.live.kind.UNIT',
  E2E: 'tests.live.kind.E2E',
  STRESS: 'tests.live.kind.STRESS',
};
