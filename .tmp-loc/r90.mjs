import { apply } from "./e.mjs";
apply("packages/app-settings/src/index.ts", [
  [
    "export {\n  LocaleProvider,\n  PUBLIC_LOCALES,\n  PUBLIC_TRANSLATIONS,\n  useTranslation,\n} from './useTranslation';",
    "export {\n  createBundleTranslation,\n  LocaleProvider,\n  PUBLIC_LOCALES,\n  PUBLIC_TRANSLATIONS,\n  useTranslation,\n} from './useTranslation';",
  ],
  ["  type NestedCatalogue,", "  type NestedCatalogue,\n  type TranslateOptions,"],
]);
