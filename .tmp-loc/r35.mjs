import { apply } from "./e.mjs";
apply("packages/ui/src/BackHeader.tsx", [
  [
    "import { mergeSx } from './mergeSx';",
    "import { useTranslation } from './i18n/useTranslation';\nimport { mergeSx } from './mergeSx';",
  ],
]);
