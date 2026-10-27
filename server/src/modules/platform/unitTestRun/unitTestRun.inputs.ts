import { createHash } from 'node:crypto';
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import type {
  IUnitCoverage,
  IUnitCoverageMetric,
  IUnitTestCounts,
  IUnitTestWorkspace,
  UnitTestCaseStatus,
  UnitTestFileKind,
  UnitTestFileStatus,
  UnitTestRunStatus,
  UnitTestRunTrigger,
  UnitTestRunner,
  UnitTestWorkflow,
  UnitTestWorkspaceStatus,
} from './unitTestRun.model';

/**
 * What CI sends, as the GraphQL inputs declare it, and the one place each
 * value is cleaned before it reaches a document.
 *
 * Enum fields are already checked by the schema; everything here is about
 * size and shape — a reporter that sends a 2 MB stack trace, a path with a
 * control character in it, or a count that is not a number must not be what
 * decides how big a document gets.
 */

/** Rows one report call may carry. The reporter chunks to this. */
const MAX_ROWS_PER_CALL = 500;
const MAX_FAILURE_CHARS = 4000;
const MAX_TITLE_CHARS = 1000;
const MAX_PATH_CHARS = 1000;
const MAX_LIST_ITEMS = 200;
const MAX_LIST_ITEM_CHARS = 300;

export const badInput = (msg: string) => new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });

export const str = (v: string | null | undefined): string => String(v ?? '').trim();

const ESC = 27;
const TAB = 9;
const LF = 10;
const CR = 13;
const DEL = 127;

/**
 * Where a terminal escape that starts at `start` ends. A CSI sequence (`ESC [`
 * then parameters then one final byte, which is what a coloured test report is
 * made of) is skipped whole; any other escape takes the character after it.
 */
function escapeEnd(text: string, start: number): number {
  if (text[start + 1] !== '[') return start + 1;
  let i = start + 2;
  while (i < text.length) {
    const code = text.charCodeAt(i);
    if (code >= 0x40 && code <= 0x7e) return i;
    i += 1;
  }
  return i;
}

const isKept = (code: number): boolean => (code >= 32 && code !== DEL) || code === TAB || code === LF || code === CR;

/** Terminal escapes and control characters out; tabs and line breaks kept. */
function stripControl(text: string): string {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    const code = text.charCodeAt(i);
    if (code === ESC) {
      i = escapeEnd(text, i) + 1;
      continue;
    }
    if (isKept(code)) out.push(text[i]);
    i += 1;
  }
  return out.join('');
}

/** Terminal colours and control characters out, then cut to `max`. */
export function cleanText(v: string | null | undefined, max: number): string {
  // Cut BEFORE stripping too, so a multi-megabyte trace is not walked whole.
  const plain = stripControl(String(v ?? '').slice(0, max * 2));
  return plain.length > max ? `${plain.slice(0, max - 1)}…` : plain;
}

/** A non-negative whole number, else 0 — a count that is not a number counts as none. */
export const count = (v: number | null | undefined): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};

export function cleanList(list: readonly string[] | null | undefined): string[] {
  const seen = new Set<string>();
  for (const item of list ?? []) {
    const value = cleanText(item, MAX_LIST_ITEM_CHARS).trim();
    if (value) seen.add(value);
    if (seen.size >= MAX_LIST_ITEMS) break;
  }
  return [...seen];
}

export function requireRunId(id: string | null | undefined): Types.ObjectId {
  const raw = str(id);
  if (!Types.ObjectId.isValid(raw)) throw badInput('run_id is not a unit test run id.');
  return new Types.ObjectId(raw);
}

export function requireRows<T>(rows: readonly T[] | null | undefined, what: string): readonly T[] {
  const list = rows ?? [];
  if (list.length > MAX_ROWS_PER_CALL) {
    throw badInput(`Send at most ${MAX_ROWS_PER_CALL} ${what} per call — got ${list.length}.`);
  }
  return list;
}

/* ── the inputs ─────────────────────────────────────────────────────────────── */

export interface ClaimUnitTestRunInput {
  workflow: UnitTestWorkflow;
  dispatch_id?: string | null;
  github_run_id: string;
  github_run_attempt?: number | null;
  github_run_url?: string | null;
  branch?: string | null;
  commit_sha?: string | null;
  trigger?: UnitTestRunTrigger | null;
  triggered_by?: string | null;
}

export interface UnitCoverageMetricInput {
  covered?: number | null;
  total?: number | null;
}

export interface UnitCoverageInput {
  lines?: UnitCoverageMetricInput | null;
  branches?: UnitCoverageMetricInput | null;
  functions?: UnitCoverageMetricInput | null;
  statements?: UnitCoverageMetricInput | null;
}

export interface UnitTestCountsInput {
  suites?: number | null;
  suites_failed?: number | null;
  tests?: number | null;
  passed?: number | null;
  failed?: number | null;
  skipped?: number | null;
  todo?: number | null;
  duration_ms?: number | null;
}

export interface UnitTestWorkspaceInput extends UnitTestCountsInput {
  name: string;
  dir?: string | null;
  group?: string | null;
  runner: UnitTestRunner;
  status: UnitTestWorkspaceStatus;
  has_results: boolean;
  exit_code?: number | null;
  error?: string | null;
  coverage?: UnitCoverageInput | null;
}

export interface ReportUnitTestWorkspacesInput {
  run_id: string;
  workspaces: UnitTestWorkspaceInput[];
}

