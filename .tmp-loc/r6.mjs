import { apply } from "./e.mjs";

apply("packages/table/src/SelectionCheckbox.tsx", [
  [
    "export function SelectionHeaderCheckbox({ api }: Readonly<CustomHeaderProps>) {\n  const [state, setState] = useState({ selected: 0, total: 0 });",
    "export function SelectionHeaderCheckbox({ api }: Readonly<CustomHeaderProps>) {\n  const { t } = useTranslation();\n  const [state, setState] = useState({ selected: 0, total: 0 });",
  ],
]);

// ---- filterState.ts : chip label takes the translator
apply("packages/table/src/toolbar/filterState.ts", [
  [
    "const OP_LABELS: Record<string, string> = {\n  eq: '=',\n  ne: '≠',\n  contains: 'contains',\n  gte: '≥',\n  lte: '≤',\n};",
    "/**\n * The comparison shown on an active-filter chip.\n *\n * Only `contains` is a word; the rest are mathematical symbols that read the\n * same in every language, so `contains` is the one entry that takes a key.\n */\nconst OP_SYMBOLS: Record<string, string> = {\n  eq: '=',\n  ne: '≠',\n  gte: '≥',\n  lte: '≤',\n};",
  ],
  [
    "export function filterChipLabel<T>(\n  columns: ReadonlyArray<DuncitColumn<T>>,\n  filter: TableFilterValue,\n): string {\n  const header = columns.find((c) => c.field === filter.field)?.headerName ?? filter.field;\n  if (filter.op === 'is_true') return `${header}: Yes`;\n  if (filter.op === 'is_false') return `${header}: No`;\n  if (filter.op === 'in') return `${header}: ${(filter.values ?? []).join(', ')}`;\n  if (filter.op === 'between') {\n    return `${header}: ${(filter.values ?? []).join(' – ')}`;\n  }\n  const op = OP_LABELS[filter.op] ?? filter.op;\n  return `${header} ${op} ${filter.value ?? ''}`.trim();\n}",
    "export function filterChipLabel<T>(\n  columns: ReadonlyArray<DuncitColumn<T>>,\n  filter: TableFilterValue,\n  t: Translate,\n): string {\n  const column = columns.find((c) => c.field === filter.field);\n  const header = column ? columnHeader(column, t) : filter.field;\n  if (filter.op === 'is_true') return `${header}: ${t('shell.table.yes')}`;\n  if (filter.op === 'is_false') return `${header}: ${t('shell.table.no')}`;\n  if (filter.op === 'in') return `${header}: ${(filter.values ?? []).join(', ')}`;\n  if (filter.op === 'between') {\n    return `${header}: ${(filter.values ?? []).join(' – ')}`;\n  }\n  const op = OP_SYMBOLS[filter.op] ?? t('shell.table.opContains');\n  return `${header} ${op} ${filter.value ?? ''}`.trim();\n}",
  ],
]);
