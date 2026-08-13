import type { TableFetch, TableQueryState } from './types';

/**
 * Rows a table already holds — a list query that answered in full, a live
 * third-party API read, an embedded list inside a detail document.
 *
 * `DuncitTable`'s only data path is `fetchRows`, so a page with its rows
 * already in hand still needs a fetch. This is that fetch: search, sort and
 * page applied in memory, with the same `TableQueryState` semantics the server
 * bridge has. Three portals had grown their own copy of it (rule 40).
 *
 * It does NOT apply column `filter`s — a column that declares one over a
 * client-side list would offer a control this fetch ignores, so don't declare
 * them. Search and sort are the affordances here.
 */

/** A row value this fetch can compare — never an object. */
type CellValue = string | number | boolean | null | undefined;

const cellOf = <T,>(row: T, field: string): CellValue =>
  (row as Record<string, CellValue>)[field];

/** Numbers numerically, booleans false-first, everything else as text. */
function compareCells(a: CellValue, b: CellValue): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' || typeof b === 'boolean') {
    return Number(Boolean(a)) - Number(Boolean(b));
  }
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, { sensitivity: 'base' });
}

/** Sorts IN PLACE — `rows` is always the fresh array `filter` just produced,
 * never the caller's list. With no sort column the given order is kept. */
function sortRows<T>(rows: T[], q: TableQueryState): T[] {
  const field = q.sortBy;
  if (!field) return rows;
  const dir = q.sortDir === 'desc' ? -1 : 1;
  rows.sort((a, b) => dir * compareCells(cellOf(a, field), cellOf(b, field)));
  return rows;
}

/**
 * A `TableFetch` over rows that are already here.
 *
 * @param rows      the full list, in the order it should appear unsorted
 * @param searchOf  the text one row is matched against, case-insensitively
 */
export function clientTableFetch<T>(
  rows: readonly T[],
  searchOf: (row: T) => string
): TableFetch<T> {
  return (q) => {
    const term = q.search.trim().toLowerCase();
    const matched = rows.filter((row) => !term || searchOf(row).toLowerCase().includes(term));
    const ordered = sortRows(matched, q);
    const start = (q.page - 1) * q.pageSize;
    return Promise.resolve({
      rows: ordered.slice(start, start + q.pageSize),
      total: ordered.length,
    });
  };
}
