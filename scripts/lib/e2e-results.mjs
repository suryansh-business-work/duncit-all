import fs from 'node:fs';
import path from 'node:path';

/**
 * What a leg's Cypress runs said, for scripts/report-e2e-run.mjs: the counts on
 * the suite row and one row per scenario.
 *
 * Two sources, best first. The per-spec files scripts/lib/cypress-scenarios.mjs
 * writes hold EVERY test Cypress counted, including the ones a failed hook
 * blocked. The JUnit XML is the fallback for a leg that wrote none; it never
 * lists blocked tests, so they are worked out from its `tests` attribute.
 */

/** Cypress's word for how a test ended → the server's enum. A blocked test is `skipped`. */
const STATE = { passed: 'PASSED', failed: 'FAILED', pending: 'PENDING', skipped: 'SKIPPED' };

function jsonFiles(dir) {
  try {
    return fs
      .readdirSync(dir)
      .filter((name) => name.endsWith('.json'))
      .sort((a, b) => a.localeCompare(b))
      .map((name) => path.join(dir, name));
  } catch {
    return [];
  }
}

/** The per-spec result files in `dir`, or null when the leg wrote none. */
export function readSpecResults(dir) {
  if (!dir) return null;
  const specs = [];
  for (const file of jsonFiles(dir)) {
    try {
      const body = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (body && typeof body.spec === 'string' && Array.isArray(body.tests)) specs.push(body);
    } catch (err) {
      console.warn(`⚠ skipped unreadable result file ${path.basename(file)}: ${err.message}`);
    }
  }
  return specs.length > 0 ? specs : null;
}

/**
 * One row per test. `ordinal` tells apart two tests a spec titles identically,
 * so every row keeps its own key on the server and the same key every night.
 */
export function scenariosOf(specs) {
  const rows = [];
  for (const spec of specs) {
    const project = String(spec.project ?? '');
    // A spec that could not run at all has no tests to list; without a row of
    // its own it would vanish from the list instead of showing red.
    if (spec.tests.length === 0 && spec.error) {
      rows.push({
        project,
        spec: spec.spec,
        ordinal: 0,
        title_path: [path.basename(spec.spec)],
        state: 'FAILED',
        duration_ms: null,
        error: String(spec.error),
      });
      continue;
    }
    const seen = new Map();
    for (const test of spec.tests) {
      const row = scenarioRow(project, spec.spec, test);
      const key = row.title_path.join('\u0000');
      row.ordinal = seen.get(key) ?? 0;
      seen.set(key, row.ordinal + 1);
      rows.push(row);
    }
  }
  return rows;
}

function scenarioRow(project, spec, test) {
  return {
    project,
    spec,
    ordinal: 0,
    title_path: (Array.isArray(test.title) ? test.title : [String(test.title ?? '')]).map(String),
    state: STATE[test.state] ?? 'SKIPPED',
    duration_ms: Number.isFinite(test.duration_ms) ? test.duration_ms : null,
    error: String(test.error ?? ''),
  };
}

/** The suite row's counts, from the scenario rows. Skipped covers pending and blocked tests. */
export function countsOf(specs, scenarios) {
  const count = (state) => scenarios.filter((row) => row.state === state).length;
  const durationMs = scenarios.reduce((sum, row) => sum + (row.duration_ms ?? 0), 0);
  return {
    specs: specs.length,
    tests: scenarios.length,
    passed: count('PASSED'),
    failed: count('FAILED'),
    skipped: count('PENDING') + count('SKIPPED'),
    duration_seconds: Math.round(durationMs / 1000),
  };
}

/* ── the JUnit fallback ────────────────────────────────────────────────────── */

/**
 * Parsed with a regex on purpose: the file is machine-written and shallow, and
 * adding an XML parser to a zero-dependency reporter that runs on a bare runner
 * after a failure is a poor trade. mocha's reporter writes its testsuites as
 * flat siblings, so a non-greedy block match cannot swallow a neighbour.
 */
const SUITE_RE = /<testsuite\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testsuite>)/g;
const CASE_RE = /<testcase\b[^>]*?(?:\/>|>([\s\S]*?)<\/testcase>)/g;
const attr = (tag, name) => {
  const match = new RegExp(String.raw`\b${name}="([^"]*)"`).exec(tag);
  return match ? match[1] : null;
};
const int = (value) => Number.parseInt(value ?? '0', 10) || 0;

function* junitFiles(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* junitFiles(full);
    } else if (entry.name.toLowerCase().endsWith('.xml')) {
      yield full;
    }
  }
}

/** One testsuite's counts: every test it holds, and how the ones that ran ended. */
function suiteCounts(head, body) {
  const tests = int(attr(head, 'tests'));
  let ran = 0;
  let failed = 0;
  let skipped = 0;
  for (const [, inner = ''] of body.matchAll(CASE_RE)) {
    ran += 1;
    if (/<(failure|error)\b/.test(inner)) failed += 1;
    else if (/<skipped\b/.test(inner)) skipped += 1;
  }
  return {
    tests: Math.max(tests, ran),
    passed: ran - failed - skipped,
    failed,
    // Held but never reported: a failed hook blocked them.
    skipped: skipped + Math.max(tests - ran, 0),
    duration: Number.parseFloat(attr(head, 'time') ?? '0') || 0,
  };
}

/**
 * The counts across every JUnit file a leg wrote, or null when it wrote none.
 *
 * Null rather than zeroes: "this suite ran nothing" and "this suite never got
 * far enough to write a report" are different facts. A testsuite's `tests` is
 * how many tests it HOLDS, but only the ones that ran get a testcase — the rest
 * were blocked by a failed hook, and are counted as skipped, never as passed.
 * The tests="0" "Root Suite" wrapper is dropped, or every spec counts twice.
 */
export function readJunit(dir) {
  const totals = { specs: 0, tests: 0, passed: 0, failed: 0, skipped: 0, duration: 0 };
  let sawFile = false;
  for (const file of junitFiles(dir)) {
    sawFile = true;
    let xml;
    try {
      xml = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const [, head, body = ''] of xml.matchAll(SUITE_RE)) {
      if (int(attr(head, 'tests')) === 0) continue;
      const suite = suiteCounts(head, body);
      totals.specs += 1;
      totals.tests += suite.tests;
      totals.passed += suite.passed;
      totals.failed += suite.failed;
      totals.skipped += suite.skipped;
      totals.duration += suite.duration;
    }
  }
  if (!sawFile) return null;
  return {
    specs: totals.specs,
    tests: totals.tests,
    passed: totals.passed,
    failed: totals.failed,
    skipped: totals.skipped,
    duration_seconds: Math.round(totals.duration),
  };
}
