import { apply } from "./e.mjs";

apply("packages/docs-demos/src/demos/table.tsx", [
  [
    "import {\n  EM_DASH,\n  clientTableFetch,\n  filterChipLabel,",
    "import {\n  EM_DASH,\n  clientTableFetch,\n  fallbackT,\n  filterChipLabel,",
  ],
  [
    "      'Toolbar chips': mock.query.filters.map((filter) =>\n        filterChipLabel(mock.columns, filter)\n      ),",
    "      // The chip words (\"Yes\", \"contains\") come from the catalogue, so the\n      // label takes a translator; outside React that is the package's own.\n      'Toolbar chips': mock.query.filters.map((filter) =>\n        filterChipLabel(mock.columns, filter, fallbackT)\n      ),",
  ],
]);

apply("packages/table/src/index.ts", [
  [
    "export { filterChipLabel } from './toolbar/filterState';",
    "export { filterChipLabel } from './toolbar/filterState';\nexport { fallbackT, useTranslation } from './i18n';\nexport type { Translate } from './i18n';",
  ],
]);
