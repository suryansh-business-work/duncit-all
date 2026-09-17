import { captureTableScope, runTableQuery, type TableEntityConfig } from '../../table-query';

const config: TableEntityConfig = {
  searchFields: ['club_name'],
  sortFields: { club_name: 'club_name' },
  filterFields: { status: { type: 'enum' } },
  defaultSort: { created_at: -1 },
};

/** A Model stand-in: every chained call resolves to one Lucknow club row. */
function fakeModel() {
  const options: Record<string, unknown>[] = [];
  const query = {
    sort: () => query,
    skip: () => query,
    limit: () => query,
    setOptions: (opts: Record<string, unknown>) => {
      options.push(opts);
      return query;
    },
    then: (resolve: (rows: unknown[]) => unknown) => resolve([{ club_name: 'Who Even Are We?' }]),
  };
  const count = {
    setOptions: (opts: Record<string, unknown>) => {
      options.push(opts);
      return count;
    },
    then: (resolve: (total: number) => unknown) => resolve(1),
  };
  return { model: { find: () => query, countDocuments: () => count }, options };
}

describe('captureTableScope', () => {
  it('hands back the collection and the combined filter the table read used', async () => {
    const { model } = fakeModel();
    const scope = await captureTableScope(() =>
      runTableQuery(model, { location_id: 'loc-lucknow' }, { search: 'Who', filters: [{ field: 'status', op: 'eq', value: 'ACTIVE' }] }, config),
    );
    expect(scope?.model).toBe(model);
    expect(scope?.includeDeleted).toBe(false);
    expect(scope?.filter).toEqual({
      $and: [
        { location_id: 'loc-lucknow' },
        { status: 'ACTIVE', $or: [{ club_name: /Who/i }] },
      ],
    });
  });

  it('keeps the first read when the resolver runs a second one', async () => {
    const first = fakeModel();
    const second = fakeModel();
    const scope = await captureTableScope(async () => {
      await runTableQuery(first.model, { city: 'Lucknow' }, null, config, { includeDeleted: true });
      await runTableQuery(second.model, { city: 'Pune' }, null, config);
    });
    expect(scope?.model).toBe(first.model);
    expect(scope?.filter).toEqual({ city: 'Lucknow' });
    expect(scope?.includeDeleted).toBe(true);
    expect(first.options).toEqual([{ includeDeleted: true }, { includeDeleted: true }]);
  });

  it('answers undefined when the read never reached runTableQuery', async () => {
    const scope = await captureTableScope(async () => [{ club_name: 'Computed row' }]);
    expect(scope).toBeUndefined();
  });

  it('leaves reads outside a capture untouched', async () => {
    const { model } = fakeModel();
    const page = await runTableQuery(model, {}, null, config);
    expect(page.total).toBe(1);
    expect(page.docs).toEqual([{ club_name: 'Who Even Are We?' }]);
  });
});
