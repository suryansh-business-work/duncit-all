#!/usr/bin/env node
/**
 * CI end-to-end reporter — the E2E workflow's only way of telling the platform
 * what happened. Runs in three shapes, chosen by MODE:
 *
 *   start   claims the run this workflow is fulfilling and prints the identity
 *           it should test with. Called once, by the setup job, before any
 *           suite runs. The credentials come back HERE rather than travelling
 *           as workflow inputs, because a dispatch input is displayed on the
 *           run's own page and a password does not belong there.
 *   suite   records one matrix leg's outcome, with the counts read out of the
 *           JUnit report Cypress wrote. Called by every leg, always, so a leg
 *           that was filtered out reports SKIPPED rather than going silent.
 *   finish  records the run's outcome and how long it took. Called by the gate.
 *
 * Every mode writes to ONE row: they join on DISPATCH_ID (a portal- or
 * schedule-started run has a row before GitHub has a runner) and then on the
 * workflow run id.
 *
 * Env:
 *   MODE                 start | suite | finish (required)
 *   DUNCIT_GRAPHQL_URL   where to record the run. Defaults to production; a
 *                        portal-started run points this at the server that
 *                        started it.
 *   DUNCIT_RELEASE_TOKEN a SUPER_ADMIN / TECH_MANAGER JWT, OR
 *   DUNCIT_RELEASE_EMAIL + DUNCIT_RELEASE_PASSWORD [+ DUNCIT_RELEASE_PORTAL_KEY]
 *   DISPATCH_ID          set by the portal or the scheduler; claims their row.
 *   SUITES               comma-separated suite filter. Empty means every suite.
 *   SUITE_KEY            (suite) which leg is reporting.
 *   SUITE_STATUS         (suite) PASSED | FAILED | SKIPPED | RUNNING.
 *   SUITE_ERROR          (suite) why it failed.
 *   JUNIT_DIR            (suite) where to look for JUnit XML. Missing is fine —
 *                        the leg still reports its status, without counts.
 *   RUN_STATUS           (finish) SUCCESS | FAILED.
 *   RUN_ERROR            (finish) why the run failed.
 *   STARTED_AT           (finish) unix seconds the run began, for the duration.
 *   STAGE                what the workflow is doing now.
 *   GITHUB_SHA / GITHUB_REF_NAME / GITHUB_RUN_ID / GITHUB_ACTOR / RUN_URL
 *                        provided by Actions.
 *
 * `start` writes the identity to $GITHUB_OUTPUT and masks the password with
 * ::add-mask:: so it cannot be echoed into a log by anything downstream.
 *
 * Loud by design: a run that cannot be recorded is a red workflow, so a missing
 * secret is found the day it happens, not the day someone reads the table.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createCiClient, describeError, MISSING_CREDENTIALS } from './lib/ci-report.mjs';

const GRAPHQL_URL = process.env.DUNCIT_GRAPHQL_URL || 'https://server.duncit.com/graphql';

/**
 * Ten minutes. Shorter than the build reporter's twenty because nothing here is
 * expensive to redo — no artifact was compiled and no upload was spent — but
 * long enough to ride out the deploy that a merge to staging kicks off
 * alongside a nightly run.
 */
const RETRY_WINDOW_MS = 10 * 60 * 1000;

const { gql, resolveToken } = createCiClient({
  url: GRAPHQL_URL,
  retryWindowMs: RETRY_WINDOW_MS,
});

const env = (name) => (process.env[name] || '').trim();

/** The join keys and the run facts every mode sends. */
const runIdentity = () => ({
  dispatch_id: env('DISPATCH_ID'),
  workflow_run_id: env('GITHUB_RUN_ID'),
  workflow_run_url: env('RUN_URL'),
});

/* ── reading what Cypress produced ────────────────────────────────────────── */

/**
 * Cypress ships mocha's JUnit reporter, so the counts come out of XML rather
 * than out of stdout. Parsed with a regex on purpose: the file is machine-
 * written and shallow, and adding an XML parser to a zero-dependency reporter
 * that runs on a bare runner after a failure is a poor trade.
 */
const SUITE_ATTR_RE = /<testsuite\b[^>]*>/g;
const attr = (tag, name) => {
  const match = new RegExp(`\\b${name}="([^"]*)"`).exec(tag);
  return match ? match[1] : null;
};

function* junitFiles(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* junitFiles(full);
    } else if (entry.name.toLowerCase().endsWith('.xml')) {
      yield full;
    }
  }
}

/**
 * The counts across every JUnit file a leg wrote, or null when it wrote none.
 *
 * Null rather than zeroes: "this suite ran nothing" and "this suite never got
 * far enough to write a report" look identical as numbers and are completely
 * different facts, and the second is the one worth seeing on a red row.
 *
 * mocha's reporter emits a "Root Suite" wrapper with tests="0" alongside the
 * real ones. Counting every testsuite element would double nothing, but the
 * SPEC count would be one too high per file, so the empty wrapper is dropped.
 */
