/**
 * Finds user-facing copy written as a literal instead of a translation key
 * (CLAUDE.md rule 38).
 *
 * Shared by the ratchet gate and by the sweep tooling so the two can never
 * disagree about what counts as a violation — a detector that drifted from the
 * baseline it produced would fail files nobody had touched.
 *
 * The heuristics are deliberately CONSERVATIVE. A ratchet is only useful if a
 * clean push stays green, so a construct that cannot be classified with
 * confidence is not counted at all. The counts here are therefore a floor on
 * the real debt, never a ceiling.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/** Surfaces that render copy. `server` ships its own email bundle and is
 * covered by the translation-key gate; vendored trees are somebody else's. */
export const SCAN_ROOTS = ["app", "packages", "portals", "website"];

/**
 * Trees whose "copy" is documentation, not product UI.
 *
 * `@duncit/docs-demos` is a corpus of worked examples: demo titles, the notes
 * that explain what to look at, and mock data written to be read by whoever is
 * about to change the package. It is the same kind of content as `docs-site`
 * (already outside SCAN_ROOTS) and is deliberately English — translating a
 * sentence that exists to explain a TypeScript signature would help nobody, and
 * a ratchet that demands it is a ratchet somebody deletes.
 *
 * Paths, not directory names: a folder called `examples` anywhere else is still
 * product code.
 */
const SKIP_PATH = ["packages/docs-demos"];

const SKIP_DIR = new Set([
  "node_modules",
  "dist",
  "build",
  ".astro",
  "coverage",
  "generated",
  "open-wa-server",
  "__tests__",
  "e2e",
  "cypress",
  ".git",
]);
/** Only rendered surfaces. Copy parked in a `.ts` file is caught where it renders. */
const SOURCE_EXT = /\.(tsx|astro)$/;
const NOT_SOURCE = /\.(test|spec|cy|stories)\.[tj]sx?$/;

export function* sourceFiles(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries.sort((a, b) => a.localeCompare(b))) {
    if (SKIP_DIR.has(entry)) continue;
    const full = join(dir, entry);
    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) yield* sourceFiles(full);
    else if (SOURCE_EXT.test(entry) && !NOT_SOURCE.test(entry)) yield full;
  }
}

/**
 * JSX props whose value the user reads. `name`, `id`, `variant` and `value` are
 * excluded on purpose: they carry identifiers far more often than copy, and a
 * ratchet that cries wolf is a ratchet somebody deletes.
 */
const COPY_PROP =
  "label|placeholder|title|helperText|headerName|tooltip|emptyText|" +
  "confirmLabel|cancelLabel|submitLabel|subtitle|heading|caption|" +
  "errorText|alt|primary|secondary|description|message";

const PATTERNS = [
  // <TextField label="Super category" />
  new RegExp(
    String.raw`\b(?:` + COPY_PROP + String.raw`)\s*=\s*(['"])([^'"{}<>\n]{3,})\1`,
    "g",
  ),
  // { headerName: 'Date / Time' } — capitalised, so enum-ish values are skipped.
  new RegExp(
    String.raw`\b(?:` + COPY_PROP + String.raw`)\s*:\s*(['"])([A-Z][^'"\n]{2,})\1`,
    "g",
  ),
  // setToast('Created 3 host leads')
  new RegExp(
    String.raw`\b(?:setToast|toast|setError|setMessage|setSuccess|` +
      String.raw`enqueueSnackbar|setStatus)\(\s*(['"])([A-Za-z][^'"\n]{3,})\1`,
    "g",
  ),
  // <Typography>Host details</Typography> — one line, starts with a capital.
  /> ?([A-Z][A-Za-z][^<>{}\n]{3,}?) ?</g,
];

/**
 * Is this literal copy a human reads, rather than an identifier, a URL, a CSS
 * value, or a token that merely looks like a word?
 */
export function isUserFacing(raw) {
  const value = raw.trim();
  if (value.length < 3 || value.length > 200) return false;
  if (!/[A-Za-z]/.test(value)) return false;
  if (/^[a-z0-9_-]+$/.test(value)) return false; // css class, enum, slug
  if (/^[A-Z0-9_]+$/.test(value)) return false; // CONSTANT_CASE
  if (/^(https?:|\/|#|\.|\$|@|\{)/.test(value)) return false; // url, path, token
  if (/^\d/.test(value)) return false;
  if (/^[A-Za-z]+\([^)]*\)$/.test(value)) return false; // rgb(…), translate(…)
  // Either a phrase, or a single Capitalised word like "Overview".
  return /\s/.test(value) || /^[A-Z][a-z]{2,}$/.test(value);
}

/** Every hardcoded-copy hit in one file's text, as the literals themselves. */
export function findInSource(text) {
  const hits = [];
  for (const pattern of PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const value = match[2] ?? match[1];
      if (isUserFacing(value)) hits.push(value);
    }
  }
  return hits;
}

/**
 * Repo-relative path -> number of hits, for every scanned file with at least
 * one. Paths use forward slashes so a baseline written on Windows matches what
 * CI computes on Linux.
 */
export function scanRepo(root) {
  const counts = {};
  for (const scanRoot of SCAN_ROOTS) {
    for (const file of sourceFiles(join(root, scanRoot))) {
      const rel = relative(root, file).replaceAll("\\", "/");
      if (SKIP_PATH.some((skip) => rel.startsWith(`${skip}/`))) continue;
      const hits = findInSource(readFileSync(file, "utf8"));
      if (hits.length === 0) continue;
      counts[rel] = hits.length;
    }
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)),
  );
}
