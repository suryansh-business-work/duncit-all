#!/usr/bin/env node
/**
 * Whole-monorepo test-coverage reporter.
 *
 * Runs each workspace's coverage in its native runner (Jest for the server,
 * Vitest for the React portals), reads the Istanbul `coverage-summary.json`
 * each emits, and prints a consolidated per-project report plus an overall
 * weighted total. Projects without a test setup are listed explicitly.
 *
 * Usage:
 *   node scripts/coverage-report.mjs          # human-readable table
 *   node scripts/coverage-report.mjs --json   # machine-readable JSON
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const JSON_OUT = process.argv.includes('--json');

/** Workspaces declared in pnpm-workspace.yaml, with how each is tested. */
const WORKSPACES = [
  { name: 'server', dir: 'server', runner: 'jest' },
  { name: 'admin', dir: 'admin', runner: 'vitest' },
  { name: 'mweb-app', dir: 'mweb-app', runner: 'vitest' },
  { name: 'ads', dir: 'ads', runner: 'vitest' },
  { name: 'crm', dir: 'crm', runner: 'vitest' },
  { name: 'finance', dir: 'finance', runner: 'vitest' },
  { name: 'tech', dir: 'tech', runner: 'vitest' },
  { name: 'support', dir: 'support', runner: 'vitest' },
  { name: 'website-app', dir: 'website-app', runner: 'vitest' },
  { name: 'legal', dir: 'legal', runner: 'vitest' },
  { name: 'ai', dir: 'ai', runner: 'vitest' },
  { name: 'products', dir: 'products', runner: 'vitest' },
  { name: 'marketing', dir: 'marketing', runner: 'vitest' },
  { name: 'partners-app', dir: 'partners/partners-app', runner: 'vitest' },
  { name: 'partners-website', dir: 'partners/partners-website', runner: 'none' },
  { name: 'website', dir: 'website', runner: 'none' },
  { name: 'user-context', dir: 'packages/user-context', runner: 'none' },
];

const TEST_RE = /\.(test|spec|cy)\.(ts|tsx|js|jsx)$/;

function walk(dir, onFile) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === 'coverage') continue;
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, onFile);
    else onFile(full);
  }
}

function countTestFiles(dir) {
  let n = 0;
  for (const sub of ['src', '__tests__']) {
    walk(path.join(ROOT, dir, sub), (f) => {
      if (TEST_RE.test(f)) n += 1;
    });
  }
  return n;
}

function readSummary(dir) {
  const file = path.join(ROOT, dir, 'coverage', 'coverage-summary.json');
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8')).total;
  } catch {
    return null;
  }
}

function runCoverage(ws) {
  const cmd =
    ws.runner === 'jest'
      ? `pnpm --filter ${ws.name} test:coverage`
      : `pnpm --filter ${ws.name} exec vitest run --coverage --coverage.provider=v8 ` +
        `--coverage.reporter=json-summary --coverage.reportsDirectory=coverage ` +
        `"--coverage.include=src/**" --coverage.all=true --coverage.reportOnFailure=true`;
  try {
    execSync(cmd, { cwd: ROOT, stdio: 'ignore', timeout: 600000 });
  } catch {
    // Threshold failures / a flaky suite still emit the summary — read it anyway.
  }
  return readSummary(ws.dir);
}

const pct = (v) => (typeof v === 'number' ? `${v.toFixed(2)}%` : '—');
const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);

const results = [];
for (const ws of WORKSPACES) {
  const testFiles = countTestFiles(ws.dir);
  if (ws.runner === 'none' || testFiles === 0) {
    results.push({ ...ws, testFiles, status: 'no-tests' });
    continue;
  }
  if (!JSON_OUT) process.stderr.write(`▶ coverage: ${ws.name}\n`);
  const total = runCoverage(ws);
  results.push({
    ...ws,
    testFiles,
    status: total ? 'ok' : 'failed',
    total,
  });
}

if (JSON_OUT) {
  process.stdout.write(JSON.stringify(results, null, 2) + '\n');
  process.exit(0);
}

// ---- Human-readable report ----------------------------------------------
const agg = { lines: { covered: 0, total: 0 }, statements: { covered: 0, total: 0 }, functions: { covered: 0, total: 0 }, branches: { covered: 0, total: 0 } };

console.log('\n══════════════════════════ Duncit Coverage Report ══════════════════════════\n');
console.log(
  `${pad('PROJECT', 18)}${pad('RUNNER', 8)}${padL('TESTS', 6)}  ${padL('STMTS', 8)}${padL('BRANCH', 8)}${padL('FUNCS', 8)}${padL('LINES', 8)}`,
);
console.log('─'.repeat(76));

const tested = results.filter((r) => r.status === 'ok');
const noTests = results.filter((r) => r.status !== 'ok');

for (const r of tested) {
  for (const k of Object.keys(agg)) {
    agg[k].covered += r.total[k].covered;
    agg[k].total += r.total[k].total;
  }
  console.log(
    `${pad(r.name, 18)}${pad(r.runner, 8)}${padL(r.testFiles, 6)}  ` +
      `${padL(pct(r.total.statements.pct), 8)}${padL(pct(r.total.branches.pct), 8)}` +
      `${padL(pct(r.total.functions.pct), 8)}${padL(pct(r.total.lines.pct), 8)}`,
  );
}

console.log('─'.repeat(76));
const overallPct = (k) => (agg[k].total ? (agg[k].covered / agg[k].total) * 100 : 0);
console.log(
  `${pad('OVERALL', 26)}${padL('', 6)}  ${padL(pct(overallPct('statements')), 8)}` +
    `${padL(pct(overallPct('branches')), 8)}${padL(pct(overallPct('functions')), 8)}${padL(pct(overallPct('lines')), 8)}`,
);

console.log('\nProjects with NO tests / coverage:');
for (const r of noTests) {
  const reason = r.runner === 'none' ? '(no test runner)' : r.status === 'failed' ? '(coverage run failed)' : '(0 test files)';
  console.log(`  • ${pad(r.name, 18)} ${reason}`);
}
console.log(
  `\nTested ${tested.length}/${results.length} workspaces · overall lines covered ` +
    `${agg.lines.covered}/${agg.lines.total} (${overallPct('lines').toFixed(2)}%)\n`,
);
