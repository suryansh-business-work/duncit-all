import { apply } from "./e.mjs";

apply("packages/i18n/src/bundles/shell.ts", [
  [
    "      active: 'Active',\n      inactive: 'Inactive',\n    },\n",
    "      active: 'Active',\n      inactive: 'Inactive',\n    },\n\n" +
      "    /**\n" +
      "     * @duncit/table's own chrome — the toolbar, the column menu, the filter\n" +
      "     * popover and the two default column headers its factories produce.\n" +
      "     *\n" +
      "     * It sits in the SHELL bundle rather than in a namespace of its own\n" +
      "     * because the table is portal-only and every portal already ships the\n" +
      "     * shell: one translator decision covers all seventeen consoles instead of\n" +
      "     * seventeen rows saying 'Export CSV' (rule 40).\n" +
      "     */\n" +
      "    table: {\n" +
      "      search: 'Search…',\n" +
      "      clearSearch: 'Clear search',\n" +
      "      filters: 'Filters',\n" +
      "      columns: 'Columns',\n" +
      "      resetColumns: 'Reset columns',\n" +
      "      exportCsv: 'Export CSV',\n" +
      "      refresh: 'Refresh',\n" +
      "      densityStandard: 'Standard density',\n" +
      "      densityCompact: 'Compact density',\n" +
      "      empty: 'No rows to display',\n" +
      "      selectRow: 'Select row',\n" +
      "      selectAllRows: 'Select every row on this page',\n" +
      "      // The filter popover. `any` is the unset option of a select filter;\n" +
      "      // `yes`/`no` are how a boolean column reads in a chip and a dropdown.\n" +
      "      any: 'Any',\n" +
      "      yes: 'Yes',\n" +
      "      no: 'No',\n" +
      "      clearAll: 'Clear all',\n" +
      "      apply: 'Apply',\n" +
      "      rangeMin: '{label} min',\n" +
      "      rangeMax: '{label} max',\n" +
      "      rangeFrom: '{label} from',\n" +
      "      rangeTo: '{label} to',\n" +
      "      opContains: 'contains',\n" +
      "    },\n",
  ],
]);
