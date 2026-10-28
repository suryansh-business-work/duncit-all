import type { TestsConfidenceBand, TestsConfidenceSignalKey } from '@duncit/gql-types';
import type { StatusColorMap } from '@duncit/ui';

/*
 * Every label key is written out as a literal, once, so the translation gate
 * sees each one rendered and a renamed enum value fails loudly here.
 */

export const BAND_KEYS: Readonly<Record<TestsConfidenceBand, string>> = {
  HIGH: 'tests.dashboard.band.HIGH',
  MEDIUM: 'tests.dashboard.band.MEDIUM',
  LOW: 'tests.dashboard.band.LOW',
  UNKNOWN: 'tests.dashboard.band.UNKNOWN',
};

export const SIGNAL_KEYS: Readonly<Record<TestsConfidenceSignalKey, string>> = {
  UNIT_PASS_RATE: 'tests.dashboard.signal.UNIT_PASS_RATE',
  CODE_COVERAGE: 'tests.dashboard.signal.CODE_COVERAGE',
  E2E_PASS_RATE: 'tests.dashboard.signal.E2E_PASS_RATE',
  SCENARIO_COVERAGE: 'tests.dashboard.signal.SCENARIO_COVERAGE',
  STRESS_HEALTH: 'tests.dashboard.signal.STRESS_HEALTH',
  REGRESSION_FREE: 'tests.dashboard.signal.REGRESSION_FREE',
  MANUAL_PASS_RATE: 'tests.dashboard.signal.MANUAL_PASS_RATE',
};

export const COVERAGE_METRIC_KEYS = {
  lines: 'tests.dashboard.coverage.lines',
  statements: 'tests.dashboard.coverage.statements',
  functions: 'tests.dashboard.coverage.functions',
  branches: 'tests.dashboard.coverage.branches',
} as const;

/** Run and report outcomes are plain strings on the wire (each kind has its own enum). */
const OUTCOME_KEYS: ReadonlyMap<string, string> = new Map([
  ['PASSED', 'tests.dashboard.status.PASSED'],
  ['SUCCESS', 'tests.dashboard.status.SUCCESS'],
  ['FAILED', 'tests.dashboard.status.FAILED'],
  ['CANCELLED', 'tests.dashboard.status.CANCELLED'],
  ['COMPLETED', 'tests.dashboard.status.COMPLETED'],
  ['ABORTED', 'tests.dashboard.status.ABORTED'],
  ['CLEAN', 'tests.dashboard.status.CLEAN'],
  ['REGRESSED', 'tests.dashboard.status.REGRESSED'],
]);

const REGRESSION_KIND_KEYS: ReadonlyMap<string, string> = new Map([
  ['UNIT', 'tests.dashboard.regression.kind.UNIT'],
  ['E2E', 'tests.dashboard.regression.kind.E2E'],
]);

/** The key for an outcome; an outcome the dashboard has no word for shows as itself. */
export const outcomeKey = (status: string) => OUTCOME_KEYS.get(status) ?? status;
export const regressionKindKey = (kind: string) => REGRESSION_KIND_KEYS.get(kind) ?? kind;

/** The confidence band as a chip colour; the chip always carries its label too. */
export const BAND_COLORS: StatusColorMap = {
  HIGH: 'success',
  MEDIUM: 'warning',
  LOW: 'error',
  UNKNOWN: 'default',
};

/** Run and report outcomes across unit, E2E, stress and regression. */
export const OUTCOME_COLORS: StatusColorMap = {
  PASSED: 'success',
  SUCCESS: 'success',
  COMPLETED: 'success',
  CLEAN: 'success',
  FAILED: 'error',
  REGRESSED: 'error',
  ABORTED: 'warning',
  CANCELLED: 'default',
};

/** `part / whole` as 0-100, or null when there is nothing to divide. */
export const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : null);

/** A 0-100 reading as text, or null when there is none. */
export const pctText = (value: number | null | undefined) =>
  value === null || value === undefined ? null : `${Math.round(value * 10) / 10}`;
