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
 * Called TWICE per workflow. Once with STATUS=RUNNING the moment the job starts,
 * which opens the row the Tech portal shows spinning; once at the end with the
 * outcome, which replaces that same row (they are joined on workflow_run_id).
 * Only the second report announces anything on Slack.
 *
 * Env:
 *   PLATFORM                 ANDROID | IOS (required)
 *   STATUS                   RUNNING | SUCCESS (default) | FAILED — only SUCCESS uploads
 *   BUILD_STAGE              what the job is doing now; the stage a FAILED report blames
 *   ERROR_MESSAGE            overrides the BUILD_STAGE-derived failure reason
 *   ARTIFACT_PATHS           newline-separated paths to upload, PRIMARY FIRST
 *                            (Android sends its .apk then its .aab; iOS one .ipa).
 *                            Required for SUCCESS.
 *   PROGRESS_ONLY            '1' to send just "still running, doing X" and stop:
 *                            no changelog, no diff stat, no upload.
 *   DISPATCH_ID              set by the Tech portal; claims the row it already
 *                            created instead of opening a second one.
 *   DUNCIT_GRAPHQL_URL       where to record the build. Defaults to production;
 *                            a portal-started build points this at the server
 *                            that started it, which is not necessarily the one
 *                            the built app talks to.
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
import { setTimeout as sleep } from 'node:timers/promises';

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

/* ── surviving a server that is briefly not there ─────────────────────────── */

/**
 * `fetch` reports every network-level failure as the same three words —
 * "fetch failed" — and hides the errno that says which failure it was on
 * `cause`. Printing only the message turns a DNS miss, a refused connection and
 * a connect timeout into one indistinguishable line, which is how a build can
 * fail twenty-eight times over without anyone learning what it could not reach.
 */
function describeError(err) {
  const seen = [];
  let current = err;
  while (current && seen.length < 4) {
    const message = current instanceof Error ? current.message : String(current);
    if (message && !seen.includes(message)) seen.push(message);
    current = current.cause;
  }
  return seen.join(': ') || 'unknown error';
}

/** What nginx answers with while the container behind it is coming back up. */
const TRANSIENT_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

/**
 * Transient means "the server is not answering right now", which is worth
 * asking again. An ANSWER is not transient however unwelcome it is: a GraphQL
 * error or any other 4xx says the request itself is wrong, and repetition does
 * not improve it — retrying a schema mismatch would just take ten minutes to
 * report the same thing.
 */
function isTransient(err) {
  if (err?.graphQLErrors) return false;
  if (typeof err?.status === 'number') return TRANSIENT_STATUS.has(err.status);
  // Everything undici raises for "could not complete the round trip" — refused,
  // timed out, reset, DNS — arrives as a TypeError carrying the errno on cause.
  return err instanceof TypeError;
}

const RETRY_DELAYS_MS = [5_000, 15_000, 30_000, 60_000];

/**
 * How long to keep trying a round trip that keeps failing transiently.
 *
 * Sized against the thing that actually causes it: THIS SAME MERGE fired the
 * deploy workflow, which restarts the very server the build is reporting to,
 * and an Android build runs long enough to land squarely in that window. Three
 * separate red runs each compiled and signed a perfectly good APK and AAB and
 * then threw both away — twice over an nginx 502 that lasted seconds, once over
 * a connect timeout. A finished build is worth waiting out a restart for.
 *
 * Twenty minutes, not ten, because the deploy it waits out has grown: a merge
 * to main can be redeploying for forty. It is deliberately NOT sized for the
 * other fault seen here — a job whose every connect to the server timed out for
 * its entire life while the same host answered everyone else, which is a
 * source-address block and outlasts any window a job could afford. That one is
 * survived by keeping the artifacts on the run, not by trying for longer.
 *
 * Zero for a progress ping: it is cosmetic, its caller already forgives it with
 * `|| true`, and a build sends seven of them, so retrying each one through an
 * outage would add minutes to every build merely to move a label.
 */
