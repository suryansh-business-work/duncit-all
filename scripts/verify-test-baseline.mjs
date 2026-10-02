#!/usr/bin/env node
/**
 * Test-failure ratchet.
 *
 * The suites already run on every staging push (sonar.yml's coverage jobs),
 * but nothing failed when they went red — so 330-odd test files had drifted
 * red without anyone seeing it, and a new break looked exactly like the old
 * ones. Making every red suite blocking at once would turn every push red for
 * every session until all of them are fixed.
 *
 * So, like the duplication and hardcoded-copy gates, this is a RATCHET:
 * `scripts/test-failure-baseline.json` lists the test files that were already
 * failing, and the run fails only when a file OUTSIDE that list fails. A
 * baseline file that passes again is reported so it can be dropped; drop them
 * with `--update`, never add to the list by hand to get a push through.
 *
 * Input is the full per-workspace log that scripts/ci-coverage-run.sh writes
 * (one `<workspace>.log` per workspace), or `label=path` for a single log such
 * as the native app's jest output. jest and vitest both print `FAIL <file>`;
 * jest may put a project name (`unit`, `integration`) in front of the file.
 *
 *   node scripts/verify-test-baseline.mjs test-logs
 *   node scripts/verify-test-baseline.mjs mobile-app=app/mobile-app/jest-coverage.log
 *   node scripts/verify-test-baseline.mjs --update <same inputs>
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(repoRoot, 'scripts', 'test-failure-baseline.json');
// `.cy.` too: the form schema suites (`<form>.form.cy.ts`) run under vitest.
const FAIL_LINE = /^\s*FAIL\s+(?:[a-z-]+\s+)?(\S+\.(?:test|spec|cy)\.[cm]?[jt]sx?)\b/;

/** Every test file a runner log reports as failing. */
export function failingFiles(log) {
  const files = new Set();
  for (const raw of log.split(/\r?\n/)) {
    const match = FAIL_LINE.exec(raw.replaceAll(/\u001b\[[0-9;]*m/g, ''));
    if (match) files.add(match[1]);
  }
  return [...files].sort((a, b) => a.localeCompare(b));
}

/** `[label, file]` for every log the arguments name. */
function logInputs(args) {
  return args.flatMap((arg) => {
    const eq = arg.indexOf('=');
    if (eq > 0) return [[arg.slice(0, eq), arg.slice(eq + 1)]];
    if (!existsSync(arg)) return [];
    if (!statSync(arg).isDirectory()) return [[path.basename(arg, '.log'), arg]];
    return readdirSync(arg)
      .filter((name) => name.endsWith('.log'))
      .map((name) => [path.basename(name, '.log'), path.join(arg, name)]);
  });
}

/** One log against its baseline entry: what newly fails, and what passes again. */
function compareLog(label, file, known) {
  const failing = failingFiles(readFileSync(file, 'utf8'));
  return {
    failing,
    added: failing.filter((f) => !known.has(f)).map((f) => `${label}: ${f}`),
    fixed: [...known].filter((f) => !failing.includes(f)).map((f) => `${label}: ${f}`),
  };
}

/** Rewrite the baseline keeping only entries still failing — it only ever shrinks:
 * a file failing now that was not before is a regression to fix, not a line to add. */
function shrinkBaseline(baseline, results) {
  for (const { label, known, failing } of results) {
    const kept = [...known].filter((f) => failing.includes(f)).sort((a, b) => a.localeCompare(b));
    if (kept.length > 0) baseline[label] = kept;
    else delete baseline[label];
  }
  const sorted = Object.fromEntries(Object.entries(baseline).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(BASELINE, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`verify-test-baseline: baseline now lists ${Object.values(sorted).flat().length} file(s)`);
}

function printList(write, heading, items) {
  if (items.length === 0) return;
  write(heading);
  for (const item of items) write(`  ${item}`);
}

function main() {
  const args = process.argv.slice(2);
  const inputs = logInputs(args.filter((a) => a !== '--update'));
  if (inputs.length === 0) {
    console.error('verify-test-baseline: no test logs found in', args.join(' '));
    process.exit(1);
  }
  const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : {};
  const results = inputs.map(([label, file]) => {
    const known = new Set(baseline[label] ?? []);
    return { label, known, ...compareLog(label, file, known) };
  });
  const added = results.flatMap((r) => r.added);
  const fixed = results.flatMap((r) => r.fixed);
  if (args.includes('--update')) shrinkBaseline(baseline, results);
  printList(console.log, `verify-test-baseline: ${fixed.length} baselined file(s) pass now — run with --update to drop them:`, fixed);
  if (added.length > 0) {
    printList(console.error, `verify-test-baseline: ${added.length} test file(s) fail that were passing before:`, added);
    console.error('Fix the test or the code it covers. The baseline only ever shrinks.');
    process.exit(1);
  }
  console.log(`verify-test-baseline: no new failures across ${inputs.length} log(s)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
