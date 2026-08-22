/**
 * Reads the shipped fallback catalogue (`packages/i18n/src/bundles/`) from
 * plain Node.
 *
 * The package is raw TypeScript with `main: ./src/index.ts` and no build step,
 * so a `.mjs` script cannot import it. The bundle files are nothing but a type
 * import and one object literal, so the literal is EVALUATED rather than
 * pattern-matched — no TS parser dependency, and no format the reader can be
 * out of step with.
 *
 * It used to walk the file line by line, tracking brace depth. That silently
 * lost every entry written as a one-line nested object —
 * `pod: { description: '…' }` matched neither the "opens a block" pattern nor
 * the "is a leaf" one — and the self-check missed it too, because the same line
 * did not look like a string entry to that either. 68 of mWeb's SSR page-title
 * and OG-description keys were invisible: never gate-checked, and never seeded
 * into Localization, so they could not be translated in any language.
 *
 * The catalogue is one file per namespace so parallel localization work does
 * not collide in a single file, which is why callers read the FOLDER rather
 * than a path of their own: a caller still pointing at the old aggregator would
 * parse zero keys and report success over nothing.
 *
 * Shared by `verify-translation-keys.mjs` (which needs the keys) and
 * `sync-localization.mjs` (which needs the English text too), so the two can
 * never disagree about what the bundle contains — a drift that would let the
 * gate pass while the seeder uploaded a different set (rule 34/40).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Where the per-namespace bundle files live, relative to the repo root. */
export const BUNDLE_DIR = "packages/i18n/src/bundles";

/** Flatten a nested catalogue to dot-paths, dropping non-string leaves exactly
 * as `flattenCatalogue` does in the package itself. */
function flattenInto(node, prefix, entries) {
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") entries.push({ key: path, value });
    else if (value && typeof value === "object" && !Array.isArray(value)) {
      flattenInto(value, path, entries);
    }
  }
}

/**
 * Every leaf of a bundle file, as `{ key: 'a.b.c', value: 'Text' }`.
 *
 * The file is reduced to its object literal and evaluated. A bundle that grows
 * an import, a computed value or a second export stops matching that shape and
 * throws HERE, rather than quietly contributing fewer keys than it contains —
 * which is the failure this replaced.
 */
export function bundleEntries(source) {
  const literal = source
    // The sole import is `import type { NestedCatalogue } from '../catalogue'`,
    // erased at compile time and meaningless to the evaluator.
    .replace(/^[ \t]*import[ \t]+type[^;]*;[ \t]*$/gm, "")
    .replace(/^[ \t]*export const \w+[ \t]*:[ \t]*NestedCatalogue[ \t]*=/m, "return");

  if (!/^[ \t]*return[ \t]*\{/m.test(literal)) {
    throw new Error(
      "no `export const X: NestedCatalogue = {` in the file — the bundle format changed",
    );
  }

  let catalogue;
  try {
    // The input is this repo's own source, not user data.
    catalogue = new Function(literal)();
  } catch (error) {
    throw new Error(`could not evaluate the bundle literal: ${error.message}`);
  }
  if (!catalogue || typeof catalogue !== "object") {
    throw new Error("the bundle did not evaluate to an object");
  }

  const entries = [];
  flattenInto(catalogue, "", entries);
  return entries;
}

/** Just the `a.b.c` paths, for callers that do not need the text. */
export function bundleKeys(source) {
  return bundleEntries(source).map((entry) => entry.key);
}

/**
 * Every leaf of every namespace file in `<repoRoot>/packages/i18n/src/bundles`.
 *
 * Filenames are sorted so the order is the same on every machine — the seeder
 * sends these in order, and a directory-order result would make two runs look
 * like different payloads.
 *
 * Throws when the folder is missing, holds no `.ts` file, or yields no entries.
 * Silence there is the dangerous failure: the verify gate would report success
 * while checking nothing at all.
 */
export function catalogueEntries(repoRoot) {
  const dir = join(repoRoot, BUNDLE_DIR);
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    throw new Error(`no bundle folder at ${dir}`);
  }

  const files = names
    .filter((name) => name.endsWith(".ts"))
    .sort((a, b) => a.localeCompare(b));
  if (files.length === 0) {
    throw new Error(`no bundle files in ${dir} — the catalogue moved`);
  }

  const entries = [];
  for (const file of files) {
    entries.push(...bundleEntries(readFileSync(join(dir, file), "utf8")));
  }
  if (entries.length === 0) {
    throw new Error(
      `parsed 0 keys from ${files.length} file(s) in ${dir} — the bundle format changed`,
    );
  }
  return entries;
}

/** Just the `a.b.c` paths from the whole folder. */
export function catalogueKeys(repoRoot) {
  return catalogueEntries(repoRoot).map((entry) => entry.key);
}

/** The server's own fallback bundle — its MJML email copy (CLAUDE.md rule 38). */
export const EMAIL_BUNDLE_FILE = "server/src/services/email/email-i18n.ts";

