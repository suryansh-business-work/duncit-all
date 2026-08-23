import { apply } from "./e.mjs";
apply("packages/auto-pods/docs/index.mdx", [
  ["  - 'autoPodSchema'", "  - 'buildAutoPodSchema'"],
  [
    "`autoPodSchema` against the same rules the server applies.",
    "`buildAutoPodSchema(t)` against the same rules the server applies — it takes\nthe console's translator, because a validation message is copy the author reads\n(rule 38).",
  ],
]);
