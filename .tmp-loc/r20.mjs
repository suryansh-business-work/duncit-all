import { apply } from "./e.mjs";
for (const p of ["packages/i18n/src/bundles.ts", "packages/i18n/src/index.ts"]) {
  apply(p, [["  SHELL_BUNDLE,", "  SESSION_BUNDLE,\n  SHELL_BUNDLE,"]]);
}
apply("packages/app-settings/src/index.ts", [["  SHELL_BUNDLE,", "  SESSION_BUNDLE,\n  SHELL_BUNDLE,"]]);
