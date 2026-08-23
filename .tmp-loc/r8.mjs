import { apply } from "./e.mjs";

apply("packages/table/src/toolbar/FilterPopover.tsx", [
  [
    "import type { DuncitColumn, TableFilterValue } from '../types';\nimport { FilterControl } from './filterControls';",
    "import { useTranslation } from '../i18n';\nimport type { DuncitColumn, TableFilterValue } from '../types';\nimport { FilterControl } from './filterControls';",
  ],
  [
    "  const { open, anchorEl, onClose, columns, filters, setFilters } = props;\n  const [drafts, setDrafts] = useState<FilterDraftMap>({});",
    "  const { open, anchorEl, onClose, columns, filters, setFilters } = props;\n  const { t } = useTranslation();\n  const [drafts, setDrafts] = useState<FilterDraftMap>({});",
  ],
  [
    "          <Button size=\"small\" onClick={handleClearAll}>\n            Clear all\n          </Button>\n          <Button size=\"small\" variant=\"contained\" onClick={handleApply}>\n            Apply\n          </Button>",
    "          <Button size=\"small\" onClick={handleClearAll}>\n            {t('shell.table.clearAll')}\n          </Button>\n          <Button size=\"small\" variant=\"contained\" onClick={handleApply}>\n            {t('shell.table.apply')}\n          </Button>",
  ],
]);

apply("packages/table/src/toolbar/DuncitTableToolbar.tsx", [
  [
    "import type { TableDensity } from '../persistence';\nimport type { DuncitColumn, TableFilterValue } from '../types';",
    "import { useTranslation } from '../i18n';\nimport type { TableDensity } from '../persistence';\nimport type { DuncitColumn, TableFilterValue } from '../types';",
  ],
  [
    "  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);\n  const [columnAnchor, setColumnAnchor] = useState<HTMLElement | null>(null);\n  const hasFilterableColumns = columns.some((column) => column.filter);\n  const isCompact = density === 'compact';\n  const densityTitle = isCompact ? 'Standard density' : 'Compact density';\n  const placeholder = searchPlaceholder ?? 'Search…';",
    "  const { t } = useTranslation();\n  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);\n  const [columnAnchor, setColumnAnchor] = useState<HTMLElement | null>(null);\n  const hasFilterableColumns = columns.some((column) => column.filter);\n  const isCompact = density === 'compact';\n  const densityTitle = isCompact ? t('shell.table.densityStandard') : t('shell.table.densityCompact');\n  const placeholder = searchPlaceholder ?? t('shell.table.search');",
  ],
  [
    "      <Tooltip title=\"Clear search\">\n        <IconButton size=\"small\" aria-label=\"Clear search\" onClick={() => setSearchInput('')}>",
    "      <Tooltip title={t('shell.table.clearSearch')}>\n        <IconButton\n          size=\"small\"\n          aria-label={t('shell.table.clearSearch')}\n          onClick={() => setSearchInput('')}\n        >",
  ],
  [
    "          >\n            Filters\n          </Button>",
    "          >\n            {t('shell.table.filters')}\n          </Button>",
  ],
  [
    "          label={filterChipLabel(columns, filter)}",
    "          label={filterChipLabel(columns, filter, t)}",
  ],
  [
    "      <Tooltip title=\"Columns\">\n        <IconButton\n          size=\"small\"\n          aria-label=\"Columns\"",
    "      <Tooltip title={t('shell.table.columns')}>\n        <IconButton\n          size=\"small\"\n          aria-label={t('shell.table.columns')}",
  ],
  [
    "      <Tooltip title=\"Export CSV\">\n        <IconButton size=\"small\" aria-label=\"Export CSV\" onClick={onExportCsv}>",
    "      <Tooltip title={t('shell.table.exportCsv')}>\n        <IconButton size=\"small\" aria-label={t('shell.table.exportCsv')} onClick={onExportCsv}>",
  ],
  [
    "      <Tooltip title=\"Refresh\">\n        <IconButton size=\"small\" aria-label=\"Refresh\" onClick={onRefresh}>",
    "      <Tooltip title={t('shell.table.refresh')}>\n        <IconButton size=\"small\" aria-label={t('shell.table.refresh')} onClick={onRefresh}>",
  ],
]);
