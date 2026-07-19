#!/usr/bin/env node
/**
 * Post-build release notifier. After a local APK build, this:
 *   1. reads the git commits + diff stat since the last emailed build,
 *   2. uploads the APK straight to ImageKit (bypassing the 25 MB nginx cap,
 *      using the server's getImagekitAuth signature — same path the web client
 *      uses for large uploads),
 *   3. calls the server `sendAppReleaseEmail` mutation, which asks OpenAI to
 *      summarise the commits into a proper MJML changelog email and sends it
 *      (with a Download-APK button) to the release distribution list.
 *
 * Credentials (SMTP + OpenAI) live only in the Tech portal env entries — this
 * script never sees them; the server resolves them when sending.
 *
 * Auth (one of):
 *   DUNCIT_RELEASE_TOKEN                a SUPER_ADMIN / TECH_MANAGER JWT, OR
 *   DUNCIT_RELEASE_EMAIL + DUNCIT_RELEASE_PASSWORD [+ DUNCIT_RELEASE_PORTAL_KEY]
 *
 * Optional:
 *   DUNCIT_GRAPHQL_URL        default https://server.duncit.com/graphql
 *   DUNCIT_RELEASE_FOLDER     ImageKit folder, default /app-builds
 *   DUNCIT_RELEASE_RECIPIENTS comma-separated override for the mail list
 *
 * Standalone:  node scripts/release-notify.js --file "build/duncit-... V1.4.19.apk"
 *
 * Every failure is non-fatal — a build must never fail because the email did.
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const appDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appDir, '..', '..');
const stateFile = path.join(repoRoot, 'build', '.last-release-sha.json');

const GRAPHQL_URL = process.env.DUNCIT_GRAPHQL_URL || 'https://server.duncit.com/graphql';
const IMAGEKIT_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';
const FOLDER = process.env.DUNCIT_RELEASE_FOLDER || '/app-builds';

/* ── git helpers ──────────────────────────────────────────────────────────── */

