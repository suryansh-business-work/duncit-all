#!/usr/bin/env node
/**
 * The e2e run's recordings — Cypress writes one video per SPEC, and what anyone
 * actually wants to watch is one video per SUITE, from the first spec's first
 * command to the last spec's last one — and, for the suites that say where each
 * scenario began and ended, one short clip per SCENARIO as well.
 *
 * Two shapes, chosen by MODE, and they run in different jobs on purpose:
 *
 *   stitch   in each matrix leg, straight after Cypress. Joins that leg's spec
 *            videos into one MP4 named after the suite, ready to be carried out
 *            of the job as an artifact. Where a spec video has a `.scenarios.json`
 *            beside it, every scenario in it is also cut into its own clip.
 *   upload   in the gate, after the run has been reported and announced. Sends
 *            every stitched video and every scenario clip to Slack and hangs
 *            them under the run's own message.
 *
 * WHY THE UPLOAD IS NOT IN THE LEG. A recording is shared with `thread_ts`, and
 * the thread it belongs to is the run's announcement — which does not exist
 * until the LAST leg has reported. Uploading from each leg would mean holding a
 * half-finished Slack file for the length of the sweep and completing it forty
 * minutes later; the artifact round-trip costs a few minutes and buys a design
 * where every Slack call happens seconds apart, in one place, with the thread
 * already known.
 *
 * The bytes never touch the Duncit server. `e2eVideoUploadAuth` answers with a
 * PRE-AUTHORISED Slack URL, so the bot token stays on the server and the video
 * goes straight from the runner to Slack.
 *
 * WHERE THE SCENARIO TIMES COME FROM. Cypress 13 stopped reporting where in the
 * video each test began, so a suite that wants per-scenario clips records that
 * itself: its Cypress config writes `<video>.scenarios.json` in `after:spec`,
 * from marks its support file sends with `cy.task` at the start and end of
 * every test (see app/mweb/__tests__/e2e-live/cypress.config.ts). A suite with
 * no sidecar gets the one stitched video and nothing else — exactly what every
 * suite got before scenarios existed.
 *
 * Env (stitch):
 *   SUITE_KEY   the matrix leg's name — becomes the file name.
 *   VIDEO_DIR   where Cypress wrote its per-spec videos.
 *   OUT_DIR     where to write <suite>.mp4 and scenarios/<suite>/*.mp4.
 *
 * Env (upload):
 *   VIDEO_DIR            the downloaded artifacts root. Suite videos sit at its
 *                        top level; scenario clips under scenarios/<suite>/.
 *   DUNCIT_GRAPHQL_URL   where to record. Defaults to production.
 *   DUNCIT_RELEASE_TOKEN a SUPER_ADMIN / TECH_MANAGER JWT, OR
 *   DUNCIT_RELEASE_EMAIL + DUNCIT_RELEASE_PASSWORD
 *   DISPATCH_ID / GITHUB_RUN_ID   which run these belong to.
 *
 * Never fatal to the suite. A run that cannot be watched afterwards is a run
 * that still passed or failed on its own merits, so every refusal here is
 * printed and stepped over — the workflow step carries continue-on-error for
 * the same reason the reporting steps do.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createCiClient, describeError, MISSING_CREDENTIALS } from './lib/ci-report.mjs';

const env = (name) => (process.env[name] || '').trim();

/** The sidecar a scenario-aware suite writes beside each spec video. */
const SIDECAR_SUFFIX = '.scenarios.json';

/** Where the clips of one suite land, under OUT_DIR, and are found again under VIDEO_DIR. */
const SCENARIOS_DIR = 'scenarios';

/** The list of clips a leg cut, read back by the gate. */
const MANIFEST = 'manifest.json';

/* ── finding what Cypress produced ────────────────────────────────────────── */

/** Every file under a directory whose name ends with `suffix`, or an empty list
 * when there is no directory. Recursive: Cypress mirrors the spec tree. */
function filesEndingWith(dir, suffix) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const found = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...filesEndingWith(full, suffix));
    } else if (entry.name.toLowerCase().endsWith(suffix)) {
      found.push(full);
    }
  }
  return found;
}

const videoFiles = (dir) => filesEndingWith(dir, '.mp4');

