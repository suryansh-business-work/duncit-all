/**
 * Reading what a unit-test run left behind, for scripts/report-unit-run.mjs.
 *
 * Two halves, used at two moments:
 *
 *  - right after a workspace's suites ran (inside ci-coverage-run.sh, or the
 *    mobile app's jest step): `compactRun` turns the runner's JSON report and
 *    the workspace's coverage files into one small `<slug>.unit.json` — the
 *    raw report carries the whole coverage map and can be tens of megabytes;
 *  - in the reporting job: the static half reads the test FILES themselves —
 *    what kind each is, what it mocks, and the `it(…)` titles of the specs no
 *    runner executes.
 *
 * Zero dependencies, like every CI reporter here: it runs on a bare runner,
 * often after a failure.
 *
 * vitest's `json` reporter and jest's `--json` share one shape:
 *   testResults[] { name, status, message, startTime, endTime,
 *                   assertionResults[] { ancestorTitles, title, fullName,
 *                                        status, duration, failureMessages[] } }
 */
import fs from 'node:fs';
import path from 'node:path';

export const UNIT_FILE_VERSION = 1;
export const MAX_FAILURE_CHARS = 4000;
const MAX_TITLES = 200;

/* ── text hygiene ─────────────────────────────────────────────────────────── */

const ESC = 27;
const isFinalByte = (code) => code >= 0x40 && code <= 0x7e;
const isKept = (code) => (code >= 32 && code !== 127) || code === 9 || code === 10 || code === 13;

/** Where the escape starting at `start` ends: a whole CSI (`ESC [ … final`), else ESC + one char. */
function escapeEnd(value, start) {
  if (value[start + 1] !== '[') return start + 1;
  let i = start + 2;
  while (i < value.length && !isFinalByte(value.charCodeAt(i))) i += 1;
  return i;
}

/** Terminal escapes and control characters out; tabs and line breaks kept. */
export function stripAnsi(text) {
  const out = [];
  const value = String(text ?? '');
  let i = 0;
  while (i < value.length) {
    const code = value.charCodeAt(i);
    if (code === ESC) {
      i = escapeEnd(value, i) + 1;
      continue;
    }
    if (isKept(code)) out.push(value[i]);
    i += 1;
  }
  return out.join('');
}

/** Names whose values must never appear in anything this pipeline sends. */
const SECRET_NAME = /TOKEN|SECRET|PASSWORD|PASSWD|API_KEY|PRIVATE|CREDENTIAL/i;
const JWT = /eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}/g;

/**
 * A failure message with every secret-looking environment value of THIS
 * process, and anything shaped like a JWT, replaced. A test that printed its
 * own environment must not carry it into a database.
 */
export function scrub(text) {
  let out = String(text ?? '').replace(JWT, '[redacted]');
  for (const [name, value] of Object.entries(process.env)) {
    if (value && value.length >= 6 && SECRET_NAME.test(name)) out = out.split(value).join('[redacted]');
  }
  return out;
}