function readJunit(dir) {
  const totals = { specs: 0, tests: 0, failed: 0, skipped: 0, duration: 0 };
  let sawFile = false;
  for (const file of junitFiles(dir)) {
    sawFile = true;
    let xml;
    try {
      xml = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const tag of xml.match(SUITE_ATTR_RE) ?? []) {
      const tests = Number.parseInt(attr(tag, 'tests') ?? '0', 10) || 0;
      if (tests === 0) continue;
      totals.specs += 1;
      totals.tests += tests;
      totals.failed +=
        (Number.parseInt(attr(tag, 'failures') ?? '0', 10) || 0) +
        (Number.parseInt(attr(tag, 'errors') ?? '0', 10) || 0);
      totals.skipped += Number.parseInt(attr(tag, 'skipped') ?? '0', 10) || 0;
      totals.duration += Number.parseFloat(attr(tag, 'time') ?? '0') || 0;
    }
  }
  if (!sawFile) return null;
  return {
    specs: totals.specs,
    tests: totals.tests,
    failed: totals.failed,
    skipped: totals.skipped,
    passed: Math.max(totals.tests - totals.failed - totals.skipped, 0),
    duration_seconds: Math.round(totals.duration),
  };
}

/* ── the three modes ──────────────────────────────────────────────────────── */

const START_MUTATION = `mutation($input: StartE2eRunInput!){
  startE2eRun(input:$input){
    run{ run_no ref }
    credentials{ stamp login_email signup_email password phone }
    suites
  }
}`;

const REPORT_MUTATION = `mutation($input: ReportE2eRunInput!){
  reportE2eRun(input:$input){ run_no status totals{ suites tests passed failed } }
}`;

/** Hand a value to the steps that follow, and keep the password out of the log. */
function writeOutputs(values, secrets = []) {
  for (const secret of secrets.filter(Boolean)) console.log(`::add-mask::${secret}`);
  const file = process.env.GITHUB_OUTPUT;
  if (!file) return;
  const lines = Object.entries(values).map(([key, value]) => `${key}=${value ?? ''}`);
  fs.appendFileSync(file, `${lines.join('\n')}\n`);
}

async function start(token) {
  const suites = env('SUITES')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const data = await gql(
    START_MUTATION,
    {
      input: {
        ...runIdentity(),
        ref: env('GITHUB_REF_NAME'),
        commit_sha: env('GITHUB_SHA'),
        triggered_by: env('GITHUB_ACTOR'),
        suites,
      },
    },
    token
  );
  const { run, credentials, suites: chosen } = data.startE2eRun;
  // Empty means every suite — the same convention the workflow's own filter
  // uses, so "all" never has to be spelled out as a list.
  writeOutputs(
    {
      run_no: run.run_no,
      suites: chosen.join(','),
      e2e_email: credentials?.login_email ?? '',
      e2e_signup_email: credentials?.signup_email ?? '',
      e2e_password: credentials?.password ?? '',
      e2e_phone: credentials?.phone ?? '',
      e2e_stamp: credentials?.stamp ?? '',
    },
    [credentials?.password]
  );
  console.log(`✓ ${run.run_no} claimed on ${run.ref}`);
  console.log(`  suites: ${chosen.length > 0 ? chosen.join(', ') : 'all'}`);
  if (credentials) {
    console.log(`  sign in as:  ${credentials.login_email}`);
    console.log(`  sign up as:  ${credentials.signup_email}`);
  } else {
    console.log('  no identity configured — Tech > E2E Tests > Settings');
  }
}

async function reportSuite(token) {
  const key = env('SUITE_KEY');
  if (!key) throw new Error('SUITE_KEY is required in suite mode');
  const status = env('SUITE_STATUS') || 'FAILED';
  const counts = status === 'SKIPPED' ? null : readJunit(env('JUNIT_DIR') || '.');
  const data = await gql(
    REPORT_MUTATION,
    {
      input: {
        ...runIdentity(),
        stage: env('STAGE'),
        suite: {
          key,
          status,
          ...(counts ?? {}),
          error: env('SUITE_ERROR'),
          job_url: env('RUN_URL'),
        },
      },
    },
    token
  );
  const detail = counts ? ` (${counts.passed}/${counts.tests} passed)` : '';
  console.log(`✓ ${data.reportE2eRun.run_no}: ${key} ${status}${detail}`);
}

/** Whole seconds since the job began, or null when nothing said when that was. */
function durationSeconds() {
  const started = Number.parseInt(env('STARTED_AT'), 10);
  if (!Number.isFinite(started) || started <= 0) return null;
  return Math.max(Math.round(Date.now() / 1000) - started, 0);
}

async function finish(token) {
  const status = env('RUN_STATUS') === 'SUCCESS' ? 'SUCCESS' : 'FAILED';
  const data = await gql(
    REPORT_MUTATION,
    {
      input: {
        ...runIdentity(),
        status,
        error_message: status === 'FAILED' ? env('RUN_ERROR') || 'One or more suites failed.' : '',
        duration_seconds: durationSeconds(),
        ref: env('GITHUB_REF_NAME'),
        commit_sha: env('GITHUB_SHA'),
      },
    },
    token
  );
  const { run_no, totals } = data.reportE2eRun;
  console.log(
    `✓ ${run_no} ${status} — ${totals.suites} suites, ${totals.passed}/${totals.tests} tests passed`
  );
}

const MODES = { start, suite: reportSuite, finish };

try {
  const mode = env('MODE');
  const run = MODES[mode];
  if (!run) throw new Error(`MODE must be one of ${Object.keys(MODES).join(', ')} — got "${mode}"`);
  const token = await resolveToken();
  if (!token) throw new Error(MISSING_CREDENTIALS);
  await run(token);
} catch (err) {
  console.error(`✗ report-e2e-run: ${describeError(err)}`);
  process.exit(1);
}
