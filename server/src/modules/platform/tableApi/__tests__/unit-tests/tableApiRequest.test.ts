import type { Request } from 'express';
import { createTableOperations } from '../../tableApi.operation';
import { pageUrl, tokenOf, variablesOf } from '../../tableApi.request';

const SDL = /* GraphQL */ `
  type Query {
    podsTable(query: TableQueryInput, status: Status, search: String, n: Int): PodPage
    flatTable(page: Int, search: String): PodPage
  }
  input TableQueryInput {
    page: Int
  }
  enum Status {
    LIVE
  }
  type PodPage {
    rows: [Pod]
    total: Int
  }
  type Pod {
    id: ID
  }
`;

const operations = createTableOperations([SDL], []);
const pods = operations.get('podsTable')!;
const flat = operations.get('flatTable')!;

const request = (query: Record<string, unknown> = {}, headers: Record<string, unknown> = {}) =>
  ({ query, headers, originalUrl: '/table-api/podsTable?token=dtt_1&page=2' }) as unknown as Request;

describe('tokenOf', () => {
  it('prefers the header, trimmed', () => {
    expect(tokenOf(request({ token: 'dtt_query' }, { 'x-table-api-token': ' dtt_header ' }))).toBe('dtt_header');
  });

  it('takes the first of a repeated header', () => {
    expect(tokenOf(request({}, { 'x-table-api-token': ['dtt_first', 'dtt_second'] }))).toBe('dtt_first');
  });

  it('falls back to the query string, then to nothing', () => {
    expect(tokenOf(request({ token: ['dtt_query'] }))).toBe('dtt_query');
    expect(tokenOf(request({ token: '   ' }))).toBe('');
  });
});

describe('variablesOf', () => {
  it('fills TableQueryInput from the paging params and passes other args by name', () => {
    const variables = variablesOf(
      request({
        page: '2',
        page_size: '50',
        search: 'yoga',
        sort_by: 'start_at',
        sort_dir: 'desc',
        filters: '[{"field":"status","op":"eq","value":"LIVE"}]',
        status: 'LIVE',
        n: '5',
      }),
      pods
    );
    expect(variables).toEqual({
      query: {
        page: 2,
        page_size: 50,
        search: 'yoga',
        sort_by: 'start_at',
        sort_dir: 'desc',
        filters: [{ field: 'status', op: 'eq', value: 'LIVE' }],
      },
      status: 'LIVE',
      n: 5,
    });
  });

  it('defaults to the first page of 25, ignoring a value that is not plain text', () => {
    expect(variablesOf(request({ search: { nested: 'x' } }), pods)).toEqual({
      query: { page: 1, page_size: 25, search: null, sort_by: null, sort_dir: null, filters: [] },
    });
  });

  it('gives a legacy flat table its own page and search args', () => {
    expect(variablesOf(request({ page: '3', search: 'book' }), flat)).toEqual({ page: 3, search: 'book' });
  });

  it.each([
    [{ page: '0' }, '"page" must be a whole number of 1 or more.'],
    [{ page_size: 'lots' }, '"page_size" must be a whole number of 1 or more.'],
    [{ filters: '[{' }, '"filters" must be valid JSON.'],
  ])('rejects %j', (query, message) => {
    expect(() => variablesOf(request(query), pods)).toThrow(message);
  });
});

describe('pageUrl', () => {
  it('swaps only the page on the public URL', () => {
    expect(pageUrl('https://server.duncit.com', request(), 3)).toBe(
      'https://server.duncit.com/table-api/podsTable?token=dtt_1&page=3'
    );
  });
});