export function clip(text, max = MAX_FAILURE_CHARS) {
  const value = String(text ?? '');
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/** Cut before stripping, so a multi-megabyte trace is never walked whole. */
export const cleanFailure = (text) => clip(scrub(stripAnsi(String(text ?? '').slice(0, MAX_FAILURE_CHARS * 2))));

/* ── which runner a workspace uses ────────────────────────────────────────── */

export function detectRunner(scriptText) {
  const script = String(scriptText ?? '');
  if (/\bvitest\b/.test(script)) return 'vitest';
  if (/\bjest\b/.test(script)) return 'jest';
  return 'none';
}

export function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/** The runner behind a workspace's `test:coverage` script. */
export function workspaceRunner(dir) {
  const pkg = readJson(path.join(dir, 'package.json'));
  return detectRunner(pkg?.scripts?.['test:coverage']);
}

/* ── coverage ─────────────────────────────────────────────────────────────── */

const metric = (covered, total) => ({ covered: Math.max(0, covered), total: Math.max(0, total) });

/** lines / branches / functions from an lcov file, or null when there is none. */
export function lcovSummary(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
  const sums = { LF: 0, LH: 0, BRF: 0, BRH: 0, FNF: 0, FNH: 0 };
  for (const line of text.split(/\r?\n/)) {
    const colon = line.indexOf(':');
    const key = line.slice(0, colon);
    if (colon > 0 && Object.hasOwn(sums, key)) sums[key] += Number.parseInt(line.slice(colon + 1), 10) || 0;
  }
  return {
    lines: metric(sums.LH, sums.LF),
    branches: metric(sums.BRH, sums.BRF),
    functions: metric(sums.FNH, sums.FNF),
  };
}

/** Statements, which only a json-summary report carries. */
export function statementsSummary(file) {
  const total = readJson(file)?.total?.statements;
  if (!total || typeof total.total !== 'number') return null;
  return metric(Number(total.covered) || 0, total.total);
}

/** A workspace's coverage, read from where its runner wrote it. */
export function workspaceCoverage(dir) {
  const lcov = lcovSummary(path.join(dir, 'coverage', 'lcov.info'));
  if (!lcov) return null;
  const statements = statementsSummary(path.join(dir, 'coverage', 'coverage-summary.json'));
  return { ...lcov, statements: statements ?? metric(0, 0) };
}

/* ── compacting a runner's JSON report ────────────────────────────────────── */

const CASE_STATUS = {
  passed: 'PASSED',
  failed: 'FAILED',
  pending: 'SKIPPED',
  skipped: 'SKIPPED',
  disabled: 'SKIPPED',
  todo: 'TODO',
  focused: 'PASSED',
};

export const caseStatus = (status) => CASE_STATUS[String(status)] ?? 'SKIPPED';

export const toPosix = (p) => String(p).split(path.sep).join('/').replaceAll('\\', '/');

/** A runner's absolute path, relative to the repo when it lies inside it. */
export function repoRelative(root, file) {
  const rel = toPosix(path.relative(root, String(file ?? '')));
  return rel && !rel.startsWith('..') ? rel : toPosix(file);
}

const durationOf = (value) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.round(value) : null);

function compactCase(a) {
  const status = caseStatus(a.status);
  const title = String(a.title ?? '');
  return {
    ancestor_titles: Array.isArray(a.ancestorTitles) ? a.ancestorTitles.map(String) : [],
    title,
    full_name: String(a.fullName ?? title),
    status,
    duration_ms: durationOf(a.duration),
    failure_message: status === 'FAILED' ? cleanFailure((a.failureMessages ?? []).join('\n\n')) : '',
  };
}

function fileStatus(result, cases) {
  if (result.status === 'failed' || cases.some((c) => c.status === 'FAILED')) return 'FAILED';
  if (cases.length > 0 && cases.every((c) => c.status === 'SKIPPED' || c.status === 'TODO')) return 'SKIPPED';
  return 'PASSED';
}

function compactFile(root, result) {
  const cases = (result.assertionResults ?? []).map(compactCase);
  const status = fileStatus(result, cases);
  const start = Number(result.startTime);
  const end = Number(result.endTime);
  // A file that died before any test ran carries its reason on the file alone.
  const noCaseFailed = !cases.some((c) => c.status === 'FAILED');
  return {
    path: repoRelative(root, result.name),
    status,
    duration_ms: Number.isFinite(start) && Number.isFinite(end) && end >= start ? end - start : null,
    failure_message: status === 'FAILED' && noCaseFailed ? cleanFailure(result.message) : '',
    cases,
  };
}

function countsOf(files) {
  const counts = { suites: files.length, suites_failed: 0, tests: 0, passed: 0, failed: 0, skipped: 0, todo: 0, duration_ms: 0 };
  for (const file of files) {
    if (file.status === 'FAILED') counts.suites_failed += 1;
    counts.duration_ms += file.duration_ms ?? 0;
    for (const c of file.cases) {
      counts.tests += 1;
      if (c.status === 'PASSED') counts.passed += 1;
      else if (c.status === 'FAILED') counts.failed += 1;
      else if (c.status === 'TODO') counts.todo += 1;
      else counts.skipped += 1;
    }
  }
  return counts;
}

/** Wall-clock span of the report itself, for a step that could not time the run. */
function reportSpan(raw) {
  const start = Number(raw?.startTime);
  const ends = (raw?.testResults ?? []).map((r) => Number(r.endTime)).filter(Number.isFinite);
  if (!Number.isFinite(start) || ends.length === 0) return null;
  return Math.max(0, Math.max(...ends) - start);
}

