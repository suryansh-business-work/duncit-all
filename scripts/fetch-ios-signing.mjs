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
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { createCiClient, describeError, MISSING_CREDENTIALS } from './lib/ci-report.mjs';

const GRAPHQL_URL = process.env.DUNCIT_GRAPHQL_URL || 'https://server.duncit.com/graphql';

const QUERY = `query IosSigningBundle {
  iosSigningBundle {
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
  }
}`;

try {
  // A few minutes of patience: the server may be mid-deploy when a build starts.
  const client = createCiClient({ url: GRAPHQL_URL, retryWindowMs: 5 * 60_000 });
  const token = await client.resolveToken();
  if (!token) {
    console.error(`✗ fetch-ios-signing: ${MISSING_CREDENTIALS}`);
    process.exit(1);
  }
  const { iosSigningBundle: bundle } = await client.gql(QUERY, {}, token);
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
  console.error(`✗ fetch-ios-signing: ${describeError(err)}`);
  process.exit(1);
}
