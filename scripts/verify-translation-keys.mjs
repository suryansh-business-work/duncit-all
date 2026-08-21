#!/usr/bin/env node
/**
 * The shipped fallback catalogue and the code that renders it must agree in
 * BOTH directions (CLAUDE.md rule 38). Run from the repo root.
 *
 *   1. No shipped key that nothing renders. An admin sees it in Localization >
 *      Translations, pays to have it translated, and the translation never
 *      appears anywhere.
 *
 *   2. No rendered key that nothing ships. This is the expensive one: the
 *      translator's last resort is to return the KEY, so a `t()` whose key is
 *      absent from the bundle puts `finance.payment.artifactStatus` on screen
 *      as a column header — in every locale, including the default. It cannot
 *      be caught by a type, because keys are strings, and it cannot be caught
 *      by the seeder, which only ever uploads what the bundle already has.
 *
 * The two directions read the source differently, on purpose:
 *   - "is this key referenced at all" is LOOSE — a key is often parked in a
 *     constant map (`labelKey: 'finance.payment.artifactCreated'`) and reaches
 *     `t()` indirectly, so any quoted occurrence counts.
 *   - "is this key definitely rendered" is STRICT — only a literal handed
 *     straight to `t('…')` (or `{{t:…}}` in an MJML template), because that is
 *     the only form we can be sure resolves through the catalogue.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  BUNDLE_DIR,
  catalogueKeys,
  serverEmailEntries,
} from "./lib/bundle-catalogue.mjs";

const ROOT = resolve(process.argv[2] ?? ".");
/** The catalogue itself defines keys; it never renders them. */
const BUNDLES = join(ROOT, BUNDLE_DIR);

/** Source roots that render copy. Generated + vendored trees are skipped. */
const SEARCH_ROOTS = ["app", "packages", "portals", "website", "server"];
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
/** A suite asserting on a deliberately-absent key is not a render site. */
const TEST_FILE = /\.(test|spec|cy|int\.test)\.[tj]sx?$/;

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
    else if (SOURCE_EXT.test(entry) && !TEST_FILE.test(entry)) yield full;
  }
}

/** Every quoted literal in the file — the loose "referenced anywhere" read. */
const QUOTED = /(['"`])([A-Za-z][A-Za-z0-9_.]*)\1/g;
/** A literal handed straight to a translate call — the strict "rendered" read. */
const RENDERED = /\bt\(\s*(['"])([A-Za-z][A-Za-z0-9_.]*)\1/g;
/** The same, inside an MJML email template. */
const RENDERED_MJML = /\{\{t:([A-Za-z][A-Za-z0-9_.]*)\}\}/g;

function matches(text, pattern, group) {
  const out = [];
  pattern.lastIndex = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) out.push(match[group]);
  return out;
}

let shipped;
let serverKeys;
try {
  shipped = catalogueKeys(ROOT);
  serverKeys = serverEmailEntries(ROOT).map((entry) => entry.key);
} catch (error) {
  console.error(`verify-translation-keys: ${error.message}`);
  process.exit(1);
}

/** Everything the platform ships copy for: client bundles + the server's own. */
const known = new Set([...shipped, ...serverKeys]);
const shippedSet = new Set(shipped);

const referenced = new Set();
/** key -> the first file that renders it, for a diagnostic that names a site. */
const rendered = new Map();

for (const root of SEARCH_ROOTS) {
  for (const file of sourceFiles(join(ROOT, root))) {
    if (file.startsWith(BUNDLES) || file.endsWith("bundles.ts")) continue;
    const text = readFileSync(file, "utf8");

    for (const literal of matches(text, QUOTED, 2)) {
      if (shippedSet.has(literal)) referenced.add(literal);
    }
    const site = file.slice(ROOT.length + 1).replaceAll("\\", "/");
    for (const key of [
      ...matches(text, RENDERED, 2),
      ...matches(text, RENDERED_MJML, 1),
    ]) {
      // A single segment is a local helper argument, not a namespaced key; a
      // trailing dot is a prefix being composed (`t('admin.wa.' + name)`).
      if (!key.includes(".") || key.endsWith(".")) continue;
      if (!rendered.has(key)) rendered.set(key, site);
    }
  }
}

const problems = [];

const unused = shipped.filter((key) => !referenced.has(key));
if (unused.length > 0) {
  problems.push(
    `${unused.length} shipped key(s) nothing renders:\n  ${unused.join("\n  ")}`,
  );
}

/**
 * Count-driven copy lives in sibling `.one` / `.other` rows, so `t('x', {count})`
 * renders a key that is deliberately absent as a leaf of its own.
 */
const resolves = (key) =>
  known.has(key) || known.has(`${key}.one`) || known.has(`${key}.other`);

const orphaned = [...rendered.entries()].filter(([key]) => !resolves(key));
if (orphaned.length > 0) {
  const lines = orphaned.map(([key, site]) => `${key}  (${site})`);
  problems.push(
    `${orphaned.length} rendered key(s) no bundle ships — these print the raw key on screen:\n  ${lines.join("\n  ")}`,
  );
}

if (problems.length > 0) {
  console.error(`verify-translation-keys:\n${problems.join("\n\n")}`);
  process.exit(1);
}
console.log(
  `verify-translation-keys: ${shipped.length} shipped key(s) all rendered; ` +
    `${rendered.size} rendered key(s) all ship a fallback`,
);
