import { apply } from "./e.mjs";
for (const p of ["packages/i18n/src/bundles.ts", "packages/i18n/src/index.ts", "packages/app-settings/src/index.ts"]) {
  apply(p, [["  WEBSITE_APP_BUNDLE,", "  UI_BUNDLE,\n  WEBSITE_APP_BUNDLE,"]]);
}
