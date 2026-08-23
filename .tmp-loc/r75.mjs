import { readFileSync } from "node:fs";
import { apply } from "./e.mjs";
const block = readFileSync(".tmp-loc/earn-bundle.txt", "utf8").split("\r\n").join("\n");
for (const b of ["shell", "mweb"]) {
  apply(`packages/i18n/src/bundles/${b}.ts`, [
    ["    hostPodEdit: {\n      contentCheck: 'Content check',\n    },", block + "    hostPodEdit: {\n      contentCheck: 'Content check',\n    },"],
  ]);
}
