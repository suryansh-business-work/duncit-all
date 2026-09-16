import type { SortDirection } from 'ag-grid-community';
import type { Translate } from './i18n';
import type { DuncitColumn, DuncitColumnType, TableFilterOp } from './types';

/**
 * The rules a column's `type` implies, in one place — the header, the filter
 * control, the chip and `clientTableFetch` all ask here, so "can this column
 * sort" never has two answers.
 */

/**
 * The text a column's header shows.
 *
 * The single place `headerKey` is turned into copy, so the grid header, the
 * column menu, the filter controls and the active-filter chips can never
 * disagree about what a column is called.
 */
export function columnHeader<T>(column: DuncitColumn<T>, t: Translate): string {
  if (column.headerKey) return t(column.headerKey);
  return column.headerName ?? column.field;
}

/** Whether the header offers a sort. Every type but `actions`, unless opted out. */
export function isColumnSortable<T>(column: DuncitColumn<T>): boolean {
  return column.type !== 'actions' && column.sortable !== false;
}

/** Whether the header offers a filter. Every type but `actions`, unless opted out. */
export function isColumnFilterable<T>(column: DuncitColumn<T>): boolean {
  return column.type !== 'actions' && column.filterable !== false;
}

/**
 * The order a header click walks through. A reader sorting a date or an amount
 * almost always wants the newest / largest first; a name or a status, A→Z.
 */
const DESC_FIRST_TYPES: ReadonlySet<DuncitColumnType> = new Set(['number', 'date']);

export function sortingOrderOf<T>(column: DuncitColumn<T>): SortDirection[] {
  return DESC_FIRST_TYPES.has(column.type) ? ['desc', 'asc', null] : ['asc', 'desc', null];
}

/** The comparisons a text / number column offers in its condition dropdown. */
export const TEXT_OPS: readonly TableFilterOp[] = ['contains', 'eq', 'ne'];
export const NUMBER_OPS: readonly TableFilterOp[] = ['eq', 'ne', 'gte', 'lte', 'between'];

/** Each dropdown operator's copy — written out whole, since a composed key is invisible to the translation gate. */
export const OPERATOR_KEYS: Readonly<Partial<Record<TableFilterOp, string>>> = {
  contains: 'shell.table.opLabelContains',
  eq: 'shell.table.opLabelEquals',
  ne: 'shell.table.opLabelNotEquals',
  gte: 'shell.table.opLabelAtLeast',
  lte: 'shell.table.opLabelAtMost',
  between: 'shell.table.opLabelBetween',
};

/** Reads `field` off a row, following a dotted path into nested objects. */
export function readField(row: unknown, field: string): unknown {
  let value: unknown = row;
  for (const key of field.split('.')) {
    if (typeof value !== 'object' || value === null) return undefined;
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}
