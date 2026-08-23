import { apply } from "./e.mjs";
const D = "packages/table/docs/index.mdx";

apply(D, [
  ["  - 'filterChipLabel'", "  - 'filterChipLabel'\n  - 'fallbackT'\n  - 'useTranslation'"],
  [
    "`filterChipLabel(payoutColumns, filter)` — one chip per applied filter, labelled from the\ncolumn's `headerName`:\n\n```ts\npayoutQuery.filters.map((f) => filterChipLabel(payoutColumns, f));",
    "`filterChipLabel(payoutColumns, filter, t)` — one chip per applied filter, labelled from the\ncolumn's header. The chip's own words (`Yes`, `No`, `contains`) come from the catalogue, so\nit takes a translator: `useTranslation().t` inside a component, `fallbackT` outside one.\n\n```ts\npayoutQuery.filters.map((f) => filterChipLabel(payoutColumns, f, t));",
  ],
  [
    "dateColumn<PayoutRow>();\n// {\n//   field: 'created_at',\n//   headerName: 'Created',\n//   hide: true,",
    "dateColumn<PayoutRow>();\n// {\n//   field: 'created_at',\n//   headerKey: 'shell.common.created',   ← the grid translates it at render time\n//   hide: true,",
  ],
  [
    "activeChipColumn<PayoutRow>();\n// {\n//   field: 'is_active',\n//   headerName: 'Status',\n//   width: 110,",
    "activeChipColumn<PayoutRow>();\n// {\n//   field: 'is_active',\n//   headerKey: 'shell.common.status',\n//   width: 110,",
  ],
  [
    "| `DuncitColumn<T>` | `{ field; headerName; sortable?; filter?; width?; flex?; minWidth?; hide?; valueGetter?; cellRenderer? }` | `field` is both the server sort/filter key and the row accessor. `sortable` defaults to `true`; no `filter` means not filterable; `hide` hides by default but keeps it in the column menu. |",
    "| `DuncitColumn<T>` | `{ field; headerName?; headerKey?; sortable?; filter?; width?; flex?; minWidth?; hide?; valueGetter?; cellRenderer? }` | `field` is both the server sort/filter key and the row accessor. Give a header as `headerName` (already translated) or as `headerKey` (a catalogue key the grid resolves at render) — never both. `sortable` defaults to `true`; no `filter` means not filterable; `hide` hides by default but keeps it in the column menu. |",
  ],
  [
    "| `filterChipLabel` | `<T>(columns, filter: TableFilterValue) => string` | Falls back to `filter.field` when no column matches. |",
    "| `filterChipLabel` | `<T>(columns, filter: TableFilterValue, t: Translate) => string` | Falls back to `filter.field` when no column matches. |",
  ],
  [
    "| `dateColumn` | `<T>(options?: DateColumnOptions<T>) => DuncitColumn<T>` | Defaults: `field 'created_at'`, `headerName 'Created'`, `hide true`, `width 130`, `filterable true`, `format` from `ambientDateFormat()`. `formatDate` wins over `format`. |\n| `activeChipColumn` | `<T>(options?: ActiveChipColumnOptions<T>) => DuncitColumn<T>` | Defaults: `field 'is_active'`, `headerName 'Status'`, `width 110`, labels `Active`/`Inactive`, `filterable true`. |",
    "| `dateColumn` | `<T>(options?: DateColumnOptions<T>) => DuncitColumn<T>` | Defaults: `field 'created_at'`, header `shell.common.created`, `hide true`, `width 130`, `filterable true`, `format` from `ambientDateFormat()`. `formatDate` wins over `format`. |\n| `activeChipColumn` | `<T>(options?: ActiveChipColumnOptions<T>) => DuncitColumn<T>` | Defaults: `field 'is_active'`, header `shell.common.status`, `width 110`, labels `shell.common.active` / `shell.common.inactive`, `filterable true`. |",
  ],
  [
    "| `EM_DASH` | `'—'` | The empty-cell character every table uses, so blanks look identical across portals. |",
    "| `EM_DASH` | `'—'` | The empty-cell character every table uses, so blanks look identical across portals. |\n| `useTranslation` | `() => { t; has; locale; … }` | The grid's own translator, layered over `shell.*`. Chrome copy lives under `shell.table.*` (rule 38). |\n| `fallbackT` | `Translate` | A provider-free translator for code that runs outside React — a `valueGetter` sorting or writing a CSV. |",
  ],
]);
