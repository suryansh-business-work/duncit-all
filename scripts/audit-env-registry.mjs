#!/usr/bin/env node
/**
 * Audits `server/src/modules/platform/envEntry/env-registry.json` — the source
 * of truth for every environment value Duncit reads — against the code.
 *
 *   node scripts/audit-env-registry.mjs          check; exit 1 on any drift
 *   node scripts/audit-env-registry.mjs --write  regenerate every `usedIn` list
 *
 * What it checks:
 *   - every category in ENV_CATEGORIES (envEntry.model.ts) has a registry entry,
 *     and the registry names no category the model does not know;
 *   - every field has a label, a description (why it is used) and a known
 *     validation type, and no env key is mapped twice;
 *   - each field's `usedIn` = the files that read its env key (a quoted literal,
 *     e.g. getRuntimeEnvValue('SMTP_HOST')), and each category's `usedIn` = the
 *     files outside the env module that use the env store with that category;
 *   - `githubSecrets` lists exactly the secrets the workflows reference, each
 *     with a reason it cannot live in the Tech portal, and its `usedIn` matches.
 *
 * Run it before every push (CLAUDE.md) — CI runs the check too. When it fails,
 * run with --write, review the diff, describe any new key, and commit.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_DIR = "server/src/modules/platform/envEntry";
const REGISTRY_PATH = join(ROOT, ENV_DIR, "env-registry.json");
const MODEL_PATH = join(ROOT, ENV_DIR, "envEntry.model.ts");
const NAME = "audit-env-registry";
const WRITE = process.argv.includes("--write");

const CODE_ROOTS = ["server/src", "scripts"];
const CODE_EXTENSIONS = [".ts", ".mjs", ".js"];
const SKIP_DIRS = new Set(["node_modules", "dist", "generated", "__tests__", "coverage"]);
// Text that mentions keys without reading them: the localization seed, and this script's own examples.
const SKIP_FILES = new Set(["server/src/modules/platform/localization/shipped-keys.ts", "scripts/audit-env-registry.mjs"]);
const VALIDATION_TYPES = new Set(["text", "url", "hostname", "email", "phone", "number", "bool", "json", "pem", "list", "fingerprints"]);

const toPosix = (path) => relative(ROOT, path).split(sep).join("/");

/** Every file under `dir` whose name passes `keep`, as repo-relative posix paths. */
function walk(dir, keep, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full, keep, out);
    } else if (keep(entry.name)) {
      out.push(toPosix(full));
    }
  }
  return out;
}

const read = (path) => readFileSync(join(ROOT, path), "utf8");

function loadCode() {
  const isCode = (name) => CODE_EXTENSIONS.some((ext) => name.endsWith(ext)) && !name.endsWith(".d.ts");
  const files = CODE_ROOTS.flatMap((root) => walk(join(ROOT, root), isCode)).filter((path) => !SKIP_FILES.has(path));
  return files.map((path) => ({ path, text: read(path) }));
}

const quoted = (word) => [`'${word}'`, `"${word}"`, `\`${word}\``];
const mentions = (text, word) => quoted(word).some((form) => text.includes(form));
const sorted = (list) => [...new Set(list)].sort((a, b) => a.localeCompare(b));

/** Files that read an env key through a quoted literal. */
const filesReadingKey = (code, key) => sorted(code.filter((file) => mentions(file.text, key)).map((file) => file.path));

/** Whether a file asks the env store for the category: `EnvEntryModel` + `category: 'X'`, or `envEntryService.…('X'`. */
function queriesCategory(text, category) {
  const modelForms = [`category: '${category}'`, `category: "${category}"`];
  if (text.includes("EnvEntryModel") && modelForms.some((form) => text.includes(form))) return true;
  return text.includes("envEntryService.") && [`('${category}'`, `("${category}"`].some((form) => text.includes(form));
}

/**
 * Files outside the env module that query the store for the category, plus
 * every reader of its fields, plus the hand-listed `alsoReadBy` files that
 * build the category's keys at run time.
 */
function filesReadingCategory(code, category, entry) {
  const direct = code.filter((file) => !file.path.startsWith(`${ENV_DIR}/`) && queriesCategory(file.text, category));
  const viaFields = (entry.fields ?? []).flatMap((field) => field.usedIn ?? []);
  return sorted([...direct.map((file) => file.path), ...viaFields, ...(entry.alsoReadBy ?? [])]);
}

/** `alsoReadBy` is hand-written, so each file it names must exist. */
function checkAlsoReadBy(category, entry, code, problems) {
  for (const path of entry.alsoReadBy ?? []) {
    const file = code.find((candidate) => candidate.path === path);
    if (!file) problems.push(`${category}: alsoReadBy names ${path}, which does not exist`);
  }
}

