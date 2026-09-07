#!/usr/bin/env node
/**
 * The e2e run's recordings — Cypress writes one video per SPEC, and what anyone
 * actually wants to watch is one video per SUITE, from the first spec's first
 * command to the last spec's last one.
 *
 * Two shapes, chosen by MODE, and they run in different jobs on purpose:
 *
 *   stitch   in each matrix leg, straight after Cypress. Joins that leg's spec
 *            videos into one MP4 named after the suite, ready to be carried out
 *            of the job as an artifact.
 *   upload   in the gate, after the run has been reported and announced. Sends
 *            every stitched video to Slack and hangs them under the run's own
 *            message.
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
 * Env (stitch):
 *   SUITE_KEY   the matrix leg's name — becomes the file name.
 *   VIDEO_DIR   where Cypress wrote its per-spec videos.
 *   OUT_DIR     where to write <suite>.mp4.
 *
 * Env (upload):
 *   VIDEO_DIR            the downloaded artifacts root, searched recursively.
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

/* ── finding what Cypress produced ────────────────────────────────────────── */

/** Every .mp4 under a directory, or an empty list when there is no directory. */
function videoFiles(dir) {
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
      found.push(...videoFiles(full));
    } else if (entry.name.toLowerCase().endsWith('.mp4')) {
      found.push(full);
    }
  }
  return found;
}

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

/* ── stitch ──────────────────────────────────────────────────────────────── */

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
  // Single quotes around each path, and any quote inside one escaped the way
  // the concat demuxer expects. A spec name is developer-controlled, but a
  // list file that cannot be parsed fails the whole join for one apostrophe.
  const list = parts.map((p) => `file '${p.replaceAll("'", String.raw`'\''`)}'`).join('\n');
  fs.writeFileSync(listFile, `${list}\n`);
  try {
    execFileSync(
      'ffmpeg',
      ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', listFile,
        '-c', 'copy', '-movflags', '+faststart', out],
      { stdio: ['ignore', 'inherit', 'inherit'] }
    );
  } finally {
    fs.rmSync(listFile, { force: true });
  }
}

function stitch() {
  const suite = env('SUITE_KEY');
  if (!suite) throw new Error('SUITE_KEY is required in stitch mode');
  const parts = orderedParts(env('VIDEO_DIR') || '.');
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

async function upload(token) {
  const files = videoFiles(env('VIDEO_DIR') || '.');
  if (files.length === 0) {
    console.log('· no recordings were produced by this run');
    return;
  }
  const videos = [];
  for (const file of files) {
    const suite = path.basename(file, '.mp4');
    const bytes = fs.statSync(file).size;
    const auth = await gql(
      AUTH_MUTATION,
      { input: { ...runIdentity(), suite, file_name: path.basename(file), length: bytes } },
      token
    );
    const slot = auth.e2eVideoUploadAuth;
    // A refusal is about the RUN, not about this file — recording is off, no
    // channel is configured, the token cannot write files — so there is nothing
    // to gain by asking again for the other eighteen.
    if (!slot.ok) {
      console.log(`· recordings are not being kept: ${slot.reason}`);
      return;
    }
    await putBytes(slot.upload_url, file);
    videos.push({
      suite,
      file_id: slot.file_id,
      seconds: durationSeconds(file),
      bytes,
    });
    console.log(`✓ ${suite}: uploaded ${(bytes / 1024 / 1024).toFixed(1)} MB`);
  }

  const data = await gql(ATTACH_MUTATION, { input: { ...runIdentity(), videos } }, token);
  const { run_no, video_error } = data.attachE2eRunVideos;
  if (video_error) {
    console.log(`⚠ ${run_no}: the recordings were uploaded but not shared — ${video_error}`);
    return;
  }
  console.log(`✓ ${run_no}: ${videos.length} recordings posted under the run's message`);
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
