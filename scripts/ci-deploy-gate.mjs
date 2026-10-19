#!/usr/bin/env node
/**
 * Deploy checkpoint: skip an image whose inputs are exactly what is already
 * deployed on this branch.
 *
 *   node scripts/ci-deploy-gate.mjs gate   <ledger.json>   (env CHANGES, BUILD_SECRETS)
 *   node scripts/ci-deploy-gate.mjs record <ledger.json>   (env DEPLOYED, HASHES)
 *
 * WHY THIS EXISTS
 * ---------------
 * deploy.yml's `changes` job diffs against the last FULLY green deploy run. A
 * wide change (anything under packages/ selects every image) where ONE build
 * fails leaves the run red, so the fix commit diffs against the older green run
 * again and rebuilds all ~40 images — the ones that built AND deployed fine in
 * the red run included. That is the "one failure costs another hour" loop.
 *
 * `gate`   takes the services paths-filter selected (CHANGES, its `changes`
 *          output) and drops each one whose input key equals the key the
 *          ledger says is LIVE for it. The key is the git blob ids of every
 *          tracked file its own paths-filter globs match (read from deploy.yml,
 *          so the two can never disagree), plus deploy.yml itself, plus a
 *          digest of the secrets the builds bake in (deploy.yml names them
 *          one by one in BUILD_SECRETS) — rotate one and every key changes. The ledger maps a service to the
 *          LAST key deployed, not every key ever deployed: after A → B → A the
 *          VPS runs B, so A must rebuild.
 *          Writes `<service>=true|false` for every filter and `hashes`.
 *          Any error selects exactly what paths-filter selected: a slow deploy
 *          is a cost, a skipped one is an outage of the fix.
 *
 * `record` runs after the deploy job's health check passes and writes the key
 *          of every service it restarted (DEPLOYED, deploy job spelling with
 *          `-`) into the ledger.
 *
 * Zero dependencies: runs before `pnpm install`.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { globToRegex } from './ci-affected.mjs';

const WORKFLOW = '.github/workflows/deploy.yml';

const sha = (text) => createHash('sha256').update(text).digest('hex');

/** service -> globs, from the `filters: |` block paths-filter reads. */
export function readFilters(yaml) {
  const lines = yaml.split(/\r?\n/);
  const start = lines.findIndex((l) => /^\s+filters: \|\s*$/.test(l));
  if (start === -1) throw new Error(`no "filters: |" block in ${WORKFLOW}`);
  const outer = lines[start].search(/\S/);
  const filters = {};
  let current = null;
  for (const line of lines.slice(start + 1)) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    if (line.search(/\S/) <= outer) break;
    const key = /^\s+([a-z_]+):\s*$/.exec(line)?.[1];
    const glob = /^\s+-\s+'([^']+)'\s*$/.exec(line)?.[1];
    if (key) {
      current = key;
      filters[key] = [];
    } else if (glob && current) filters[current].push(glob);
    else throw new Error(`unrecognised filter line: ${line.trim()}`);
  }
  if (Object.keys(filters).length === 0) throw new Error('the filters block is empty');
  return filters;
}

/** The build-baked secrets (one per line, as deploy.yml lists them) as one digest. */
export function envDigest(secrets = '') {
  return sha(secrets);
}

/** `mode blob stage\tpath` for every tracked file. */
function indexEntries() {
  return execFileSync('git', ['ls-files', '-s', '-z'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
    .split('\0')
    .filter(Boolean)
    .map((entry) => ({ entry, file: entry.slice(entry.indexOf('\t') + 1) }));
}

export function serviceKey(globs, entries, digest) {
  const patterns = [...globs, WORKFLOW].map(globToRegex);
  const inputs = entries.filter(({ file }) => patterns.some((re) => re.test(file))).map(({ entry }) => entry);
  return sha([digest, ...inputs].join('\n')).slice(0, 32);
}

function readLedger(file) {
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
}

function output(lines) {
  const out = process.env.GITHUB_OUTPUT;
  if (out) appendFileSync(out, `${lines.join('\n')}\n`);
}

function gate(ledgerFile) {
  const changed = new Set(JSON.parse(process.env.CHANGES || '[]'));
  let filters;
  try {
    filters = readFilters(readFileSync(WORKFLOW, 'utf8'));
    const digest = envDigest(process.env.BUILD_SECRETS);
    const entries = indexEntries();
    const live = readLedger(ledgerFile);
    const hashes = Object.fromEntries([...changed].map((s) => [s, serviceKey(filters[s] ?? [], entries, digest)]));
    const skipped = [...changed].filter((s) => filters[s] && live[s] === hashes[s]);
    if (skipped.length > 0) console.log(`already live with identical inputs, not rebuilt: ${skipped.join(' ')}`);
    const build = [...changed].filter((s) => !skipped.includes(s));
    console.log(`to build: ${build.join(' ') || '(nothing)'}`);
    output([...Object.keys(filters).map((s) => `${s}=${build.includes(s)}`), `hashes=${JSON.stringify(hashes)}`]);
  } catch (err) {
    console.log(`::warning::deploy checkpoint unavailable (${err.message}) — building everything paths-filter selected`);
    output([...(filters ? Object.keys(filters) : changed)].map((s) => `${s}=${changed.has(s)}`).concat('hashes={}'));
  }
}

function record(ledgerFile) {
  const hashes = JSON.parse(process.env.HASHES || '{}');
  const deployed = (process.env.DEPLOYED || '').split(/\s+/).filter(Boolean).map((s) => s.replaceAll('-', '_'));
  const ledger = readLedger(ledgerFile);
  // Deployed without a key (a manual dispatch rebuilds services paths-filter did
  // not select): what is live is unknown, so forget it rather than keep a key
  // that a later revert could falsely match.
  for (const s of deployed) {
    if (hashes[s]) ledger[s] = hashes[s];
    else delete ledger[s];
  }
  writeFileSync(ledgerFile, `${JSON.stringify(ledger, null, 2)}\n`);
  console.log(`recorded as live: ${deployed.filter((s) => hashes[s]).join(' ') || '(nothing)'}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [command, ledgerFile] = process.argv.slice(2);
  if (command === 'gate' && ledgerFile) gate(ledgerFile);
  else if (command === 'record' && ledgerFile) record(ledgerFile);
  else {
    console.error('usage: ci-deploy-gate.mjs gate|record <ledger.json>');
    process.exit(2);
  }
}
