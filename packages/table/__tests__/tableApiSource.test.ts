import { describe, expect, it, vi } from 'vitest';
import { makeApolloTableFetch, type TableGqlClient } from '../src/apolloFetch';
import { clientTableFetch } from '../src/clientFetch';
import { tableQueryToGql } from '../src/gql';
import { tableApiSourceOf } from '../src/tableApi/source';
import { tableApiUrl } from '../src/tableApi/tableApiUrl';
import type { TableQueryState } from '../src/types';

const QUERY: TableQueryState = {
  search: 'yoga',
  page: 2,
  pageSize: 50,
  sortBy: 'start_at',
  sortDir: 'desc',
  filters: [{ field: 'status', op: 'eq', value: 'LIVE' }],
};

const client: TableGqlClient = { query: vi.fn() };

describe('table API source', () => {
  it('records the server query behind an Apollo table fetch, with the same variables it sends', () => {
    const fetchRows = makeApolloTableFetch(client, {}, 'podsTable', {
      extraFilters: [{ field: 'club_id', op: 'eq', value: 'DUN-CLUB-12' }],
      extraVariables: { from: '2026-09-01' },
    });
    const source = tableApiSourceOf(fetchRows);
    expect(source?.resultKey).toBe('podsTable');
    expect(source?.variablesOf(QUERY)).toEqual({
      ...tableQueryToGql({ ...QUERY, filters: [...QUERY.filters, { field: 'club_id', op: 'eq', value: 'DUN-CLUB-12' }] }),
      from: '2026-09-01',
    });
  });

  it('has no source for rows already in hand', () => {
    expect(tableApiSourceOf(clientTableFetch([], () => '', []))).toBeUndefined();
  });
});

describe('tableApiUrl', () => {
  const base = 'https://server.duncit.com/table-api';

  it('spreads the table query into readable params and keeps the token first', () => {
    const url = new URL(tableApiUrl(base, 'podsTable', tableQueryToGql(QUERY), 'dtt_4821'));
    expect(url.pathname).toBe('/table-api/podsTable');
    expect([...url.searchParams.keys()][0]).toBe('token');
    expect(url.searchParams.get('token')).toBe('dtt_4821');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('page_size')).toBe('50');
    expect(url.searchParams.get('search')).toBe('yoga');
    expect(url.searchParams.get('sort_dir')).toBe('desc');
    expect(JSON.parse(url.searchParams.get('filters') ?? '')).toEqual([
      { field: 'status', op: 'eq', value: 'LIVE', values: null },
    ]);
  });

  it('leaves out empty values and passes other variables by name', () => {
    const url = new URL(
      tableApiUrl(
        base,
        'ticketsTable',
        { query: { search: null, sort_by: undefined, page: 1, filters: [] }, status: 'OPEN', club_ids: ['c1'], note: '' },
        'YOUR_TOKEN',
      ),
    );
    expect(url.searchParams.has('search')).toBe(false);
    expect(url.searchParams.has('sort_by')).toBe(false);
    expect(url.searchParams.has('filters')).toBe(false);
    expect(url.searchParams.has('note')).toBe(false);
    expect(url.searchParams.get('status')).toBe('OPEN');
    expect(url.searchParams.get('club_ids')).toBe('["c1"]');
  });

  it('treats a null query variable as absent', () => {
    const url = new URL(tableApiUrl(base, 'ticketsTable', { query: null }, 'dtt_1'));
    expect([...url.searchParams.keys()]).toEqual(['token']);
  });
});
