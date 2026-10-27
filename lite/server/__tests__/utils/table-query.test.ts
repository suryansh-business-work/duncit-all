import { describe, expect, it } from 'vitest';
import {
  buildTableFilter,
  clampPage,
  combineFilters,
  escapedSearchRegex,
  resolveSort,
  runTableQuery,
  type TableEntityConfig,
  type TableQueryModel,
} from '../../utils/table-query';

const EVENTS: TableEntityConfig = {
  searchFields: ['title', 'slug'],
  sortFields: { title: 'title', start: 'start_at' },
  filterFields: {
    status: { type: 'enum' },
    price: { type: 'number' },
    start_at: { type: 'date' },
    featured: { type: 'boolean' },
    city: { type: 'string', path: 'city_slug' },
    title: { type: 'string' },
  },
  defaultSort: { start_at: -1 },
};

describe('escapedSearchRegex', () => {
  it('matches the text literally and case-insensitively', () => {
    const rx = escapedSearchRegex('  a.b*(c)  ');
    expect(rx.test('A.B*(C) party')).toBe(true);
    expect(rx.test('axb*(c)')).toBe(false);
    expect(rx.flags).toBe('i');
  });
});

describe('buildTableFilter', () => {
  it('answers an empty filter for no input', () => {
    expect(buildTableFilter(null, EVENTS)).toEqual({});
    expect(buildTableFilter(undefined, EVENTS)).toEqual({});
  });

  it('drops fields that are not on the allowlist', () => {
    expect(buildTableFilter({ filters: [{ field: 'password', op: 'eq', value: 'x' }] }, EVENTS)).toEqual({});
    expect(buildTableFilter({ filters: [{ field: 'toString', op: 'eq', value: 'x' }] }, EVENTS)).toEqual({});
  });

  it('builds eq, ne, gte and lte conditions with typed values', () => {
    expect(buildTableFilter({ filters: [{ field: 'status', op: 'eq', value: 'PUBLISHED' }] }, EVENTS)).toEqual({ status: 'PUBLISHED' });
    expect(buildTableFilter({ filters: [{ field: 'status', op: 'ne', value: 'DRAFT' }] }, EVENTS)).toEqual({ status: { $ne: 'DRAFT' } });
    expect(buildTableFilter({ filters: [{ field: 'price', op: 'gte', value: '100' }] }, EVENTS)).toEqual({ price: { $gte: 100 } });
    expect(buildTableFilter({ filters: [{ field: 'start_at', op: 'lte', value: '2026-11-01T00:00:00.000Z' }] }, EVENTS)).toEqual({
      start_at: { $lte: new Date('2026-11-01T00:00:00.000Z') },
    });
  });

  it('drops a condition whose value is missing or does not fit the field type', () => {
    const filters = [
      { field: 'price', op: 'eq' as const, value: 'cheap' },
      { field: 'start_at', op: 'gte' as const, value: 'soon' },
      { field: 'status', op: 'eq' as const, value: null },
      { field: 'title', op: 'contains' as const },
      { field: 'featured', op: 'eq' as const, value: 'true' },
    ];
    expect(buildTableFilter({ filters }, EVENTS)).toEqual({});
  });

  it('builds "in" from the values that fit, and drops it when none do', () => {
    expect(buildTableFilter({ filters: [{ field: 'price', op: 'in', values: ['100', 'x', '250'] }] }, EVENTS)).toEqual({ price: { $in: [100, 250] } });
    expect(buildTableFilter({ filters: [{ field: 'price', op: 'in', values: ['x'] }] }, EVENTS)).toEqual({});
    expect(buildTableFilter({ filters: [{ field: 'price', op: 'in' }] }, EVENTS)).toEqual({});
  });

  it('builds "between" only from two values that both fit', () => {
    expect(buildTableFilter({ filters: [{ field: 'price', op: 'between', values: ['10', '20'] }] }, EVENTS)).toEqual({ price: { $gte: 10, $lte: 20 } });
    expect(buildTableFilter({ filters: [{ field: 'price', op: 'between', values: ['10'] }] }, EVENTS)).toEqual({});
    expect(buildTableFilter({ filters: [{ field: 'price', op: 'between', values: ['10', 'many'] }] }, EVENTS)).toEqual({});
  });

  it('turns "contains" into an escaped regex and booleans into true/false', () => {
    const filter = buildTableFilter(
      {
        filters: [
          { field: 'title', op: 'contains', value: 'C++' },
          { field: 'featured', op: 'is_true' },
        ],
      },
      EVENTS,
    );
    expect(filter.featured).toBe(true);
    expect(filter.title).toBeInstanceOf(RegExp);
    expect((filter.title as RegExp).test('Intro to c++ night')).toBe(true);
    expect(buildTableFilter({ filters: [{ field: 'featured', op: 'is_false' }] }, EVENTS)).toEqual({ featured: false });
  });

  it('writes the condition at the field path when one is configured', () => {
    expect(buildTableFilter({ filters: [{ field: 'city', op: 'eq', value: 'mumbai' }] }, EVENTS)).toEqual({ city_slug: 'mumbai' });
  });

  it('merges two operator conditions on one field, and lets a later plain value replace an earlier one', () => {
    const range = buildTableFilter(
      {
        filters: [
          { field: 'price', op: 'gte', value: '100' },
          { field: 'price', op: 'lte', value: '500' },
        ],
      },
      EVENTS,
    );
    expect(range).toEqual({ price: { $gte: 100, $lte: 500 } });
    const replaced = buildTableFilter(
      {
        filters: [
          { field: 'price', op: 'gte', value: '100' },
          { field: 'price', op: 'eq', value: '300' },
        ],
      },
      EVENTS,
    );
    expect(replaced).toEqual({ price: 300 });
  });

  it('searches every search field with the same escaped regex, ignoring blank searches', () => {
    const filter = buildTableFilter({ search: ' jazz ' }, EVENTS);
    expect(filter.$or).toEqual([{ title: /jazz/i }, { slug: /jazz/i }]);
    expect(buildTableFilter({ search: '   ' }, EVENTS)).toEqual({});
    expect(buildTableFilter({ search: 'jazz' }, { ...EVENTS, searchFields: [] })).toEqual({});
  });
});

