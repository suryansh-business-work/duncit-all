import { apply } from "./e.mjs";
for (const p of ["packages/i18n/src/bundles.ts", "packages/i18n/src/index.ts", "packages/app-settings/src/index.ts"]) {
  apply(p, [["  CHALLENGE_BUNDLE,", "  AD_REQUEST_BUNDLE,\n  CHALLENGE_BUNDLE,"]]);
}