const RETRY_WINDOW_MS = process.env.PROGRESS_ONLY === '1' ? 0 : 20 * 60 * 1000;

/**
 * ONE deadline for the whole reporting phase, fixed when the script starts.
 *
 * It used to be a window granted afresh to every call, which is the wrong shape
 * for the only thing that ever spends it. An unreachable server is unreachable
 * for all of them, so a single outage was paid for three times over — the
 * window on the APK, the whole of it again on the AAB, and again on the report
 * — half an hour of runner time that still ended with the build thrown away,
 * written into the log as three unrelated failures rather than one outage.
 * Sharing the deadline spends that wall-clock once, and because the whole of it
 * is now available to whichever call is in flight, any single call can ride out
 * twice the outage it could before.
 */
const RETRY_DEADLINE = Date.now() + RETRY_WINDOW_MS;

/**
 * The same treatment the workflow already gives the Gradle distribution fetch:
 * try again, backing off, and give up only once the outage has outlived the
 * deadline rather than on the first refusal. A deadline of 0 is already in the
 * past, which is how a caller asks for no retry at all.
 */
async function withRetry(label, run, giveUpAt = RETRY_DEADLINE) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await run();
    } catch (err) {
      const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
      if (!isTransient(err) || Date.now() + delay >= giveUpAt) throw err;
      console.warn(`⚠ ${label}: ${describeError(err)} — retrying in ${delay / 1000}s`);
      await sleep(delay);
    }
  }
}

/* ── graphql + upload ─────────────────────────────────────────────────────── */