/**
 * The parts in the order they were RECORDED, which is the order the specs ran.
 *
 * By modified time rather than by name: a suite's specs run in Cypress's own
 * order, and sorting `checkout.cy.mp4` before `home.cy.mp4` would splice the
 * story of the run into the wrong sequence — the one thing a start-to-end
 * recording exists to get right.
 */
function orderedParts(dir) {
  return videoFiles(dir)
    .map((file) => ({ file, at: fs.statSync(file).mtimeMs }))
    .sort((a, b) => a.at - b.at)
    .map((part) => part.file);
}

/* ── ffmpeg ──────────────────────────────────────────────────────────────── */

/**
 * Seconds of video, read out of the file itself.
 *
 * ffprobe ships with ffmpeg, so this costs no dependency the concat did not
 * already need. Null when it cannot be read — a duration is a label on the
 * Slack file, and not having one is no reason to drop the video.
 */
function durationSeconds(file) {
  try {
    const out = execFileSync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file],
      { encoding: 'utf8' }
    );
    const seconds = Number.parseFloat(out.trim());
    return Number.isFinite(seconds) ? Math.round(seconds) : null;
  } catch {
    return null;
  }
}

const ffmpeg = (args) =>
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    stdio: ['ignore', 'inherit', 'inherit'],
  });

/**
 * Join the parts without re-encoding.
 *
 * Every spec in one suite is recorded by the same Cypress at the same viewport
 * and the same frame rate, so the streams are already compatible and `-c copy`
 * is exact as well as fast — a re-encode would spend minutes per leg to produce
 * a worse picture.
 */
function concat(parts, out) {
  const listFile = `${out}.parts.txt`;
  // Absolute paths: the concat demuxer resolves a relative entry against the
  // LIST FILE's folder, not the working directory, so a repo-relative part
  // (`app/mobile-app/cypress-artifacts/videos/…`) was looked for under
  // OUT_DIR and every suite with more than one spec failed to join.
  // Single quotes around each path, and any quote inside one escaped the way
  // the concat demuxer expects. A spec name is developer-controlled, but a
  // list file that cannot be parsed fails the whole join for one apostrophe.
  const escapedQuote = String.raw`'\''`;
  const list = parts.map((p) => `file '${path.resolve(p).replaceAll("'", escapedQuote)}'`).join('\n');
  fs.writeFileSync(listFile, `${list}\n`);
  try {
    ffmpeg(['-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', '-movflags', '+faststart', out]);
  } finally {
    fs.rmSync(listFile, { force: true });
  }
}

/**
 * One scenario, cut out of its spec's video.
 *
 * Re-encoded rather than `-c copy`: a copy can only start on a keyframe, and
 * at the compression Cypress records with those are seconds apart — a clip
 * that opens a few seconds before its scenario is a clip that opens on the
 * previous one's last screen. The clips are short and the runner is idle by
 * now, so the seconds this costs are cheap.
 */
function cut(source, startSeconds, seconds, out) {
  ffmpeg([
    '-ss', startSeconds.toFixed(3),
    '-i', source,
    '-t', seconds.toFixed(3),
    // A phone viewport is 412x915 and x264 refuses an odd dimension — the
    // same even-rounding Cypress's own recorder applies.
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '30', '-pix_fmt', 'yuv420p',
    '-an', '-movflags', '+faststart',
    out,
  ]);
}

/* ── stitch ──────────────────────────────────────────────────────────────── */

/**
 * Breathing room around a scenario, in seconds.
 *
 * The marks are taken from inside the browser and the recording starts a
 * moment before the first of them, so the clip opens slightly early and closes
 * slightly late — the last assertion's screen is what a viewer wants to see,
 * and the lead-in is what tells them the clip has started.
 */
const LEAD_SECONDS = 1;
const TAIL_SECONDS = 1.5;

/** A file name a shell, a zip and Slack all accept, from a scenario title. */
function slug(title) {
  const words = title.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  return words.join('-').slice(0, 80) || 'scenario';
}

