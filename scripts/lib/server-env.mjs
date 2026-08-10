/**
 * Reads `server/.env` the way the server itself does, from a plain Node script.
 *
 * A script that has to reach the SAME database the API uses needs the SAME
 * connection string, and that string only lives in `server/.env` (the server
 * loads it with `dotenv/config`). Asking a developer to re-export it before
 * every run is exactly the step that ends up pointing at the wrong cluster, so
 * read the file the server reads.
 *
 * dotenv is a SERVER dependency, not a root one, so this is a short reader
 * rather than a new dependency at the repo root. It mirrors dotenv's handling
 * of the forms that actually appear in an env file: an `export` prefix, quoted
 * values, and a `#` comment after an unquoted value.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ENTRY = /^\s*(?:export\s+)?([\w.-]+)\s*=\s*(.*)$/;
const QUOTES = new Set(['"', "'", "`"]);

/** Strip the quotes dotenv strips; truncate an unquoted inline comment. */
function parseValue(raw) {
  const value = raw.trim();
  const quote = value[0];
  if (QUOTES.has(quote) && value.length > 1 && value.endsWith(quote)) {
    const inner = value.slice(1, -1);
    return quote === '"' ? inner.replaceAll("\\n", "\n") : inner;
  }
  // dotenv reads an unquoted value as everything before the first `#`.
  return value.split("#")[0].trim();
}

/** `KEY=value` lines of an env file, as a plain object. */
export function parseEnvFile(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    if (line.trim().startsWith("#")) continue;
    const match = ENTRY.exec(line);
    if (match) values[match[1]] = parseValue(match[2]);
  }
  return values;
}

/**
 * A reader over `server/.env`.
 *
 * The real environment wins over the file, so `MONGO_URI=… node script.mjs`
 * still targets whatever the caller asked for — the file is the default, not an
 * override. `path` is null when there is no `server/.env` at all, which lets a
 * caller say so instead of reporting a blank value with no explanation.
 */
export function serverEnv(repoRoot) {
  const path = join(repoRoot, "server", ".env");
  let fileValues = {};
  let found = true;
  try {
    fileValues = parseEnvFile(readFileSync(path, "utf8"));
  } catch {
    found = false;
  }
  return {
    path: found ? path : null,
    get: (name) => process.env[name] || fileValues[name] || "",
  };
}
