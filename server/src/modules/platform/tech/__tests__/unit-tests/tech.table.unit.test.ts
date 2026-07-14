import { techService, type TechDockerInfo } from '../../tech.service';

const containers = [
  {
    id: 'aaa111aaa111',
    name: 'duncit-api',
    image: 'duncit/api:prod',
    state: 'running',
    status: 'Up 3 days',
    createdAt: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 'bbb222bbb222',
    name: 'duncit-web',
    image: 'duncit/web:prod',
    state: 'exited',
    status: 'Exited (0) 2 hours ago',
    createdAt: '2026-07-02T00:00:00.000Z',
  },
  {
    id: 'ccc333ccc333',
    name: 'mongo',
    image: 'mongo:7',
    state: 'running',
    status: 'Up 5 days',
    createdAt: '2026-06-01T00:00:00.000Z',
  },
];

const dockerUp: TechDockerInfo = {
  available: true,
  version: '27.0.1',
  error: null,
  containersRunning: 2,
  containersTotal: 3,
  containers,
};

describe('techService.containersTable', () => {
  beforeEach(() => {
    jest.spyOn(techService, 'dockerInfo').mockResolvedValue(dockerUp);
  });

  it('pages the computed containers list with the default name-asc sort', async () => {
    const all = await techService.containersTable();
    expect(all.total).toBe(3);
    expect(all.rows.map((c) => c.name)).toEqual(['duncit-api', 'duncit-web', 'mongo']);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);
  });

  it('searches across name, image and id', async () => {
    const byName = await techService.containersTable({ search: 'duncit' });
    expect(byName.rows.map((c) => c.name)).toEqual(['duncit-api', 'duncit-web']);
    expect(byName.total).toBe(2);

    const byImage = await techService.containersTable({ search: 'mongo:7' });
    expect(byImage.rows.map((c) => c.name)).toEqual(['mongo']);

    const byId = await techService.containersTable({ search: 'bbb222' });
    expect(byId.rows.map((c) => c.name)).toEqual(['duncit-web']);
  });

  it('filters by state and sorts by createdAt', async () => {
    const running = await techService.containersTable({
      filters: [{ field: 'state', op: 'eq', value: 'running' }],
    });
    expect(running.rows.map((c) => c.name)).toEqual(['duncit-api', 'mongo']);

    const newest = await techService.containersTable({ sort_by: 'createdAt', sort_dir: 'desc' });
    expect(newest.rows.map((c) => c.name)).toEqual(['duncit-web', 'duncit-api', 'mongo']);
  });

  it('pages and reports the clamped page/page_size back', async () => {
    const page2 = await techService.containersTable({ page: 2, page_size: 1 });
    expect(page2.rows.map((c) => c.name)).toEqual(['duncit-web']);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });

  it('degrades to an empty page when Docker is unavailable', async () => {
    jest.spyOn(techService, 'dockerInfo').mockResolvedValue({
      available: false,
      version: null,
      error: 'Docker API timed out',
      containersRunning: 0,
      containersTotal: 0,
      containers: [],
    });
    const empty = await techService.containersTable({ search: 'duncit' });
    expect(empty.rows).toEqual([]);
    expect(empty.total).toBe(0);
  });
});
