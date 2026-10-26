import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { DuncitColumn, TableFilterValue } from '@duncit/table';

/** The filter one `?<field>=<value>` asks for, or null when the column cannot take it. */
function columnFilter<Row>(column: DuncitColumn<Row>, raw: string): TableFilterValue | null {
  if (column.type === 'boolean') {
    if (raw === 'true') return { field: column.field, op: 'is_true' };
    if (raw === 'false') return { field: column.field, op: 'is_false' };
    return null;
  }
  if (column.type === 'enum' && column.options.some((option) => option.value === raw)) {
    return { field: column.field, op: 'eq', value: raw };
  }
  return null;
}

/**
 * The table filters a list's query string names, e.g. `?status=REJECTED` or
 * `?is_active=false` — what a directory tile links to.
 *
 * Only an `enum` column's own option or a `boolean` column's `true`/`false` is
 * honoured, so the columns are the allowlist: a hand-edited URL can never send
 * the server a field or value the table itself could not.
 */
export function urlColumnFilters<Row>(
  params: URLSearchParams,
  columns: ReadonlyArray<DuncitColumn<Row>>,
): TableFilterValue[] {
  const filters: TableFilterValue[] = [];
  for (const column of columns) {
    const raw = column.filterable === false ? null : params.get(column.field);
    const filter = raw === null ? null : columnFilter(column, raw);
    if (filter) filters.push(filter);
  }
  return filters;
}

/**
 * {@link urlColumnFilters} for the current URL, for a DuncitTable's
 * `externalFilters` — the same URL-driven pattern as the pods list's
 * `usePodListParams`, so a link lands on an already-filtered list.
 */
export default function useUrlColumnFilters<Row>(
  columns: ReadonlyArray<DuncitColumn<Row>>,
): TableFilterValue[] {
  const [params] = useSearchParams();
  return useMemo(() => urlColumnFilters(params, columns), [params, columns]);
}
