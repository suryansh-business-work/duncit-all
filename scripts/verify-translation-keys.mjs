#!/usr/bin/env node
/**
 * Every key in the shipped fallback catalogue must actually be rendered by some
 * surface (CLAUDE.md rule 38).
 *
 * A key nobody calls `t()` with is worse than missing: an admin sees it in
 * Localization > Translations, pays to have it translated, and the translation
 * never appears anywhere. Run from the repo root.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { BUNDLE_DIR, catalogueKeys } from "./lib/bundle-catalogue.mjs";

const ROOT = resolve(process.argv[2] ?? ".");
/** The catalogue itself defines keys; it never renders them. */
const BUNDLES = join(ROOT, BUNDLE_DIR);

/** Source roots that render copy. Generated + vendored trees are skipped. */
const SEARCH_ROOTS = ["app", "packages", "portals", "website"];
const SKIP_DIR = new Set([
  "node_modules",
  "dist",
  "build",
  ".astro",
  "coverage",
  "generated",
  "open-wa-server",
  "__tests__",
]);
const SOURCE_EXT = /\.(tsx?|astro|mjml)$/;

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

let keys;
try {
  keys = catalogueKeys(ROOT);
} catch (error) {
  console.error(`verify-translation-keys: ${error.message}`);
  process.exit(1);
}

const used = new Set();
for (const root of SEARCH_ROOTS) {
  for (const file of sourceFiles(join(ROOT, root))) {
    if (file.startsWith(BUNDLES) || file.endsWith("bundles.ts")) continue;
    const text = readFileSync(file, "utf8");
    for (const key of keys) {
      // `t('key')` in code, `{{t:key}}` in an MJML template.
      if (text.includes(`'${key}'`) || text.includes(`{{t:${key}}}`))
        used.add(key);
    }
  }
}

const unused = keys.filter((k) => !used.has(k));
if (unused.length > 0) {
  console.error(
    `verify-translation-keys: ${unused.length} shipped key(s) nothing renders:\n  ${unused.join("\n  ")}`,
  );
  process.exit(1);
}
console.log(`verify-translation-keys: all ${keys.length} keys are rendered`);