/** The sidecar beside a spec video, parsed, or null when the spec wrote none. */
function readSidecar(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(parsed?.scenarios) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Every scenario clip of one suite, written under OUT_DIR/scenarios/<suite>/,
 * with a manifest the gate reads them back by. Returns how many were cut.
 *
 * Numbered in the order they ran so the folder — and the Slack thread — reads
 * top to bottom the way the suite did.
 */
function cutScenarios(suite, videoDir, outDir) {
  const sidecars = filesEndingWith(videoDir, SIDECAR_SUFFIX)
    .map((file) => ({ file, at: fs.statSync(file).mtimeMs }))
    .sort((a, b) => a.at - b.at)
    .map((entry) => entry.file);
  if (sidecars.length === 0) return 0;

  const clipDir = path.join(outDir, SCENARIOS_DIR, suite);
  fs.mkdirSync(clipDir, { recursive: true });
  const manifest = [];

  for (const sidecarFile of sidecars) {
    const sidecar = readSidecar(sidecarFile);
    const source = sidecarFile.slice(0, -SIDECAR_SUFFIX.length);
    if (!sidecar || !fs.existsSync(source)) continue;
    for (const scenario of sidecar.scenarios) {
      const title = String(scenario.title ?? '').trim();
      const startMs = Number(scenario.start_ms);
      const endMs = Number(scenario.end_ms);
      if (!title || !Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) continue;
      const index = manifest.length + 1;
      const file = path.join(clipDir, `${String(index).padStart(2, '0')}-${slug(title)}.mp4`);
      const start = Math.max(startMs / 1000 - LEAD_SECONDS, 0);
      const seconds = endMs / 1000 - start + TAIL_SECONDS;
      try {
        cut(source, start, seconds, file);
      } catch (err) {
        console.log(`· ${suite}: could not cut "${title}" — ${describeError(err)}`);
        continue;
      }
      manifest.push({
        suite,
        spec: String(sidecar.spec ?? ''),
        title,
        state: String(scenario.state ?? ''),
        file: path.basename(file),
        seconds: durationSeconds(file),
      });
    }
  }

  fs.writeFileSync(path.join(clipDir, MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest.length;
}

function stitch() {
  const suite = env('SUITE_KEY');
  if (!suite) throw new Error('SUITE_KEY is required in stitch mode');
  const videoDir = env('VIDEO_DIR') || '.';
  const parts = orderedParts(videoDir);
  if (parts.length === 0) {
    console.log(`· ${suite}: nothing was recorded`);
    return;
  }
  const outDir = env('OUT_DIR') || '.';
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `${suite}.mp4`);

  if (parts.length === 1) {
    fs.copyFileSync(parts[0], out);
  } else {
    concat(parts, out);
  }
  const seconds = durationSeconds(out);
  const mb = (fs.statSync(out).size / 1024 / 1024).toFixed(1);
  const from = parts.length === 1 ? '1 spec' : `${parts.length} specs`;
  console.log(`✓ ${suite}: ${from} → ${path.basename(out)} (${mb} MB, ${seconds ?? '?'}s)`);

  const clips = cutScenarios(suite, videoDir, outDir);
  if (clips > 0) console.log(`✓ ${suite}: ${clips} scenario clips → ${SCENARIOS_DIR}/${suite}/`);
}

/* ── upload ──────────────────────────────────────────────────────────────── */

const GRAPHQL_URL = process.env.DUNCIT_GRAPHQL_URL || 'https://server.duncit.com/graphql';

/**
 * Five minutes. Shorter than the reporter's ten because by the time this runs
 * the verdict is already recorded — the run is readable without its videos, so
 * an outage here is worth riding out briefly and not worth holding a runner
 * open for.
 */
const RETRY_WINDOW_MS = 5 * 60 * 1000;

const { gql, resolveToken } = createCiClient({ url: GRAPHQL_URL, retryWindowMs: RETRY_WINDOW_MS });

const AUTH_MUTATION = `mutation($input: E2eVideoUploadAuthInput!){
  e2eVideoUploadAuth(input:$input){ ok upload_url file_id reason }
}`;

const ATTACH_MUTATION = `mutation($input: AttachE2eRunVideosInput!){
  attachE2eRunVideos(input:$input){ run_no video_error }
}`;

const runIdentity = () => ({
  dispatch_id: env('DISPATCH_ID'),
  workflow_run_id: env('GITHUB_RUN_ID'),
});

/**
 * Send one file's bytes to the pre-authorised Slack URL.
 *
 * No Authorization header, and that is the point of the whole three-call
 * flow: the URL carries its own signature, which is what lets a runner upload
 * a video while the bot token stays on the Duncit server. A 401 or 403 here
 * would mean that assumption is wrong — so the refusal is reported with
 * Slack's own words rather than a bare status.
 *
 * `openAsBlob` rather than `readFileSync`: the runner holds a whole sweep's
 * recordings and reading each one into memory to post it would put a hundred
 * megabytes on the heap for no reason.
 */
async function putBytes(url, file) {
  const form = new FormData();
  form.append('file', await fs.openAsBlob(file), path.basename(file));
  const res = await fetch(url, { method: 'POST', body: form });
  if (!res.ok) {
    const said = (await res.text().catch(() => '')).trim().slice(0, 200);
    throw new Error(`Slack refused the upload of ${path.basename(file)}: HTTP ${res.status}${said ? ` — ${said}` : ''}`);
  }
}

/** The suite videos: the top level of VIDEO_DIR, one file per leg. */
function suiteVideos(root) {
  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.mp4'))
    .map((entry) => ({ suite: path.basename(entry.name, '.mp4'), file: path.join(root, entry.name) }));
}

/** Every scenario clip a leg cut, from the manifests under VIDEO_DIR/scenarios/. */
function scenarioClips(root) {
  const clips = [];
  for (const manifestFile of filesEndingWith(path.join(root, SCENARIOS_DIR), MANIFEST)) {
    let rows;
    try {
      rows = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    } catch {
      continue;
    }
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      const file = path.join(path.dirname(manifestFile), String(row.file ?? ''));
      if (fs.existsSync(file)) clips.push({ ...row, file });
    }
  }
  return clips;
}

/**
 * Reserve a place in Slack for one file and send its bytes there. Returns the
 * file id, or null when the run is not keeping recordings — which is about
 * the RUN, not the file, so the caller stops asking.
 */
async function uploadOne(token, suite, file) {
  const bytes = fs.statSync(file).size;
  const auth = await gql(
    AUTH_MUTATION,
    { input: { ...runIdentity(), suite, file_name: path.basename(file), length: bytes } },
    token
  );
  const slot = auth.e2eVideoUploadAuth;
  if (!slot.ok) {
    console.log(`· recordings are not being kept: ${slot.reason}`);
    return null;
  }
  await putBytes(slot.upload_url, file);
  return { file_id: slot.file_id, bytes };
}

async function upload(token) {
  const root = env('VIDEO_DIR') || '.';
  const suites = suiteVideos(root);
  const clips = scenarioClips(root);
  if (suites.length === 0 && clips.length === 0) {
    console.log('· no recordings were produced by this run');
    return;
  }

  const videos = [];
  for (const { suite, file } of suites) {
    const sent = await uploadOne(token, suite, file);
    if (!sent) return;
    videos.push({ suite, file_id: sent.file_id, seconds: durationSeconds(file), bytes: sent.bytes });
    console.log(`✓ ${suite}: uploaded ${(sent.bytes / 1024 / 1024).toFixed(1)} MB`);
  }

  const scenarios = [];
  for (const clip of clips) {
    const sent = await uploadOne(token, clip.suite, clip.file);
    if (!sent) return;
    scenarios.push({
      suite: clip.suite,
      spec: clip.spec,
      title: clip.title,
      state: clip.state,
      file_id: sent.file_id,
      seconds: clip.seconds ?? durationSeconds(clip.file),
      bytes: sent.bytes,
    });
  }
  if (scenarios.length > 0) console.log(`✓ ${scenarios.length} scenario clips uploaded`);

  const data = await gql(ATTACH_MUTATION, { input: { ...runIdentity(), videos, scenarios } }, token);
  const { run_no, video_error } = data.attachE2eRunVideos;
  if (video_error) {
    console.log(`⚠ ${run_no}: the recordings were uploaded but not shared — ${video_error}`);
    return;
  }
  console.log(`✓ ${run_no}: ${videos.length} recordings and ${scenarios.length} scenario clips posted under the run's message`);
}

/* ── entry ───────────────────────────────────────────────────────────────── */

try {
  const mode = env('MODE');
  if (mode === 'stitch') {
    stitch();
  } else if (mode === 'upload') {
    const token = await resolveToken();
    if (!token) throw new Error(MISSING_CREDENTIALS);
    await upload(token);
  } else {
    throw new Error(`MODE must be stitch or upload — got "${mode}"`);
  }
} catch (err) {
  console.error(`✗ e2e-videos: ${describeError(err)}`);
  process.exit(1);
}