function tryGit(args) {
  try {
    // stdio: pipe stdout (returned), discard stderr so git's "fatal:" notices
    // (e.g. no tags for `describe`) don't leak into the build output.
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function readLastSha() {
  try {
    const sha = JSON.parse(fs.readFileSync(stateFile, 'utf8')).sha;
    return typeof sha === 'string' && sha ? sha : null;
  } catch {
    return null;
  }
}

/** Pick the commit range to describe: last emailed build → last tag → last 30. */
function determineRange() {
  const lastSha = readLastSha();
  if (lastSha && tryGit(['cat-file', '-e', lastSha]) !== null) {
    return { base: lastSha, label: 'since the last emailed build' };
  }
  const tag = tryGit(['describe', '--tags', '--abbrev=0']);
  if (tag) return { base: tag, label: `since ${tag}` };
  return { base: null, label: 'last 30 commits' };
}

function getCommits(base) {
  const pretty = '--pretty=format:%H%x1f%s%x1f%b%x1e';
  const args = base
    ? ['log', `${base}..HEAD`, '--no-merges', pretty]
    : ['log', '-n', '30', '--no-merges', pretty];
  const out = tryGit(args) || '';
  return out
    .split('\x1e')
    .map((rec) => rec.trim())
    .filter(Boolean)
    .map((rec) => {
      const [hash, subject, body] = rec.split('\x1f');
      return { hash: (hash || '').trim(), subject: (subject || '').trim(), body: (body || '').trim() || null };
    })
    .filter((c) => c.hash && c.subject);
}

function getStats(base) {
  if (!base) return {};
  const out = tryGit(['diff', '--shortstat', `${base}..HEAD`]);
  if (!out) return {};
  const num = (re) => {
    const m = re.exec(out);
    return m ? Number.parseInt(m[1], 10) : null;
  };
  return {
    files_changed: num(/(\d+) files? changed/),
    insertions: num(/(\d+) insertions?/),
    deletions: num(/(\d+) deletions?/),
  };
}

/* ── graphql + upload ─────────────────────────────────────────────────────── */

async function gql(query, variables, token) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json().catch(() => ({}));
  if (json.errors?.length) throw new Error(json.errors[0].message || 'GraphQL error');
  if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`);
  return json.data;
}

async function resolveToken() {
  if (process.env.DUNCIT_RELEASE_TOKEN) return process.env.DUNCIT_RELEASE_TOKEN;
  const email = process.env.DUNCIT_RELEASE_EMAIL;
  const password = process.env.DUNCIT_RELEASE_PASSWORD;
  if (!email || !password) return null;
  const data = await gql(
    `mutation($input: LoginInput!){ login(input:$input){ token } }`,
    { input: { email, password, portal_key: process.env.DUNCIT_RELEASE_PORTAL_KEY || null } },
  );
  return data?.login?.token || null;
}

async function uploadApk(token, filePath) {
  const auth = (
    await gql(
      `mutation{ getImagekitAuth{ token expire signature publicKey } }`,
      {},
      token,
    )
  ).getImagekitAuth;
  const fileName = path.basename(filePath);
  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(filePath)]), fileName);
  form.append('fileName', fileName);
  form.append('useUniqueFileName', 'true');
  form.append('folder', FOLDER);
  form.append('publicKey', auth.publicKey);
  form.append('signature', auth.signature);
  form.append('expire', String(auth.expire));
  form.append('token', auth.token);
  const res = await fetch(IMAGEKIT_UPLOAD_URL, { method: 'POST', body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.url) throw new Error(`ImageKit upload failed: ${json.message || res.statusText}`);
  return json.url;
}

function recipientsFromEnv() {
  const raw = process.env.DUNCIT_RELEASE_RECIPIENTS;
  if (!raw) return null;
  const list = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return list.length ? list : null;
}

/* ── main entry ───────────────────────────────────────────────────────────── */

const SEND_MUTATION = `mutation($input: SendAppReleaseEmailInput!){
  sendAppReleaseEmail(input:$input){ ok message recipients }
}`;

async function notifyRelease({ apkPath, version, buildName }) {
  if (!apkPath || !apkPath.toLowerCase().endsWith('.apk')) {
    console.log('ℹ  release-notify: not an APK, skipping email.');
    return;
  }
  const token = await resolveToken();
  if (!token) {
    console.warn(
      [
        '',
        '⚠  release-notify: NO RELEASE EMAIL SENT — release credentials are not set.',
        '   The APK built fine, but sending the changelog mail needs a SUPER_ADMIN / TECH_MANAGER login.',
        '   Set ONE of these (then re-build, or re-send standalone with the command below):',
        '     • DUNCIT_RELEASE_TOKEN=<jwt>',
        '     • DUNCIT_RELEASE_EMAIL=<email> DUNCIT_RELEASE_PASSWORD=<password> [DUNCIT_RELEASE_PORTAL_KEY=<key>]',
        `   Re-send this build:  node scripts/release-notify.js --file "${apkPath}"`,
        '',
      ].join('\n'),
    );
    return;
  }

  const { base, label } = determineRange();
  const commits = getCommits(base);
  const stats = getStats(base);
  console.log(`\n📧  release-notify: ${commits.length} commit(s) ${label}. Uploading APK…`);

  const apkUrl = await uploadApk(token, apkPath);
  const sizeMb = fs.statSync(apkPath).size / 1024 / 1024;

  const input = {
    version,
    build_name: buildName,
    apk_url: apkUrl,
    apk_size_mb: Number(sizeMb.toFixed(2)),
    commits,
    range_label: label,
    files_changed: stats.files_changed ?? null,
    insertions: stats.insertions ?? null,
    deletions: stats.deletions ?? null,
    recipients: recipientsFromEnv(),
  };
  const result = (await gql(SEND_MUTATION, { input }, token)).sendAppReleaseEmail;
  console.log(`✓  ${result.message}: ${result.recipients.join(', ')}`);

  const head = tryGit(['rev-parse', 'HEAD']);
  if (head) fs.writeFileSync(stateFile, JSON.stringify({ sha: head, at: new Date().toISOString() }));
}

/** Best-effort wrapper — never throws, so a notify failure can't fail a build. */
async function notifyReleaseSafe(opts) {
  try {
    await notifyRelease(opts);
  } catch (err) {
    console.error(`⚠  release-notify skipped: ${err.message}`);
  }
}

module.exports = { notifyRelease, notifyReleaseSafe, determineRange, getCommits, getStats };

/* Standalone: node scripts/release-notify.js --file "<path-to.apk>" */
if (require.main === module) {
  const idx = process.argv.indexOf('--file');
  const file = idx >= 0 ? process.argv[idx + 1] : process.env.RELEASE_APK_PATH;
  if (!file) {
    console.error('Usage: node scripts/release-notify.js --file "<path-to.apk>"');
    process.exit(1);
  }
  const version = (() => {
    try {
      return JSON.parse(fs.readFileSync(path.join(appDir, 'app.json'), 'utf8')).expo.version;
    } catch {
      return '0.0.0';
    }
  })();
  const buildName = path.basename(file).replace(/\.apk$/i, '');
  notifyReleaseSafe({ apkPath: file, version, buildName }).then(() => process.exit(0));
}
