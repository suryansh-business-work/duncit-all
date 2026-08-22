import { readFileSync, writeFileSync } from "node:fs";
const p = "scripts/lib/hardcoded-copy.mjs";
const lines = readFileSync(p, "utf8").split("\n");
const i = lines.findIndex((l) => l.trim().startsWith("/> ?([A-Z]"));
if (i < 0) throw new Error("pattern line not found");
lines.splice(i, 1,
  "  // The lookbehind drops `=>`: a TypeScript arrow return type (`() =>",
  "  // Promise<void>`) is the same three characters as a JSX text node, and is",
  "  // not copy anybody reads.",
  "  /(?<!=)" + lines[i].trim().slice(1),
);
writeFileSync(p, lines.join("\n"), "utf8");
console.log("ok");
