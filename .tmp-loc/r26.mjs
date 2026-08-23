import { apply } from "./e.mjs";

// shell ships session.* too — the login screen and the portal-mode gates are
// @duncit/user-context's, and every portal renders them.
apply("packages/shell/src/i18n/fallback.ts", [
  [
    "import {\n  allFallbackEntries,\n  createTranslator,\n  flattenCatalogue,\n  SHELL_BUNDLE,",
    "import {\n  allFallbackEntries,\n  createTranslator,\n  flattenCatalogue,\n  SESSION_BUNDLE,\n  SHELL_BUNDLE,",
  ],
  [
    "export const SHELL_FALLBACK: NestedCatalogue = SHELL_BUNDLE;",
    "// `session.*` is @duncit/user-context's — the login screen, the maintenance /\n// under-development gates and the \"user data not loaded\" dialog. It renders in\n// mWeb as well, so it is its own namespace rather than a second copy inside\n// `shell.*` (rule 40); the two are disjoint, so a shallow merge is the whole of\n// it.\nexport const SHELL_FALLBACK: NestedCatalogue = { ...SHELL_BUNDLE, ...SESSION_BUNDLE };",
  ],
]);

apply("app/mweb/src/i18n/fallback.ts", [
  [
    "  POLICY_ACCEPTANCE_BUNDLE,\n  WHATSAPP_BUNDLE,",
    "  POLICY_ACCEPTANCE_BUNDLE,\n  SESSION_BUNDLE,\n  WHATSAPP_BUNDLE,",
  ],
  [
    "  ...POLICY_ACCEPTANCE_BUNDLE,\n  ...WHATSAPP_BUNDLE,\n};",
    "  ...POLICY_ACCEPTANCE_BUNDLE,\n  ...SESSION_BUNDLE,\n  ...WHATSAPP_BUNDLE,\n};",
  ],
  [
    "// namespaces are disjoint (`mweb`, `grievance`, `podProduct`,\n// `whatsappPreference`, `policyAcceptance`), so a shallow merge is the whole of\n// it — no key can shadow another.",
    "// namespaces are disjoint (`mweb`, `grievance`, `podProduct`,\n// `whatsappPreference`, `policyAcceptance`, `session`), so a shallow merge is\n// the whole of it — no key can shadow another. `session.*` is\n// @duncit/user-context's: the portal-mode gate and the \"user data not loaded\"\n// dialog render here too.",
  ],
]);
