import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { SCAN_ROOTS, sourceFiles, isUserFacing } from "../scripts/lib/hardcoded-copy.mjs";

// mirror of PATTERNS, but capturing the match index so we can name the line
const COPY_PROP =
  "label|placeholder|title|helperText|headerName|tooltip|emptyText|" +
  "confirmLabel|cancelLabel|submitLabel|subtitle|heading|caption|" +
  "errorText|alt|primary|secondary|description|message";
const P = [
  ["prop", new RegExp(String.raw`\b(?:${COPY_PROP})\s*=\s*(['"])([^'"{}<>\n]{3,})\1`, "g")],
  ["obj", new RegExp(String.raw`\b(?:${COPY_PROP})\s*:\s*(['"])([A-Z][^'"\n]{2,})\1`, "g")],
  ["toast", new RegExp(String.raw`\b(?:setToast|toast|setError|setMessage|setSuccess|enqueueSnackbar|setStatus)\(\s*(['"])([A-Za-z][^'"\n]{3,})\1`, "g")],
  ["jsx", /(?<!=)> ?([A-Z][A-Za-z][^<>{}\n]{3,}?) ?</g],
];
const ROOT = process.cwd();
const SKIP_PATH = ["packages/docs-demos"];
const out = [];
for (const scanRoot of SCAN_ROOTS) {
  for (const file of sourceFiles(join(ROOT, scanRoot))) {
    const rel = relative(ROOT, file).replaceAll("\\", "/");
    if (SKIP_PATH.some((s) => rel.startsWith(`${s}/`))) continue;
    const text = readFileSync(file, "utf8");
    const starts = [];
    { let i = 0; for (const l of text.split("\n")) { starts.push(i); i += l.length + 1; } }
    const lineAt = (idx) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (starts[m] <= idx) lo = m; else hi = m - 1; } return lo; };
    const lines = text.split("\n");
    for (const [kind, pat] of P) {
      pat.lastIndex = 0;
      let m;
      while ((m = pat.exec(text)) !== null) {
        const value = m[2] ?? m[1];
        if (!isUserFacing(value)) continue;
        const ln = lineAt(m.index);
        out.push({ file: rel, line: ln + 1, kind, text: value, src: lines[ln].trim().slice(0, 170) });
      }
    }
  }
}
out.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
console.log(JSON.stringify(out, null, 1));
