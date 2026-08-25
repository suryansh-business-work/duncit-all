#!/usr/bin/env node
/**
 * Per-surface coverage totals for the PR comment and the job summary.
 *
 *   node scripts/coverage-surfaces.mjs collect --surface portal --out cov/portal.json portals
 *   node scripts/coverage-surfaces.mjs comment --dir cov --out comment.md
 *
 * WHY THIS EXISTS
 * ---------------
 * Codecov owns the deltas, the file-level view and the sunburst. What it cannot
 * do is answer the one question asked on every PR — "what is each SURFACE at
 * right now" — because a surface here is 17 workspaces (portal) or 5 (website),
 * each writing its own lcov. This reduces every report under a surface's
 * directories to one weighted set of totals, which the workflow renders as a
 * sticky comment from github-actions[bot].
 *
 * lcov is the input on purpose: it is the ONE report format every runner in this
 * repo already writes (vitest istanbul, vitest v8 and the mobile app's jest all
 * emit it; `json-summary` is configured in only some of them).
 *
 * `collect` never fails on a missing report — a surface whose suites all died
 * still gets a row, saying so. Silence would read as "fine".
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.astro', 'android', 'ios']);

/** Display order + label for every surface the workflow reports on. */
const SURFACES = [
  { key: 'portal', label: 'Portal' },
  { key: 'mweb', label: 'mWeb' },
  { key: 'native', label: 'Native app' },
  { key: 'website', label: 'Website' },
];

const toPosix = (p) => p.split(path.sep).join('/');

// ---------------------------------------------------------------- lcov parsing

/** Every lcov.info under `dir`, skipping dependency and build output trees. */
function findLcovFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) findLcovFiles(path.join(dir, entry.name), out);
    } else if (entry.name === 'lcov.info') {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

const emptyTotals = () => ({
  files: 0,
  lines: { hit: 0, found: 0 },
  branches: { hit: 0, found: 0 },
  functions: { hit: 0, found: 0 },
});

/** lcov counter prefix -> which metric, and which half of it the number is. */
const COUNTERS = {
  LF: ['lines', 'found'],
  LH: ['lines', 'hit'],
  BRF: ['branches', 'found'],
  BRH: ['branches', 'hit'],
  FNF: ['functions', 'found'],
  FNH: ['functions', 'hit'],
};

function parseLcov(file) {
  const totals = emptyTotals();
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (line.startsWith('SF:')) {
      totals.files += 1;
      continue;
    }
    const sep = line.indexOf(':');
    if (sep === -1) continue;
    const counter = COUNTERS[line.slice(0, sep)];
    if (!counter) continue;
    const value = Number.parseInt(line.slice(sep + 1), 10);
    if (Number.isNaN(value)) continue;
    const [metric, half] = counter;
    totals[metric][half] += value;
  }
  return totals;
}

function addTotals(into, from) {
  into.files += from.files;
  for (const metric of ['lines', 'branches', 'functions']) {
    into[metric].hit += from[metric].hit;
    into[metric].found += from[metric].found;
  }
}

