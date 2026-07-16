import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeApolloTableFetch, useApolloTableFetch, type TableGqlClient } from '../src/apolloFetch';
import { tableQueryToGql } from '../src/gql';
import type { TableQueryState } from '../src/types';

type Row = { id: string; name: string };

const QUERY_DOC = { kind: 'Document' }; // opaque doc — the adapter never inspects it

const baseQuery: TableQueryState = {
  search: 'ali',
  page: 2,
  pageSize: 25,
  sortBy: 'name',
  sortDir: 'asc',
  filters: [{ field: 'status', op: 'eq', value: 'OPEN' }],
};

function fakeClient(rows: Row[] = [{ id: '1', name: 'Alice' }], total = 7) {
  const query = vi.fn(async (_opts: unknown) => ({
    data: { podsTable: { rows, total } },
  }));
  const client: TableGqlClient = { query };
  return { client, query };
}

describe('makeApolloTableFetch', () => {
  it('maps state via tableQueryToGql, fetches network-only, unwraps rows/total', async () => {
    const { client, query } = fakeClient();
    const fetchRows = makeApolloTableFetch<Row>(client, QUERY_DOC, 'podsTable');
    const page = await fetchRows(baseQuery);

    expect(query).toHaveBeenCalledWith({
      query: QUERY_DOC,
      variables: tableQueryToGql(baseQuery),
      fetchPolicy: 'network-only',
    });
    expect(page).toEqual({ rows: [{ id: '1', name: 'Alice' }], total: 7 });
  });

  it('appends extraFilters after the table filters', async () => {
    const { client, query } = fakeClient();
    const fetchRows = makeApolloTableFetch<Row>(client, QUERY_DOC, 'podsTable', {
      extraFilters: [{ field: 'club_id', op: 'eq', value: 'c1' }],
    });
    await fetchRows(baseQuery);

    const variables = query.mock.calls[0][0] as { variables: { query: { filters: unknown[] } } };
    expect(variables.variables.query.filters).toEqual([
      { field: 'status', op: 'eq', value: 'OPEN', values: null },
      { field: 'club_id', op: 'eq', value: 'c1', values: null },
    ]);
  });

  it('mapQuery transforms the state before mapping', async () => {
    const { client, query } = fakeClient();
    const fetchRows = makeApolloTableFetch<Row>(client, QUERY_DOC, 'podsTable', {
      mapQuery: (q) => ({ ...q, search: q.search.trim() }),
    });
    await fetchRows({ ...baseQuery, search: '  ali  ' });
    const opts = query.mock.calls[0][0] as { variables: { query: { search: string } } };
    expect(opts.variables.query.search).toBe('ali');
  });

  it('extraVariables merge over the tableQueryToGql output', async () => {
    const { client, query } = fakeClient();
    const fetchRows = makeApolloTableFetch<Row>(client, QUERY_DOC, 'podsTable', {
      extraVariables: { from: '2026-01-01', to: null },
    });
    await fetchRows(baseQuery);
    const opts = query.mock.calls[0][0] as { variables: Record<string, unknown> };
    expect(opts.variables).toEqual({ ...tableQueryToGql(baseQuery), from: '2026-01-01', to: null });
  });

  it('buildVariables fully replaces tableQueryToGql (legacy flat args)', async () => {
    const { client, query } = fakeClient();
    const fetchRows = makeApolloTableFetch<Row>(client, QUERY_DOC, 'podsTable', {
      buildVariables: (q) => ({ status: q.filters[0]?.value ?? null, page: q.page }),
    });
    await fetchRows(baseQuery);
    const opts = query.mock.calls[0][0] as { variables: Record<string, unknown> };
    expect(opts.variables).toEqual({ status: 'OPEN', page: 2 });
  });

  it('mapRow transforms each fetched row; fetchPolicy is overridable', async () => {
    const { client, query } = fakeClient([{ id: '1', name: 'alice' }], 1);
    const fetchRows = makeApolloTableFetch<Row>(client, QUERY_DOC, 'podsTable', {
      mapRow: (row) => ({ ...(row as Row), name: (row as Row).name.toUpperCase() }),
      fetchPolicy: 'cache-first',
    });
    const page = await fetchRows(baseQuery);
    expect(page.rows).toEqual([{ id: '1', name: 'ALICE' }]);
    const opts = query.mock.calls[0][0] as { fetchPolicy: string };
    expect(opts.fetchPolicy).toBe('cache-first');
  });
});

describe('useApolloTableFetch', () => {
  it('keeps identity across rerenders and rebuilds when a dep changes', () => {
    const { client } = fakeClient();
    const { result, rerender } = renderHook(
      ({ club }: { club: string }) =>
        useApolloTableFetch<Row>(
          client,
          QUERY_DOC,
          'podsTable',
          { extraFilters: [{ field: 'club_id', op: 'eq', value: club }] },
          [club],
        ),
      { initialProps: { club: 'c1' } },
    );
    const first = result.current;
    rerender({ club: 'c1' });
    expect(result.current).toBe(first);
    rerender({ club: 'c2' });
    expect(result.current).not.toBe(first);
  });
});
