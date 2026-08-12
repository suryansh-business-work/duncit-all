#!/usr/bin/env node
/**
 * CI build reporter — runs at the end of the android-build / ios-build
 * workflows. It:
 *   1. reads the merged commits + diff stat for this push (GIT_BEFORE..GITHUB_SHA),
 *   2. asks the server to sign a direct-to-ImageKit upload (appBuildUploadAuth —
 *      the ImageKit private key never leaves the server, and the artifact goes
 *      straight to upload.imagekit.io so no server body cap applies),
 *   3. calls reportAppBuild, which stores the row the Tech portal's App Builds
 *      tables read and announces the build on the platform's Slack channel.
 *
 * Env:
 *   PLATFORM                 ANDROID | IOS (required)
 *   STATUS                   SUCCESS (default) | FAILED — FAILED reports skip the upload
 *   ARTIFACT_PATH            path to the .apk / .ipa (required for SUCCESS)
 *   DUNCIT_GRAPHQL_URL       default https://server.duncit.com/graphql
 *   DUNCIT_RELEASE_TOKEN     a SUPER_ADMIN / TECH_MANAGER JWT, OR
 *   DUNCIT_RELEASE_EMAIL + DUNCIT_RELEASE_PASSWORD [+ DUNCIT_RELEASE_PORTAL_KEY]
 *   GIT_BEFORE               github.event.before (commit range base)
 *   BUILD_STARTED_AT         unix seconds the job started (for duration)
 *   GITHUB_SHA / GITHUB_REF_NAME / GITHUB_RUN_ID / RUN_URL   provided by Actions
 *
 * Loud by design: a build that cannot be reported is a red workflow, so a
 * missing secret is found the day it happens, not the day someone needs a build.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';

const GRAPHQL_URL = process.env.DUNCIT_GRAPHQL_URL || 'https://server.duncit.com/graphql';
const IMAGEKIT_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';
const MAX_COMMITS = 50;

/* ── git helpers ──────────────────────────────────────────────────────────── */

function tryGit(args) {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

const isValidBase = (sha) =>
  Boolean(sha) && !/^0+$/.test(sha) && tryGit(['cat-file', '-e', sha]) !== null;

/**
 * The changelog base, most-truthful first: the last build the server already
 * recorded for this platform (GitHub keeps only one PENDING run per
 * concurrency group, so a superseded merge's commits would otherwise vanish
 * from every changelog), then this push's own base, then head-only.
 */
function commitRange(lastReportedSha) {
  const head = process.env.GITHUB_SHA || 'HEAD';
  const candidates = [lastReportedSha, (process.env.GIT_BEFORE || '').trim()];
  const base = candidates.find(isValidBase) ?? null;
  return { base, head };
}

/** Control bytes would corrupt the %x1f/%x1e framing into fabricated records. */
const cleanField = (s) => (s || '').replaceAll(/[\x00-\x1f\x7f]/g, ' ').trim();

function getCommits(range) {
  const pretty = '--pretty=format:%H%x1f%s%x1f%an%x1e';
  const args = range.base
    ? ['log', `${range.base}..${range.head}`, '--no-merges', pretty]
    : ['log', '-n', '1', range.head, pretty];
  const out = tryGit(args) || '';
  const commits = out
    .split('\x1e')
    .map((rec) => rec.trim())
    .filter(Boolean)
    .map((rec) => {
      const [hash, subject, author] = rec.split('\x1f');
      return { hash: cleanField(hash), subject: cleanField(subject), author: cleanField(author) };
    })
    // The hash-shape check drops records fabricated by a stray separator byte
    // that survived inside a subject.
    .filter((c) => /^[0-9a-f]{40}$/i.test(c.hash) && c.subject);
  // A pure merge-of-merge push can be all merge commits; fall back to the head
  // commit so the row never ships an empty changelog.
  if (commits.length === 0 && range.base) return getCommits({ base: null, head: range.head });
  return commits.slice(0, MAX_COMMITS);
}

function getStats(range) {
  if (!range.base) return {};
  const out = tryGit(['diff', '--shortstat', `${range.base}..${range.head}`]);
  if (!out) return {};
  const num = (re) => {
    const m = re.exec(out);
    return m ? Number.parseInt(m[1], 10) : null;
  };
  return {
    files_changed: num(/(\d+) file/),
    insertions: num(/(\d+) insertion/),
    deletions: num(/(\d+) deletion/),
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
  // undefined (not null): JSON.stringify drops the key, and the server's yup
  // schema rejects an explicit null portal_key.
  const data = await gql(
    'mutation($input: LoginInput!){ login(input:$input){ token } }',
    { input: { email, password, portal_key: process.env.DUNCIT_RELEASE_PORTAL_KEY || undefined } }
  );
  return data?.login?.token || null;
}

/** The newest build the server has for this platform — the changelog base. */
async function lastReportedSha(token, platform) {
  try {
    const data = await gql(
      `query($platform: AppBuildPlatform!){
        appBuildsTable(platform: $platform, query: { page_size: 1 }) { rows { commit_sha } }
      }`,
      { platform },
      token
    );
    return data?.appBuildsTable?.rows?.[0]?.commit_sha || null;
  } catch {
    return null;
  }
}

async function uploadArtifact(token, filePath) {
  const auth = (
    await gql(
      'mutation{ appBuildUploadAuth{ token expire signature public_key folder } }',
      {},
      token
    )
  ).appBuildUploadAuth;
  const fileName = path.basename(filePath);
  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(filePath)]), fileName);
  form.append('fileName', fileName);
  form.append('useUniqueFileName', 'true');
  form.append('folder', auth.folder);
  form.append('publicKey', auth.public_key);
  form.append('signature', auth.signature);
  form.append('expire', String(auth.expire));
  form.append('token', auth.token);
  const res = await fetch(IMAGEKIT_UPLOAD_URL, { method: 'POST', body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.url) {
    throw new Error(`ImageKit upload failed: ${json.message || res.statusText}`);
  }
  return { url: json.url, fileId: json.fileId || '' };
}

