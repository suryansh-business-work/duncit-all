import { readField } from './columnTypes';
import type {
  DuncitColumn,
  DuncitColumnType,
  TableFetch,
  TableFilterValue,
  TableQueryState,
} from './types';

/**
 * Rows a table already holds — a list query that answered in full, a live
 * third-party API read, an embedded list inside a detail document.
 *
 * `DuncitTable`'s only data path is `fetchRows`, so a page with its rows
 * already in hand still needs a fetch. This is that fetch: search, column
 * filters, sort and page applied in memory, with the same `TableQueryState`
 * semantics the server bridge has. Three portals had grown their own copy of
 * it (rule 40).
 *
 * Filters and sort read `row[field]` (a dotted path reaches nested values) and
 * compare it the way the column's `type` says: numbers numerically, dates
 * chronologically, text case-insensitively.
 */

/** A cell reduced to what its type compares: a number (amounts, epoch ms), text, a flag — or null. */
type Comparable = number | string | boolean | null;

function toComparable(raw: unknown, type: DuncitColumnType): Comparable {
  if (raw === null || raw === undefined || raw === '') return null;
  if (type === 'number') {
    const n = Number(raw);
    return Number.isNaN(n) ? null : n;
  }
  if (type === 'date') {
    const ms = new Date(raw as string | number | Date).getTime();
    return Number.isNaN(ms) ? null : ms;
  }
  if (type === 'boolean') return Boolean(raw);
  return typeof raw === 'object' ? JSON.stringify(raw) : String(raw as string | number | boolean);
}

/** Empty first, then numerically — or as text, ignoring case — like the server's sort. */
function compareComparable(a: Comparable, b: Comparable): number {
  if (a === b) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  if (typeof a === 'string' || typeof b === 'string') {
    return String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true });
  }
  return Number(a) - Number(b);
}

function inRange(cell: Comparable, low: Comparable, high: Comparable): boolean {
  return cell !== null && compareComparable(cell, low) >= 0 && compareComparable(cell, high) <= 0;
}

function matchesComparison(cell: Comparable, filter: TableFilterValue, type: DuncitColumnType): boolean {
  const target = toComparable(filter.value, type);
  if (filter.op === 'eq') return compareComparable(cell, target) === 0;
  if (filter.op === 'ne') return compareComparable(cell, target) !== 0;
  if (cell === null) return false;
  if (filter.op === 'gte') return compareComparable(cell, target) >= 0;
  return compareComparable(cell, target) <= 0;
}

/** One filter against one row, with the same operators the server table engine answers. */
function matchesFilter(row: unknown, filter: TableFilterValue, type: DuncitColumnType): boolean {
  const cell = toComparable(readField(row, filter.field), type);
  const values = (filter.values ?? []).map((value) => toComparable(value, type));
  if (filter.op === 'is_true') return cell === true;
  if (filter.op === 'is_false') return cell === false;
  if (filter.op === 'in') return values.some((value) => compareComparable(cell, value) === 0);
  if (filter.op === 'between') return inRange(cell, values[0] ?? null, values[1] ?? null);
  if (filter.op === 'contains') {
    return cell !== null && String(cell).toLowerCase().includes((filter.value ?? '').toLowerCase());
  }
  return matchesComparison(cell, filter, type);
}

/** The type a field compares as. A filter or sort on a field no column shows compares as text. */
function typeOf<T>(columns: ReadonlyArray<DuncitColumn<T>>, field: string): DuncitColumnType {
  return columns.find((column) => column.field === field)?.type ?? 'text';
}

/** Sorts IN PLACE — `rows` is always the fresh array `filter` just produced,
 * never the caller's list. With no sort column the given order is kept. */
function sortRows<T>(rows: T[], q: TableQueryState, columns: ReadonlyArray<DuncitColumn<T>>): T[] {
  const field = q.sortBy;
  if (!field) return rows;
  const type = typeOf(columns, field);
  const dir = q.sortDir === 'desc' ? -1 : 1;
  const valueOf = (row: T) => toComparable(readField(row, field), type);
  rows.sort((a, b) => dir * compareComparable(valueOf(a), valueOf(b)));
  return rows;
}

/**
 * A `TableFetch` over rows that are already here.
 *
 * @param rows      the full list, in the order it should appear unsorted
 * @param searchOf  the text one row is matched against, case-insensitively
 * @param columns   the table's columns — their types decide how filters and sort compare
 */
export function clientTableFetch<T>(
  rows: readonly T[],
  searchOf: (row: T) => string,
  columns: ReadonlyArray<DuncitColumn<T>>,
): TableFetch<T> {
  return (q) => {
    const term = q.search.trim().toLowerCase();
    const filters = q.filters.map((filter) => ({ filter, type: typeOf(columns, filter.field) }));
    const matched = rows.filter(
      (row) =>
        (!term || searchOf(row).toLowerCase().includes(term)) &&
        filters.every(({ filter, type }) => matchesFilter(row, filter, type)),
    );
    const ordered = sortRows(matched, q, columns);
    const start = (q.page - 1) * q.pageSize;
    return Promise.resolve({
      rows: ordered.slice(start, start + q.pageSize),
      total: ordered.length,
    });
  };
}
