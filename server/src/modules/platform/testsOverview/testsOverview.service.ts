import { logs } from '@observability/log';
import { confidence, regressionFree, type SignalReading } from './testsOverview.score';
import { getTestsSettings } from './testsOverview.settings';
import { latestE2e, latestStress, scenarioCoverage } from './testsOverview.sources';
import { readManual, readRegressions, readUnit } from './testsOverview.readers';

const iso = (value: Date | string | null | undefined) => (value ? new Date(value).toISOString() : null);

/**
 * One source failing (a collection mid-migration, a slow aggregate) must not
 * blank the whole dashboard: that reading comes back empty, the score leaves it
 * out, and the failure is logged with the source that raised it.
 */
async function settle<T>(source: string, read: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await read();
  } catch (error) {
    logs.server.error('testsOverview', 'source', { source, error });
    return fallback;
  }
}

/** The Tests console's dashboard: every reading, and the confidence score built from them. */
export async function testsOverview() {
  const [settings, unit, e2e, stress, scenario, regressions, manual] = await Promise.all([
    getTestsSettings(),
    settle('unit', readUnit, { summary: null, trend: [], passRate: null, coverage: null }),
    settle('e2e', latestE2e, { run: null, passRate: null }),
    settle('stress', latestStress, { run: null, health: null }),
    settle('scenario', scenarioCoverage, {
      flows: 0, sub_flows: 0, looks_good: 0, needs_review: 0, not_reviewed: 0, pct: null,
    }),
    settle('regression', readRegressions, { reports: [], regressed: null }),
    settle('manual', readManual, { summary: null, passRate: null }),
  ]);

  const readings: SignalReading[] = [
    { signal: 'UNIT_PASS_RATE', value: unit.passRate },
    { signal: 'CODE_COVERAGE', value: unit.coverage },
    { signal: 'E2E_PASS_RATE', value: e2e.passRate },
    { signal: 'SCENARIO_COVERAGE', value: scenario.pct },
    { signal: 'STRESS_HEALTH', value: stress.health },
    { signal: 'REGRESSION_FREE', value: regressionFree(regressions.regressed, settings.regression_penalty) },
    { signal: 'MANUAL_PASS_RATE', value: manual.passRate },
  ];
  const result = confidence(readings, settings.weights, settings);

  return {
    ...result,
    unit: unit.summary,
    coverage_trend: unit.trend,
    e2e: e2e.run && {
      run_id: e2e.run.id,
      run_no: e2e.run.run_no,
      status: e2e.run.status,
      ref: e2e.run.ref,
      finished_at: iso(e2e.run.finished_at),
      tests: e2e.run.tests,
      passed: e2e.run.passed,
      failed: e2e.run.failed,
      skipped: e2e.run.skipped,
      suites: e2e.run.suites,
      suites_failed: e2e.run.suites_failed,
      workflow_run_url: e2e.run.workflow_run_url,
    },
    stress: stress.run && { ...stress.run, run_id: stress.run.id, ended_at: iso(stress.run.ended_at) },
    scenario,
    regressions: regressions.reports,
    manual: manual.summary,
    generated_at: new Date().toISOString(),
  };
}
