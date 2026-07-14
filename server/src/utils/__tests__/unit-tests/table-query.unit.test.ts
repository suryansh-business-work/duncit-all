import {
  applyTableQueryInMemory,
  buildTableFilter,
  escapedSearchRegex,
  runTableQuery,
  type TableEntityConfig,
  type TableFilterInput,
} from '../../table-query';
import { supportSearchRegex } from '@modules/support/support.pagination';

const config: TableEntityConfig = {
  searchFields: ['name', 'email'],
  sortFields: { name: 'name', created_at: 'created_at', amount: 'stats.amount' },
  filterFields: {
    name: { type: 'string' },
    status: { type: 'enum' },
    amount: { type: 'number', path: 'stats.amount' },
    created_at: { type: 'date' },
    active: { type: 'boolean' },
  },
  defaultSort: { created_at: -1 },
};

const f = (field: string, op: TableFilterInput['op'], rest: Partial<TableFilterInput> = {}) =>
  ({ field, op, ...rest }) as TableFilterInput;

describe('escapedSearchRegex', () => {
  it('escapes every regex metacharacter and matches case-insensitively', () => {
    const rx = escapedSearchRegex('  a+b(c)*[d]?^$|.{}\\ ');
    expect(rx.flags).toBe('i');
    expect(rx.test('xxA+B(C)*[D]?^$|.{}\\yy')).toBe(true);
    expect(rx.test('aab')).toBe(false); // '+' is literal, not a quantifier
  });

  it('is the single implementation behind supportSearchRegex', () => {
    expect(supportSearchRegex).toBe(escapedSearchRegex);
  });
});

describe('buildTableFilter — ops', () => {
  it('eq / ne on strings and enums', () => {
    expect(buildTableFilter({ filters: [f('name', 'eq', { value: 'Riya' })] }, config)).toEqual({
      name: 'Riya',
    });
    expect(buildTableFilter({ filters: [f('status', 'ne', { value: 'NEW' })] }, config)).toEqual({
      status: { $ne: 'NEW' },
    });
  });

  it('in maps values through $in with per-type coercion', () => {
    expect(
      buildTableFilter({ filters: [f('amount', 'in', { values: ['1', 'x', '3'] })] }, config)
    ).toEqual({ 'stats.amount': { $in: [1, 3] } }); // NaN entry dropped
  });

  it('contains builds an escaped case-insensitive regex', () => {
    const out = buildTableFilter({ filters: [f('name', 'contains', { value: 'a+b' })] }, config);
    const rx = out.name as RegExp;
    expect(rx).toBeInstanceOf(RegExp);
    expect(rx.test('xa+by')).toBe(true);
    expect(rx.test('aab')).toBe(false);
  });

  it('gte / lte coerce numbers and dates', () => {
    expect(buildTableFilter({ filters: [f('amount', 'gte', { value: '10' })] }, config)).toEqual({
      'stats.amount': { $gte: 10 },
    });
    const out = buildTableFilter(
      { filters: [f('created_at', 'lte', { value: '2026-01-02T00:00:00.000Z' })] },
      config
    );
    expect((out.created_at as { $lte: Date }).$lte).toEqual(new Date('2026-01-02T00:00:00.000Z'));
  });

  it('between builds an inclusive {$gte,$lte} from values[0..1]', () => {
    expect(
      buildTableFilter({ filters: [f('amount', 'between', { values: ['5', '9'] })] }, config)
    ).toEqual({ 'stats.amount': { $gte: 5, $lte: 9 } });
  });

  it('is_true / is_false need no value and ignore the declared type', () => {
    expect(buildTableFilter({ filters: [f('active', 'is_true')] }, config)).toEqual({
      active: true,
    });
    expect(buildTableFilter({ filters: [f('active', 'is_false')] }, config)).toEqual({
      active: false,
    });
  });
});