async function gqlOnce(query, variables, token) {
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
  if (!res.ok) {
    // Carried so isTransient can tell a gateway that is restarting from a
    // request the server has understood and rejected.
    const err = new Error(`GraphQL HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return json.data;
}

const gql = (query, variables, token, giveUpAt) =>
  withRetry('server request failed', () => gqlOnce(query, variables, token), giveUpAt);

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

/**
 * The newest build the server has for this platform — the changelog base.
 *
 * Skips THIS run's own row. Since the workflow opens a RUNNING row at its start,
 * the newest row is now usually us, and ranging from our own head would give
 * every build an empty changelog.
 */
async function lastReportedSha(token, platform) {
  try {
    const data = await gql(
      `query($platform: AppBuildPlatform!){
        appBuildsTable(platform: $platform, query: { page_size: 5 }) {
          rows { commit_sha workflow_run_id }
        }
      }`,
      { platform },
      token,
      // A deadline already past, i.e. no retry: this only picks a nicer
      // changelog base, and falls back to this push's own base the moment it
      // cannot be had. Spending the shared deadline on an optimisation would
      // leave none for the upload and the report it exists to protect.
      0
    );
    const runId = process.env.GITHUB_RUN_ID || '';
    const rows = data?.appBuildsTable?.rows ?? [];
    return rows.find((r) => r.commit_sha && r.workflow_run_id !== runId)?.commit_sha || null;
  } catch {
    return null;
  }
}

/** APK / AAB / IPA from the file name — the store never renames anything. */
function artifactKind(name) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.aab')) return 'AAB';
  if (lower.endsWith('.ipa')) return 'IPA';
  return 'APK';
}

/** The files this run produced, in workflow order — the first is the primary. */
const artifactPaths = () =>
  (process.env.ARTIFACT_PATHS || '')
    .split(/[\r\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * Upload every artifact, and describe each one either way.
 *
 * A file that fails to store does not sink the others or the report. An Android
 * build whose AAB uploaded and whose APK did not is still a build worth having,
 * and `error` is the field that says which half is missing — the same reasoning
 * that made a SUCCESS-with-no-artifact a legal report in the first place.
 */
async function uploadAll(token, paths) {
  const artifacts = [];
  for (const filePath of paths) {
    const name = path.basename(filePath);
    const kind = artifactKind(name);
    const sizeMb = Number((fs.statSync(filePath).size / 1024 / 1024).toFixed(2));
    console.log(`Uploading ${name} (${sizeMb} MB)…`);
    try {
      // Retried as ONE unit, deliberately: the ticket is spent before the
      // server starts parsing the body, so a second attempt needs a second
      // ticket — reusing the first would be rejected as authoritatively as it
      // deserves to be.
      const { url, fileId } = await withRetry(`upload of ${name} failed`, () =>
        uploadArtifact(token, filePath)
      );
      artifacts.push({ kind, name, url, file_id: fileId, size_mb: sizeMb, error: '' });
    } catch (err) {
      const message = describeError(err);
      console.error(`✗ ${name} was not stored: ${message}`);
      artifacts.push({ kind, name, url: '', file_id: '', size_mb: sizeMb, error: message });
    }
  }
  return artifacts;
}

async function uploadArtifact(token, filePath) {
  // gqlOnce, not gql: uploadAll already retries this whole function, and a
  // retry nested inside a retry would spend the window twice over.
  const auth = (
    await gqlOnce('mutation{ appBuildUploadAuth{ upload_url ticket folder } }', {}, token)
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
    const err = new Error(`Artifact upload failed: ${json.message || res.statusText}`);
    err.status = res.status;
    throw err;
  }
  return { url: json.url, fileId: json.fileId || '' };
}

/* ── main ─────────────────────────────────────────────────────────────────── */

/**
 * Deliberately selects only long-standing fields. The retry below repairs an
 * unknown INPUT field, but nothing can repair a selection set the server has
 * never heard of — so asking for anything new here would reintroduce the exact
 * deploy-race failure it exists to prevent. What was uploaded is already known
 * locally; there is no reason to ask for it back.
 */
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

const STATUSES = new Set(['RUNNING', 'SUCCESS', 'FAILED']);

/**
 * What every report carries regardless of kind, so a build is identifiable
 * before it has produced anything.
 *
 * `dispatch_id` is set only when the Tech portal started this build. It is what
 * lets the run CLAIM the row the portal already created, instead of opening a
 * second one — the dispatch REST call answers with no run id, so this is the
 * only join key that exists on the first report.
 */
function reportIdentity(platform) {
  return {
    platform,
    dispatch_id: (process.env.DISPATCH_ID || '').trim(),
    // Only a push build has a GitHub actor worth naming; a portal build already
    // recorded who pressed the button, and the server keeps that.
    triggered_by: (process.env.GITHUB_ACTOR || '').trim(),
    commit_sha: process.env.GITHUB_SHA || '',
    branch: process.env.GITHUB_REF_NAME || '',
    workflow_run_id: process.env.GITHUB_RUN_ID || '',
    workflow_run_url: process.env.RUN_URL || '',
  };
}

/**
 * A progress ping: "still going, currently doing X".
 *
 * Deliberately skips the changelog, the diff stat and every upload. Those cost
 * git work and an extra round trip, and a build sends one of these before each
 * long stage — paying for the full report seven times to move a label would
 * make the reporting slower than some of the stages it reports.
 */
async function reportProgress(platform, token) {
  const stage = (process.env.BUILD_STAGE || '').trim();
  const result = await reportBuild(
    {
      ...reportIdentity(platform),
      status: 'RUNNING',
      version: readVersion(),
      stage,
      duration_seconds: durationSeconds(),
    },
    token
  );
  console.log(`✓ ${result.build_no}: ${stage || 'running'}`);
}

/**
 * What to blame for a failed build.
 *
 * The workflow sets BUILD_STAGE before each long step, so whatever stage was
 * current when the job died IS the stage that broke — no GitHub API call and no
 * log scraping to find out. A red row that cannot say more than "failed" makes
 * everyone open the run anyway.
 */
function failureMessage() {
  const explicit = (process.env.ERROR_MESSAGE || '').trim();
  if (explicit) return explicit;
  const stage = (process.env.BUILD_STAGE || '').trim();
  if (stage) return `Failed during: ${stage}`;
  return 'The workflow failed before it reported a stage — see the run log.';
}

try {
  const platform = (process.env.PLATFORM || '').toUpperCase();
  if (platform !== 'ANDROID' && platform !== 'IOS') {
    throw new Error('PLATFORM must be ANDROID or IOS');
  }
  const requested = (process.env.STATUS || 'SUCCESS').toUpperCase();
  const status = STATUSES.has(requested) ? requested : 'SUCCESS';
  const progressOnly = (process.env.PROGRESS_ONLY || '') === '1';
  const paths = artifactPaths();
  if (status === 'SUCCESS' && !progressOnly) {
    if (paths.length === 0) {
      throw new Error('ARTIFACT_PATHS is empty — a SUCCESS report must name what it built');
    }
    const missing = paths.filter((p) => !fs.existsSync(p));
    if (missing.length > 0) {
      throw new Error(`ARTIFACT_PATHS names files that do not exist: ${missing.join(', ')}`);
    }
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

  // Nothing below this line is needed to move a progress label, and all of it
  // costs git work or a round trip.
  if (progressOnly) {
    await reportProgress(platform, token);
    process.exit(0);
  }

  const range = commitRange(await lastReportedSha(token, platform));
  const commits = getCommits(range);
  const stats = getStats(range);

  // The app COMPILED. Losing an upload must not lose the announcement — "it
  // builds, but you cannot download it" is the report most worth sending, and
  // throwing used to swallow it entirely. The row and the Slack post go out
  // carrying the reason, and the step still exits 1 below so the workflow stays
  // red and somebody fixes the store.
  const artifacts = status === 'SUCCESS' ? await uploadAll(token, paths) : [];
  const primary = artifacts[0] ?? null;

  const input = {
    ...reportIdentity(platform),
    status,
    version: readVersion(),
    // The stage is the answer on a RUNNING report and part of the reason on a
    // FAILED one, where failureMessage() already names it. A finished build is
    // not in a stage, and the server clears it.
    stage: status === 'RUNNING' ? (process.env.BUILD_STAGE || '').trim() : '',
    error_message: status === 'FAILED' ? failureMessage() : '',
    artifacts,
    // Mirrors of the primary artifact. A server that predates the list still
    // lands the file that matters: the unknown-field retry drops `artifacts`
    // and leaves these standing.
    build_name: primary?.name ?? '',
    artifact_url: primary?.url ?? '',
    artifact_file_id: primary?.file_id ?? '',
    artifact_error: primary?.error ?? '',
    size_mb: primary?.size_mb ?? null,
    commits,
    files_changed: stats.files_changed ?? null,
    insertions: stats.insertions ?? null,
    deletions: stats.deletions ?? null,
    duration_seconds: durationSeconds(),
  };
  const result = await reportBuild(input, token);
  console.log(`✓ Recorded ${result.build_no} (${status})`);
  for (const stored of artifacts.filter((a) => a.url)) {
    console.log(`  ${stored.kind}: ${stored.url}`);
  }
  if (result.slack_ts) {
    console.log('  announced on Slack');
  } else if (result.slack_error) {
    console.log(`  Slack post skipped: ${result.slack_error}`);
  }
  // Recorded and announced, but a file is missing — a real half-failure, so the
  // workflow goes red even though the report itself succeeded.
  const unstored = artifacts.filter((a) => a.error);
  if (unstored.length > 0) {
    const detail = unstored.map((a) => `${a.name} (${a.error})`).join('; ');
    console.error(`✗ report-app-build: recorded, but not stored: ${detail}`);
    process.exit(1);
  }
} catch (err) {
  console.error(`✗ report-app-build: ${describeError(err)}`);
  process.exit(1);
}
