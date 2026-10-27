import { dockerGet } from '../../../tech/tech.service';
import { sampleContainers } from '../../stressTest.containers';

jest.mock('../../../tech/tech.service', () => ({ dockerGet: jest.fn() }));

const MB = 1_048_576;
const mockDocker = (list: unknown, stats: Record<string, unknown | Error>) =>
  (dockerGet as jest.Mock).mockImplementation(async (path: string) => {
    if (path === '/containers/json') {
      if (list instanceof Error) throw list;
      return list;
    }
    const id = decodeURIComponent(path.split('/')[2]);
    const value = stats[id];
    if (value instanceof Error) throw value;
    return value;
  });

const cpuStats = (total: number, system: number, cpus?: number) => ({
  cpu_usage: { total_usage: total },
  system_cpu_usage: system,
  ...(cpus === undefined ? {} : { online_cpus: cpus }),
});

describe('sampleContainers', () => {
  it('returns nothing when Docker is not reachable', async () => {
    mockDocker(new Error('no socket'), {});
    await expect(sampleContainers()).resolves.toEqual([]);
  });

  it('reads 0% CPU on the first sample, then the delta against the previous reading', async () => {
    const first = { cpu_stats: cpuStats(1000, 10_000, 4), memory_stats: { usage: 200 * MB, limit: 1000 * MB } };
    mockDocker([{ Id: 'cpu-a', Names: ['/api'] }], { 'cpu-a': first });
    expect(await sampleContainers()).toEqual([{ name: 'api', cpu_pct: 0, memory_mb: 200, memory_pct: 20 }]);

    const second = { cpu_stats: cpuStats(1500, 12_000, 4), memory_stats: { usage: 200 * MB, limit: 1000 * MB } };
    mockDocker([{ Id: 'cpu-a', Names: ['/api'] }], { 'cpu-a': second });
    const [row] = await sampleContainers();
    // (500 / 2000) * 4 cpus = 100%
    expect(row.cpu_pct).toBe(100);
  });

  it('reads 0% when usage did not advance or the system counter stalled', async () => {
    mockDocker([{ Id: 'cpu-b', Names: ['/b'] }], { 'cpu-b': { cpu_stats: cpuStats(1000, 5000) } });
    await sampleContainers();
    mockDocker([{ Id: 'cpu-b', Names: ['/b'] }], { 'cpu-b': { cpu_stats: cpuStats(1000, 6000) } });
    expect((await sampleContainers())[0].cpu_pct).toBe(0);
    mockDocker([{ Id: 'cpu-b', Names: ['/b'] }], { 'cpu-b': { cpu_stats: cpuStats(2000, 6000) } });
    expect((await sampleContainers())[0].cpu_pct).toBe(0);
  });

  it('assumes one CPU when the daemon does not report online_cpus', async () => {
    mockDocker([{ Id: 'cpu-c', Names: ['/c'] }], { 'cpu-c': { cpu_stats: cpuStats(0, 0) } });
    await sampleContainers();
    mockDocker([{ Id: 'cpu-c', Names: ['/c'] }], { 'cpu-c': { cpu_stats: cpuStats(100, 1000) } });
    expect((await sampleContainers())[0].cpu_pct).toBe(10);
  });

  it('treats a container with no stats at all as idle and unbounded', async () => {
    mockDocker([{ Id: 'empty-1', Names: ['/e'] }], { 'empty-1': {} });
    expect(await sampleContainers()).toEqual([{ name: 'e', cpu_pct: 0, memory_mb: 0, memory_pct: 0 }]);
  });

  it('subtracts reclaimable cache from memory: inactive_file (cgroup v2) before cache (v1)', async () => {
    mockDocker(
      [{ Id: 'mem-v2', Names: ['/v2'] }, { Id: 'mem-v1', Names: ['/v1'] }, { Id: 'mem-over', Names: ['/over'] }],
      {
        'mem-v2': { memory_stats: { usage: 300 * MB, limit: 1000 * MB, stats: { inactive_file: 100 * MB, cache: 250 * MB } } },
        'mem-v1': { memory_stats: { usage: 300 * MB, limit: 1000 * MB, stats: { cache: 50 * MB } } },
        'mem-over': { memory_stats: { usage: 10 * MB, limit: 1000 * MB, stats: { inactive_file: 50 * MB } } },
      }
    );
    const byName = Object.fromEntries((await sampleContainers()).map((s) => [s.name, s]));
    expect(byName.v2).toMatchObject({ memory_mb: 200, memory_pct: 20 });
    expect(byName.v1).toMatchObject({ memory_mb: 250, memory_pct: 25 });
    expect(byName.over).toMatchObject({ memory_mb: 0, memory_pct: 0 });
  });

  it('names a container by its id prefix when it has no name and strips the leading slash', async () => {
    mockDocker([{ Id: 'abcdefghijklmnop', Names: [] }, { Id: 'named-1', Names: ['/db'] }], {
      abcdefghijklmnop: {},
      'named-1': {},
    });
    const names = (await sampleContainers()).map((s) => s.name).sort();
    expect(names).toEqual(['abcdefghijkl', 'db']);
  });

  it('skips a container that vanished between the list and its stats', async () => {
    mockDocker([{ Id: 'gone-1', Names: ['/gone'] }, { Id: 'here-1', Names: ['/here'] }], {
      'gone-1': new Error('404'),
      'here-1': {},
    });
    expect((await sampleContainers()).map((s) => s.name)).toEqual(['here']);
  });

  it('keeps the fifteen busiest, ordered by CPU then memory', async () => {
    const list = Array.from({ length: 18 }, (_, i) => ({ Id: `many-${i}`, Names: [`/c${i}`] }));
    const stats = Object.fromEntries(list.map((c, i) => [c.Id, { memory_stats: { usage: i * MB, limit: 100 * MB } }]));
    mockDocker(list, stats);
    const out = await sampleContainers();
    expect(out).toHaveLength(15);
    expect(out[0].name).toBe('c17');
    expect(out[14].name).toBe('c3');
    expect(dockerGet).toHaveBeenCalledWith('/containers/many-0/stats?stream=false&one-shot=true');
  });
});
