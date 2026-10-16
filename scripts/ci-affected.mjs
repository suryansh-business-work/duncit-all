#!/usr/bin/env node
/**
 * Which pnpm workspaces a CI run actually has to check.
 *
 *   node scripts/ci-affected.mjs plan --under packages/ [--shards 4] [--global <path|glob>...] [--extra <dir>...] [--ledger <file>]
 *   node scripts/ci-affected.mjs hash <path>...
 *   node scripts/ci-affected.mjs ledger-merge <ledger> <passed-file>...
 *
 * WHY THIS EXISTS
 * ---------------
 * Every push ran every suite. Shared Gates spent 23 minutes on all 50 package
 * suites although 120 of the last 188 staging commits touched no package at
 * all, and the Sonar coverage matrix re-ran thirteen runners' worth of tests
 * whose code had not moved. Path filters on the `on:` block cannot fix that:
 * they are all-or-nothing per workflow, and a portal depends on a dozen
 * packages that a filter list cannot know about.
 *
 * The workspace graph is read from the package.json files the workspaces
 * already declare, so a new package or a new `@duncit/*` dependency needs no
 * edit here.
 *
 * `plan`  diffs HEAD against the last commit this SAME workflow passed on this
 *         branch — not against the push's `before`. With cancel-in-progress a
 *         superseded run never finishes, and diffing against `before` would let
 *         the cancelled commit's change go unchecked forever. A pull request
 *         diffs against its base. Anything it cannot resolve (a manual run, an
 *         unreachable API, a root config change) selects EVERYTHING: a slow
 *         run is a cost, a skipped one is a hole.
 *         Writes `any`, `dirs` (JSON array) and `matrix` (shards of
 *         { name, dirs }) to GITHUB_OUTPUT.
 *
 *         `--ledger` is the checkpoint. "Last green run" is one commit for the
 *         whole workflow, so after ONE workspace fails, the fix commit used to
 *         re-check every workspace changed since that green run — including the
 *         ones that already passed in the red run. The ledger holds a
 *         `<dir> <content key>` line for every workspace that passed; a selected
 *         workspace whose current key is in it is dropped. Its key covers its
 *         own tree, its transitive @duncit deps, the root files and the
 *         `--global` files, so any change to what it is built from re-runs it.
 *         Also writes `hashes` ({ dir: key }) for the jobs to record passes.
 *
 * `ledger-merge` appends the passed lines to the ledger, newest last, and keeps
 *         the last LEDGER_LIMIT distinct lines.
 *
 * `hash`  prints a content key for the given paths: the git tree id of each,
 *         with every workspace widened to its transitive `@duncit/*` deps,
 *         plus the root files. Same key ⇒ same code ⇒ same test result, which
 *         is what lets sonar.yml reuse a group's coverage instead of re-running.
 *
 * Zero dependencies: `plan` runs before `pnpm install`.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const TEST_FILE = /\.(?:test|spec|cy)\.[cm]?[jt]sx?$/;
// Root files that no workspace build, test or lint reads. Every OTHER root file
// (package.json, the lockfile, tsconfig.base.json, the eslint configs, …) can
// change any workspace's result, so touching one selects everything.
const INERT_ROOT = /^(?:[^/]+\.md|\.gitignore|\.mcp\.json|\.env\.example|\.easignore|\.dockerignore|codecov\.yml|sonar-project\.properties|\.jscpd\.json)$/;
// The pre-commit hook (scripts/bump-version.mjs) restamps the app version in
// these on EVERY commit. Counted as a change, mWeb and the native app would be
// "affected" by every push and their coverage could never be reused, so a diff
// or a hash ignores their `"version"` lines — and app.json's store build number
// (`"versionCode"` / `"buildNumber"`), which the same hook moves +1.
const VERSION_STAMPED = new Set([
  'app/mobile-app/app.json',
  'app/mobile-app/package.json',
  'app/mobile-app/package-lock.json',
  'app/mweb/package.json',
]);
const VERSION_LINE = /^[ \t]*(?:"(?:version|buildNumber)": "[^"\n]*"|"versionCode": \d+),?$/;
// Enough for every workspace a few hundred times over; older lines describe
// content no branch tip still has.
const LEDGER_LIMIT = 3000;

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();

/** `**` and `*` only — the spelling paths-filter and `--global` use. Anything else is literal. */
export function globToRegex(glob) {
  const escaped = glob.replaceAll(/[.+?^${}()|[\]\\]/g, String.raw`\$&`);
  const source = escaped.replaceAll('**/', '\u0000').replaceAll('**', '\u0001').replaceAll('*', '[^/]*');
  return new RegExp(`^${source.replaceAll('\u0000', '(?:.*/)?').replaceAll('\u0001', '.*')}$`);
}

