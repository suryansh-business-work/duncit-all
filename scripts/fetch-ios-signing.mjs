#!/usr/bin/env node
/**
 * Fetches the iOS signing identity for the ios-build workflow from the Duncit
 * server, where Tech → App Builds → Settings generates it through the App Store
 * Connect API — so no Apple certificate, profile or key lives in GitHub.
 *
 * Writes, on the runner only:
 *   $RUNNER_TEMP/duncit-signing.p12           the certificate + private key
 *   $RUNNER_TEMP/duncit.mobileprovision       the App Store profile
 *   ~/.appstoreconnect/private_keys/AuthKey_<KeyID>.p8   where altool looks
 * and appends to $GITHUB_ENV, for the steps after this one:
 *   IOS_P12_PATH IOS_P12_PASSWORD IOS_PROFILE_PATH IOS_PROFILE_UUID
 *   IOS_PROFILE_NAME IOS_TEAM_ID IOS_BUNDLE_ID
 *   APP_STORE_CONNECT_KEY_ID APP_STORE_CONNECT_ISSUER_ID
 *
 * Env: DUNCIT_GRAPHQL_URL (the server the build reports to — each server keeps
 * its own identity, as it signs its own tokens), DUNCIT_RELEASE_TOKEN or
 * DUNCIT_RELEASE_EMAIL + DUNCIT_RELEASE_PASSWORD, RUNNER_TEMP, GITHUB_ENV.
 * APP=CRM (crm-ios-build) asks for the Duncit CRM app's identity instead: the
 * same certificate with the CRM bundle ID's own App Store profile, which the
 * server makes on first use — so that one is a mutation.
 *
 * `--check` (crm-ios-build's preflight) writes no file and moves no key: it
 * sets the step outputs `ready` (true/false) and `reason`. A signing server
 * that is not set up for the CRM app yet is ready=false with exit 0, so a
 * push can skip the macOS build instead of failing it; anything else (no
 * credentials, network, an expired certificate) still exits 1.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { createCiClient, describeError, MISSING_CREDENTIALS } from './lib/ci-report.mjs';

const GRAPHQL_URL = process.env.DUNCIT_GRAPHQL_URL || 'https://server.duncit.com/graphql';
const CRM = (process.env.APP || '').trim().toUpperCase() === 'CRM';
const CHECK = process.argv.includes('--check');

/**
 * What a signing server answers while it is not set up for the CRM app yet,
 * each a step a person has to take — never a code fault worth a red build.
 */
const NOT_SET_UP = [
  {
    match: /Cannot query field "crmIosSigningBundle"/,
    reason: 'The signing server does not have Duncit CRM iOS signing yet: it arrives with the next production deploy (merge staging into main).',
  },
  { match: /Duncit CRM bundle ID/ },
  { match: /No iOS signing files yet/ },
  { match: /App Store Connect is not connected/ },
];

/** Step outputs for the preflight; one line each, as GITHUB_OUTPUT needs. */
function writeOutputs(values) {
  const lines = Object.entries(values).map(([key, value]) => `${key}=${String(value).replaceAll(/\s+/g, ' ')}`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join('\n')}\n`);
}

const BUNDLE_FIELDS = `
    team_id
    bundle_id
    profile_uuid
    profile_name
    profile_base64
    p12_base64
    p12_password
    asc_key_id
    asc_issuer_id
    asc_private_key
`;

// The preflight asks for no key: the answer only has to prove signing works.
const FIELDS = CHECK ? 'bundle_id team_id profile_name' : BUNDLE_FIELDS;

const QUERY = CRM
  ? `mutation CrmIosSigningBundle {
  crmIosSigningBundle {${FIELDS}  }
}`
  : `query IosSigningBundle {
  iosSigningBundle {${FIELDS}  }
}`;

try {
  // A few minutes of patience: the server may be mid-deploy when a build starts.
  const client = createCiClient({ url: GRAPHQL_URL, retryWindowMs: 5 * 60_000 });
  const token = await client.resolveToken();
  if (!token) {
    console.error(`✗ fetch-ios-signing: ${MISSING_CREDENTIALS}`);
    process.exit(1);
  }
  const data = await client.gql(QUERY, {}, token);
  const bundle = CRM ? data.crmIosSigningBundle : data.iosSigningBundle;
  if (CHECK) {
    writeOutputs({ ready: true, reason: '' });
    console.log(`✓ Signing is set up for ${bundle.bundle_id} — team ${bundle.team_id}, profile "${bundle.profile_name}"`);
    process.exit(0);
  }
  // Masked before anything else could print it.
  console.log(`::add-mask::${bundle.p12_password}`);

  const outDir = process.env.RUNNER_TEMP || os.tmpdir();
  const p12Path = path.join(outDir, 'duncit-signing.p12');
  const profilePath = path.join(outDir, 'duncit.mobileprovision');
  fs.writeFileSync(p12Path, Buffer.from(bundle.p12_base64, 'base64'), { mode: 0o600 });
  fs.writeFileSync(profilePath, Buffer.from(bundle.profile_base64, 'base64'));

  const keyDir = path.join(os.homedir(), '.appstoreconnect', 'private_keys');
  fs.mkdirSync(keyDir, { recursive: true });
  fs.writeFileSync(path.join(keyDir, `AuthKey_${bundle.asc_key_id}.p8`), `${bundle.asc_private_key}\n`, {
    mode: 0o600,
  });

  const env = {
    IOS_P12_PATH: p12Path,
    IOS_P12_PASSWORD: bundle.p12_password,
    IOS_PROFILE_PATH: profilePath,
    IOS_PROFILE_UUID: bundle.profile_uuid,
    IOS_PROFILE_NAME: bundle.profile_name,
    IOS_TEAM_ID: bundle.team_id,
    IOS_BUNDLE_ID: bundle.bundle_id,
    APP_STORE_CONNECT_KEY_ID: bundle.asc_key_id,
    APP_STORE_CONNECT_ISSUER_ID: bundle.asc_issuer_id,
  };
  const lines = Object.entries(env).map(([key, value]) => `${key}=${value}`);
  fs.appendFileSync(process.env.GITHUB_ENV, `${lines.join('\n')}\n`);
  console.log(`✓ Signing identity for ${bundle.bundle_id} — team ${bundle.team_id}, profile "${bundle.profile_name}"`);
} catch (err) {
  const message = describeError(err);
  const notSetUp = CHECK ? NOT_SET_UP.find((entry) => entry.match.test(message)) : undefined;
  if (notSetUp) {
    const reason = notSetUp.reason ?? message;
    writeOutputs({ ready: false, reason });
    console.log(`::warning title=Duncit CRM iOS signing is not set up::${reason}`);
    process.exit(0);
  }
  console.error(`✗ fetch-ios-signing: ${message}`);
  process.exit(1);
}
