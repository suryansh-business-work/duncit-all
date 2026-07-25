#!/usr/bin/env node
/**
 * Fails the build when a project's fallback-icon bundle is incomplete.
 *
 * Every project must ship a local copy of each icon named in
 * @duncit/fallback-icons, so a server URL that is missing or fails to load
 * always has something to render.
 *
 * Why an explicit script rather than relying on the bundler: a static import of
 * a missing file only breaks Rollup/Metro if that module is REACHABLE from an
 * entry point. If nothing imports the manifest yet — or an import is removed —
 * the bundler silently succeeds. This check does not care who imports what.
 *
 * Chain it inside the "build" script, not "prebuild": pnpm >= 8 defaults
 * enable-pre-post-scripts=false, so a prebuild hook would never run.
 *
 *   node ../../scripts/verify-fallback-icons.mjs src/fallback-icons
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONTRACT = path.join(HERE, '..', 'packages', 'fallback-icons', 'src', 'contract.ts');

/**
 * Read the canonical names straight from the contract. It stays the single
 * source of truth (its `as const` tuple is what makes a missing NAME a tsc
 * error), and Node cannot import .ts portably across our Node versions and
 * Docker images — so parse it, and treat a failed parse as a hard error rather
 * than silently verifying nothing.
 */
function readIconNames() {
  const source = fs.readFileSync(CONTRACT, 'utf8');
  const block = /export const FALLBACK_ICON_NAMES = \[(.*?)\] as const;/s.exec(source);
  if (!block) {
    console.error(`verify-fallback-icons: could not parse FALLBACK_ICON_NAMES from ${CONTRACT}`);
    process.exit(1);
  }
  const names = [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  if (names.length === 0) {
    console.error('verify-fallback-icons: FALLBACK_ICON_NAMES parsed as empty');
    process.exit(1);
  }
  return names;
}

const FALLBACK_ICON_NAMES = readIconNames();

const dir = process.argv[2];
if (!dir) {
  console.error('verify-fallback-icons: expected a directory argument');
  process.exit(1);
}

const root = path.resolve(process.cwd(), dir);
if (!fs.existsSync(root)) {
  console.error(`verify-fallback-icons: missing fallback-icons directory: ${root}`);
  process.exit(1);
}

const files = fs.readdirSync(root);
/** name -> the file that provides it, ignoring extension. */
const provided = new Map(files.map((file) => [path.parse(file).name, file]));

const missing = FALLBACK_ICON_NAMES.filter((name) => !provided.has(name));

if (missing.length > 0) {
  console.error(
    [
      '',
      `verify-fallback-icons: ${missing.length} fallback icon(s) missing in ${dir}`,
      ...missing.map((name) => `  - ${name}  (add ${dir}/${name}.<png|svg>)`),
      '',
      'Every name in @duncit/fallback-icons must exist locally so a failed',
      'server icon always has a bundled replacement.',
      '',
    ].join('\n'),
  );
  process.exit(1);
}

console.log(`verify-fallback-icons: ${FALLBACK_ICON_NAMES.length} icons present in ${dir}`);
