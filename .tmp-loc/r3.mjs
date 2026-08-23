import { apply } from "./e.mjs";

// ---- types.ts : headerKey alongside headerName
apply("packages/table/src/types.ts", [
  [
    "export interface DuncitColumn<T> {\n  field: string; // server-side sort/filter key AND row accessor\n  headerName: string;",
    "export interface DuncitColumn<T> {\n  field: string; // server-side sort/filter key AND row accessor\n  /** The header, already translated by whoever built the column. */\n  headerName?: string;\n  /**\n   * A translation key for the header, resolved by the grid at render time.\n   *\n   * It exists for the column FACTORIES in `cells.tsx`: they hand back a column\n   * before there is a React tree, so they cannot call `t` themselves, and a\n   * caller that does not name a header would otherwise get an English literal\n   * baked into a definition (rule 38). Pass one or the other, never both.\n   */\n  headerKey?: string;",
  ],
]);

// ---- columnDefs.ts : one place that resolves a header
apply("packages/table/src/columnDefs.ts", [
  [
    "import type { DuncitColumn, TableSortDir } from './types';",
    "import type { Translate } from './i18n';\nimport type { DuncitColumn, TableSortDir } from './types';",
  ],
  [
    "/** Class applied to plain-text cells so a global CSS rule can ellipsize them. */",
    "/**\n * The text a column's header shows.\n *\n * The single place `headerKey` is turned into copy, so the grid header, the\n * column menu, the filter controls and the active-filter chips can never\n * disagree about what a column is called.\n */\nexport function columnHeader<T>(column: DuncitColumn<T>, t: Translate): string {\n  if (column.headerKey) return t(column.headerKey);\n  return column.headerName ?? column.field;\n}\n\n/** Class applied to plain-text cells so a global CSS rule can ellipsize them. */",
  ],
  [
    "  sortBy: string | null,\n  sortDir: TableSortDir,\n): ColDef<T>[] {\n  return columns.map((column) => ({\n    colId: column.field,\n    headerName: column.headerName,",
    "  sortBy: string | null,\n  sortDir: TableSortDir,\n  t: Translate,\n): ColDef<T>[] {\n  return columns.map((column) => ({\n    colId: column.field,\n    headerName: columnHeader(column, t),",
  ],
]);
