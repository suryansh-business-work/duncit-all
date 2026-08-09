/**
 * Reads the shipped fallback catalogue (`packages/i18n/src/bundles/`) from
 * plain Node.
 *
 * The package is raw TypeScript with `main: ./src/index.ts` and no build step,
 * so a `.mjs` script cannot import it. The files are only plain object
 * literals, so brace depth plus the `name:` before each brace reconstructs
 * every path without pulling in a TS parser (which would mean a new dependency
 * for two scripts).
 *
 * The catalogue is one file per namespace so parallel localization work does
 * not collide in a single file, which is why callers read the FOLDER rather
 * than a path of their own: a caller still pointing at the old aggregator would
 * parse zero keys and report success over nothing.
 *
 * Shared by `verify-translation-keys.mjs` (which needs the keys) and
 * `seed-localization.mjs` (which needs the English text too), so the two can
 * never disagree about what the bundle contains — a drift that would let the
 * gate pass while the seeder uploaded a different set (rule 34/40).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Where the per-namespace bundle files live, relative to the repo root. */
export const BUNDLE_DIR = "packages/i18n/src/bundles";

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
 * Every leaf of the nested catalogues, as `{ key: 'a.b.c', value: 'Text' }`.
 *
 * Throws when the parse does not account for every string entry in the file:
 * without that check a future formatting change silently shrinks the result and
 * both callers carry on reporting success over a smaller set.
 */
export function bundleEntries(source) {
  const entries = [];
  const path = [];
  // Prettier wraps a long entry as `key:` / newline / `'value',`. Join those
  // back onto one line first — otherwise the leaf matches nothing and the key
  // is skipped WITHOUT a diagnostic. (`key: {` keeps its brace on the same
  // line, so objects are unaffected.)
  const joined = source.replace(/:[ \t]*\r?\n[ \t]*/g, ": ");

  for (const raw of joined.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("//") || line.startsWith("*") || line.startsWith("/*"))
      continue;

    const open =
      /^(?:export const \w+: NestedCatalogue = )?(?:'([^']+)'|(\w+)):?\s*\{$/.exec(
        line,
      );
    if (open) {
      path.push(open[1] ?? open[2]);
      continue;
    }
    if (line.startsWith("}")) {
      path.pop();
      continue;
    }
    const leaf = /^(?:'([^']+)'|(\w+)):\s*(['"`])([\s\S]*)$/.exec(line);
    if (leaf) {
      entries.push({
        key: [...path, leaf[1] ?? leaf[2]].join("."),
        value: readLiteral(leaf[3], leaf[4]),
      });
    }
  }

  const literals = joined.match(/^[ \t]*(?:'[^']+'|\w+):[ \t]*['"`]/gm) ?? [];
  if (literals.length !== entries.length) {
    throw new Error(
      `parsed ${entries.length} keys but the bundle has ${literals.length} string entries — ` +
        `the parser is out of step with the file's format`,
    );
  }
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
