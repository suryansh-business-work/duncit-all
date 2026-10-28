#!/usr/bin/env node
/**
 * CI unit-test reporter — how sonar.yml and coverage.yml tell the Tests
 * console (tests.duncit.com) what their suites did. One script, five modes:
 *
 *   runner <dir>  prints the runner behind a workspace's `test:coverage`
 *                 script (vitest | jest | none). ci-coverage-run.sh asks it
 *                 which machine-readable flags to append.
 *   meta          right after a workspace ran: compacts the runner's JSON
 *                 report and the coverage it wrote into one small
 *                 `<slug>.unit.json` (see scripts/lib/unit-results.mjs) and
 *                 deletes the raw report, which carries the whole coverage map.
 *   start         claims the console's row for this workflow run, so it reads
 *                 RUNNING while the suites go. A console-started run already
 *                 has a QUEUED row; DISPATCH_ID claims it.
 *   report        everything else, once the suites are done: every workspace's
 *                 summary, every test file in the repo (kind, mocks, GraphQL
 *                 stubs, the titles of the specs nothing runs), every test case
 *                 in chunks of 500, then the finish that totals the run.
 *   cancel        closes the row as CANCELLED when the workflow was cancelled.
 *
 * NEVER FAILS THE WORKFLOW. Unlike the E2E reporter, nothing here gates
 * anything — the suites already ran and their own jobs say how they went. Any
 * failure is a `::warning::` and exit 0. Credentials come from secrets in the
 * environment (never workflow inputs), and the token is masked.
 *
 * Env (start / report / cancel):
 *   DUNCIT_GRAPHQL_URL    where to report — the workflow picks staging or
 *                         production from the branch. Empty skips reporting.
 *   DUNCIT_RELEASE_TOKEN  a TECH_MANAGER JWT for that server, OR
 *   DUNCIT_RELEASE_EMAIL + DUNCIT_RELEASE_PASSWORD
 *   UNIT_WORKFLOW         SONAR | COVERAGE
 *   DISPATCH_ID           set when the console started the run.
 *   GITHUB_RUN_ID / GITHUB_RUN_ATTEMPT / GITHUB_REF_NAME / GITHUB_SHA /
 *   GITHUB_EVENT_NAME / GITHUB_ACTOR / RUN_URL — provided by Actions.
 *
 *   node scripts/report-unit-run.mjs runner portals/admin
 *   node scripts/report-unit-run.mjs meta --dir portals/admin --group admin \
 *        --runner vitest --exit 0 --duration-ms 81234 \
 *        --raw test-logs/results/admin.raw.json --out test-logs/results/admin.unit.json
 *   node scripts/report-unit-run.mjs report --artifacts unit-artifacts
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { createCiClient, describeError, MISSING_CREDENTIALS } from './lib/ci-report.mjs';
import {
  TEST_FILE,
  cleanFailure,
  compactRun,
  fileKind,
  readJson,
  scanMocks,
  scanTitles,
  toPosix,
  workspaceRunner,
} from './lib/unit-results.mjs';

const env = (name) => (process.env[name] || '').trim();
const ROWS_PER_CALL = 500;
const WORKSPACES_PER_CALL = 100;
/** Rides out a deploy restarting the server, but never holds a runner for long. */
const RETRY_WINDOW_MS = { start: 2 * 60 * 1000, report: 10 * 60 * 1000, cancel: 2 * 60 * 1000 };
const RATE_LIMIT_PAUSE_MS = 30_000;
const RATE_LIMIT_TRIES = 5;

/* ── arguments ────────────────────────────────────────────────────────────── */

function parseArgs(argv) {
  const out = { _: [] };
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq > 0) {
        out[arg.slice(2, eq)] = arg.slice(eq + 1);
      } else {
        out[arg.slice(2)] = argv[i + 1] ?? '';
        i += 1;
      }
    } else {
      out._.push(arg);
    }
    i += 1;
  }
  return out;
}

const intOrNull = (value) => {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
};

/* ── runner / meta: the test jobs' half ───────────────────────────────────── */

function printRunner(args) {
  console.log(workspaceRunner(args._[0] ?? '.'));
}