describe('clampPage', () => {
  it('defaults to page 1 of 25', () => {
    expect(clampPage({})).toEqual({ page: 1, pageSize: 25 });
  });

  it('keeps page at least 1 and page size within 1..100, as whole numbers', () => {
    expect(clampPage({ page: 0, page_size: 0 })).toEqual({ page: 1, pageSize: 1 });
    expect(clampPage({ page: -3, page_size: 500 })).toEqual({ page: 1, pageSize: 100 });
    expect(clampPage({ page: 2.7, page_size: 10.9 })).toEqual({ page: 2, pageSize: 10 });
  });
});

describe('resolveSort', () => {
  it('uses the default sort with _id as the tiebreaker', () => {
    expect(resolveSort({}, EVENTS)).toEqual({ start_at: -1, _id: -1 });
  });

  it('maps an allowed sort key to its path, descending unless asked for asc', () => {
    expect(resolveSort({ sort_by: 'start', sort_dir: 'asc' }, EVENTS)).toEqual({ start_at: 1, _id: -1 });
    expect(resolveSort({ sort_by: 'title' }, EVENTS)).toEqual({ title: -1, _id: -1 });
    expect(resolveSort({ sort_by: 'title', sort_dir: 'sideways' }, EVENTS)).toEqual({ title: -1, _id: -1 });
  });

  it('ignores unknown and inherited keys', () => {
    expect(resolveSort({ sort_by: 'password', sort_dir: 'asc' }, EVENTS)).toEqual({ start_at: -1, _id: -1 });
    expect(resolveSort({ sort_by: 'constructor', sort_dir: 'asc' }, EVENTS)).toEqual({ start_at: -1, _id: -1 });
  });
});

describe('combineFilters', () => {
  it('ANDs a base filter with the built one only when both have conditions', () => {
    expect(combineFilters({ locale: 'hi-IN' }, { key: 'a' })).toEqual({ $and: [{ locale: 'hi-IN' }, { key: 'a' }] });
    expect(combineFilters({ locale: 'hi-IN' }, {})).toEqual({ locale: 'hi-IN' });
    expect(combineFilters({}, { key: 'a' })).toEqual({ key: 'a' });
    expect(combineFilters({}, {})).toEqual({});
  });
});

describe('runTableQuery', () => {
  interface QueryChain {
    sort(sort: unknown): QueryChain;
    skip(skip: number): QueryChain;
    limit(limit: number): QueryChain;
    lean(): Promise<unknown[]>;
  }

  function fakeModel(docs: unknown[], total: number) {
    const calls: { filter?: Record<string, unknown>; sort?: unknown; skip?: number; limit?: number; count?: Record<string, unknown> } = {};
    const model: TableQueryModel = {
      find: (filter) => {
        calls.filter = filter;
        const chain: QueryChain = {
          sort: (sort: unknown) => {
            calls.sort = sort;
            return chain;
          },
          skip: (skip: number) => {
            calls.skip = skip;
            return chain;
          },
          limit: (limit: number) => {
            calls.limit = limit;
            return chain;
          },
          lean: async () => docs,
        };
        return chain;
      },
      countDocuments: async (filter) => {
        calls.count = filter;
        return total;
      },
    };
    return { model, calls };
  }

  it('pages, sorts and counts with the same combined filter', async () => {
    const { model, calls } = fakeModel([{ title: 'A' }, { title: 'B' }], 42);
    const result = await runTableQuery(model, { status: 'PUBLISHED' }, { page: 3, page_size: 10, sort_by: 'title', sort_dir: 'asc', search: 'jazz' }, EVENTS);
    expect(result).toEqual({ docs: [{ title: 'A' }, { title: 'B' }], total: 42, page: 3, page_size: 10 });
    expect(calls.filter).toEqual({ $and: [{ status: 'PUBLISHED' }, { $or: [{ title: /jazz/i }, { slug: /jazz/i }] }] });
    expect(calls.count).toEqual(calls.filter);
    expect(calls.sort).toEqual({ title: 1, _id: -1 });
    expect(calls.skip).toBe(20);
    expect(calls.limit).toBe(10);
  });

  it('runs with defaults when no query is given', async () => {
    const { model, calls } = fakeModel([], 0);
    await expect(runTableQuery(model, {}, null, EVENTS)).resolves.toEqual({ docs: [], total: 0, page: 1, page_size: 25 });
    expect(calls.skip).toBe(0);
    expect(calls.limit).toBe(25);
  });
});
