#!/usr/bin/env node
/**
 * Prints the Truecaller identifiers this build must carry, as KEY=value lines
 * for $GITHUB_ENV, read from the server the app is being built for.
 *
 * Truecaller's SDKs read them from the native project — the Android client ID
 * from AndroidManifest meta-data, the iOS app key as a URL scheme and the app
 * link as an associated domain — so they have to exist at `expo prebuild`,
 * not just at runtime. They live in Tech → Environment → Truecaller and reach
 * the build through the same public client config the app reads, so nothing
 * is hardcoded and a change there needs only a new build.
 *
 * Never fails the build: a server that is down or predates these fields
 * prints blanks, and `plugins/withTruecaller` then leaves Truecaller out of
 * the binary (the app shows no Truecaller button).
 *
 * Usage: node scripts/truecaller-build-env.js >> "$GITHUB_ENV"
 * Reads EXPO_PUBLIC_API_URL.
 */
const QUERY =
  '{ publicClientConfig { truecaller_android_client_id truecaller_app_key truecaller_ios_app_link } }';

const KEYS = {
  TRUECALLER_ANDROID_CLIENT_ID: 'truecaller_android_client_id',
  TRUECALLER_APP_KEY: 'truecaller_app_key',
  TRUECALLER_IOS_APP_LINK: 'truecaller_ios_app_link',
};

/** Only characters these identifiers are made of — nothing that could break $GITHUB_ENV. */
const clean = (value) => (typeof value === 'string' ? value.trim().replace(/[^\w.:/-]/g, '') : '');

async function main() {
  const base = String(process.env.EXPO_PUBLIC_API_URL || '').replace(/\/+$/, '');
  let config = {};
  if (base) {
    try {
      const res = await fetch(`${base}/graphql`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: QUERY }),
        signal: AbortSignal.timeout(30_000),
      });
      const json = await res.json();
      config = json?.data?.publicClientConfig ?? {};
      if (json?.errors) console.error('truecaller-build-env: server answered', JSON.stringify(json.errors).slice(0, 300));
    } catch (error) {
      console.error('truecaller-build-env: could not read the public client config —', String(error));
    }
  }
  for (const [env, field] of Object.entries(KEYS)) {
    console.log(`${env}=${clean(config[field])}`);
  }
  console.error(
    `truecaller-build-env: android=${Boolean(config.truecaller_android_client_id)} ios=${Boolean(
      config.truecaller_app_key && config.truecaller_ios_app_link,
    )}`,
  );
}

main();
