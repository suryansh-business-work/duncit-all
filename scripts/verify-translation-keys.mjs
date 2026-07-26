#!/usr/bin/env node
/**
 * Every key in the shipped fallback catalogue must actually be rendered by some
 * surface (CLAUDE.md rule 38).
 *
 * A key nobody calls `t()` with is worse than missing: an admin sees it in
 * Localization > Translations, pays to have it translated, and the translation
 * never appears anywhere. Run from the repo root.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.argv[2] ?? '.');
const BUNDLES = join(ROOT, 'packages/i18n/src/bundles.ts');

/** Source roots that render copy. Generated + vendored trees are skipped. */
const SEARCH_ROOTS = ['app', 'packages', 'portals', 'website'];
const SKIP_DIR = new Set([
  'node_modules',
  'dist',
  'build',
  '.astro',
  'coverage',
  'generated',
  'open-wa-server',
  '__tests__',
]);
const SOURCE_EXT = /\.(tsx?|astro|mjml)$/;

/** Leaf keys of the nested literals in bundles.ts, as `a.b.c` paths. */
function bundleKeys(source) {
  const keys = [];
  const path = [];
  // The file is a small set of plain object literals, so brace depth plus the
  // `name:` before each brace reconstructs every path without a TS parser.
  for (const raw of source.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('//') || line.startsWith('*') || line.startsWith('/*')) continue;

    const open = /^(?:export const \w+: NestedCatalogue = )?(?:'([^']+)'|(\w+)):?\s*\{$/.exec(line);
    if (open) {
      path.push(open[1] ?? open[2]);
      continue;
    }
    if (line.startsWith('}')) {
      path.pop();
      continue;
    }
    const leaf = /^(?:'([^']+)'|(\w+)):\s*['"`]/.exec(line);
    if (leaf) keys.push([...path, leaf[1] ?? leaf[2]].join('.'));
  }
  return keys;
}

function* sourceFiles(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIP_DIR.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* sourceFiles(full);
    else if (SOURCE_EXT.test(entry)) yield full;
  }
}

const keys = bundleKeys(readFileSync(BUNDLES, 'utf8'));
if (keys.length === 0) {
  console.error('verify-translation-keys: parsed 0 keys — the bundle format changed');
  process.exit(1);
}

const used = new Set();
for (const root of SEARCH_ROOTS) {
  for (const file of sourceFiles(join(ROOT, root))) {
    if (file.endsWith('bundles.ts')) continue;
    const text = readFileSync(file, 'utf8');
    for (const key of keys) {
      // `t('key')` in code, `{{t:key}}` in an MJML template.
      if (text.includes(`'${key}'`) || text.includes(`{{t:${key}}}`)) used.add(key);
    }
  }
}

const unused = keys.filter((k) => !used.has(k));
if (unused.length > 0) {
  console.error(
    `verify-translation-keys: ${unused.length} shipped key(s) nothing renders:\n  ${unused.join('\n  ')}`,
  );
  process.exit(1);
}
console.log(`verify-translation-keys: all ${keys.length} keys are rendered`);