describe('buildTableFilter — allowlist + coercion drops', () => {
  it('silently drops unknown fields, including prototype keys', () => {
    const filters = [
      f('nope', 'eq', { value: 'x' }),
      f('__proto__', 'eq', { value: 'x' }),
      f('constructor', 'eq', { value: 'x' }),
    ];
    expect(buildTableFilter({ filters }, config)).toEqual({});
  });

  it('drops uncoercible numbers, invalid dates and missing values', () => {
    const filters = [
      f('amount', 'eq', { value: 'NaN-ish' }),
      f('created_at', 'gte', { value: 'not a date' }),
      f('name', 'eq'), // no value
      f('amount', 'in', { values: ['x'] }), // all entries NaN
      f('amount', 'in'), // no values
      f('amount', 'between', { values: ['1'] }), // missing max
      f('amount', 'between', { values: ['1', 'x'] }), // uncoercible max
      f('name', 'contains'), // no value
      f('active', 'eq', { value: 'true' }), // boolean field only via is_true/is_false
    ];
    expect(buildTableFilter({ filters }, config)).toEqual({});
  });

  it('AND-merges filters and collapses two range filters on one field', () => {
    const filters = [
      f('amount', 'gte', { value: '5' }),
      f('amount', 'lte', { value: '9' }),
      f('status', 'eq', { value: 'NEW' }),
    ];
    expect(buildTableFilter({ filters }, config)).toEqual({
      'stats.amount': { $gte: 5, $lte: 9 },
      status: 'NEW',
    });
  });

  it('ORs the escaped search across searchFields and trims it', () => {
    const out = buildTableFilter({ search: '  a+b  ' }, config);
    const or = out.$or as Array<Record<string, RegExp>>;
    expect(or.map((c) => Object.keys(c)[0])).toEqual(['name', 'email']);
    expect(or[0].name.test('xa+by')).toBe(true);
  });

  it('ignores empty/whitespace search and a null input', () => {
    expect(buildTableFilter({ search: '   ' }, config)).toEqual({});
    expect(buildTableFilter(null, config)).toEqual({});
  });
});

describe('runTableQuery', () => {
  const captured: { filter?: Record<string, unknown>; sort?: Record<string, number>; skip?: number; limit?: number } = {};
  const fakeModel = {
    find: (filter: Record<string, unknown>) => {
      captured.filter = filter;
      return {
        sort: (s: Record<string, number>) => {
          captured.sort = s;
          return {
            skip: (n: number) => {
              captured.skip = n;
              return {
                limit: (l: number) => {
                  captured.limit = l;
                  return Promise.resolve([{ id: 'row' }]);
                },
              };
            },
          };
        },
      };
    },
    countDocuments: () => Promise.resolve(42),
  };

  it('clamps page/page_size, allowlists sort and appends the _id tiebreaker', async () => {
    const res = await runTableQuery(
      fakeModel,
      {},
      { page: 0, page_size: 999, sort_by: 'amount', sort_dir: 'asc' },
      config
    );
    expect(res).toEqual({ docs: [{ id: 'row' }], total: 42, page: 1, page_size: 100 });
    expect(captured.sort).toEqual({ 'stats.amount': 1, _id: -1 });
    expect(captured.skip).toBe(0);
    expect(captured.limit).toBe(100);
  });

  it('falls back to defaultSort for non-allowlisted sort_by and defaults paging', async () => {
    const res = await runTableQuery(fakeModel, {}, { sort_by: 'hax', sort_dir: 'asc' }, config);
    expect(captured.sort).toEqual({ created_at: -1, _id: -1 });
    expect(res.page).toBe(1);
    expect(res.page_size).toBe(25);
  });

  it('uses defaults for a missing input and skips (page-1)*page_size', async () => {
    await runTableQuery(fakeModel, {}, { page: 3, page_size: 10 }, config);
    expect(captured.skip).toBe(20);
    expect(captured.limit).toBe(10);
    await runTableQuery(fakeModel, {}, null, config);
    expect(captured.sort).toEqual({ created_at: -1, _id: -1 });
  });

  it('$and-combines baseFilter with client filters so guards cannot be overridden', async () => {
    await runTableQuery(
      fakeModel,
      { status: 'ACTIVE' },
      { filters: [f('status', 'eq', { value: 'DELETED' })] },
      config
    );
    expect(captured.filter).toEqual({ $and: [{ status: 'ACTIVE' }, { status: 'DELETED' }] });
    await runTableQuery(fakeModel, { status: 'ACTIVE' }, {}, config);
    expect(captured.filter).toEqual({ status: 'ACTIVE' });
    await runTableQuery(fakeModel, {}, { filters: [f('name', 'eq', { value: 'a' })] }, config);
    expect(captured.filter).toEqual({ name: 'a' });
  });
});

