import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { SCAN_ROOTS, sourceFiles, findInSource, isUserFacing } from "../scripts/lib/hardcoded-copy.mjs";

const ROOT = process.cwd();
const SKIP_PATH = ["packages/docs-demos"];
const out = [];
for (const scanRoot of SCAN_ROOTS) {
  for (const file of sourceFiles(join(ROOT, scanRoot))) {
    const rel = relative(ROOT, file).replaceAll("\\", "/");
    if (SKIP_PATH.some((s) => rel.startsWith(`${s}/`))) continue;
    const text = readFileSync(file, "utf8");
    const hits = findInSource(text);
    if (!hits.length) continue;
    const lines = text.split("\n");
    for (const h of hits) {
      const idx = lines.findIndex((l) => l.includes(h));
      out.push({ file: rel, line: idx + 1, text: h, src: (lines[idx] ?? "").trim().slice(0, 160) });
    }
  }
}
console.log(JSON.stringify(out, null, 1));
