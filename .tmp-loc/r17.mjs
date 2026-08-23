import { apply } from "./e.mjs";

apply("packages/location/src/AdminLocationSelect.tsx", [
  [
    "const DEFAULT_LABELS: Record<LocationLevel, string> = {",
    "/** Label keys, so an unlabelled level still reads in the viewer's language. */\nconst DEFAULT_LABEL_KEYS: Record<LocationLevel, string> = {",
  ],
  [
    "}: Readonly<AdminLocationSelectProps>) {\n  const { locations, loading } = useAdminLocations();",
    "}: Readonly<AdminLocationSelectProps>) {\n  const { t } = useTranslation();\n  const { locations, loading } = useAdminLocations();",
  ],
  [
    "import { EMPTY_LOCATION, type AdminLocationValue, type LocationLevel } from './types';",
    "import { useTranslation } from './i18n/useTranslation';\nimport { EMPTY_LOCATION, type AdminLocationValue, type LocationLevel } from './types';",
  ],
]);
