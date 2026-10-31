#!/usr/bin/env node
/**
 * The accounts leg's preflight: can the staging release token do what every
 * spec's first command does — ask staging for the run's traffic key — and does
 * staging know the account this run is about to sign up as?
 *
 * Without this, a missing or refused token is not one failure but two
 * thousand: every spec dies in its setup hook, the leg spends an hour building
 * and serving twenty apps to get there, and the run reads as a broken product
 * instead of one missing secret. This fails in seconds with the reason, and
 * hands it to the suite row as `error`.
 *
 * The second question is the quieter failure. The run's identity — address,
 * phone — is minted by the server the run REPORTS to, but one-time codes are
 * held on the server it DRIVES, and only for the account THAT server's own
 * Tests → E2E → Settings describe. When the two disagree, every code the suite
 * asks for is sent for real instead of held, and the suite fails an hour later
 * with "No code was held for the run account". So the identity staging names
 * must be this run's, and that is checked here, beside the token.
 *
 * Env:
 *   E2E_APP_GRAPHQL_URL    the server under test (staging).
 *   DUNCIT_RELEASE_TOKEN   that server's TECH_MANAGER / SUPER_ADMIN JWT.
 *   E2E_STAMP              the run's stamp, from `Fetch the run identity`.
 *   E2E_SIGNUP_EMAIL       the run account's address, from the same step.
 *   E2E_PHONE              the run phone, from the same step.
 */
import fs from 'node:fs';
import process from 'node:process';

const env = (name) => (process.env[name] || '').trim();

const url = env('E2E_APP_GRAPHQL_URL');
const token = env('DUNCIT_RELEASE_TOKEN');
const stamp = env('E2E_STAMP');
const signup = env('E2E_SIGNUP_EMAIL').toLowerCase();
const phone = env('E2E_PHONE').replaceAll(/\D/g, '');

const ATTEMPTS = 4;
const WAIT_MS = 15_000;

const TRAFFIC_KEY_QUERY = 'query($stamp: String!){ e2eTrafficKey(stamp: $stamp) }';
const SETTINGS_QUERY = 'query{ e2eRunSettings { email_prefix email_domain identity_phone } }';

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
if (!signup || !phone) {
  fail(
    'This run has no account to sign up as: Tests → E2E → Settings on the server the run reports to needs an email ' +
      'prefix, a domain and a run phone.'
  );
}

/** Staging's answer, retried while it is unreachable or restarting — never on a refusal. */
async function ask(what, query, variables = {}) {
  let lastError = '';
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ query, variables }),
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
  return fail(`Staging did not answer the ${what}: ${lastError}.`);
}

const body = await ask('token check', TRAFFIC_KEY_QUERY, { stamp });
const refusal = body?.errors?.[0]?.message;
if (refusal) {
  fail(
    `Staging refused the run's first request (e2eTrafficKey): ${refusal}. The token must be a staging ` +
      'Tech or Super admin CI token, and staging needs Tests → E2E → Settings → "One-time codes for the run account" ON.'
  );
}
if (!body?.data?.e2eTrafficKey) fail('Staging answered the token check without a traffic key.');
console.log('✓ the staging release token works, and staging is an e2e target');

const escapeRe = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/**
 * Every run's address as the driven server's settings describe it — the same
 * shape the server itself builds (e2eRun.identity, runAccountMatcher): the
 * prefix, a 12-digit stamp, an optional `-suffix`, the domain. Null when no
 * run account is configured there at all.
 */
function runAddressOf(settings) {
  const prefix = (settings.email_prefix || '').trim();
  const domain = (settings.email_domain || '').trim().replace(/^@/, '');
  if (!prefix || !domain) return null;
  return new RegExp(String.raw`^${escapeRe(prefix)}\d{12}(?:-[a-z0-9-]{1,40})?@${escapeRe(domain)}$`, 'i');
}

/** The identity staging's settings hold, as a phrase for the refusal. */
function described(settings) {
  const prefix = (settings.email_prefix || '').trim();
  const domain = (settings.email_domain || '').trim();
  const number = (settings.identity_phone || '').replaceAll(/\D/g, '');
  if (!prefix && !domain && !number) return 'no run account at all';
  return `prefix "${prefix}", domain "${domain}", phone "${number}"`;
}

const settingsBody = await ask('settings check', SETTINGS_QUERY);
const settingsRefusal = settingsBody?.errors?.[0]?.message;
if (settingsRefusal) fail(`Staging refused to show its E2E settings (e2eRunSettings): ${settingsRefusal}.`);
const settings = settingsBody?.data?.e2eRunSettings;
if (!settings) fail('Staging answered the settings check without its E2E settings.');

const stagingPhone = (settings.identity_phone || '').replaceAll(/\D/g, '');
if (!runAddressOf(settings)?.test(signup) || stagingPhone !== phone) {
  fail(
    'Staging holds one-time codes only for the run account its OWN Tests → E2E → Settings name, and those name ' +
      `${described(settings)} — not this run's account (${signup}, phone ${phone}). Save the same email prefix, ` +
      'domain and run phone on staging as on the server the run reports to.'
  );
}
console.log(`✓ staging names this run's account (${signup}, phone ${phone}) in its E2E settings`);
