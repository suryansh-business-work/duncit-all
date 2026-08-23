import { readFileSync, writeFileSync } from "node:fs";

const src = readFileSync("packages/ai-prompts/src/copy.ts", "utf8").split("\r\n").join("\n");
const start = src.indexOf("export const PROMPT_COPY = {");
const end = src.indexOf("} as const;", start);
const body = src.slice(start + "export const PROMPT_COPY = ".length, end + 1);
  const cleaned = body.split("} satisfies Record<PromptKind, { label: string; chip: string; blurb: string }>,").join("},");
const obj = eval("(" + cleaned + ")");

const q = (s) => "'" + s.replaceAll("\\", "\\\\").replaceAll("'", "\'") + "'";

/** Nested object literal, sorted the way the source reads. */
function emit(node, indent) {
  const pad = " ".repeat(indent);
  const lines = [];
  for (const [k, v] of Object.entries(node)) {
    if (v && typeof v === "object") {
      lines.push(`${pad}${k}: {`);
      lines.push(emit(v, indent + 2));
      lines.push(`${pad}},`);
    } else {
      lines.push(`${pad}${k}: ${q(v)},`);
    }
  }
  return lines.join("\n");
}

/** The same shape, but every leaf replaced by a t('ai.library.<path>') call. */
function emitT(node, indent, path) {
  const pad = " ".repeat(indent);
  const lines = [];
  for (const [k, v] of Object.entries(node)) {
    const p = [...path, k];
    if (v && typeof v === "object") {
      lines.push(`${pad}${k}: {`);
      lines.push(emitT(v, indent + 2, p));
      lines.push(`${pad}},`);
    } else {
      lines.push(`${pad}${k}: t('ai.library.${p.join(".")}'),`);
    }
  }
  return lines.join("\n");
}

writeFileSync(".tmp-loc/ai-library-bundle.txt", emit(obj, 6) + "\n", "utf8");
writeFileSync(".tmp-loc/ai-library-copy.txt", emitT(obj, 4, []) + "\n", "utf8");
console.log("leaves:", JSON.stringify(obj).match(/:/g).length);
