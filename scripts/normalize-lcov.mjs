#!/usr/bin/env node
/**
 * Rewrites every lcov `SF:` path to be repo-root relative, in place.
 *
 *   node scripts/normalize-lcov.mjs [rootDir]
 *
 * WHY THIS EXISTS
 * ---------------
 * SonarQube never runs tests; it reads the lcov each runner writes and resolves
 * every `SF:` path against `sonar.projectBaseDir` — the repo root. But each
 * runner writes paths relative to ITS OWN workspace:
 *
 *   packages/regex/coverage/lcov.info   ->  SF:regex.mjs
 *   portals/admin/coverage/lcov.info    ->  SF:src/pages/Foo.tsx
 *
 * Sonar then looks for `<repo>/regex.mjs` and `<repo>/src/pages/Foo.tsx`, finds
 * nothing, and DROPS the coverage silently — no warning, no failure, just 0%.
 * That is why `packages`, `portals`, `server` and `website` all reported 0.0%
 * coverage while their own 100% thresholds were passing locally.
 *
 * Jest writes absolute paths, which Sonar can resolve — that is why only the
 * mobile app ever showed up. Those are rewritten to repo-relative here too, so
 * the scan does not depend on the checkout living at a particular path.
 *
 * The workspace root for an lcov file is the nearest ancestor directory holding
 * a package.json, which handles every layout in use here: `coverage/lcov.info`,
 * `coverage/vitest/lcov.info` and `cypress-artifacts/coverage/lcov.info`.
 *
 * Idempotent: a path that already resolves from the repo root is left alone.
 */
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.astro', 'android', 'ios']);

/** Every lcov.info under `dir`, skipping dependency and build output trees. */
function findLcovFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        findLcovFiles(path.join(dir, entry.name), out);
      }
    } else if (entry.name === 'lcov.info') {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

/** Nearest ancestor of `from` that holds a package.json, or ROOT. */
function workspaceRootFor(from) {
  let dir = from;
  while (dir.startsWith(ROOT) && dir !== ROOT) {
    if (existsSync(path.join(dir, 'package.json'))) return dir;
    dir = path.dirname(dir);
  }
  return ROOT;
}

const toPosix = (p) => p.split(path.sep).join('/');

/**
 * Repo-relative POSIX path for one `SF:` value, or null when it cannot be
 * resolved to a file that actually exists (a stale entry we must not invent a
 * path for).
 */
function resolveSourcePath(sourceFile, workspaceRoot) {
  const candidates = path.isAbsolute(sourceFile)
    ? [sourceFile]
    : [path.join(workspaceRoot, sourceFile), path.join(ROOT, sourceFile)];

  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return toPosix(path.relative(ROOT, candidate));
    }
  }
  return null;
}

function normalizeFile(lcovPath) {
  const workspaceRoot = workspaceRootFor(path.dirname(lcovPath));
  const lines = readFileSync(lcovPath, 'utf8').split(/\r?\n/);

  let rewritten = 0;
  let unresolved = 0;
  const out = lines.map((line) => {
    if (!line.startsWith('SF:')) return line;
    const sourceFile = line.slice(3).trim();
    const resolved = resolveSourcePath(sourceFile, workspaceRoot);
    if (resolved === null) {
      unresolved += 1;
      return line;
    }
    if (resolved !== sourceFile) rewritten += 1;
    return `SF:${resolved}`;
  });

  if (rewritten > 0) writeFileSync(lcovPath, out.join('\n'), 'utf8');
  return { rewritten, unresolved };
}

const lcovFiles = findLcovFiles(ROOT);
if (lcovFiles.length === 0) {
  console.error('normalize-lcov: no lcov.info found — the coverage runs produced nothing.');
  process.exit(1);
}

let totalRewritten = 0;
let totalUnresolved = 0;
for (const lcovPath of lcovFiles) {
  const { rewritten, unresolved } = normalizeFile(lcovPath);
  totalRewritten += rewritten;
  totalUnresolved += unresolved;
  const rel = toPosix(path.relative(ROOT, lcovPath));
  console.log(`  ${rel.padEnd(64)} rewritten=${rewritten} unresolved=${unresolved}`);
}

console.log(
  `normalize-lcov: ${lcovFiles.length} report(s), ${totalRewritten} path(s) rewritten, ${totalUnresolved} unresolved.`,
);
if (totalUnresolved > 0) {
  console.warn(
    'normalize-lcov: unresolved entries are reported as-is; Sonar will ignore them. ' +
      'They usually mean the source moved after the coverage run.',
  );
}
