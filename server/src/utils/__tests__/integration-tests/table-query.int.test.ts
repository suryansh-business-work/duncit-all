import {
  runTableQuery,
  type TableEntityConfig,
} from '../../table-query';
import {
  JobApplicationModel,
  type IJobApplication,
} from '@modules/content/jobApplication/jobApplication.model';

const config: TableEntityConfig = {
  searchFields: ['name', 'email', 'role_title'],
  sortFields: { name: 'name', created_at: 'created_at', status: 'status' },
  filterFields: {
    status: { type: 'enum' },
    name: { type: 'string' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

const doc = (n: number, over: Partial<IJobApplication> = {}) => ({
  role_title: 'Frontend Engineer',
  name: `Person ${String(n).padStart(2, '0')}`,
  email: `person${n}@example.com`,
  status: 'NEW',
  ...over,
});

describe('runTableQuery integration (JobApplicationModel)', () => {
  it('pages a filtered, sorted, searched query end-to-end', async () => {
    await JobApplicationModel.create([
      doc(1, { name: 'Asha Rao', status: 'SHORTLISTED' }),
      doc(2, { name: 'Asha Verma' }),
      doc(3, { name: 'Asha Iyer' }),
      doc(4, { name: 'Ravi Kumar' }),
      doc(5, { name: 'Asha Nair', status: 'REJECTED' }),
    ]);

    const res = await runTableQuery<IJobApplication>(
      JobApplicationModel,
      {},
      {
        search: 'asha',
        filters: [{ field: 'status', op: 'in', values: ['NEW', 'SHORTLISTED'] }],
        sort_by: 'name',
        sort_dir: 'asc',
        page: 1,
        page_size: 2,
      },
      config
    );

    // 4 Ashas, minus the REJECTED one -> 3 match; page 1 of 2 sorted by name asc
    expect(res.total).toBe(3);
    expect(res.page).toBe(1);
    expect(res.page_size).toBe(2);
    expect(res.docs.map((d) => d.name)).toEqual(['Asha Iyer', 'Asha Rao']);

    const page2 = await runTableQuery<IJobApplication>(
      JobApplicationModel,
      {},
      {
        search: 'asha',
        filters: [{ field: 'status', op: 'in', values: ['NEW', 'SHORTLISTED'] }],
        sort_by: 'name',
        sort_dir: 'asc',
        page: 2,
        page_size: 2,
      },
      config
    );
    expect(page2.docs.map((d) => d.name)).toEqual(['Asha Verma']);
  });

  it('escapes the search (regex metacharacters match literally)', async () => {
    await JobApplicationModel.create([
      doc(1, { name: 'C++ Fan' }),
      doc(2, { name: 'Cccc Plain' }),
    ]);
    const res = await runTableQuery<IJobApplication>(
      JobApplicationModel,
      {},
      { search: 'c++' },
      config
    );
    expect(res.total).toBe(1);
    expect(res.docs[0].name).toBe('C++ Fan');
  });

  it('keeps a stable page order on a low-cardinality sort via the _id tiebreaker', async () => {
    // 25 docs all sharing the same sort key (status) — without the _id
    // tiebreaker rows could duplicate/drop across pages.
    await JobApplicationModel.create(Array.from({ length: 25 }, (_, i) => doc(i)));
    const q = { sort_by: 'status', sort_dir: 'asc' as const, page_size: 10 };
    const pages = await Promise.all(
      [1, 2, 3].map((page) =>
        runTableQuery<IJobApplication>(JobApplicationModel, {}, { ...q, page }, config)
      )
    );
    const ids = pages.flatMap((p) => p.docs.map((d) => String(d._id)));
    expect(ids).toHaveLength(25);
    expect(new Set(ids).size).toBe(25); // no duplicates, no drops
    expect(pages[0].total).toBe(25);
  });

  it('$and-combines the baseFilter so client filters cannot widen it', async () => {
    await JobApplicationModel.create([
      doc(1, { status: 'NEW' }),
      doc(2, { status: 'REJECTED' }),
    ]);
    const res = await runTableQuery<IJobApplication>(
      JobApplicationModel,
      { status: 'NEW' },
      { filters: [{ field: 'status', op: 'eq', value: 'REJECTED' }] },
      config
    );
    expect(res.total).toBe(0); // NEW AND REJECTED matches nothing
  });
});
