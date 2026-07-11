#!/usr/bin/env node
/**
 * Bumps the unified app version across the mobile app + mWeb.
 *
 *   node scripts/bump-version.mjs <major|minor|patch>
 *
 * Source of truth = app/mobile-app/app.json (expo.version). The same new
 * version is written to app/mobile-app/package.json and app/mweb/package.json so
 * every surface (login screens, sidebars) and the deploy's DB sync agree.
 *
 * Called by the husky pre-commit hook (which asks major/minor/patch), and the
 * deploy workflow reads app.json's version into the DB on push.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP_JSON = join(ROOT, 'app/mobile-app/app.json');
const MOBILE_PKG = join(ROOT, 'app/mobile-app/package.json');
const MWEB_PKG = join(ROOT, 'app/mweb/package.json');

const kind = (process.argv[2] ?? '').toLowerCase();
if (!['major', 'minor', 'patch'].includes(kind)) {
  console.error('Usage: node scripts/bump-version.mjs <major|minor|patch>');
  process.exit(1);
}

function bump(version, part) {
  const nums = version.split('.').map((n) => Number.parseInt(n, 10));
  const [major = 0, minor = 0, patch = 0] = nums.map((n) => (Number.isNaN(n) ? 0 : n));
  if (part === 'major') return `${major + 1}.0.0`;
  if (part === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const writeJson = (path, obj) => writeFileSync(path, `${JSON.stringify(obj, null, 2)}\n`, 'utf8');

const appJson = readJson(APP_JSON);
const current = appJson.expo?.version ?? '0.0.0';
const next = bump(current, kind);

appJson.expo.version = next;
writeJson(APP_JSON, appJson);

for (const pkgPath of [MOBILE_PKG, MWEB_PKG]) {
  const pkg = readJson(pkgPath);
  pkg.version = next;
  writeJson(pkgPath, pkg);
}

console.log(`Version bumped (${kind}): ${current} -> ${next}`);
