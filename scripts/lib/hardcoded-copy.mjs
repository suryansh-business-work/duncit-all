/**
 * Finds user-facing copy written as a literal instead of a translation key
 * (CLAUDE.md rule 38).
 *
 * Shared by the ratchet gate and by the sweep tooling so the two can never
 * disagree about what counts as a violation — a detector that drifted from the
 * baseline it produced would fail files nobody had touched.
 *
 * The heuristics stay CONSERVATIVE about AMBIGUITY — a construct that cannot be
 * classified with confidence is not counted — but they are no longer
 * conservative about REACH. The first version scanned only `.tsx`/`.astro` and
 * only single-line JSX text, and reported four hits repo-wide while roughly two
 * thousand real ones sat in `.ts` constant tables, Zod messages, thrown errors
 * and JSX text written across two lines. A ratchet nobody can fail is not a
 * ratchet; these five extra passes are what make the number mean something:
 *
 *   1. `.ts` files          — a label table or a schema is copy wherever it lives
 *   2. multi-line JSX text  — the usual way a sentence is written in a component
 *   3. Zod / Yup messages   — the sentence a person is stopped by
 *   4. aria-labels          — copy a screen reader reads out
 *   5. thrown Error text    — what a catch block puts in front of the user
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
 * `packages/i18n/src` is the copy itself: every bundle is a wall of English by
 * definition, and it is the one place rule 38 wants it.
 *
 * Paths, not directory names: a folder called `examples` anywhere else is still
 * product code.
 */
const SKIP_PATH = ["packages/docs-demos", "packages/i18n/src"];

const SKIP_DIR = new Set([
  "node_modules",
  "dist",
  "build",
  ".astro",
  "coverage",
  "generated",
  "open-wa-server",
  "__tests__",
  "__mocks__",
  "e2e",
  "cypress",
  ".git",
]);
/** Any source a surface ships. A `.ts` label table renders as surely as a `.tsx`. */
const SOURCE_EXT = /\.(tsx?|astro)$/;
const NOT_SOURCE = /\.(test|spec|cy|stories|d)\.[tj]sx?$/;

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
 * Blank out comments before scanning.
 *
 * Prose in a doc block is the one place in this repo where English is not only
 * allowed but wanted, and these files are heavily commented — without this the
 * `.ts` pass would report every explanation as a violation. Replaced with
 * spaces rather than removed so byte offsets, and therefore line numbers, still
 * line up with the file on disk.
 */
export function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (line, before) =>
      before + " ".repeat(line.length - before.length),
    );
}

/**
 * JSX props whose value the user reads. `name`, `id`, `variant` and `value` are
 * excluded on purpose: they carry identifiers far more often than copy, and a
 * ratchet that cries wolf is a ratchet somebody deletes.
 */
const COPY_PROP =
  "aria-label|label|placeholder|title|helperText|headerName|tooltip|emptyText|" +
  "confirmLabel|cancelLabel|submitLabel|subtitle|heading|caption|" +
  "errorText|alt|primary|secondary|description|message";

/** Object keys that hold copy in a constant table, a config or a schema. */
const COPY_KEY =
  "label|title|text|heading|subtitle|description|placeholder|helperText|" +
  "emptyText|caption|summary|hint|tooltip|cta|body|message|required_error";

/** Zod / Yup validators whose trailing argument is the message shown on failure. */
const VALIDATOR =
  "min|max|regex|email|url|length|refine|nonempty|superRefine|int|positive|gt|lt|matches|oneOf";

const PATTERNS = [
  // <TextField label="Super category" />
  new RegExp(
    String.raw`\b(?:` + COPY_PROP + String.raw`)\s*=\s*(['"])([^'"{}<>\n]{3,})\1`,
    "g",
  ),
  // { headerName: 'Date / Time' } — capitalised, so enum-ish values are skipped.
  new RegExp(
    String.raw`\b(?:` + COPY_KEY + String.raw`)\s*:\s*(['"])([A-Z][^'"\n]{2,})\1`,
    "g",
  ),
  // setToast('Created 3 host leads')
  new RegExp(
    String.raw`\b(?:setToast|toast|setError|setMessage|setSuccess|` +
      String.raw`enqueueSnackbar|setStatus)\(\s*(['"])([A-Za-z][^'"\n]{3,})\1`,
    "g",
  ),
  // z.string().min(1, 'Name is required')
  new RegExp(
    String.raw`\.(?:` + VALIDATOR + String.raw`)\([^)]*?(['"])([A-Z][^'"\n]{5,})\1`,
    "g",
  ),
  // throw new Error('Invoice not available') — surfaced by the catch block.
  /throw new Error\(\s*(['"])([A-Z][^'"\n]{8,})\1/g,
  // `Delete "${name}"? This cannot be undone.` — a sentence built at the call
  // site. Needs an interpolation AND lowercase words either side of it, so a
  // path or a class list is not read as prose.
  /`([^`$<>\n]{0,60}\$\{[^}]{1,40}\}[^`<>\n]{6,80})`/g,
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

/**
 * JSX text children, including the ones written on their own line.
 *
 * One bounded character class then a literal `<`, with the neighbours checked
 * afterwards, rather than a pattern that spans the whitespace itself: the
 * `\s*\n?\s*` version backtracked so badly it never finished on a 3k-line page.
 * The `>` must close a real tag and the `<` must open one, so a TypeScript
 * generic (`Record<string, string>`) is never read as copy.
 */
function jsxText(text) {
  const hits = [];
  const pattern = />([^<>{}=]{4,240})</g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const before = text[match.index - 1];
    const after = text[match.index + match[0].length];
    if (!before || !/[A-Za-z0-9"'}\]/]/.test(before)) continue;
    if (!after || !/[A-Za-z/]/.test(after)) continue;
    const value = match[1].replace(/\s+/g, " ").trim();
    // A sentence a component renders opens with a capital or a quotation mark;
    // anything else here is far more likely to be markup that survived.
    if (!/^[A-Z"'“]/.test(value)) continue;
    if (!/\s/.test(value)) continue;
    if (isUserFacing(value)) hits.push(value);
  }
  return hits;
}

/** Every hardcoded-copy hit in one file's text, as the literals themselves. */
export function findInSource(text, rel = "") {
  const source = stripComments(text);
  const hits = [];
  // A swept nav config keeps a REQUIRED English `label` beside its `labelKey`,
  // so an unswept console still renders real words — that pairing is the fix,
  // not the violation.
  const keyed = /\b(?:label|title|description|caption|section)Key\s*:/.test(source);
  for (const pattern of PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(source)) !== null) {
      const value = match[2] ?? match[1];
      if (!isUserFacing(value)) continue;
      if (keyed && /Key\s*:/.test(lineAround(source, match.index))) continue;
      hits.push(value);
    }
  }
  if (/\.(tsx|astro)$/.test(rel)) hits.push(...jsxText(source));
  return hits;
}

/** The matched line plus the one after it, for the `*Key` sibling check. */
function lineAround(text, index) {
  const start = text.lastIndexOf("\n", index) + 1;
  const nextBreak = text.indexOf("\n", index);
  const end = nextBreak === -1 ? text.length : text.indexOf("\n", nextBreak + 1);
  return text.slice(start, end === -1 ? text.length : end);
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
      const hits = findInSource(readFileSync(file, "utf8"), rel);
      if (hits.length === 0) continue;
      counts[rel] = hits.length;
    }
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)),
  );
}
