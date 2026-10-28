import type {
  ManualTestCaseType,
  ManualTestCategory,
  ManualTestEnvironment,
  ManualTestPriority,
} from '@duncit/gql-types';
import type { StatusColorMap } from '@duncit/ui';

/**
 * The board's vocabulary and its copy. Every key is written out as a literal
 * here, once, so the translation gate sees each one rendered.
 */

/** The same bounds the server's manualTest validator enforces. */
export const MANUAL_LIMITS = {
  titleMin: 3,
  titleMax: 200,
  richTextMax: 50_000,
  stepsMax: 100,
  stepTextMax: 1000,
  labelsMax: 20,
  labelMax: 40,
  columnNameMax: 40,
  wipMax: 999,
  estimateMax: 14_400,
  commentMax: 20_000,
  searchMax: 120,
} as const;

// Tuples, so a Zod enum takes them as they are and keeps the literal types.
export const CASE_TYPES = [
  'TEST_CASE',
  'BUG',
  'REGRESSION',
  'EXPLORATORY',
  'TASK',
] as const satisfies readonly ManualTestCaseType[];
export const PRIORITIES = ['HIGHEST', 'HIGH', 'MEDIUM', 'LOW', 'LOWEST'] as const satisfies readonly ManualTestPriority[];
export const CATEGORIES = [
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'PASSED',
  'FAILED',
  'BLOCKED',
] as const satisfies readonly ManualTestCategory[];
export const ENVIRONMENTS = ['STAGING', 'PRODUCTION'] as const satisfies readonly ManualTestEnvironment[];

export const TYPE_KEYS: Readonly<Record<ManualTestCaseType, string>> = {
  TEST_CASE: 'testsManual.type.testCase',
  BUG: 'testsManual.type.bug',
  REGRESSION: 'testsManual.type.regression',
  EXPLORATORY: 'testsManual.type.exploratory',
  TASK: 'testsManual.type.task',
};

export const PRIORITY_KEYS: Readonly<Record<ManualTestPriority, string>> = {
  HIGHEST: 'testsManual.priority.highest',
  HIGH: 'testsManual.priority.high',
  MEDIUM: 'testsManual.priority.medium',
  LOW: 'testsManual.priority.low',
  LOWEST: 'testsManual.priority.lowest',
};

export const CATEGORY_KEYS: Readonly<Record<ManualTestCategory, string>> = {
  TODO: 'testsManual.category.todo',
  IN_PROGRESS: 'testsManual.category.inProgress',
  IN_REVIEW: 'testsManual.category.inReview',
  PASSED: 'testsManual.category.passed',
  FAILED: 'testsManual.category.failed',
  BLOCKED: 'testsManual.category.blocked',
};

export const ENVIRONMENT_KEYS: Readonly<Record<ManualTestEnvironment, string>> = {
  STAGING: 'testsManual.environment.staging',
  PRODUCTION: 'testsManual.environment.production',
};

/** A column's chip tone comes from what it means, never from its name. */
export const CATEGORY_TONES: StatusColorMap = {
  TODO: 'default',
  IN_PROGRESS: 'info',
  IN_REVIEW: 'secondary',
  PASSED: 'success',
  FAILED: 'error',
  BLOCKED: 'warning',
};

/** Field names as the Activity tab says them. */
export const FIELD_KEYS: Readonly<Record<string, string>> = {
  title: 'testsManual.field.title',
  type: 'testsManual.field.type',
  priority: 'testsManual.field.priority',
  column_id: 'testsManual.field.status',
  assignee_id: 'testsManual.field.assignee',
  reporter_id: 'testsManual.field.reporter',
  labels: 'testsManual.field.labels',
  surface: 'testsManual.field.surface',
  environment: 'testsManual.field.environment',
  description: 'testsManual.field.description',
  preconditions: 'testsManual.field.preconditions',
  expected_result: 'testsManual.field.expectedResult',
  actual_result: 'testsManual.field.actualResult',
  steps: 'testsManual.field.steps',
  e2e_flow_id: 'testsManual.field.e2eFlow',
  e2e_sub_flow_id: 'testsManual.field.e2eSubFlow',
  due_date: 'testsManual.field.dueDate',
  estimate_minutes: 'testsManual.field.estimate',
};
