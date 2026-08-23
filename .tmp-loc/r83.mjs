import { readFileSync } from "node:fs";
import { apply } from "./e.mjs";
const block = readFileSync(".tmp-loc/status-bundle.txt", "utf8").split("\r\n").join("\n");
apply("packages/i18n/src/bundles/status.ts", [
  ["    impact: {", block + "    impact: {"],
]);