/** secret name → workflow files that reference `secrets.NAME`. */
function secretReferences() {
  const isWorkflow = (name) => name.endsWith(".yml") || name.endsWith(".yaml");
  const refs = new Map();
  for (const path of walk(join(ROOT, ".github"), isWorkflow)) {
    for (const match of read(path).matchAll(/secrets\.([A-Z0-9_]+)/g)) {
      refs.set(match[1], sorted([...(refs.get(match[1]) ?? []), path]));
    }
  }
  return refs;
}

function modelCategories() {
  const source = read(toPosix(MODEL_PATH));
  const start = source.indexOf("export const ENV_CATEGORIES = [");
  const end = source.indexOf("] as const", start);
  if (start < 0 || end < 0) throw new Error(`${NAME}: cannot find ENV_CATEGORIES in ${MODEL_PATH}`);
  return [...source.slice(start, end).matchAll(/'([A-Z0-9_]+)'/g)].map((match) => match[1]);
}

const same = (a, b) => a.length === b.length && a.every((value, index) => value === b[index]);

/** Compare (and on --write, replace) one generated list; returns a problem line or null. */
function syncList(owner, expected, where) {
  const current = owner.usedIn ?? [];
  if (same(current, expected)) return null;
  owner.usedIn = expected;
  return `${where}: usedIn is stale (registry ${JSON.stringify(current)} vs code ${JSON.stringify(expected)})`;
}

function checkCategories(registry, code, problems, stale) {
  const known = modelCategories();
  const listed = Object.keys(registry.categories);
  for (const category of known) if (!listed.includes(category)) problems.push(`${category}: in ENV_CATEGORIES but missing from the registry`);
  for (const category of listed) if (!known.includes(category)) problems.push(`${category}: in the registry but not in ENV_CATEGORIES`);
  const seenKeys = new Set();
  for (const [category, entry] of Object.entries(registry.categories)) {
    // Fields first: the category's list includes every reader of its fields.
    for (const field of entry.fields ?? []) checkField(category, field, code, seenKeys, problems, stale);
    checkAlsoReadBy(category, entry, code, problems);
    const drift = syncList(entry, filesReadingCategory(code, category, entry), category);
    if (drift) stale.push(drift);
  }
}

function checkField(category, field, code, seenKeys, problems, stale) {
  const where = `${category}.${field.name}`;
  if (!field.label?.trim()) problems.push(`${where}: needs a label`);
  if (!field.description?.trim()) problems.push(`${where}: needs a description (why the value is used)`);
  if (!VALIDATION_TYPES.has(field.validation?.type)) problems.push(`${where}: validation.type must be one of ${[...VALIDATION_TYPES].join(", ")}`);
  if (!field.envKey) return;
  if (seenKeys.has(field.envKey)) problems.push(`${where}: env key ${field.envKey} is mapped twice`);
  seenKeys.add(field.envKey);
  const drift = syncList(field, filesReadingKey(code, field.envKey), where);
  if (drift) stale.push(drift);
}

function checkSecrets(registry, problems, stale) {
  const refs = secretReferences();
  const listed = registry.githubSecrets ?? {};
  for (const name of refs.keys()) {
    if (!listed[name]) problems.push(`githubSecrets.${name}: referenced by ${refs.get(name).join(", ")} but not in the registry (add it with a reason it cannot live in the Tech portal)`);
  }
  for (const [name, secret] of Object.entries(listed)) {
    if (!refs.has(name)) problems.push(`githubSecrets.${name}: no workflow references it any more — remove it from the registry and delete the GitHub secret`);
    if (!secret.description?.trim() || !secret.whyNotTechPortal?.trim()) problems.push(`githubSecrets.${name}: needs a description and whyNotTechPortal`);
    const drift = syncList(secret, refs.get(name) ?? [], `githubSecrets.${name}`);
    if (drift) stale.push(drift);
  }
}

const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
const code = loadCode();
const problems = [];
const stale = [];
checkCategories(registry, code, problems, stale);
checkSecrets(registry, problems, stale);

if (WRITE && stale.length > 0) {
  writeFileSync(REGISTRY_PATH, `${JSON.stringify(registry, null, 2)}\n`);
  console.log(`${NAME}: rewrote ${stale.length} usedIn list(s) in ${toPosix(REGISTRY_PATH)}`);
}

const failures = WRITE ? problems : [...problems, ...stale];
if (failures.length > 0) {
  console.error(`${NAME}: ${failures.length} problem(s) in ${toPosix(REGISTRY_PATH)}`);
  for (const line of failures) console.error(`  - ${line}`);
  if (!WRITE && stale.length > 0) console.error(`${NAME}: run \`node scripts/audit-env-registry.mjs --write\`, review the diff and commit it.`);
  process.exit(1);
}
console.log(`${NAME}: env registry matches the code (${Object.keys(registry.categories).length} categories, ${Object.keys(registry.githubSecrets ?? {}).length} GitHub secrets).`);
