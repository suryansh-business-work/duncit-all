/**
 * `@duncit/table` double for the portal-access-page tests.
 *
 * The grid itself is the portal-wide stub in `src/__tests__/table-mock`; only
 * `useApolloTableFetch` is replaced here, because this page needs to serve
 * fixed rows and to record the `extraFilters` the page scoped the query with
 * (the status toggle's whole job is choosing those filters).
 */
export { DuncitTable } from '../../../__tests__/table-mock';
export type { DuncitColumn, TableFetch } from '../../../__tests__/table-mock';

export const tableFetchCalls: {
  rows: unknown[];
  extraFilters: unknown;
  resultKey: string | undefined;
} = { rows: [], extraFilters: undefined, resultKey: undefined };

export function __setTableRows(rows: unknown[]): void {
  tableFetchCalls.rows = rows;
}

export function useApolloTableFetch(
  _client: unknown,
  _document: unknown,
  resultKey: string,
  options?: { extraFilters?: unknown },
) {
  tableFetchCalls.resultKey = resultKey;
  tableFetchCalls.extraFilters = options?.extraFilters;
  return async () => ({ rows: tableFetchCalls.rows, total: tableFetchCalls.rows.length });
}