/** A `--global` entry matches its exact path, anything under it, or its glob. */
function globalMatcher(globals) {
  const globs = globals.filter((g) => g.includes('*')).map(globToRegex);
  const prefixes = globals.filter((g) => !g.includes('*'));
  return (f) => prefixes.some((g) => f === g || f.startsWith(`${g}/`)) || globs.some((re) => re.test(f));
}

/** True when the only lines `file` changed since `base` are version stamps. */
function onlyVersionStamped(base, file) {
  if (!VERSION_STAMPED.has(file)) return false;
  const edits = git('diff', '-U0', base, 'HEAD', '--', file)
    .split('\n')
    .filter((l) => /^[+-]/.test(l) && !/^(?:\+\+\+|---) /.test(l));
  return edits.every((l) => VERSION_LINE.test(l.slice(1)));
}

/** Git's id for `p` at HEAD, with version stamps blanked out of the stamped files. */
function contentId(p) {
  const stamped = [...VERSION_STAMPED].filter((f) => f === p || f.startsWith(`${p}/`));
  if (stamped.length === 0) return git('rev-parse', 'HEAD:' + p);
  const blank = (f) => {
    const text = git('show', 'HEAD:' + f).replaceAll(new RegExp(VERSION_LINE.source, 'gm'), '');
    return createHash('sha256').update(text).digest('hex');
  };
  const entries = git('ls-tree', '-r', 'HEAD', '--', p)
    .split('\n')
    .map((line) => {
      const file = line.split('\t')[1];
      return stamped.includes(file) ? `${file} ${blank(file)}` : line;
    });
  return createHash('sha256').update(entries.join('\n')).digest('hex');
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

/** Every workspace dir pnpm-workspace.yaml lists, `dir/*` expanded. */
function workspaceDirs() {
  const dirs = [];
  for (const line of readFileSync('pnpm-workspace.yaml', 'utf8').split(/\r?\n/)) {
    if (/^\S/.test(line) && !line.startsWith('packages:')) break;
    const entry = /^\s+-\s+['"]?([^'"#\s]+)/.exec(line)?.[1];
    if (!entry) continue;
    const parent = entry.endsWith('/*') ? entry.slice(0, -2) : null;
    const found = parent
      ? readdirSync(parent, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => `${parent}/${d.name}`)
      : [entry];
    dirs.push(...found.filter((d) => existsSync(path.join(d, 'package.json'))));
  }
  return dirs;
}

/**
 * dir -> { name, deps: dirs of the workspaces it depends on }. `extra` adds
 * projects outside the pnpm workspace that still depend on it by name (the
 * native app is npm, but links twenty @duncit/* packages).
 */
function workspaceGraph(extra = []) {
  const manifests = new Map([...workspaceDirs(), ...extra].map((dir) => [dir, readJson(path.join(dir, 'package.json'))]));
  const dirByName = new Map([...manifests].map(([dir, pkg]) => [pkg.name, dir]));
  const graph = new Map();
  for (const [dir, pkg] of manifests) {
    const names = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies });
    graph.set(dir, { name: pkg.name, deps: names.map((n) => dirByName.get(n)).filter(Boolean) });
  }
  return graph;
}

/** `dirs` plus every workspace they transitively depend on. */
function withDependencies(graph, dirs) {
  const seen = new Set();
  const visit = (dir) => {
    if (seen.has(dir)) return;
    seen.add(dir);
    for (const dep of graph.get(dir)?.deps ?? []) visit(dep);
  };
  dirs.forEach(visit);
  return seen;
}

