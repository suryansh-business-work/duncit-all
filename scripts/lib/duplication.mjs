/**
 * jscpd plumbing for scripts/verify-duplication.mjs — running the detector and
 * turning its report into the two numbers the gate holds: duplicated lines per
 * AREA, and the repo-wide duplication percentage.
 *
 * Kept apart from the gate itself so the measurement can be reused (a report
 * script, a docs refresh) without re-implementing the attribution rules below.
 */
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

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

const SOURCE_EXT = /\.(tsx?|jsx?|mjs|cjs)$/;

/**
 * The corpus, staged into a temp tree with LF endings.
 *
 * Two things made a Windows run and a CI run disagree by ~200 lines on the same
 * commit, and a checked-in baseline is worthless if it only holds on one OS:
 *
 *  - `core.autocrlf=true` gives the Windows working tree CRLF, so every line
 *    carries an extra token and fragments land either side of `minTokens`
 *    differently than they do on the runner's LF checkout.
 *  - the working tree carries whatever is uncommitted, which on a repo several
 *    sessions write to at once is never the same set twice.
 *
 * Asking git for the file list (tracked + untracked-but-not-ignored, exactly
 * what a fresh checkout has) and rewriting each one with LF removes both.
 */
function stageCorpus(root) {
  const dir = mkdtempSync(join(tmpdir(), "jscpd-src-"));
  const listed = execFileSync(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", ...SCAN_PATHS],
    { cwd: root, maxBuffer: 1 << 28 },
  ).toString("utf8");

  for (const rel of listed.split("\0")) {
    if (!rel || !SOURCE_EXT.test(rel)) continue;
    let source;
    try {
      source = readFileSync(join(root, rel), "utf8");
    } catch {
      continue; // listed but deleted in the working tree
    }
    const dest = join(dir, rel);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, source.replaceAll("\r\n", "\n"), "utf8");
  }
  return dir;
}

function runJscpd(root) {
  const corpus = stageCorpus(root);
  const out = mkdtempSync(join(tmpdir(), "jscpd-"));
  // Read the entry from the package rather than assuming a path: jscpd 5
  // replaced `bin/jscpd` with a launcher beside its manifest.
  const manifest = resolve(root, "node_modules/jscpd/package.json");
  const declared = JSON.parse(readFileSync(manifest, "utf8")).bin;
  const entry = typeof declared === "string" ? declared : declared.jscpd;
  const bin = resolve(dirname(manifest), entry);
  try {
    execFileSync(
      process.execPath,
      [
        bin,
        // The corpus already holds ONLY the SCAN_PATHS files, so `.` scans the
        // same set — and it is load-bearing for the paths in the report: jscpd 5
        // names each file relative to the scan-path ARGUMENT it was found under,
        // so passing the paths themselves strips their first segment and every
        // area in the baseline reads as brand-new duplication ("ads-portal"
        // instead of "portals/ads-portal"). Relative to `.`, the names match
        // what v4 reported and the baseline keeps meaning what it says.
        ".",
        "--config",
        resolve(root, ".jscpd.json"),
        "--reporters",
        "json",
        "--output",
        out,
        "--silent",
      ],
      { cwd: corpus, stdio: ["ignore", "ignore", "inherit"], maxBuffer: 1 << 28 },
    );
    return JSON.parse(readFileSync(join(out, "jscpd-report.json"), "utf8"));
  } finally {
    rmSync(out, { recursive: true, force: true });
    rmSync(corpus, { recursive: true, force: true });
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
