#!/usr/bin/env node
/**
 * The accounts leg's preflight: can the staging release token do what every
 * spec's first command does — ask staging for the run's traffic key?
 *
 * Without this, a missing or refused token is not one failure but two
 * thousand: every spec dies in its setup hook, the leg spends an hour building
 * and serving twenty apps to get there, and the run reads as a broken product
 * instead of one missing secret. This fails in seconds with the reason, and
 * hands it to the suite row as `error`.
 *
 * Env:
 *   E2E_APP_GRAPHQL_URL    the server under test (staging).
 *   DUNCIT_RELEASE_TOKEN   that server's TECH_MANAGER / SUPER_ADMIN JWT.
 *   E2E_STAMP              the run's stamp, from `Fetch the run identity`.
 */
import fs from 'node:fs';
import process from 'node:process';

const url = (process.env.E2E_APP_GRAPHQL_URL || '').trim();
const token = (process.env.DUNCIT_RELEASE_TOKEN || '').trim();
const stamp = (process.env.E2E_STAMP || '').trim();

const ATTEMPTS = 4;
const WAIT_MS = 15_000;

function fail(reason) {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `error=${reason}\n`);
  console.error(`::error::${reason}`);
  process.exit(1);
}

if (!url) fail('E2E_APP_GRAPHQL_URL is not set — the workflow names the server under test.');
if (!token) {
  fail(
    'The repo secret DUNCIT_RELEASE_TOKEN_STAGING is empty, so no spec can start. Sign in to the STAGING ' +
      'Tech portal as a Tech or Super admin, issue a CI token under App Builds → Settings, and save it as that secret.'
  );
}
if (!stamp) fail('This run has no identity stamp: "Fetch the run identity" could not reach the reporting server.');

/** Staging's answer, retried while it is unreachable or restarting — never on a refusal. */
async function ask() {
  let lastError = '';
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: 'query($stamp: String!){ e2eTrafficKey(stamp: $stamp) }', variables: { stamp } }),
        signal: AbortSignal.timeout(30_000),
      });
      if (res.status < 500) return await res.json();
      lastError = `HTTP ${res.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    if (attempt < ATTEMPTS) {
      console.log(`⚠ staging did not answer (${lastError}) — retrying in ${WAIT_MS / 1000}s`);
      await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
    }
  }
  return fail(`Staging did not answer the token check: ${lastError}.`);
}

const body = await ask();
const refusal = body?.errors?.[0]?.message;
if (refusal) {
  fail(
    `Staging refused the run's first request (e2eTrafficKey): ${refusal}. The token must be a staging ` +
      'Tech or Super admin CI token, and staging needs Tests → E2E → Settings → "One-time codes for the run account" ON.'
  );
}
if (!body?.data?.e2eTrafficKey) fail('Staging answered the token check without a traffic key.');
console.log('✓ the staging release token works, and staging is an e2e target');
