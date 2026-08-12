#!/usr/bin/env node
/**
 * CI build reporter — runs at the end of the android-build / ios-build
 * workflows. It:
 *   1. reads the merged commits + diff stat for this push (GIT_BEFORE..GITHUB_SHA),
 *   2. asks the server for a one-shot upload pass (appBuildUploadAuth) and POSTs
 *      the artifact to the server, which puts it on ImageKit with the private key,
 *   3. calls reportAppBuild, which stores the row the Tech portal's App Builds
 *      tables read and announces the build on the platform's Slack channel.
 *
 * Step 2 used to post straight to upload.imagekit.io with a server-signed
 * signature, to skip the server's body cap. An ImageKit signature only
 * authenticates while the public and private keys are a matched pair from one
 * account, and when they are not it fails with "invalid signature parameter" and
 * names neither key. The server uploads on the private key alone now — no
 * signature, no public key — and the /upload nginx location carries a body cap
 * sized for an artifact.
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
  if (json.errors?.length) {
    const err = new Error(json.errors[0].message || 'GraphQL error');
    err.graphQLErrors = json.errors;
    throw err;
  }
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
    await gql('mutation{ appBuildUploadAuth{ upload_url ticket folder } }', {}, token)
  ).appBuildUploadAuth;
  const fileName = path.basename(filePath);
  const form = new FormData();
  // openAsBlob keeps the artifact on disk and lets fetch stream it. readFileSync
  // would hold 150 MB in the runner's memory for no benefit.
  form.append('file', await fs.openAsBlob(filePath), fileName);
  // The ticket rides the query string, not the body: the server spends it before
  // it starts parsing multipart, so an unauthorised request costs it nothing.
  const query = new URLSearchParams({ ticket: auth.ticket, fileName });
  const res = await fetch(`${auth.upload_url}?${query}`, { method: 'POST', body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.url) {
    throw new Error(`Artifact upload failed: ${json.message || res.statusText}`);
  }
  return { url: json.url, fileId: json.fileId || '' };
}

/* ── main ─────────────────────────────────────────────────────────────────── */

const REPORT_MUTATION = `mutation($input: ReportAppBuildInput!){
  reportAppBuild(input:$input){ build_no artifact_url slack_ts slack_error }
}`;

const UNKNOWN_FIELD_RE = /Field "([^"]+)" is not defined by type "ReportAppBuildInput"/g;

/** Every input field the server said it has never heard of, across all errors. */
function unknownInputFields(err) {
  const names = (err?.graphQLErrors ?? []).flatMap((e) =>
    [...(e.message || '').matchAll(UNKNOWN_FIELD_RE)].map((m) => m[1])
  );
  return [...new Set(names)];
}

/**
 * A merge fires this workflow and the deploy workflow at the same instant, so a
 * build that takes a quarter of an hour can finish reporting BEFORE the server
 * carrying its own commit's schema is live. The only thing that older server
 * cannot accept is whichever field the commit just added — and it names it. Drop
 * exactly those and send again: the row and its Slack post are worth far more
 * than one field, and losing a finished build to a deploy that is four minutes
 * behind is the most expensive way possible to learn nothing.
 */
async function reportBuild(input, token) {
  try {
    return (await gql(REPORT_MUTATION, { input }, token)).reportAppBuild;
  } catch (err) {
    const unknown = unknownInputFields(err);
    if (unknown.length === 0) throw err;
    console.warn(
      `⚠ server predates this commit — resending without: ${unknown.join(', ')}`
    );
    const trimmed = { ...input };
    for (const field of unknown) delete trimmed[field];
    return (await gql(REPORT_MUTATION, { input: trimmed }, token)).reportAppBuild;
  }
}

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
  let artifactError = '';
  let sizeMb = null;
  if (status === 'SUCCESS') {
    sizeMb = Number((fs.statSync(artifactPath).size / 1024 / 1024).toFixed(2));
    console.log(`Uploading ${path.basename(artifactPath)} (${sizeMb} MB)…`);
    try {
      artifact = await uploadArtifact(token, artifactPath);
    } catch (err) {
      // The app COMPILED. Losing the upload must not lose the announcement —
      // "it builds, but you cannot download it" is the report most worth
      // sending, and throwing here used to swallow it entirely. The row and the
      // Slack post go out carrying the reason, and the step still exits 1 below
      // so the workflow stays red and somebody fixes the store.
      artifactError = err instanceof Error ? err.message : String(err);
      console.error(`✗ artifact upload failed: ${artifactError}`);
    }
  }

  const input = {
    platform,
    status,
    version: readVersion(),
    build_name: status === 'SUCCESS' ? path.basename(artifactPath) : '',
    artifact_url: artifact.url,
    artifact_file_id: artifact.fileId,
    artifact_error: artifactError,
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
  const result = await reportBuild(input, token);
  console.log(`✓ Recorded ${result.build_no} (${status})`);
  if (result.artifact_url) console.log(`  download: ${result.artifact_url}`);
  if (result.slack_ts) {
    console.log('  announced on Slack');
  } else if (result.slack_error) {
    console.log(`  Slack post skipped: ${result.slack_error}`);
  }
  // Recorded and announced, but the artifact is missing — a real half-failure,
  // so the workflow goes red even though the report succeeded.
  if (artifactError) {
    console.error(`✗ report-app-build: recorded, but the artifact was not stored: ${artifactError}`);
    process.exit(1);
  }
} catch (err) {
  console.error(`✗ report-app-build: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}