/** Nearest ancestor of `from` holding a package.json — that is the workspace. */
function workspaceFor(from, root) {
  let dir = from;
  while (dir.length >= root.length) {
    const manifest = path.join(dir, 'package.json');
    if (existsSync(manifest)) {
      const { name } = JSON.parse(readFileSync(manifest, 'utf8'));
      return { name: name ?? path.basename(dir), dir: toPosix(path.relative(root, dir)) };
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  const rel = toPosix(path.relative(root, from));
  return { name: rel, dir: rel };
}

// ------------------------------------------------------------------- rendering

const pct = (metric) => (metric.found === 0 ? null : (metric.hit / metric.found) * 100);

function cell(metric) {
  const value = pct(metric);
  if (value === null) return '—';
  return `${value.toFixed(1)}% <sub>${metric.hit}/${metric.found}</sub>`;
}

/** Traffic light on lines covered — the one number people scan for. */
function light(metric) {
  const value = pct(metric);
  if (value === null) return '⚪';
  if (value >= 90) return '🟢';
  if (value >= 75) return '🟡';
  return '🔴';
}

function surfaceRow(label, summary) {
  if (!summary || summary.totals.files === 0) {
    return `| ⚪ **${label}** | no report | — | — | — |`;
  }
  const { totals } = summary;
  return (
    `| ${light(totals.lines)} **${label}** | ${cell(totals.lines)} | ${cell(totals.branches)} | ` +
    `${cell(totals.functions)} | ${totals.files} |`
  );
}

const TABLE_HEAD = ['| Workspace | Lines | Branches | Functions | Files |', '| --- | --: | --: | --: | --: |'];

function workspaceTable(summary) {
  const rows = [...summary.workspaces]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((w) => `| \`${w.name}\` | ${cell(w.lines)} | ${cell(w.branches)} | ${cell(w.functions)} | ${w.files} |`);
  return [...TABLE_HEAD, ...rows].join('\n');
}

function render(summaries, { commit, runUrl }) {
  const overall = emptyTotals();
  for (const summary of summaries.values()) addTotals(overall, summary.totals);

  const head = [
    '<!-- duncit-coverage-report -->',
    '### 🧪 Coverage report',
    '',
    '| Surface | Lines | Branches | Functions | Files |',
    '| --- | --: | --: | --: | --: |',
    ...SURFACES.map((s) => surfaceRow(s.label, summaries.get(s.key))),
    `| ⬛ **Overall** | ${cell(overall.lines)} | ${cell(overall.branches)} | ${cell(overall.functions)} | ${overall.files} |`,
    '',
  ];

  const details = [];
  for (const surface of SURFACES) {
    const summary = summaries.get(surface.key);
    if (!summary || summary.workspaces.length === 0) continue;
    details.push(
      `<details><summary><b>${surface.label}</b> — ${summary.workspaces.length} workspace(s)</summary>`,
      '',
      workspaceTable(summary),
      '',
      '</details>',
      '',
    );
  }

  const repo = process.env.GITHUB_REPOSITORY ?? '';
  const runLink = runUrl ? ` · [workflow run](${runUrl})` : '';
  const foot = [
    '---',
    `File-level detail and the diff against the base branch are on [Codecov](https://app.codecov.io/gh/${repo}).`,
    `Commit \`${commit.slice(0, 7)}\`${runLink}.`,
    '',
    '> The per-surface CI workflows keep their test steps paused, so a red suite here lowers the',
    '> number rather than failing a check — this comment is evidence, not a gate.',
  ];

  return [...head, ...details, ...foot].join('\n');
}

// -------------------------------------------------------------------- commands

/** `--flag value` pairs plus the bare positional arguments. */
function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      flags[arg.slice(2)] = argv[i + 1];
      i += 1;
    } else {
      positional.push(arg);
    }
  }
  return { flags, positional };
}

function writeJson(file, data) {
  mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function collect({ flags, positional }) {
  const root = path.resolve(flags.root ?? process.cwd());
  const surface = flags.surface;
  const summary = { surface, workspaces: [], totals: emptyTotals() };

  const byWorkspace = new Map();
  for (const dir of positional) {
    for (const file of findLcovFiles(path.resolve(root, dir))) {
      const totals = parseLcov(file);
      const ws = workspaceFor(path.dirname(file), root);
      const existing = byWorkspace.get(ws.dir) ?? { ...ws, ...emptyTotals() };
      addTotals(existing, totals);
      byWorkspace.set(ws.dir, existing);
      addTotals(summary.totals, totals);
    }
  }
  summary.workspaces = [...byWorkspace.values()];

  writeJson(flags.out, summary);
  const lines = pct(summary.totals.lines);
  const linesLabel = lines === null ? 'n/a' : `${lines.toFixed(1)}%`;
  console.log(
    `coverage-surfaces: ${surface} — ${summary.workspaces.length} workspace(s), ` +
      `${summary.totals.files} file(s), lines ${linesLabel}`,
  );
  if (summary.totals.files === 0) {
    console.log(`::warning::no lcov report found for surface "${surface}" — its row will read "no report".`);
  }
}

function comment({ flags }) {
  const dir = path.resolve(flags.dir);
  const summaries = new Map();
  if (existsSync(dir)) {
    for (const entry of readdirSync(dir)) {
      const file = path.join(dir, entry);
      if (!entry.endsWith('.json') || !statSync(file).isFile()) continue;
      const summary = JSON.parse(readFileSync(file, 'utf8'));
      summaries.set(summary.surface, summary);
    }
  }
  const body = render(summaries, {
    commit: process.env.COVERAGE_COMMIT ?? '',
    runUrl: process.env.COVERAGE_RUN_URL ?? '',
  });
  writeFileSync(flags.out, `${body}\n`, 'utf8');
  console.log(`coverage-surfaces: wrote ${flags.out} (${summaries.size} surface summaries)`);
}

const [command, ...rest] = process.argv.slice(2);
const parsed = parseArgs(rest);

if (command === 'collect') {
  collect(parsed);
} else if (command === 'comment') {
  comment(parsed);
} else {
  console.error('usage: coverage-surfaces.mjs <collect|comment> [--surface s] [--root r] [--dir d] --out file [dirs...]');
  process.exit(1);
}
