import { useEffect, useMemo } from 'react';
import { tableApiSourceOf } from '../tableApi/source';
import type { TableFetch, TableQueryState } from '../types';
import { useTableBulkDeleteApi, type TableBulkDeleteApi } from './bulkDeleteContext';

/** A grid's bulk delete: who runs it, which table, and how its view maps to variables. */
export interface BulkDeleteBinding {
  api: TableBulkDeleteApi;
  table: string;
  variablesOf: (query: TableQueryState) => Record<string, unknown>;
}

/**
 * The bulk delete this grid offers, or null.
 *
 * No page opts in: a grid fed by `makeApolloTableFetch` already knows the
 * `<name>Table` query behind it, and the server says which of those this person
 * may delete from. A grid fed any other way has no server table to name, so it
 * never shows the controls.
 *
 * The grid refetches when a job on its table finishes — the rows it deleted are
 * still on screen until then.
 */
export function useBulkDelete<T>(fetchRows: TableFetch<T>, refetch: () => void): BulkDeleteBinding | null {
  const api = useTableBulkDeleteApi();
  const source = tableApiSourceOf(fetchRows);
  const table = source && api?.tables.has(source.resultKey) ? source.resultKey : null;

  useEffect(() => {
    if (!api || !table) return undefined;
    return api.onSettled(table, refetch);
  }, [api, table, refetch]);

  return useMemo(() => {
    if (!api || !source || !table) return null;
    return { api, table, variablesOf: source.variablesOf };
  }, [api, source, table]);
}