export interface UnitTestFileInput {
  workspace: string;
  path: string;
  kind: UnitTestFileKind;
  status: UnitTestFileStatus;
  tests?: number | null;
  passed?: number | null;
  failed?: number | null;
  skipped?: number | null;
  todo?: number | null;
  duration_ms?: number | null;
  mocks?: string[] | null;
  gql_mocks?: string[] | null;
  titles?: string[] | null;
  failure_message?: string | null;
}

export interface ReportUnitTestFilesInput {
  run_id: string;
  files: UnitTestFileInput[];
}

export interface UnitTestCaseInput {
  workspace: string;
  file: string;
  /** 0 for the first test a file names this way, 1 for the second, … */
  ordinal?: number | null;
  ancestor_titles?: string[] | null;
  title: string;
  full_name: string;
  status: UnitTestCaseStatus;
  duration_ms?: number | null;
  failure_message?: string | null;
}

export interface ReportUnitTestCasesInput {
  run_id: string;
  cases: UnitTestCaseInput[];
}

export interface FinishUnitTestRunInput {
  run_id: string;
  /** Absent derives it from the workspaces: any red or broken workspace fails the run. */
  status?: UnitTestRunStatus | null;
  duration_ms?: number | null;
  error_message?: string | null;
}

/* ── cleaned shapes ─────────────────────────────────────────────────────────── */

const metric = (m: UnitCoverageMetricInput | null | undefined): IUnitCoverageMetric => {
  const total = count(m?.total);
  return { total, covered: Math.min(count(m?.covered), total) };
};

export function cleanCoverage(c: UnitCoverageInput | null | undefined): IUnitCoverage | null {
  if (!c) return null;
  return {
    lines: metric(c.lines),
    branches: metric(c.branches),
    functions: metric(c.functions),
    statements: metric(c.statements),
  };
}

export function cleanCounts(c: UnitTestCountsInput): IUnitTestCounts {
  return {
    suites: count(c.suites),
    suites_failed: count(c.suites_failed),
    tests: count(c.tests),
    passed: count(c.passed),
    failed: count(c.failed),
    skipped: count(c.skipped),
    todo: count(c.todo),
    duration_ms: count(c.duration_ms),
  };
}

export function cleanWorkspace(w: UnitTestWorkspaceInput): IUnitTestWorkspace {
  const name = cleanText(w.name, MAX_LIST_ITEM_CHARS).trim();
  if (!name) throw badInput('Every workspace needs a name.');
  const exit = w.exit_code;
  return {
    name,
    dir: cleanText(w.dir, MAX_PATH_CHARS).trim(),
    group: cleanText(w.group, MAX_LIST_ITEM_CHARS).trim(),
    runner: w.runner,
    status: w.status,
    has_results: Boolean(w.has_results),
    exit_code: typeof exit === 'number' && Number.isFinite(exit) ? Math.round(exit) : null,
    error: cleanText(w.error, MAX_FAILURE_CHARS),
    coverage: cleanCoverage(w.coverage),
    ...cleanCounts(w),
  };
}

export function cleanFile(f: UnitTestFileInput) {
  const workspace = cleanText(f.workspace, MAX_LIST_ITEM_CHARS).trim();
  const path = cleanText(f.path, MAX_PATH_CHARS).trim();
  if (!workspace || !path) throw badInput('Every file needs a workspace and a path.');
  const mocks = cleanList(f.mocks);
  const gqlMocks = cleanList(f.gql_mocks);
  return {
    workspace,
    path,
    kind: f.kind,
    status: f.status,
    tests: count(f.tests),
    passed: count(f.passed),
    failed: count(f.failed),
    skipped: count(f.skipped),
    todo: count(f.todo),
    duration_ms: count(f.duration_ms),
    mocks,
    gql_mocks: gqlMocks,
    mock_count: mocks.length + gqlMocks.length,
    has_mocks: mocks.length + gqlMocks.length > 0,
    titles: cleanList(f.titles),
    failure_message: cleanText(f.failure_message, MAX_FAILURE_CHARS),
  };
}

/**
 * The key a test is known by in every run — see IUnitTestCase.case_key. A
 * NUL between the parts so `a/b` + `c` can never collide with `a` + `b/c`.
 */
export function caseKey(workspace: string, file: string, fullName: string, ordinal: number): string {
  return createHash('sha1').update([workspace, file, fullName, String(ordinal)].join('\u0000')).digest('hex');
}

export function cleanCase(c: UnitTestCaseInput) {
  const workspace = cleanText(c.workspace, MAX_LIST_ITEM_CHARS).trim();
  const file = cleanText(c.file, MAX_PATH_CHARS).trim();
  if (!workspace || !file) throw badInput('Every test case needs a workspace and a file.');
  const title = cleanText(c.title, MAX_TITLE_CHARS);
  const fullName = cleanText(c.full_name, MAX_TITLE_CHARS * 2) || title;
  const ordinal = count(c.ordinal);
  const duration = c.duration_ms;
  return {
    case_key: caseKey(workspace, file, fullName, ordinal),
    workspace,
    file,
    ancestor_titles: (c.ancestor_titles ?? []).slice(0, 20).map((t) => cleanText(t, MAX_TITLE_CHARS)),
    title,
    full_name: fullName,
    status: c.status,
    duration_ms: typeof duration === 'number' && Number.isFinite(duration) && duration >= 0 ? Math.round(duration) : null,
    failure_message: c.status === 'FAILED' ? cleanText(c.failure_message, MAX_FAILURE_CHARS) : '',
  };
}
