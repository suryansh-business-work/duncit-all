import { readFileSync } from "node:fs";
import { apply } from "./e.mjs";
const block = readFileSync(".tmp-loc/hpa-bundle.txt", "utf8").split("\r\n").join("\n");

apply("packages/i18n/src/bundles/shell.ts", [
  ["    hostPodEdit: {\n      contentCheck: 'Content check',\n    },", block + "    hostPodEdit: {\n      contentCheck: 'Content check',\n    },"],
]);
apply("packages/i18n/src/bundles/mweb.ts", [
  ["    hostPodEdit: {\n      contentCheck: 'Content check',\n    },", block + "    hostPodEdit: {\n      contentCheck: 'Content check',\n    },"],
]);
