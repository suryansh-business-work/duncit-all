/**
 * jscpd plumbing for scripts/verify-duplication.mjs — running the detector and
 * turning its report into the two numbers the gate holds: duplicated lines per
 * AREA, and the repo-wide duplication percentage.
 *
 * Kept apart from the gate itself so the measurement can be reused (a report
 * script, a docs refresh) without re-implementing the attribution rules below.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

/**
 * Trees that ship product code. `app/mobile-app` is not a pnpm workspace member
 * but is very much product code (rule 27 says it must not drift from mWeb), and
 * `server/src` is in because the server is a duplication boundary of its own:
 * it takes no `@duncit/*` dependency, so its copies consolidate internally.
 */
export const SCAN_PATHS = [
  "app/mweb/src",
  "app/mobile-app/src",
  "packages",
  "portals",
  "server/src",
  "website",
];

/** Roots whose SECOND segment names the workspace (`portals/finance`). */
const NESTED_ROOTS = new Set(["app", "packages", "portals", "website"]);

/**
 * The unit the ratchet counts. Per-FILE would be more precise and unusable:
 * rule 9 has files splitting into folders constantly, and every such move would
 * read as brand-new duplication. A workspace is stable across those moves and
 * still fails the moment a copy lands inside it.
 */
export function areaOf(file) {
  const parts = file.split("/");
  if (NESTED_ROOTS.has(parts[0]) && parts.length > 1) {
    return `${parts[0]}/${parts[1]}`;
  }
  return parts[0];
}

const posix = (p) => p.replaceAll("\\", "/");

function runJscpd(root) {
  const out = mkdtempSync(join(tmpdir(), "jscpd-"));
  const bin = resolve(root, "node_modules/jscpd/bin/jscpd");
  try {
    execFileSync(
      process.execPath,
      [bin, ...SCAN_PATHS, "--reporters", "json", "--output", out, "--silent"],
      { cwd: root, stdio: ["ignore", "ignore", "inherit"], maxBuffer: 1 << 28 },
    );
    return JSON.parse(readFileSync(join(out, "jscpd-report.json"), "utf8"));
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

/**
 * A clone is a PAIR, and both halves are duplicated code, so both sides are
 * counted. Line NUMBERS go into a set per file rather than a running total:
 * jscpd reports overlapping fragments when three or more files share a block,
 * and summing their lengths would count the same line several times — a figure
 * that moves when an unrelated fourth copy appears.
 */
function duplicatedLinesByFile(duplicates) {
  const byFile = new Map();
  const mark = (side) => {
    const file = posix(side.name);
    let lines = byFile.get(file);
    if (!lines) {
      lines = new Set();
      byFile.set(file, lines);
    }
    for (let line = side.start; line <= side.end; line++) lines.add(line);
  };
  for (const clone of duplicates) {
    mark(clone.firstFile);
    mark(clone.secondFile);
  }
  return byFile;
}

/** The largest clone pairs, so a failing gate can name what was copied. */
function biggestClones(duplicates, limit) {
  return duplicates
    .map((clone) => ({
      lines: clone.lines,
      first: posix(clone.firstFile.name),
      firstStart: clone.firstFile.start,
      firstEnd: clone.firstFile.end,
      second: posix(clone.secondFile.name),
      secondStart: clone.secondFile.start,
      secondEnd: clone.secondFile.end,
    }))
    .sort((a, b) => b.lines - a.lines || a.first.localeCompare(b.first))
    .slice(0, limit);
}

/** @returns {{areas: Record<string, number>, total: object, clones: object[]}} */
export function measure(root) {
  const report = runJscpd(root);
  const byFile = duplicatedLinesByFile(report.duplicates ?? []);

  const areas = {};
  for (const [file, lines] of byFile) {
    const area = areaOf(file);
    areas[area] = (areas[area] ?? 0) + lines.size;
  }

  const sorted = {};
  for (const area of Object.keys(areas).sort((a, b) => a.localeCompare(b))) {
    sorted[area] = areas[area];
  }

  const stats = report.statistics?.total ?? {};
  return {
    areas: sorted,
    total: {
      lines: stats.lines ?? 0,
      duplicatedLines: stats.duplicatedLines ?? 0,
      percent: Number((stats.percentage ?? 0).toFixed(2)),
      clones: stats.clones ?? 0,
      sources: stats.sources ?? 0,
    },
    clones: biggestClones(report.duplicates ?? [], 200),
  };
}