/* ── main ─────────────────────────────────────────────────────────────────── */

const REPORT_MUTATION = `mutation($input: ReportAppBuildInput!){
  reportAppBuild(input:$input){ build_no artifact_url slack_ts slack_error }
}`;

function readVersion() {
  try {
    const appJson = path.join('app', 'mobile-app', 'app.json');
    return JSON.parse(fs.readFileSync(appJson, 'utf8')).expo.version;
  } catch {
    return '0.0.0';
  }
}

function durationSeconds() {
  const started = Number.parseInt(process.env.BUILD_STARTED_AT || '', 10);
  if (Number.isNaN(started)) return null;
  return Math.max(0, Math.floor(Date.now() / 1000) - started);
}

try {
  const platform = (process.env.PLATFORM || '').toUpperCase();
  if (platform !== 'ANDROID' && platform !== 'IOS') {
    throw new Error('PLATFORM must be ANDROID or IOS');
  }
  const status = (process.env.STATUS || 'SUCCESS').toUpperCase() === 'FAILED' ? 'FAILED' : 'SUCCESS';
  const artifactPath = process.env.ARTIFACT_PATH || '';
  if (status === 'SUCCESS' && !fs.existsSync(artifactPath)) {
    throw new Error(`ARTIFACT_PATH does not exist: ${artifactPath}`);
  }

  const token = await resolveToken();
  if (!token) {
    throw new Error(
      [
        'no Duncit credentials — the build cannot be recorded or announced.',
        'Add ONE of these as GitHub Actions repo secrets:',
        '  • DUNCIT_RELEASE_TOKEN=<SUPER_ADMIN / TECH_MANAGER JWT>',
        '  • DUNCIT_RELEASE_EMAIL + DUNCIT_RELEASE_PASSWORD (a TECH_MANAGER account)',
      ].join('\n')
    );
  }

  const range = commitRange(await lastReportedSha(token, platform));
  const commits = getCommits(range);
  const stats = getStats(range);

  let artifact = { url: '', fileId: '' };
  let sizeMb = null;
  if (status === 'SUCCESS') {
    console.log(`Uploading ${path.basename(artifactPath)} to ImageKit…`);
    artifact = await uploadArtifact(token, artifactPath);
    sizeMb = Number((fs.statSync(artifactPath).size / 1024 / 1024).toFixed(2));
  }

  const input = {
    platform,
    status,
    version: readVersion(),
    build_name: status === 'SUCCESS' ? path.basename(artifactPath) : '',
    artifact_url: artifact.url,
    artifact_file_id: artifact.fileId,
    size_mb: sizeMb,
    commit_sha: process.env.GITHUB_SHA || '',
    branch: process.env.GITHUB_REF_NAME || '',
    commits,
    files_changed: stats.files_changed ?? null,
    insertions: stats.insertions ?? null,
    deletions: stats.deletions ?? null,
    workflow_run_id: process.env.GITHUB_RUN_ID || '',
    workflow_run_url: process.env.RUN_URL || '',
    duration_seconds: durationSeconds(),
  };
  const result = (await gql(REPORT_MUTATION, { input }, token)).reportAppBuild;
  console.log(`✓ Recorded ${result.build_no} (${status})`);
  if (result.artifact_url) console.log(`  download: ${result.artifact_url}`);
  if (result.slack_ts) {
    console.log('  announced on Slack');
  } else if (result.slack_error) {
    console.log(`  Slack post skipped: ${result.slack_error}`);
  }
} catch (err) {
  console.error(`✗ report-app-build: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}