function workspaceStatus({ runner, raw, files, counts, exitCode }) {
  if (!raw) {
    if (runner === 'none') return { status: 'NO_TESTS', has_results: true, error: '' };
    const exitNote = exitCode == null ? '' : ` (exit ${exitCode})`;
    const why =
      exitCode === 124
        ? 'Timed out before the runner wrote its report.'
        : `No results — the runner died before writing its report${exitNote}.`;
    return { status: 'ERROR', has_results: false, error: why };
  }
  if (files.length === 0 && counts.tests === 0) return { status: 'NO_TESTS', has_results: true, error: '' };
  const red = counts.failed > 0 || counts.suites_failed > 0;
  return { status: red ? 'FAILED' : 'PASSED', has_results: true, error: '' };
}

/**
 * One workspace's run, compacted: what ran, how it went, test by test, and
 * the coverage it wrote. Everything the reporter needs and nothing else.
 */
export function compactRun({ root, workspace, dir, group, runner, exitCode, durationMs, rawFile }) {
  const raw = rawFile ? readJson(rawFile) : null;
  const files = (raw?.testResults ?? []).map((result) => compactFile(root, result));
  const counts = countsOf(files);
  const verdict = workspaceStatus({ runner, raw, files, counts, exitCode });
  return {
    version: UNIT_FILE_VERSION,
    workspace,
    dir: repoRelative(root, path.resolve(root, dir)),
    group,
    runner,
    exit_code: exitCode,
    duration_ms: durationMs ?? reportSpan(raw),
    ...verdict,
    coverage: workspaceCoverage(path.resolve(root, dir)),
    counts,
    files,
  };
}

/* ── the static half: test files as source ────────────────────────────────── */

export const TEST_FILE = /\.(?:test|spec|cy)\.[cm]?[jt]sx?$/;
const CY_FILE = /\.cy\.[cm]?[jt]sx?$/;
const E2E_PATH = /(?:^|\/)e2e\//;
const IMPORTS_VITEST = /from\s+['"]vitest['"]|require\(\s*['"]vitest['"]\s*\)|\bvi\.(?:fn|mock|spyOn|hoisted)\(/;

/**
 * What a test file is. Cypress e2e specs live under an `e2e/` directory; a
 * `.cy.` file elsewhere is a Cypress component spec UNLESS it imports vitest —
 * the form-schema suites (`*.form.cy.ts`) are vitest suites with a Cypress
 * name, and they run under vitest.
 */
export function fileKind(relPath, source, runner) {
  if (E2E_PATH.test(relPath)) return 'CYPRESS_E2E';
  if (CY_FILE.test(relPath)) return IMPORTS_VITEST.test(source) ? 'VITEST' : 'CYPRESS_COMPONENT';
  if (runner === 'jest') return 'JEST';
  if (runner === 'vitest') return 'VITEST';
  return IMPORTS_VITEST.test(source) ? 'VITEST' : 'JEST';
}

const MODULE_MOCK = /\b(?:vi|jest)\.(?:mock|doMock|unstable_mockModule)\(\s*(?:import\(\s*)?(['"`])([^'"`\r\n]+)\1/g;
const GQL_MOCKS = [
  // cy.interceptOperation('Name') — the e2e suites' own command.
  /\binterceptOperation\(\s*['"`](\w+)['"`]/g,
  // req.body.operationName === 'Name', { operationName: 'Name' }
  /\boperationName\s*(?:===?|:)\s*['"`](\w+)['"`]/g,
  // MockedProvider mocks: { request: { query: SOME_DOCUMENT } }
  /\brequest\s*:\s*\{\s*query\s*:\s*([A-Za-z_$][\w$]*)/g,
  /\bmockGraphql\(\s*['"`](\w+)['"`]/g,
];
const TEST_TITLE = /\b(?:it|test|specify)(?:\.only|\.skip)?\(\s*(?:'([^'\r\n]*)'|"([^"\r\n]*)"|`([^`\r\n]*)`)/g;

const uniq = (values) => [...new Set(values.filter(Boolean))];

export function scanMocks(source) {
  const modules = [...String(source).matchAll(MODULE_MOCK)].map((m) => m[2].trim());
  const operations = GQL_MOCKS.flatMap((re) => [...String(source).matchAll(re)].map((m) => m[1]));
  return { mocks: uniq(modules), gql_mocks: uniq(operations) };
}

export function scanTitles(source) {
  const titles = [...String(source).matchAll(TEST_TITLE)].map((m) => (m[1] ?? m[2] ?? m[3] ?? '').trim());
  return uniq(titles).slice(0, MAX_TITLES);
}
