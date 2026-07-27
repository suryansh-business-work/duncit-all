/**
 * `@duncit/table` double for the user-details sections.
 *
 * The grid itself is the portal-wide stub in `src/__tests__/table-mock`; only
 * `useApolloTableFetch` is replaced here, because this section needs to serve
 * real rows and to record the variables the section scoped the query with.
 */
export { DuncitTable } from '../../../__tests__/table-mock';
export type { DuncitColumn, TableFetch } from '../../../__tests__/table-mock';

export const tableFetchCalls: {
  rows: unknown[];
  extraVariables: Record<string, unknown> | undefined;
  resultKey: string | undefined;
} = { rows: [], extraVariables: undefined, resultKey: undefined };

export function __setTableRows(rows: unknown[]): void {
  tableFetchCalls.rows = rows;
  tableFetchCalls.extraVariables = undefined;
  tableFetchCalls.resultKey = undefined;
}

export function useApolloTableFetch(
  _client: unknown,
  _document: unknown,
  resultKey: string,
  options?: { extraVariables?: Record<string, unknown> },
) {
  tableFetchCalls.resultKey = resultKey;
  tableFetchCalls.extraVariables = options?.extraVariables;
  return async () => ({ rows: tableFetchCalls.rows, total: tableFetchCalls.rows.length });
}

export type TableQueryState = {
  search: string;
  page: number;
  pageSize: number;
  sortBy: string | null;
  sortDir: 'asc' | 'desc';
  filters: unknown[];
};
