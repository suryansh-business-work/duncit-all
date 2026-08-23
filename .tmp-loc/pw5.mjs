import { apply } from "./e.mjs";
// There is only one fallback footer group on this site; the second was never
// rendered.
apply("packages/i18n/src/bundles/website.ts", [
  ["        supportGroup: 'Support',\n", ""],
]);
