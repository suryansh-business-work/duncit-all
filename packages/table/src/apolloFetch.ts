import { useMemo, type DependencyList } from 'react';
import { tableQueryToGql } from './gql';
import type { TableFetch, TableFilterValue, TablePage, TableQueryState } from './types';

/**
 * Structural slice of ApolloClient (or any compatible GraphQL client) — just the
 * `query` method the table fetch needs. Typed structurally so this package needs
 * no @apollo/client dependency; a real ApolloClient satisfies it as-is.
 */
export interface TableGqlClient {
  query(options: {
    query: unknown;
    variables?: Record<string, unknown>;
    fetchPolicy?: string;
  }): Promise<{ data: unknown }>;
}

export interface ApolloTableFetchOptions<Row> {
  /**
   * Pinned page-level filters appended after the table's own column filters
   * (e.g. `[{ field: 'club_id', op: 'eq', value: clubFilter }]`).
   */
  extraFilters?: ReadonlyArray<TableFilterValue>;
  /** Transform the whole query state before it is mapped to variables. */
  mapQuery?: (q: TableQueryState) => TableQueryState;
  /**
   * Extra top-level variables merged over the tableQueryToGql output
   * (e.g. `{ from, to: null }` for range-scoped table queries).
   */
  extraVariables?: Record<string, unknown>;
  /**
   * Full replacement for tableQueryToGql when the server query takes legacy
   * flat args instead of TableQueryInput (e.g. the support portal lists).
   */
  buildVariables?: (q: TableQueryState) => Record<string, unknown>;
  /** Per-row transform applied to the fetched rows. */
  mapRow?: (row: unknown) => Row;
  /** Apollo fetch policy; defaults to 'network-only' (the only policy used today). */
  fetchPolicy?: string;
}

/**
 * Builds the standard DuncitTable `fetchRows` bridge for a server `<name>Table`
 * GraphQL query: maps the query state via tableQueryToGql, runs client.query with
 * fetchPolicy 'network-only', and unwraps `data[resultKey].rows/.total`.
 *
 *   const fetchRows = useApolloTableFetch<PodRow>(client, PODS_TABLE, 'podsTable');
 */
export function makeApolloTableFetch<Row>(
  client: TableGqlClient,
  query: unknown,
  resultKey: string,
  options: ApolloTableFetchOptions<Row> = {},
): TableFetch<Row> {
  const {
    extraFilters,
    mapQuery,
    extraVariables,
    buildVariables,
    mapRow,
    fetchPolicy = 'network-only',
  } = options;
  return async (q: TableQueryState): Promise<TablePage<Row>> => {
    let state = mapQuery ? mapQuery(q) : q;
    if (extraFilters?.length) {
      state = { ...state, filters: [...state.filters, ...extraFilters] };
    }
    const base = buildVariables ? buildVariables(state) : tableQueryToGql(state);
    const variables = extraVariables ? { ...base, ...extraVariables } : base;
    const { data } = await client.query({ query, variables, fetchPolicy });
    const payload = (data as Record<string, { rows: unknown[]; total: number }>)[resultKey];
    const rows = mapRow ? payload.rows.map(mapRow) : (payload.rows as Row[]);
    return { rows, total: payload.total };
  };
}

/**
 * Memoized hook form of makeApolloTableFetch. `deps` lists the reactive values the
 * options close over (like the old useCallback dep arrays); the client/query/resultKey
 * identities are tracked automatically.
 */
export function useApolloTableFetch<Row>(
  client: TableGqlClient,
  query: unknown,
  resultKey: string,
  options: ApolloTableFetchOptions<Row> = {},
  deps: DependencyList = [],
): TableFetch<Row> {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- options is rebuilt per render; deps names its reactive inputs
  return useMemo(
    () => makeApolloTableFetch(client, query, resultKey, options),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [client, query, resultKey, ...deps],
  );
}