const byName = (a, b) => a.localeCompare(b);
const ownerOf = (dirs, file) => dirs.find((dir) => file.startsWith(`${dir}/`));

// ------------------------------------------------------------------ plan

async function lastGreenSha() {
  const { GITHUB_REPOSITORY, GITHUB_WORKFLOW_REF, GITHUB_REF_NAME, GH_TOKEN } = process.env;
  const workflow = path.posix.basename(GITHUB_WORKFLOW_REF.split('@')[0]);
  const url = `https://api.github.com/repos/${GITHUB_REPOSITORY}/actions/workflows/${workflow}/runs?branch=${encodeURIComponent(GITHUB_REF_NAME)}&event=push&status=success&per_page=1`;
  const res = await fetch(url, { headers: { authorization: `Bearer ${GH_TOKEN}`, accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`runs API answered ${res.status}`);
  return (await res.json()).workflow_runs[0]?.head_sha ?? null;
}

async function resolveBase() {
  const event = process.env.GITHUB_EVENT_NAME;
  if (event === 'pull_request') return readJson(process.env.GITHUB_EVENT_PATH).pull_request.base.sha;
  if (event === 'push') return lastGreenSha();
  return null;
}

function hasCommit(sha) {
  try {
    git('cat-file', '-e', `${sha}^{commit}`);
    return true;
  } catch {
    return false;
  }
}

/** Changed files since the base, or null when everything must run. */
async function changedFiles() {
  try {
    const base = await resolveBase();
    if (!base) return null;
    // CI checks out one commit; fetch the base only when it is missing, so a
    // local run never turns a full clone shallow.
    if (!hasCommit(base)) git('fetch', '--no-tags', '--depth=1', 'origin', base);
    console.log(`base: ${base}`);
    return git('diff', '--name-only', base, 'HEAD')
      .split('\n')
      .filter((f) => f && !onlyVersionStamped(base, f));
  } catch (err) {
    console.log(`::warning::could not resolve what changed (${err.message}) — checking everything`);
    return null;
  }
}

/** Workspaces whose own files, or any dependency's files, changed. */
function affectedDirs(graph, files, globals) {
  const dirs = [...graph.keys()];
  if (!files) return dirs;
  const matchesGlobal = globalMatcher(globals);
  const isGlobal = (f) => (!f.includes('/') && !INERT_ROOT.test(f)) || matchesGlobal(f);
  const hit = files.find(isGlobal);
  if (hit) {
    console.log(`${hit} changed — checking everything`);
    return dirs;
  }
  const touched = new Set(files.map((f) => ownerOf(dirs, f)).filter(Boolean));
  return dirs.filter((dir) => [...withDependencies(graph, [dir])].some((d) => touched.has(d)));
}

/** Longest-first onto the lightest shard; test-file count stands in for runtime. */
function shard(dirs, count) {
  const weight = (dir) => git('ls-files', dir).split('\n').filter((f) => TEST_FILE.test(f)).length + 1;
  const shards = Array.from({ length: Math.min(count, dirs.length) }, () => ({ dirs: [], weight: 0 }));
  const heaviestFirst = dirs.map((d) => [d, weight(d)]).toSorted((a, b) => b[1] - a[1]);
  for (const [dir, w] of heaviestFirst) {
    const lightest = shards.reduce((a, b) => (b.weight < a.weight ? b : a), shards[0]);
    lightest.dirs.push(dir);
    lightest.weight += w;
  }
  return shards.map((s, i) => ({ name: `${i + 1}/${shards.length}`, dirs: s.dirs.toSorted(byName).join(' ') }));
}

function option(args, flag, fallback) {
  const at = args.indexOf(flag);
  return at === -1 ? fallback : args[at + 1];
}

/** Every value of a repeatable flag, trailing slash dropped. */
const options = (args, flag) => args.flatMap((a, i) => (args[i - 1] === flag ? [a.replace(/\/$/, '')] : []));

function readLedger(file) {
  if (!file || !existsSync(file)) return new Set();
  return new Set(readFileSync(file, 'utf8').split('\n').filter(Boolean));
}

/** Drops the workspaces whose current content already passed (see `--ledger` above). */
function skipPassed(dirs, ledgerFile, globals, graph) {
  const passed = readLedger(ledgerFile);
  const files = globals.filter((g) => !g.includes('*'));
  const hashes = Object.fromEntries(dirs.map((d) => [d, contentKey([d, ...files], graph)]));
  const skipped = dirs.filter((d) => passed.has(`${d} ${hashes[d]}`));
  if (skipped.length > 0) console.log(`already passed with identical inputs, skipped: ${skipped.join(' ')}`);
  return { remaining: dirs.filter((d) => !skipped.includes(d)), hashes };
}

async function plan(args) {
  const under = option(args, '--under', '');
  const globals = [...options(args, '--global'), 'scripts/ci-affected.mjs'];
  const graph = workspaceGraph(options(args, '--extra'));
  const affected = affectedDirs(graph, await changedFiles(), globals).filter((d) => d.startsWith(under));
  const ledger = option(args, '--ledger', null);
  const { remaining: selected, hashes } = ledger ? skipPassed(affected, ledger, globals, graph) : { remaining: affected, hashes: {} };
  const shards = shard(selected, Number(option(args, '--shards', '4')));
  console.log(`${selected.length} workspace(s) under '${under}' to check:`);
  shards.forEach((s) => console.log(`  shard ${s.name}: ${s.dirs}`));
  const out = process.env.GITHUB_OUTPUT;
  if (out) {
    appendFileSync(out, `any=${selected.length > 0}\ndirs=${JSON.stringify(selected)}\nmatrix=${JSON.stringify(shards)}\n`);
    appendFileSync(out, `hashes=${JSON.stringify(hashes)}\n`);
  }
}

/** Appends each passed-file's lines to the ledger, de-duplicated, newest kept. */
function ledgerMerge([ledgerFile, ...passedFiles]) {
  const lines = [...readLedger(ledgerFile), ...passedFiles.flatMap((f) => [...readLedger(f)])];
  const latest = [...new Set(lines.toReversed())].toReversed().slice(-LEDGER_LIMIT);
  writeFileSync(ledgerFile, latest.length > 0 ? `${latest.join('\n')}\n` : '');
  console.log(`ledger: ${latest.length} line(s)`);
}

// ------------------------------------------------------------------ hash

/**
 * Content key of `paths`: their git trees, every workspace among them widened
 * to its transitive `@duncit/*` deps, plus the root files. Accepts pnpm filter
 * spelling too: `./portals/admin`, `./packages/**`.
 */
export function contentKey(paths, graph = workspaceGraph()) {
  const dirs = [...graph.keys()];
  const roots = paths.map((p) => p.replace(/^\.\//, '').replace(/\/\*\*$/, ''));
  const members = roots.flatMap((p) => dirs.filter((d) => d === p || d.startsWith(`${p}/`)));
  const inputs = new Set([...roots, ...withDependencies(graph, members)]);
  const rootFiles = git('ls-tree', 'HEAD')
    .split('\n')
    .filter((l) => l.includes(' blob ') && !INERT_ROOT.test(l.split('\t')[1]));
  const trees = [...inputs].toSorted(byName).map((p) => {
    return `${p} ${contentId(p)}`;
  });
  return createHash('sha256').update([...rootFiles, ...trees].join('\n')).digest('hex').slice(0, 32);
}

// Imported by ci-deploy-gate.mjs for globToRegex; the CLI only runs when invoked directly.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [command, ...rest] = process.argv.slice(2);
  if (command === 'plan') await plan(rest);
  else if (command === 'hash') process.stdout.write(contentKey(rest));
  else if (command === 'ledger-merge') ledgerMerge(rest);
  else {
    console.error(
      'usage: ci-affected.mjs plan --under <dir/> [--shards N] [--global <path|glob>...] [--extra <dir>...] [--ledger <file>] | hash <path>... | ledger-merge <ledger> <passed>...',
    );
    process.exit(2);
  }
}
