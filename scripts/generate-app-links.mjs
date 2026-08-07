/**
 * Write the two files that let a phone open an mWeb link in the app.
 *
 * This is the ONLY thing that makes the jump automatic. Everything else is
 * already in place: the app declares an intent filter for mweb.duncit.com and
 * its router mirrors mWeb's URL grammar, so once the OS hands the URL over it
 * lands on the same page. But Android only hands it over after fetching
 * /.well-known/assetlinks.json and finding the app's signing fingerprint in
 * it, and iOS only after fetching /.well-known/apple-app-site-association.
 * Serve neither and the intent filter is inert — which is exactly what an
 * SPA that answers every path with index.html does.
 *
 *   MWEB_ANDROID_CERT_SHA256=AA:BB:… MWEB_IOS_TEAM_ID=ABCDE12345 \
 *     node scripts/generate-app-links.mjs
 *
 * The package name and bundle id are read from app.json rather than passed in,
 * because two places to change them is one place to forget. The fingerprint and
 * team id come from the environment: they are per-signing-key, so a value
 * committed here would be wrong for anyone who re-signs.
 *
 * A MISSING value writes nothing and removes any stale file. That is
 * deliberate — Android caches a failed verification, so shipping a placeholder
 * is worse than shipping nothing at all.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..');
const outDir = join(repo, 'app', 'mweb', 'public', '.well-known');

const app = JSON.parse(readFileSync(join(repo, 'app', 'mobile-app', 'app.json'), 'utf8')).expo;
const androidPackage = app.android?.package;
const iosBundleId = app.ios?.bundleIdentifier;

/** Several fingerprints are normal: the Play signing key AND the upload key. */
const fingerprints = (process.env.MWEB_ANDROID_CERT_SHA256 ?? '')
  .split(',')
  .map((value) => value.trim().toUpperCase())
  .filter(Boolean);
const teamId = (process.env.MWEB_IOS_TEAM_ID ?? '').trim();

const written = [];
const skipped = [];

mkdirSync(outDir, { recursive: true });

const write = (name, contents) => {
  writeFileSync(join(outDir, name), `${JSON.stringify(contents, null, 2)}\n`);
  written.push(name);
};

const drop = (name, why) => {
  rmSync(join(outDir, name), { force: true });
  skipped.push(`${name} — ${why}`);
};

// --- Android -----------------------------------------------------------------
if (fingerprints.length > 0 && androidPackage) {
  write('assetlinks.json', [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: androidPackage,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ]);
} else {
  drop('assetlinks.json', 'MWEB_ANDROID_CERT_SHA256 is not set');
}

// --- iOS ---------------------------------------------------------------------
if (teamId && iosBundleId) {
  write('apple-app-site-association', {
    applinks: {
      details: [
        {
          appIDs: [`${teamId}.${iosBundleId}`],
          // Everything except the association files themselves — a phone that
          // opened those in the app could never verify anything again.
          components: [{ '/': '/.well-known/*', exclude: true }, { '/': '*' }],
        },
      ],
    },
  });
} else {
  drop('apple-app-site-association', 'MWEB_IOS_TEAM_ID is not set');
}

for (const name of written) console.log(`generate-app-links: wrote .well-known/${name}`);
for (const note of skipped) console.warn(`generate-app-links: SKIPPED ${note}`);
if (skipped.length > 0) {
  console.warn(
    'generate-app-links: links for that platform will open the browser, not the app. See dev.md > Opening an mWeb link in the app.'
  );
}