/**
 * Records EMAIL_FALLBACK spreads in, by name -> the file that declares them.
 * `serverEmailEntries` throws on a spread that is missing here rather than
 * skipping it, so the next one cannot go unread the way the catalogue did.
 */
const EMAIL_SPREAD_FILES = {
  CATALOGUE_FALLBACK: "server/src/services/email/catalogue/catalogue.bundle.ts",
};

/** Turns a backslash escape into the character it stands for. */
function unescapeChar(char) {
  if (char === "n") return "\n";
  if (char === "t") return "\t";
  return char ?? "";
}

/**
 * Reads a quoted literal, given the opening quote and everything after it.
 * Stops at the first unescaped matching quote, so a value containing an
 * apostrophe (`\'`) survives intact.
 */
function readLiteral(quote, rest) {
  let out = "";
  for (let i = 0; i < rest.length; i += 1) {
    const char = rest[i];
    if (char === "\\") {
      out += unescapeChar(rest[i + 1]);
      i += 1;
      continue;
    }
    if (char === quote) break;
    out += char;
  }
  return out;
}

/**
 * The text inside a top-level `const <name> = { … }` literal, prettier-unwrapped
 * so a key and its value sit on one line.
 */
function recordBody(source, name) {
  const declared = source.indexOf(`const ${name}`);
  if (declared === -1) {
    throw new Error(`no \`const ${name}\` in the file — the bundle moved`);
  }
  const open = source.indexOf("{", declared);
  const close = source.indexOf("\n};", open);
  if (open === -1 || close === -1) {
    throw new Error(`could not read the \`${name}\` object literal`);
  }
  // Same prettier unwrap as bundleEntries: `"key":` / newline / `"value",`.
  return source.slice(open + 1, close).replace(/:[ \t]*\r?\n[ \t]*/g, ": ");
}

/**
 * The leaves of a FLAT `Record<string, string>` literal, e.g. the server's
 * EMAIL_FALLBACK.
 *
 * This one is still read line by line rather than evaluated: the file around it
 * is a module with imports and code of its own, so there is no literal to slice
 * out and run. It is safe from the nesting bug that forced `bundleEntries` to
 * change, because the shape is flat by construction — every key is one dotted,
 * quoted string — and the count check below still catches a shrink.
 *
 * Either quote is accepted for the key: EMAIL_FALLBACK writes them double, the
 * catalogue bundle it spreads in writes them single, and a parser that insisted
 * on one silently read the other as zero keys.
 */
export function flatRecordEntries(source, name) {
  const body = recordBody(source, name);

  const entries = [];
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("//")) continue;
    const leaf = /^(['"])([^'"]+)\1:\s*(['"`])([\s\S]*)$/.exec(line);
    if (leaf) entries.push({ key: leaf[2], value: readLiteral(leaf[3], leaf[4]) });
  }

  const literals = body.match(/^[ \t]*(['"])[^'"]+\1:[ \t]*['"`]/gm) ?? [];
  if (literals.length !== entries.length) {
    throw new Error(
      `parsed ${entries.length} keys from ${name} but it has ${literals.length} string entries — ` +
        `the parser is out of step with the file's format`,
    );
  }
  if (entries.length === 0) {
    throw new Error(`parsed 0 keys from ${name} — the bundle format changed`);
  }
  return entries;
}

/** The names a record spreads in, e.g. `...CATALOGUE_FALLBACK,`. */
function spreadNames(source, name) {
  return [...recordBody(source, name).matchAll(/^[ \t]*\.\.\.([A-Za-z0-9_$]+),/gm)].map(
    (match) => match[1],
  );
}

/**
 * Every key the SERVER ships copy for, read straight from its fallback bundle.
 *
 * Read locally rather than fetched from a running API so the same set is pushed
 * whether or not a server is up — and because the local code is the source of
 * truth for what the platform's keys ARE.
 */
export function serverEmailEntries(repoRoot) {
  const read = (relPath) => {
    const path = join(repoRoot, relPath);
    try {
      return readFileSync(path, "utf8");
    } catch {
      throw new Error(`no server email bundle at ${path}`);
    }
  };

  const source = read(EMAIL_BUNDLE_FILE);
  const entries = flatRecordEntries(source, "EMAIL_FALLBACK");

  // The catalogue's copy is spread in from its own file, so read line by line a
  // spread is not a leaf and its keys were simply invisible here — which the
  // gate reported as "no bundle ships this key" for every one of them.
  for (const spread of spreadNames(source, "EMAIL_FALLBACK")) {
    const file = EMAIL_SPREAD_FILES[spread];
    if (!file) {
      throw new Error(
        `EMAIL_FALLBACK spreads \`${spread}\`, but no file is mapped for it — ` +
          `add it to EMAIL_SPREAD_FILES or its keys ship unseen`,
      );
    }
    entries.push(...flatRecordEntries(read(file), spread));
  }
  return entries;
}
