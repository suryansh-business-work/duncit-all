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
 *   suite   records one matrix leg's outcome and every scenario it ran, read
 *           out of the per-spec results Cypress wrote (the JUnit report when
 *           there are none). Called by every leg, always, so a leg that was
 *           filtered out reports SKIPPED rather than going silent.
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
 *   RESULTS_DIR          (suite) where scripts/lib/cypress-scenarios.mjs wrote
 *                        one result file per spec. Read first: it is the only
 *                        source that lists the tests a failed hook blocked.
 *   JUNIT_DIR            (suite) where to look for JUnit XML when there are no
 *                        result files. Missing is fine — the leg still reports
 *                        its status, without counts.
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
import process from 'node:process';
import { createCiClient, describeError, MISSING_CREDENTIALS } from './lib/ci-report.mjs';
import { countsOf, readJunit, readSpecResults, scenariosOf } from './lib/e2e-results.mjs';

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
    console.log(`  run account: ${credentials.signup_email}`);
  } else {
    console.log('  no identity configured — Tech > E2E Tests > Settings');
  }
}

const SCENARIOS_MUTATION = `mutation($input: ReportE2eScenariosInput!){
  reportE2eScenarios(input:$input)
}`;

/** Rows one call may carry — the server refuses more. */
const SCENARIO_CHUNK = 500;

/**
 * Every scenario the leg ran, in chunks. The first chunk resets the leg's rows,
 * so a re-run job replaces what an earlier attempt said instead of leaving its
 * vanished scenarios behind; a retried chunk upserts the same keys again.
 */
async function sendScenarios(token, suite, scenarios) {
  // Only the join keys: the input declares no run url, and an undeclared field
  // refuses the whole chunk.
  const { dispatch_id, workflow_run_id } = runIdentity();
  let written = 0;
  for (let i = 0; i < scenarios.length; i += SCENARIO_CHUNK) {
    const data = await gql(
      SCENARIOS_MUTATION,
      {
        input: {
          dispatch_id,
          workflow_run_id,
          suite,
          reset: i === 0,
          scenarios: scenarios.slice(i, i + SCENARIO_CHUNK),
        },
      },
      token
    );
    written += data.reportE2eScenarios;
  }
  console.log(`✓ ${written} scenarios recorded for ${suite}`);
}

/** The leg's counts and scenarios: Cypress's own per-spec results, else the JUnit report. */
function legResults(status) {
  if (status === 'SKIPPED') return { counts: null, scenarios: [] };
  const specs = readSpecResults(env('RESULTS_DIR'));
  if (!specs) return { counts: readJunit(env('JUNIT_DIR') || '.'), scenarios: [] };
  const scenarios = scenariosOf(specs);
  return { counts: countsOf(specs, scenarios), scenarios };
}

async function reportSuite(token) {
  const key = env('SUITE_KEY');
  if (!key) throw new Error('SUITE_KEY is required in suite mode');
  const status = env('SUITE_STATUS') || 'FAILED';
  const { counts, scenarios } = legResults(status);
  const data = await gql(
    REPORT_MUTATION,
    {
      input: {
        ...runIdentity(),
        stage: env('STAGE'),
        suite: {
          key,
          status,
          ...counts,
          error: env('SUITE_ERROR'),
          job_url: env('RUN_URL'),
        },
      },
    },
    token
  );
  const detail = counts ? ` (${counts.passed}/${counts.tests} passed)` : '';
  console.log(`✓ ${data.reportE2eRun.run_no}: ${key} ${status}${detail}`);
  if (scenarios.length > 0) await sendScenarios(token, key, scenarios);
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
