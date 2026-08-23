import { apply } from "./e.mjs";

// ---- DuncitTable.tsx
apply("packages/table/src/DuncitTable.tsx", [
  [
    "import { buildColDefs, TRUNCATE_CELL_CLASS } from './columnDefs';",
    "import { buildColDefs, TRUNCATE_CELL_CLASS } from './columnDefs';\nimport { useTranslation } from './i18n';",
  ],
  [
    "    const defs = buildColDefs(columns, prefs.hiddenOverrides, sortBy, sortDir);\n    return selection ? [SELECT_COLUMN, ...defs] : defs;\n  }, [columns, prefs.hiddenOverrides, sortBy, sortDir, selection]);",
    "    const defs = buildColDefs(columns, prefs.hiddenOverrides, sortBy, sortDir, t);\n    return selection ? [SELECT_COLUMN, ...defs] : defs;\n  }, [columns, prefs.hiddenOverrides, sortBy, sortDir, selection, t]);",
  ],
  [
    "    () => `<span>${escapeHtml(emptyText ?? 'No rows to display')}</span>`,\n    [emptyText],",
    "    () => `<span>${escapeHtml(emptyText ?? t('shell.table.empty'))}</span>`,\n    [emptyText, t],",
  ],
]);

// ---- SelectionCheckbox.tsx
apply("packages/table/src/SelectionCheckbox.tsx", [
  ["      inputProps={{ 'aria-label': 'Select row' }}", "      inputProps={{ 'aria-label': t('shell.table.selectRow') }}"],
  [
    "      inputProps={{ 'aria-label': 'Select every row on this page' }}",
    "      inputProps={{ 'aria-label': t('shell.table.selectAllRows') }}",
  ],
]);

// ---- ColumnMenu.tsx
apply("packages/table/src/toolbar/ColumnMenu.tsx", [
  [
    "import { isColumnHidden } from '../columnDefs';\nimport type { DuncitColumn } from '../types';",
    "import { columnHeader, isColumnHidden } from '../columnDefs';\nimport { useTranslation } from '../i18n';\nimport type { DuncitColumn } from '../types';",
  ],
  [
    "  const { open, anchorEl, onClose, columns, hiddenOverrides, toggleColumn, resetColumns } = props;",
    "  const { open, anchorEl, onClose, columns, hiddenOverrides, toggleColumn, resetColumns } = props;\n  const { t } = useTranslation();",
  ],
  [
    "            <ListItemText primary={column.headerName} />",
    "            <ListItemText primary={columnHeader(column, t)} />",
  ],
  [
    "        <ListItemText primary=\"Reset columns\" />",
    "        <ListItemText primary={t('shell.table.resetColumns')} />",
  ],
]);