function writeMeta(args) {
  const root = process.cwd();
  const dir = args.dir || '.';
  const pkg = readJson(path.resolve(root, dir, 'package.json'));
  const unit = compactRun({
    root,
    workspace: args.workspace || pkg?.name || dir,
    dir,
    group: args.group || '',
    runner: args.runner || workspaceRunner(path.resolve(root, dir)),
    exitCode: intOrNull(args.exit),
    durationMs: intOrNull(args['duration-ms']),
    rawFile: args.raw,
  });
  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, JSON.stringify(unit));
  if (args.raw) fs.rmSync(args.raw, { force: true });
  const { counts } = unit;
  console.log(`unit results: ${unit.workspace} ${unit.status} — ${counts.passed}/${counts.tests} passed, ${counts.failed} failed`);
}

/* ── the server ───────────────────────────────────────────────────────────── */

const CLAIM = `mutation($input: ClaimUnitTestRunInput!){ claimUnitTestRun(input:$input){ id run_no status } }`;
const WORKSPACES = `mutation($input: ReportUnitTestWorkspacesInput!){ reportUnitTestWorkspaces(input:$input) }`;
const FILES = `mutation($input: ReportUnitTestFilesInput!){ reportUnitTestFiles(input:$input) }`;
const CASES = `mutation($input: ReportUnitTestCasesInput!){ reportUnitTestCases(input:$input) }`;
const FINISH = `mutation($input: FinishUnitTestRunInput!){
  finishUnitTestRun(input:$input){ run_no status totals{ tests passed failed } }
}`;

function triggerOf(eventName, dispatchId) {
  if (eventName === 'push') return 'PUSH';
  if (eventName === 'schedule') return 'SCHEDULE';
  return dispatchId ? 'PORTAL' : 'MANUAL';
}

const claimInput = () => ({
  workflow: env('UNIT_WORKFLOW') === 'COVERAGE' ? 'COVERAGE' : 'SONAR',
  dispatch_id: env('DISPATCH_ID') || undefined,
  github_run_id: env('GITHUB_RUN_ID'),
  github_run_attempt: Number.parseInt(env('GITHUB_RUN_ATTEMPT'), 10) || 1,
  github_run_url: env('RUN_URL'),
  branch: env('GITHUB_REF_NAME'),
  commit_sha: env('GITHUB_SHA'),
  trigger: triggerOf(env('GITHUB_EVENT_NAME'), env('DISPATCH_ID')),
  triggered_by: env('GITHUB_ACTOR'),
});

const isRateLimited = (err) => err?.graphQLErrors?.some((e) => e?.extensions?.code === 'RATE_LIMITED');

/**
 * A server connection for one mode. The client already retries an absent
 * server; a rate-limited answer is a GraphQL error to it, so that one pause is
 * added here — a report is ~100 mutations, close to the per-account ceiling.
 */
async function connect(mode) {
  const { gql, resolveToken } = createCiClient({ url: env('DUNCIT_GRAPHQL_URL'), retryWindowMs: RETRY_WINDOW_MS[mode] });
  const token = await resolveToken();
  if (!token) throw new Error(MISSING_CREDENTIALS);
  console.log(`::add-mask::${token}`);
  return async (query, variables) => {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await gql(query, variables, token);
      } catch (err) {
        if (!isRateLimited(err) || attempt >= RATE_LIMIT_TRIES) throw err;
        console.warn(`⚠ rate limited — pausing ${RATE_LIMIT_PAUSE_MS / 1000}s`);
        await sleep(RATE_LIMIT_PAUSE_MS);
      }
    }
  };
}

async function claim(call) {
  const data = await call(CLAIM, { input: claimInput() });
  return data.claimUnitTestRun;
}

async function start() {
  const call = await connect('start');
  const run = await claim(call);
  console.log(`✓ ${run.run_no} claimed (${run.status})`);
}

async function cancel() {
  const call = await connect('cancel');
  const run = await claim(call);
  await call(FINISH, { input: { run_id: run.id, status: 'CANCELLED', error_message: 'The workflow run was cancelled.' } });
  console.log(`✓ ${run.run_no} closed as cancelled`);
}

/* ── report: reading the artifacts ────────────────────────────────────────── */

function* walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

/**
 * Every workspace result under the artifacts directory. A `_group.json`
 * beside them says whether that group's coverage was REUSED from sonar.yml's
 * cache, in which case its results are the cached run's.
 */
function loadUnits(artifactsDir) {
  const units = new Map();
  for (const file of walk(artifactsDir)) {
    if (!file.endsWith('.unit.json')) continue;
    const unit = readJson(file);
    if (!unit?.workspace || units.has(unit.workspace)) continue;
    const group = readJson(path.join(path.dirname(file), '_group.json'));
    units.set(unit.workspace, { unit, reused: group?.reused === true, group: group?.group || unit.group || '' });
  }
  return [...units.values()];
}

const RUNNER = { vitest: 'VITEST', jest: 'JEST' };

const workspaceInput = ({ unit, reused, group }) => ({
  name: unit.workspace,
  dir: unit.dir,
  group,
  runner: RUNNER[unit.runner] ?? 'OTHER',
  status: reused ? 'REUSED' : unit.status,
  has_results: Boolean(unit.has_results),
  exit_code: unit.exit_code ?? null,
  error: unit.error ?? '',
  coverage: unit.coverage ?? null,
  ...unit.counts,
});

/* ── report: the test-file inventory ──────────────────────────────────────── */

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage']);

/** Tooling trees (.claude, .github, …) hold the scripts' own tests, not the product's. */
const isProductPath = (rel) => !rel.startsWith('.');

/** Every test file the repo tracks — git's list, or a walk when git is not there. */
function listTestFiles(root) {
  try {
    const out = execFileSync('git', ['ls-files', '-z'], { cwd: root, maxBuffer: 256 * 1024 * 1024 });
    return out.toString('utf8').split('\0').filter((p) => TEST_FILE.test(p) && isProductPath(p));
  } catch {
    const files = [];
    const visit = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name) && isProductPath(entry.name)) visit(path.join(dir, entry.name));
        } else if (TEST_FILE.test(entry.name)) {
          files.push(toPosix(path.relative(root, path.join(dir, entry.name))));
        }
      }
    };
    visit(root);
    return files;
  }
}

/**
 * Which workspace a file belongs to: the deepest workspace that reported,
 * else the nearest package.json above it.
 */
function makeOwnerOf(root, units) {
  const known = units
    .map(({ unit }) => ({ dir: unit.dir, name: unit.workspace, runner: unit.runner }))
    .sort((a, b) => b.dir.length - a.dir.length);
  const cache = new Map();
  const nearest = (relDir) => {
    if (cache.has(relDir)) return cache.get(relDir);
    const pkg = readJson(path.join(root, relDir, 'package.json'));
    let owner;
    if (pkg?.name) owner = { dir: relDir, name: pkg.name, runner: workspaceRunner(path.join(root, relDir)) };
    else if (relDir === '.' || relDir === '') owner = { dir: '.', name: 'root', runner: 'none' };
    else owner = nearest(toPosix(path.dirname(relDir)));
    cache.set(relDir, owner);
    return owner;
  };
  return (rel) => known.find((ws) => ws.dir && rel.startsWith(`${ws.dir}/`)) ?? nearest(toPosix(path.dirname(rel)));
}

function readSource(root, rel) {
  try {
    return fs.readFileSync(path.join(root, rel), 'utf8');
  } catch {
    return '';
  }
}

function countsOfFile(file) {
  const counts = { tests: 0, passed: 0, failed: 0, skipped: 0, todo: 0 };
  for (const c of file.cases) {
    counts.tests += 1;
    if (c.status === 'PASSED') counts.passed += 1;
    else if (c.status === 'FAILED') counts.failed += 1;
    else if (c.status === 'TODO') counts.todo += 1;
    else counts.skipped += 1;
  }
  return counts;
}

