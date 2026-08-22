#!/usr/bin/env node
/**
 * RATCHET: no NEW user-facing string may be hardcoded (CLAUDE.md rule 38).
 *
 * The repo carries a large backlog of copy written as literals instead of
 * translation keys, and that backlog is being swept surface by surface. A gate
 * that simply failed on any hit would be red for months and get switched off,
 * so this one compares against a checked-in baseline: every file may keep the
 * hits it had, and may never gain one. The backlog can only shrink.
 *
 * Usage:
 *   node scripts/verify-hardcoded-copy.mjs [repoRoot]     check (CI)
 *   node scripts/verify-hardcoded-copy.mjs [repoRoot] --update
 *
 * `--update` rewrites the baseline and is never run in CI. Run it after
 * localizing a surface so the ceiling drops with the work; a diff that RAISES a
 * number is the thing to catch in review.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { scanRepo } from "./lib/hardcoded-copy.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const BASELINE = join(HERE, "hardcoded-copy-baseline.json");
const NAME = "verify-hardcoded-copy";

const args = process.argv.slice(2);
const update = args.includes("--update");
const ROOT = resolve(args.find((a) => !a.startsWith("--")) ?? ".");

const counts = scanRepo(ROOT);
const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

if (update) {
  writeFileSync(BASELINE, `${JSON.stringify(counts, null, 2)}\n`, "utf8");
  console.log(
    `${NAME}: baseline updated — ${total} hit(s) across ${Object.keys(counts).length} file(s)`,
  );
  process.exit(0);
}

let baseline;
try {
  baseline = JSON.parse(readFileSync(BASELINE, "utf8"));
} catch {
  console.error(
    `${NAME}: no baseline at ${BASELINE} — run with --update to create it`,
  );
  process.exit(1);
}

/** A file absent from the baseline is new, and its ceiling is zero. */
const regressions = Object.entries(counts)
  .map(([file, n]) => ({ file, n, was: baseline[file] ?? 0 }))
  .filter((row) => row.n > row.was);

if (regressions.length > 0) {
  const lines = regressions.map(
    (r) => `${r.file}: ${r.was} -> ${r.n} (+${r.n - r.was})`,
  );
  console.error(
    `${NAME}: ${regressions.length} file(s) gained hardcoded user-facing copy.\n` +
      `Add the text to packages/i18n/src/bundles/ and render it with t() instead.\n\n  ${lines.join("\n  ")}\n`,
  );
  process.exit(1);
}

const baseTotal = Object.values(baseline).reduce((sum, n) => sum + n, 0);
const cleared = baseTotal - total;
const stale = Object.keys(baseline).filter((f) => !(f in counts));
console.log(
  `${NAME}: ${total} hardcoded hit(s), baseline ${baseTotal}` +
    (cleared > 0
      ? ` — ${cleared} cleared across ${stale.length} fully-clean file(s); run --update to lower the ceiling`
      : " — no regressions"),
);
