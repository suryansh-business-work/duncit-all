#!/usr/bin/env node
/**
 * RATCHET: no workspace may gain duplicated code (CLAUDE.md rules 34 + 40).
 *
 * The audit in docs/duplication-audit.md measured ~19,000 duplicated lines
 * across ~55 clusters, and docs/duplication-backlog.md tracks how little of it
 * has been paid down. A gate that simply failed on any clone would be red for
 * months and get switched off, so this one works exactly like its sibling
 * verify-hardcoded-copy.mjs: every workspace may KEEP the duplication it has
 * and may never GAIN any, and the repo-wide percentage has a hard ceiling on
 * top. The backlog can only shrink.
 *
 * Usage:
 *   node scripts/verify-duplication.mjs                    check (CI)
 *   node scripts/verify-duplication.mjs --summary=out.md   check + PR comment body
 *   node scripts/verify-duplication.mjs --update           rewrite the baseline
 *
 * `--update` is never run in CI. Run it after deleting a duplicate so the
 * ceiling drops with the work; a diff that RAISES a number is the thing to
 * catch in review, which is why the baseline is checked in rather than derived
 * from the base branch at run time.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { areaOf, measure } from "./lib/duplication.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const BASELINE = join(HERE, "duplication-baseline.json");
const NAME = "verify-duplication";

const args = process.argv.slice(2);
const update = args.includes("--update");
const summaryPath = args.find((a) => a.startsWith("--summary="))?.slice(10);

/**
 * The agreed ceiling. It is deliberately a hair above where the repo sits, not
 * an aspiration: the per-workspace ratchet is what stops growth, and this is
 * the backstop that catches a spread thin enough to slip under every single
 * workspace's own number. Lower it as the backlog is paid down.
 */
const HEADROOM_PERCENT = 0.25;

const readBaseline = () => JSON.parse(readFileSync(BASELINE, "utf8"));

function writeBaseline(result) {
  const baseline = {
    maxPercent: Math.ceil((result.total.percent + HEADROOM_PERCENT) * 10) / 10,
    areas: result.areas,
  };
  writeFileSync(BASELINE, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
  console.log(
    `${NAME}: baseline updated — ${result.total.duplicatedLines} duplicated line(s), ` +
      `${result.total.percent}% of ${result.total.lines}, ceiling ${baseline.maxPercent}%`,
  );
}

/** A workspace absent from the baseline is new, and its ceiling is zero. */
function regressions(areas, baseline) {
  return Object.entries(areas)
    .map(([area, now]) => ({ area, now, was: baseline.areas[area] ?? 0 }))
    .filter((row) => row.now > row.was)
    .sort((a, b) => b.now - b.was - (a.now - a.was));
}

/** The clones that explain a regressed workspace, biggest first. */
function clonesFor(clones, areaSet) {
  const inArea = (file) => areaSet.has(areaOf(file));
  return clones.filter((c) => inArea(c.first) || inArea(c.second)).slice(0, 10);
}

const MARKER = "<!-- duncit-duplication-gate -->";

function summaryMarkdown(result, baseline, rows, overCeiling) {
  const { total } = result;
  const failed = rows.length > 0 || overCeiling;
  const head = [
    MARKER,
    "### Duplicate code gate — jscpd",
    "",
    failed
      ? "**Result: FAILED** — this branch adds duplicated code."
      : "**Result: passed** — no workspace gained duplicated code.",
    "",
    "| Metric | Value |",
    "| --- | --- |",
    `| Duplicated lines | ${total.duplicatedLines} of ${total.lines} |`,
    `| Duplication | ${total.percent}% (ceiling ${baseline.maxPercent}%) |`,
    `| Clone pairs | ${total.clones} across ${total.sources} files |`,
    "",
  ];

  if (overCeiling) {
    head.push(
      `Repo-wide duplication is over the agreed ceiling of ${baseline.maxPercent}%.`,
      "",
    );
  }

  if (rows.length === 0) return head.join("\n");

  head.push(
    `#### ${rows.length} workspace(s) gained duplicated lines`,
    "",
    "| Workspace | Baseline | Now | Δ |",
    "| --- | ---: | ---: | ---: |",
    ...rows.map((r) => `| \`${r.area}\` | ${r.was} | ${r.now} | +${r.now - r.was} |`),
    "",
  );

  const areaSet = new Set(rows.map((r) => r.area));
  const examples = clonesFor(result.clones, areaSet);
  if (examples.length > 0) {
    head.push(
      "#### Largest clones touching those workspaces",
      "",
      ...examples.map(
        (c) =>
          `- **${c.lines} lines** — \`${c.first}:${c.firstStart}-${c.firstEnd}\` ↔ ` +
          `\`${c.second}:${c.secondStart}-${c.secondEnd}\``,
      ),
      "",
    );
  }

  head.push(
    "<details><summary>Measured duplicated lines per workspace</summary>",
    "",
    "```json",
    JSON.stringify(result.areas, null, 2),
    "```",
    "",
    "</details>",
    "",
    "Move the shared logic into a `@duncit/*` package (CLAUDE.md rule 40 has the map of",
    "which package owns what; `server/src` consolidates internally instead). If the code",
    "genuinely moved rather than multiplied, re-run `pnpm dup:update` and commit the",
    "baseline — a raised number is what review is meant to look at.",
    "",
  );
  return head.join("\n");
}

const result = measure(ROOT);

if (update) {
  writeBaseline(result);
  process.exit(0);
}

let baseline;
try {
  baseline = readBaseline();
} catch {
  console.error(
    `${NAME}: no baseline at ${BASELINE} — run with --update to create it`,
  );
  process.exit(1);
}

const rows = regressions(result.areas, baseline);
const overCeiling = result.total.percent > baseline.maxPercent;

if (summaryPath) {
  writeFileSync(
    summaryPath,
    summaryMarkdown(result, baseline, rows, overCeiling),
    "utf8",
  );
}

if (rows.length > 0 || overCeiling) {
  const lines = rows.map(
    (r) => `${r.area}: ${r.was} -> ${r.now} (+${r.now - r.was})`,
  );
  console.error(
    `${NAME}: ${result.total.percent}% duplicated (ceiling ${baseline.maxPercent}%), ` +
      `${rows.length} workspace(s) gained duplicated code.\n` +
      `Move the shared logic into a @duncit/* package (CLAUDE.md rule 40).\n\n  ${lines.join("\n  ")}\n`,
  );
  process.exit(1);
}

console.log(
  `${NAME}: ${result.total.duplicatedLines} duplicated line(s), ` +
    `${result.total.percent}% of ${result.total.lines} (ceiling ${baseline.maxPercent}%) — no regressions`,
);
