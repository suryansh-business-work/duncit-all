import { downloadTextFile } from '@duncit/utils';
import { isColumnHidden } from '../columnDefs';
import { columnHeader } from '../columnTypes';
import type { Translate } from '../i18n';
import type { DuncitColumn, TableFetch, TableQueryState } from '../types';

/**
 * The toolbar's downloads: the page on screen or every row matching the
 * current search, sort and filters — as CSV (the visible columns, as the grid
 * reads them) or JSON (the rows exactly as the server returned them).
 */

export type DownloadScope = 'page' | 'all';
export type DownloadFormat = 'csv' | 'json';

/** The server table engine's page-size ceiling — the fewest requests for "all". */
const ALL_ROWS_PAGE_SIZE = 100;
/** Cells a spreadsheet would run as a formula (CSV injection). */
const FORMULA_START = /^[=+\-@\t\r]/;
const NEEDS_QUOTES = /[",\r\n]/;
const UTF8_BOM = '﻿';

/** Every row matching `query`, page by page. */
export async function fetchAllRows<T>(fetchRows: TableFetch<T>, query: TableQueryState, total: number): Promise<T[]> {
  const rows: T[] = [];
  const pages = Math.ceil(total / ALL_ROWS_PAGE_SIZE);
  for (let page = 1; page <= pages; page += 1) {
    const result = await fetchRows({ ...query, page, pageSize: ALL_ROWS_PAGE_SIZE });
    if (result.rows.length === 0) break;
    rows.push(...result.rows);
  }
  return rows;
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  const text = String(value as string | number | boolean);
  return typeof value === 'string' && FORMULA_START.test(text) ? `'${text}` : text;
}

function csvField(value: unknown): string {
  const text = cellText(value);
  return NEEDS_QUOTES.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function rowsToCsv<T>(
  rows: readonly T[],
  columns: ReadonlyArray<DuncitColumn<T>>,
  hiddenOverrides: Record<string, boolean>,
  t: Translate,
): string {
  const visible = columns.filter((column) => !isColumnHidden(column, hiddenOverrides));
  const header = visible.map((column) => csvField(columnHeader(column, t))).join(',');
  const lines = rows.map((row) =>
    visible
      .map((column) =>
        csvField(column.valueGetter ? column.valueGetter(row) : (row as Record<string, unknown>)[column.field]),
      )
      .join(','),
  );
  return UTF8_BOM + [header, ...lines].join('\r\n');
}

/** Apollo's `__typename` is client bookkeeping, not data. */
export function rowsToJson<T>(rows: readonly T[]): string {
  return JSON.stringify(rows, (key, value: unknown) => (key === '__typename' ? undefined : value), 2);
}

export interface SaveRowsOptions<T> {
  tableId: string;
  scope: DownloadScope;
  format: DownloadFormat;
  page: number;
  rows: readonly T[];
  columns: ReadonlyArray<DuncitColumn<T>>;
  hiddenOverrides: Record<string, boolean>;
  t: Translate;
}

export function saveRows<T>(options: Readonly<SaveRowsOptions<T>>): void {
  const { tableId, scope, format, page, rows, columns, hiddenOverrides, t } = options;
  const suffix = scope === 'page' ? `page-${page}` : 'all';
  const fileName = `${tableId}-${suffix}.${format}`;
  if (format === 'csv') {
    downloadTextFile(rowsToCsv(rows, columns, hiddenOverrides, t), fileName, 'text/csv;charset=utf-8');
  } else {
    downloadTextFile(rowsToJson(rows), fileName, 'application/json');
  }
}
