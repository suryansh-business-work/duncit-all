#!/usr/bin/env node
/**
 * npm-check-updates for this monorepo — one implementation, every manifest.
 *
 *   node scripts/deps.mjs check     # what is behind, nothing written
 *   node scripts/deps.mjs update    # rewrite the ranges in package.json
 *
 * Every workspace carries `deps:check` / `deps:update` scripts that call this
 * file with their own directory as the cwd, so the pair means "this package"
 * there and "all 79 manifests" at the repo root. That is the whole point of a
 * shared script rather than 79 copies of an ncu invocation: the flags below —
 * which registry, what to skip, what NOT to touch — are decided once.
 *
 * Two things it will not do, both deliberate:
 *
 * - It never installs. `ncu -u` rewrites ranges; resolving them is a separate
 *   act with a different blast radius, so the install command is printed and
 *   you run it when you mean to.
 * - It never offers to upgrade a `@duncit/*` workspace dependency. Those are
 *   `workspace:*` links to code in this repo and are not published anywhere;
 *   asking the registry about them is a question with no true answer.
 *
 * ncu is spawned as a CLI rather than imported because it is pure ESM with a
 * moving API surface, and the JSON it prints is a stable contract. It resolves
 * from the ROOT node_modules (a root devDependency), so no workspace needs its
 * own copy on PATH — the trap that breaks a script whose CLI belongs to a
 * different workspace.
 */
import { execFile, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

/** Vendored third party (CLAUDE.md rule 36) — not ours to bump. */
const VENDORED = 'open-wa-server';
/** Workspace links, not registry packages. */
const INTERNAL_SCOPE = '@duncit/*';
const REGISTRY = 'https://registry.npmjs.org';
/** A registry sweep per manifest, so a slow one cannot stall the rest. */
const CONCURRENCY = 6;
const NCU_TIMEOUT_MS = 120_000;
const NCU_MAX_BUFFER = 8 * 1024 * 1024;

const args = process.argv.slice(2);
const mode = args.find((a) => !a.startsWith('-')) ?? 'check';
const passthrough = args.filter((a) => a.startsWith('-') && a !== '--all');
const forceAll = args.includes('--all');

if (mode !== 'check' && mode !== 'update') {
  console.error(`deps: unknown mode '${mode}' — expected 'check' or 'update'.`);
  process.exit(1);
}

const ncuCli = () =>
  path.join(path.dirname(require.resolve('npm-check-updates/package.json')), 'build', 'cli.js');

/** Every manifest this repo owns, from git rather than a hand-kept list. */
function allManifests() {
  const listed = execFileSync('git', ['ls-files', '**/package.json', 'package.json'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((file) => !file.includes(VENDORED));
  return listed.map((file) => path.join(ROOT, file));
}

/** What this invocation is about: one package, or the whole repo. */
function targets() {
  const cwd = process.cwd();
  if (forceAll || path.resolve(cwd) === ROOT) return allManifests();
  const own = path.join(cwd, 'package.json');
  if (!fs.existsSync(own)) {
    console.error(`deps: no package.json in ${cwd}`);
    process.exit(1);
  }
  return [own];
}

/** Ask ncu about one manifest. Returns { name -> newer range }. */
async function inspect(manifest) {
  const flags = [
    ncuCli(),
    '--packageFile',
    manifest,
    '--jsonUpgraded',
    '--target',
    'latest',
    '--packageManager',
    'npm',
    '--registry',
    REGISTRY,
    '--reject',
    INTERNAL_SCOPE,
    ...passthrough,
  ];
  if (mode === 'update') flags.push('--upgrade');
  const { stdout } = await execFileAsync(process.execPath, flags, {
    cwd: ROOT,
    timeout: NCU_TIMEOUT_MS,
    maxBuffer: NCU_MAX_BUFFER,
    windowsHide: true,
  });
  const printed = stdout.slice(stdout.indexOf('{'));
  return printed.trim() ? JSON.parse(printed) : {};
}

/** Run the sweep a few at a time: 79 registry round trips in series is minutes. */
async function sweep(manifests) {
  const results = [];
  let next = 0;
  const worker = async () => {
    while (next < manifests.length) {
      const manifest = manifests[next++];
      try {
        results.push({ manifest, upgrades: await inspect(manifest) });
      } catch (error) {
        results.push({ manifest, error: error?.message ?? String(error) });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, manifests.length) }, worker));
  return results.sort((a, b) => a.manifest.localeCompare(b.manifest));
}

const KINDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

/** What a manifest declares today, read before an update can rewrite it. */
function declaredRanges(manifest) {
  const json = JSON.parse(fs.readFileSync(manifest, 'utf8'));
  const ranges = new Map();
  for (const kind of KINDS) {
    // First kind wins: ncu upgrades prod/dev/optional by default, so a package
    // that is ALSO a peer would otherwise report the peer range it never touched.
    for (const [name, range] of Object.entries(json[kind] ?? {})) {
      if (!ranges.has(name)) ranges.set(name, range);
    }
  }
  return ranges;
}

const manifests = targets();
console.log(
  `deps ${mode}: ${manifests.length} manifest(s), skipping ${INTERNAL_SCOPE} and ${VENDORED}/…`
);

const before = new Map(manifests.map((manifest) => [manifest, declaredRanges(manifest)]));
const results = await sweep(manifests);
let behind = 0;
let failed = 0;

for (const { manifest, upgrades, error } of results) {
  const label = path.relative(ROOT, manifest).split(path.sep).join('/');
  if (error) {
    failed += 1;
    console.log(`\n  ${label}\n    ! ${error.split('\n')[0]}`);
    continue;
  }
  const names = Object.keys(upgrades);
  if (names.length === 0) continue;
  behind += names.length;
  console.log(`\n  ${label}`);
  const was = before.get(manifest);
  for (const name of names.sort()) {
    const from = was.get(name) ?? '?';
    console.log(`    ${name.padEnd(38)} ${from.padEnd(14)} -> ${upgrades[name]}`);
  }
}

if (failed > 0) console.log(`\n${failed} manifest(s) could not be checked.`);

if (behind === 0) {
  console.log('\nEverything is on its newest published version.');
} else if (mode === 'check') {
  console.log(`\n${behind} dependency range(s) behind. Rewrite them with: pnpm deps:update`);
} else {
  console.log(`\n${behind} range(s) rewritten. Install them with:`);
  console.log('  pnpm install                                  # every pnpm workspace');
  console.log('  npm install --prefix app/mobile-app           # the app is npm, not pnpm');
  console.log(
    '\nA major bump is a code change, not a version change — read the changelogs,\n' +
      'and for the mobile app prefer `npx expo install --check`, which pins what the\n' +
      'installed Expo SDK actually supports.'
  );
}