describe('applyTableQueryInMemory', () => {
  const rows = [
    { id: '1', name: 'beta', email: 'b@x.com', status: 'NEW', 'stats.amount': 5, created_at: new Date('2026-01-01'), active: true },
    { id: '2', name: 'Alpha', email: 'a+b@x.com', status: 'OPEN', 'stats.amount': 9, created_at: new Date('2026-01-03'), active: false },
    { id: '3', name: 'gamma', email: 'g@x.com', status: 'NEW', 'stats.amount': 1, created_at: new Date('2026-01-02'), active: true },
  ];

  it('searches across searchFields with the escaped regex', () => {
    const res = applyTableQueryInMemory(rows, { search: 'a+b' }, config);
    expect(res.rows.map((r) => r.id)).toEqual(['2']);
    expect(res.total).toBe(1);
  });

  it('applies every op with typed comparisons', () => {
    const run = (filters: TableFilterInput[]) =>
      applyTableQueryInMemory(rows, { filters }, config).rows.map((r) => r.id);
    expect(run([f('status', 'eq', { value: 'NEW' })]).sort()).toEqual(['1', '3']);
    expect(run([f('status', 'ne', { value: 'NEW' })])).toEqual(['2']);
    expect(run([f('status', 'in', { values: ['OPEN', 'NEW'] })])).toHaveLength(3);
    expect(run([f('name', 'contains', { value: 'ALPH' })])).toEqual(['2']);
    expect(run([f('amount', 'gte', { value: '5' })]).sort()).toEqual(['1', '2']);
    expect(run([f('amount', 'lte', { value: '5' })]).sort()).toEqual(['1', '3']);
    expect(run([f('amount', 'between', { values: ['2', '8'] })])).toEqual(['1']);
    expect(run([f('created_at', 'gte', { value: '2026-01-02' })]).sort()).toEqual(['2', '3']);
    expect(run([f('active', 'is_true')]).sort()).toEqual(['1', '3']);
    expect(run([f('active', 'is_false')])).toEqual(['2']);
  });

  it('AND-merges multiple filters and drops unknown/invalid ones', () => {
    const res = applyTableQueryInMemory(
      rows,
      {
        filters: [
          f('status', 'eq', { value: 'NEW' }),
          f('amount', 'gte', { value: '2' }),
          f('nope', 'eq', { value: 'x' }), // unknown field: dropped
          f('amount', 'eq', { value: 'x' }), // NaN: dropped
        ],
      },
      config
    );
    expect(res.rows.map((r) => r.id)).toEqual(['1']);
  });

  it('sorts strings via localeCompare and numbers/dates numerically', () => {
    const byName = applyTableQueryInMemory(rows, { sort_by: 'name', sort_dir: 'asc' }, config);
    expect(byName.rows.map((r) => r.name)).toEqual(['Alpha', 'beta', 'gamma']);
    const byAmount = applyTableQueryInMemory(rows, { sort_by: 'amount', sort_dir: 'desc' }, config);
    expect(byAmount.rows.map((r) => r['stats.amount'])).toEqual([9, 5, 1]);
    const byDefault = applyTableQueryInMemory(rows, {}, config); // defaultSort created_at:-1
    expect(byDefault.rows.map((r) => r.id)).toEqual(['2', '3', '1']);
  });

  it('clamps and pages the sorted result, reporting the pre-page total', () => {
    const res = applyTableQueryInMemory(
      rows,
      { page: 2, page_size: -5, sort_by: 'amount', sort_dir: 'asc' },
      config
    );
    expect(res).toMatchObject({ page: 2, page_size: 1, total: 3 });
    expect(res.rows.map((r) => r.id)).toEqual(['1']); // amounts 1,5,9 -> page 2 of size 1
    const empty = applyTableQueryInMemory(rows, { page: 99 }, config);
    expect(empty.rows).toEqual([]);
    expect(empty.total).toBe(3);
  });
});
