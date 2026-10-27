import { TESTS_MANAGER } from '@middleware/rbac';

/**
 * The vocabulary of the Tests console's Manual Testing board.
 *
 * The Tests portal's forms enforce the same bounds (the server imports no
 * workspace package, so the client keeps its own copy) — kept equal so a save
 * never fails here first.
 */

/**
 * What a board column MEANS, whatever it is called. A column's category drives
 * the dashboard numbers (pass rate, executed this week) and the tone of its
 * chip, so renaming "Passed" to "Verified" never breaks a statistic.
 */
export const MANUAL_TEST_CATEGORIES = [
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'PASSED',
  'FAILED',
  'BLOCKED',
] as const;
export type ManualTestCategory = (typeof MANUAL_TEST_CATEGORIES)[number];

export const MANUAL_TEST_CASE_TYPES = ['TEST_CASE', 'BUG', 'REGRESSION', 'EXPLORATORY', 'TASK'] as const;
export type ManualTestCaseType = (typeof MANUAL_TEST_CASE_TYPES)[number];

export const MANUAL_TEST_PRIORITIES = ['LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST'] as const;
export type ManualTestPriority = (typeof MANUAL_TEST_PRIORITIES)[number];

export const MANUAL_TEST_ENVIRONMENTS = ['STAGING', 'PRODUCTION'] as const;
export type ManualTestEnvironment = (typeof MANUAL_TEST_ENVIRONMENTS)[number];

/**
 * A priority as a number, stored beside the name: sorting the names would put
 * HIGH before HIGHEST before LOW, which is no order anybody reads a list in.
 */
export const PRIORITY_WEIGHT: Readonly<Record<ManualTestPriority, number>> = {
  LOWEST: 1,
  LOW: 2,
  MEDIUM: 3,
  HIGH: 4,
  HIGHEST: 5,
};

/** Landing in one of these is what "executed" means for the dashboard. */
export const EXECUTED_CATEGORIES: ReadonlySet<ManualTestCategory> = new Set(['PASSED', 'FAILED']);

/** Every case key reads `QA-<n>`. */
export const MANUAL_CASE_KEY_PREFIX = 'QA';

/** The counter row (in the shared entity id counter) that numbers cases. */
export const MANUAL_CASE_COUNTER_KEY = 'entity_no_manual_test_case';

export const MANUAL_TEST_LIMITS = {
  titleMin: 3,
  titleMax: 200,
  /** One rich-text section — a description with a table or two, not a book. */
  richTextMax: 50_000,
  stepsMax: 100,
  stepTextMax: 1000,
  labelsMax: 20,
  labelMax: 40,
  columnNameMax: 40,
  columnsMax: 30,
  wipMax: 999,
  /** Thirty working days of eight hours. */
  estimateMax: 14_400,
  commentMax: 20_000,
  searchMax: 120,
  /** Cards a board column shows before "load more". */
  boardPageSize: 50,
  commentsPageSize: 50,
  activityPageSize: 50,
  /** Staff listed as possible assignees. */
  assigneesMax: 500,
  /** Distinct labels offered to the autocomplete. */
  labelsListed: 200,
} as const;

/**
 * Who may open and change the manual test board — and so who a case can be
 * assigned to.
 */
export const MANUAL_TEST_ROLES: readonly string[] = ['SUPER_ADMIN', TESTS_MANAGER];