/** The repo's test files, each with what the run made of it — or NOT_RUN. */
function inventory(root, units) {
  const results = new Map();
  for (const { unit } of units) {
    for (const file of unit.files) results.set(file.path, { workspace: unit.workspace, runner: unit.runner, file });
  }
  const ownerOf = makeOwnerOf(root, units);
  const paths = new Set([...listTestFiles(root), ...results.keys()]);
  const rows = [];
  for (const rel of paths) {
    const source = readSource(root, rel);
    const ran = results.get(rel);
    const owner = ran ? { name: ran.workspace, runner: ran.runner } : ownerOf(rel);
    const { mocks, gql_mocks } = scanMocks(source);
    const base = { workspace: owner.name, path: rel, kind: fileKind(rel, source, owner.runner), mocks, gql_mocks };
    if (ran) {
      rows.push({
        ...base,
        status: ran.file.status,
        ...countsOfFile(ran.file),
        duration_ms: ran.file.duration_ms,
        failure_message: cleanFailure(ran.file.failure_message),
      });
    } else {
      const titles = scanTitles(source);
      rows.push({ ...base, status: 'NOT_RUN', tests: titles.length, titles });
    }
  }
  return rows.sort((a, b) => a.path.localeCompare(b.path));
}

/** Every executed test, with the ordinal that tells identically named tests apart. */
function casesOf(units) {
  const rows = [];
  for (const { unit } of units) {
    for (const file of unit.files) {
      const seen = new Map();
      for (const c of file.cases) {
        const ordinal = seen.get(c.full_name) ?? 0;
        seen.set(c.full_name, ordinal + 1);
        rows.push({
          workspace: unit.workspace,
          file: file.path,
          ordinal,
          ancestor_titles: c.ancestor_titles,
          title: c.title,
          full_name: c.full_name,
          status: c.status,
          duration_ms: c.duration_ms,
          failure_message: c.failure_message ? cleanFailure(c.failure_message) : '',
        });
      }
    }
  }
  return rows;
}

async function sendChunks(call, mutation, runId, key, rows, size) {
  let sent = 0;
  for (let i = 0; i < rows.length; i += size) {
    await call(mutation, { input: { run_id: runId, [key]: rows.slice(i, i + size) } });
    sent += Math.min(size, rows.length - i);
  }
  return sent;
}

async function report(args) {
  const root = process.cwd();
  const units = loadUnits(args.artifacts || 'unit-artifacts');
  console.log(`found results for ${units.length} workspace(s)`);
  const call = await connect('report');
  const run = await claim(call);
  console.log(`reporting into ${run.run_no}`);
  await sendChunks(call, WORKSPACES, run.id, 'workspaces', units.map(workspaceInput), WORKSPACES_PER_CALL);
  const files = inventory(root, units);
  await sendChunks(call, FILES, run.id, 'files', files, ROWS_PER_CALL);
  console.log(`  ${files.length} test file(s)`);
  const cases = casesOf(units);
  await sendChunks(call, CASES, run.id, 'cases', cases, ROWS_PER_CALL);
  console.log(`  ${cases.length} test case(s)`);
  const data = await call(FINISH, { input: { run_id: run.id } });
  const { run_no, status, totals } = data.finishUnitTestRun;
  console.log(`✓ ${run_no} ${status} — ${totals.passed}/${totals.tests} passed, ${totals.failed} failed`);
}

/* ── entry ────────────────────────────────────────────────────────────────── */

const MODES = { runner: printRunner, meta: writeMeta, start, report, cancel };
const SERVER_MODES = new Set(['start', 'report', 'cancel']);

const [mode, ...rest] = process.argv.slice(2);
try {
  const run = MODES[mode];
  if (!run) throw new Error(`mode must be one of ${Object.keys(MODES).join(', ')} — got "${mode ?? ''}"`);
  if (SERVER_MODES.has(mode) && !env('DUNCIT_GRAPHQL_URL')) {
    console.log(`::warning::report-unit-run ${mode}: no DUNCIT_GRAPHQL_URL for this branch — nothing reported.`);
  } else {
    await run(parseArgs(rest));
  }
} catch (err) {
  console.error(`report-unit-run: ${describeError(err)}`);
  // The runner mode's answer is read by a shell as the runner's name, so it
  // answers "none" — the workspace then runs exactly as it did before.
  if (mode === 'runner') console.log('none');
  else console.log(`::warning::report-unit-run ${mode ?? ''} did not complete: ${describeError(err)}`);
}
process.exit(0);
