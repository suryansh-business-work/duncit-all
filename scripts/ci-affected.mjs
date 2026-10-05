#!/usr/bin/env node
/**
 * Which pnpm workspaces a CI run actually has to check.
 *
 *   node scripts/ci-affected.mjs plan --under packages/ [--shards 4] [--global <path>...] [--extra <dir>...]
 *   node scripts/ci-affected.mjs hash <path>...
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
 * `hash`  prints a content key for the given paths: the git tree id of each,
 *         with every workspace widened to its transitive `@duncit/*` deps,
 *         plus the root files. Same key ⇒ same code ⇒ same test result, which
 *         is what lets sonar.yml reuse a group's coverage instead of re-running.
 *
 * Zero dependencies: `plan` runs before `pnpm install`.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const TEST_FILE = /\.(?:test|spec|cy)\.[cm]?[jt]sx?$/;
// Root files that no workspace build, test or lint reads. Every OTHER root file
// (package.json, the lockfile, tsconfig.base.json, the eslint configs, …) can
// change any workspace's result, so touching one selects everything.
const INERT_ROOT = /^(?:[^/]+\.md|\.gitignore|\.mcp\.json|\.env\.example|\.easignore|\.dockerignore|codecov\.yml|sonar-project\.properties|\.jscpd\.json)$/;

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

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
    return git('diff', '--name-only', base, 'HEAD').split('\n').filter(Boolean);
  } catch (err) {
    console.log(`::warning::could not resolve what changed (${err.message}) — checking everything`);
    return null;
  }
}

/** Workspaces whose own files, or any dependency's files, changed. */
function affectedDirs(graph, files, globals) {
  const dirs = [...graph.keys()];
  if (!files) return dirs;
  const isGlobal = (f) => (!f.includes('/') && !INERT_ROOT.test(f)) || globals.some((g) => f === g || f.startsWith(`${g}/`));
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

async function plan(args) {
  const under = option(args, '--under', '');
  const globals = [...options(args, '--global'), 'scripts/ci-affected.mjs'];
  const graph = workspaceGraph(options(args, '--extra'));
  const selected = affectedDirs(graph, await changedFiles(), globals).filter((d) => d.startsWith(under));
  const shards = shard(selected, Number(option(args, '--shards', '4')));
  console.log(`${selected.length} workspace(s) under '${under}' to check:`);
  shards.forEach((s) => console.log(`  shard ${s.name}: ${s.dirs}`));
  const out = process.env.GITHUB_OUTPUT;
  if (out) appendFileSync(out, `any=${selected.length > 0}\ndirs=${JSON.stringify(selected)}\nmatrix=${JSON.stringify(shards)}\n`);
}

// ------------------------------------------------------------------ hash

/** Accepts pnpm filter spelling too: `./portals/admin`, `./packages/**`. */
function hash(paths) {
  const graph = workspaceGraph();
  const dirs = [...graph.keys()];
  const roots = paths.map((p) => p.replace(/^\.\//, '').replace(/\/\*\*$/, ''));
  const members = roots.flatMap((p) => dirs.filter((d) => d === p || d.startsWith(`${p}/`)));
  const inputs = new Set([...roots, ...withDependencies(graph, members)]);
  const rootFiles = git('ls-tree', 'HEAD')
    .split('\n')
    .filter((l) => l.includes(' blob ') && !INERT_ROOT.test(l.split('\t')[1]));
  const trees = [...inputs].toSorted(byName).map((p) => {
    const tree = git('rev-parse', 'HEAD:' + p);
    return `${p} ${tree}`;
  });
  process.stdout.write(createHash('sha256').update([...rootFiles, ...trees].join('\n')).digest('hex').slice(0, 32));
}

const [command, ...rest] = process.argv.slice(2);
if (command === 'plan') await plan(rest);
else if (command === 'hash') hash(rest);
else {
  console.error('usage: ci-affected.mjs plan --under <dir/> [--shards N] [--global <path>...] [--extra <dir>...] | hash <path>...');
  process.exit(2);
}
