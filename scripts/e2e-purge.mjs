#!/usr/bin/env node
/**
 * Remove what the live e2e suite created.
 *
 * The live mWeb leg signs up, applies to host, publishes a pod, raises a
 * ticket and shares an idea — all on a real server. This asks that server to
 * delete every one of them: the accounts whose address carries the run's
 * stamp, and every record the sign-in account named with the run's marker.
 * Runs after Cypress whether the suite passed or failed; a failed run leaves
 * the MOST behind.
 *
 * It talks to the APP server — the one the bundle under test pointed at —
 * which is not always the one the run reports to. A nightly run records itself
 * in production while its live suite drives staging, and the data has to be
 * removed where it was made. That is also why the identity is passed in rather
 * than looked up: the app server may hold no row for this run at all.
 *
 * Env:
 *   E2E_APP_GRAPHQL_URL   the server the suite created its data on (required).
 *   DUNCIT_RELEASE_TOKEN  a SUPER_ADMIN / TECH_MANAGER JWT for THAT server, OR
 *   DUNCIT_RELEASE_EMAIL + DUNCIT_RELEASE_PASSWORD
 *   E2E_STAMP / E2E_EMAIL / E2E_SIGNUP_EMAIL   the run identity, as the leg
 *                         fetched it. Absent means no identity was configured,
 *                         so nothing was created and there is nothing to do.
 *
 * Never fatal to the suite: the verdict is already recorded by the time this
 * runs, and the workflow step carries continue-on-error for the same reason
 * the reporting steps do. It still exits 1 on a refusal, so the log says so.
 */
import process from 'node:process';
import { createCiClient, describeError, MISSING_CREDENTIALS } from './lib/ci-report.mjs';

const env = (name) => (process.env[name] || '').trim();

const PURGE_MUTATION = `mutation($input: PurgeE2eRunDataInput!){
  purgeE2eRunData(input:$input){ accounts_deleted records{ collection deleted } }
}`;

/** Three minutes: the leg has already spent its budget on the suite. */
const RETRY_WINDOW_MS = 3 * 60 * 1000;

try {
  const url = env('E2E_APP_GRAPHQL_URL');
  if (!url) throw new Error('E2E_APP_GRAPHQL_URL is required — which server did the suite create its data on?');
  const stamp = env('E2E_STAMP');
  const signup = env('E2E_SIGNUP_EMAIL');
  const login = env('E2E_EMAIL');
  if (!stamp || !signup || !login) {
    console.log('· no run identity was configured, so the suite created nothing — nothing to purge');
    process.exit(0);
  }
  const { gql, resolveToken } = createCiClient({ url, retryWindowMs: RETRY_WINDOW_MS });
  const token = await resolveToken();
  if (!token) throw new Error(MISSING_CREDENTIALS);
  const data = await gql(
    PURGE_MUTATION,
    { input: { stamp, login_email: login, signup_email: signup } },
    token
  );
  const report = data.purgeE2eRunData;
  console.log(`✓ purged run ${stamp} on ${url}`);
  console.log(`  accounts removed: ${report.accounts_deleted}`);
  for (const row of report.records) {
    console.log(`  ${row.collection}: ${row.deleted}`);
  }
} catch (err) {
  console.error(`✗ e2e-purge: ${describeError(err)}`);
  process.exit(1);
}
