import { apply } from "./e.mjs";

apply("packages/table/src/cells.tsx", [
  [
    "import { ambientDateFormat } from '@duncit/datetime';\nimport type { DuncitColumn } from './types';",
    "import { ambientDateFormat } from '@duncit/datetime';\nimport { useTranslation } from './i18n';\nimport type { DuncitColumn } from './types';",
  ],

  // dateColumn — no English default header
  [
    "export interface DateColumnOptions<T> {\n  field?: string; // default 'created_at'\n  headerName?: string; // default 'Created'",
    "export interface DateColumnOptions<T> {\n  field?: string; // default 'created_at'\n  /** The header. Omit it and the grid renders the shared `Created` copy. */\n  headerName?: string;",
  ],
  [
    "  const {\n    field = 'created_at',\n    headerName = 'Created',\n    hide = true,",
    "  const {\n    field = 'created_at',\n    headerName,\n    hide = true,",
  ],
  [
    "  return {\n    field,\n    headerName,\n    hide,\n    width,\n    flex,\n    minWidth,\n    sortable,\n    filter: filterable ? { type: 'date' } : undefined,\n    valueGetter: (row) => toText(readIso(row)),\n  };",
    "  return {\n    field,\n    headerName,\n    headerKey: headerName ? undefined : 'shell.common.created',\n    hide,\n    width,\n    flex,\n    minWidth,\n    sortable,\n    filter: filterable ? { type: 'date' } : undefined,\n    valueGetter: (row) => toText(readIso(row)),\n  };",
  ],

  // activeChipColumn — header + the two chip words
  [
    "export interface ActiveChipColumnOptions<T> {\n  field?: string; // default 'is_active'\n  headerName?: string; // default 'Status'\n  width?: number; // default 110\n  activeLabel?: string; // default 'Active'\n  inactiveLabel?: string; // default 'Inactive'",
    "export interface ActiveChipColumnOptions<T> {\n  field?: string; // default 'is_active'\n  /** The header. Omit it and the grid renders the shared `Status` copy. */\n  headerName?: string;\n  width?: number; // default 110\n  /** Omit either one and the chip renders the shared `Active` / `Inactive` copy. */\n  activeLabel?: string;\n  inactiveLabel?: string;",
  ],
  [
    "  const {\n    field = 'is_active',\n    headerName = 'Status',\n    width = 110,\n    activeLabel = 'Active',\n    inactiveLabel = 'Inactive',\n    outlineInactive = false,\n    filterable = true,\n    getActive,\n  } = options;\n  const readActive = getActive ?? ((row: T) => Boolean((row as Record<string, unknown>)[field]));\n  const labelOf = (active: boolean) => (active ? activeLabel : inactiveLabel);\n  const variantOf = (active: boolean): 'filled' | 'outlined' => {\n    if (outlineInactive && !active) return 'outlined';\n    return 'filled';\n  };\n  return {\n    field,\n    headerName,\n    width,\n    filter: filterable ? { type: 'boolean' } : undefined,\n    cellRenderer: (row) => {\n      const active = readActive(row);\n      return (\n        <Chip\n          size=\"small\"\n          color={active ? 'success' : 'default'}\n          label={labelOf(active)}\n          variant={variantOf(active)}\n        />\n      );\n    },\n    valueGetter: (row) => labelOf(readActive(row)),\n  };\n}",
    "  const {\n    field = 'is_active',\n    headerName,\n    width = 110,\n    activeLabel,\n    inactiveLabel,\n    outlineInactive = false,\n    filterable = true,\n    getActive,\n  } = options;\n  const readActive = getActive ?? ((row: T) => Boolean((row as Record<string, unknown>)[field]));\n  const variantOf = (active: boolean): 'filled' | 'outlined' => {\n    if (outlineInactive && !active) return 'outlined';\n    return 'filled';\n  };\n  return {\n    field,\n    headerName,\n    headerKey: headerName ? undefined : 'shell.common.status',\n    width,\n    filter: filterable ? { type: 'boolean' } : undefined,\n    cellRenderer: (row) => (\n      <ActiveChip\n        active={readActive(row)}\n        activeLabel={activeLabel}\n        inactiveLabel={inactiveLabel}\n        variant={variantOf(readActive(row))}\n      />\n    ),\n    // The sort/export value follows the chip, so it needs the same words —\n    // resolved through the provider-free translator because a value getter runs\n    // outside the React tree.\n    valueGetter: (row) => activeChipText(readActive(row), activeLabel, inactiveLabel),\n  };\n}",
  ],

  // actionsColumn
  [
    "export interface ActionsColumnOptions<T> {\n  field?: string; // default 'actions'\n  headerName?: string; // default 'Actions'",
    "export interface ActionsColumnOptions<T> {\n  field?: string; // default 'actions'\n  /** The header. Omit it and the grid renders the shared `Actions` copy. */\n  headerName?: string;",
  ],
  [
    "  const {\n    field = 'actions',\n    headerName = 'Actions',\n    width = 110,",
    "  const {\n    field = 'actions',\n    headerName,\n    width = 110,",
  ],
  [
    "  return {\n    field,\n    headerName,\n    width,\n    sortable: false,",
    "  return {\n    field,\n    headerName,\n    headerKey: headerName ? undefined : 'shell.common.actions',\n    width,\n    sortable: false,",
  ],
  [
    "            fallbackTitle=\"Edit\"",
    "            fallbackTitleKey=\"shell.common.edit\"",
  ],
  [
    "            fallbackTitle=\"Delete\"",
    "            fallbackTitleKey=\"shell.common.delete\"",
  ],
  [
    "interface RowActionButtonProps<T> {\n  row: T;\n  fallbackTitle: string;",
    "interface RowActionButtonProps<T> {\n  row: T;\n  /** Translation key for the tooltip when the caller names none. */\n  fallbackTitleKey: string;",
  ],
  [
    "function RowActionButton<T>(props: Readonly<RowActionButtonProps<T>>): JSX.Element {\n  const { row, fallbackTitle, icon, color, config, onClick } = props;\n  const disabled = config?.disabled?.(row) ?? false;\n  const baseTitle = resolveLabel(config?.title, row, fallbackTitle);",
    "function RowActionButton<T>(props: Readonly<RowActionButtonProps<T>>): JSX.Element {\n  const { row, fallbackTitleKey, icon, color, config, onClick } = props;\n  const { t } = useTranslation();\n  const disabled = config?.disabled?.(row) ?? false;\n  const baseTitle = resolveLabel(config?.title, row, t(fallbackTitleKey));",
  ],
]);
