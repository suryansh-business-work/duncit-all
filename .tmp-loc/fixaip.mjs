import { readFileSync, writeFileSync } from "node:fs";
const p = ".tmp-loc/aiprompts.mjs";
const lines = readFileSync(p, "utf8").split("\n");
const i = lines.findIndex((l) => l.includes("const obj = eval("));
lines[i] = '  const cleaned = body.split("} satisfies Record<PromptKind, { label: string; chip: string; blurb: string }>,").join("},");\nconst obj = eval("(" + cleaned + ")");';
writeFileSync(p, lines.join("\n"), "utf8");
console.log("patched");
