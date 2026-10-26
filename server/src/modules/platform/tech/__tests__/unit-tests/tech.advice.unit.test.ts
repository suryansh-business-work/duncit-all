import { generateServerAdvice, latestServerAdvice } from '../../tech.advice';
import { techService } from '../../tech.service';
import { serverHistory } from '../../tech.history.service';
import { ServerAdviceModel } from '../../tech.history.model';
import { graphqlMonitorService } from '../../../graphqlMonitor/graphqlMonitor.service';
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { openaiChat } from '@services/openai/openai.client';
import { logs } from '@observability/log';

jest.mock('../../tech.service', () => ({ techService: { serverInfo: jest.fn(), dockerInfo: jest.fn() } }));
jest.mock('../../tech.history.service', () => ({ serverHistory: jest.fn() }));
jest.mock('../../tech.history.model', () => ({
  ...jest.requireActual('../../tech.history.model'),
  ServerAdviceModel: { create: jest.fn(), findOne: jest.fn() },
}));
jest.mock('../../../graphqlMonitor/graphqlMonitor.service', () => ({ graphqlMonitorService: { operations: jest.fn() } }));
jest.mock('@modules/ai/prompt/prompt.service', () => ({ resolvePrompt: jest.fn() }));
jest.mock('@services/openai/openai.client', () => ({ openaiChat: jest.fn() }));
jest.mock('@observability/statusServices', () => ({ getStatusEnvironment: () => 'staging' }));
jest.mock('@observability/log', () => ({ logs: { server: { info: jest.fn() } } }));

const GB = 1_073_741_824;
const user = { id: 'u1', email: 'ops@duncit.com' } as never;

const info = (over: Record<string, unknown> = {}) => ({
  os: { distro: 'Ubuntu', release: '24.04', arch: 'x64', nodeVersion: 'v24', kernelUptimeSeconds: 172_800 },
  cpu: { model: 'EPYC', cores: 8, usagePercent: 20, loadAvg1: 1, loadAvg5: 2, loadAvg15: 3 },
  memory: { totalBytes: 16 * GB, usagePercent: 50 },
  swap: { totalBytes: 2 * GB, usagePercent: 5 },
  disk: { totalBytes: 100 * GB, freeBytes: 40 * GB, usagePercent: 60, inodeUsagePercent: 10 },
  ssl: { daysRemaining: 30 },
  ...over,
});
const op = (name: string, over: Record<string, unknown> = {}) => ({ name, type: 'QUERY', requests: 100, p95_ms: 100, avg_ms: 50, error_rate_pct: 1, ...over });
const day = (date: string) => ({
  date, samples: 10, cpuAvgPct: 1, cpuPeakPct: 2, loadAvg: 3, memoryAvgPct: 4, memoryPeakPct: 5, swapPeakPct: 6, diskPct: 7, diskUsedBytes: 7 * GB,
  requests: 8, errors5xx: 9, latencyAvgMs: 10, latencyP95Ms: 11, latencyPeakMs: 12, probeLatencyMs: 13, uptimePct: 99, eventLoopP99PeakMs: 14, rssPeakMb: 15,
});

function arrange(over: { info?: unknown; operations?: unknown[]; docker?: unknown } = {}) {
  (techService.serverInfo as jest.Mock).mockResolvedValue(over.info ?? info());
  (techService.dockerInfo as jest.Mock).mockResolvedValue(
    over.docker ?? { available: true, containersRunning: 1, containersTotal: 2, containers: [{ name: 'api', state: 'running', status: 'Up' }, { name: 'db', state: 'exited', status: 'Exited (1)' }] }
  );
  (serverHistory as jest.Mock).mockResolvedValue({
    timeZone: 'UTC',
    days: [day('2026-03-01')],
    containers: [{ name: 'api' }],
    summary: { diskGrowthBytesPerDay: 2 * GB, daysWithData: 1, cpuAvgPct: 5 },
  });
  (graphqlMonitorService.operations as jest.Mock).mockResolvedValue(over.operations ?? []);
  (resolvePrompt as jest.Mock).mockImplementation(async (key: string) => ({ model: 'gpt-x', content: `prompt:${key}` }));
  (ServerAdviceModel.create as jest.Mock).mockImplementation(async (doc) => ({ ...doc, _id: 'adv1', toObject: () => ({ ...doc, _id: 'adv1' }) }));
}
const answer = (content: unknown) => (openaiChat as jest.Mock).mockResolvedValue({ ok: true, model: 'gpt-x', content: typeof content === 'string' ? content : JSON.stringify(content) });
const sentData = () => JSON.parse((resolvePrompt as jest.Mock).mock.calls.find((c) => c[0] === 'tech.server_advice.user')[1].server_data);

describe('latestServerAdvice', () => {
  const find = (value: unknown) => (ServerAdviceModel.findOne as jest.Mock).mockReturnValue({ sort: () => ({ lean: () => Promise.resolve(value) }) });

  it('is null before anyone asked for one', async () => {
    find(null);
    await expect(latestServerAdvice()).resolves.toBeNull();
  });

  it('shapes the newest recommendation for the portal', async () => {
    find({
      _id: 'a1', grade: 'WATCH', headline: 'h', summary: 's', trends: [{ title: 't' }], recommendations: [], notable_days: [{ date: '2026-03-01', note: 'n' }],
      watch_points: ['w'], period_days: 30, days_with_data: 12, model: 'gpt-x', generated_by: 'ops', generated_at: new Date('2026-03-02T00:00:00Z'),
    });
    await expect(latestServerAdvice()).resolves.toEqual({
      id: 'a1', grade: 'WATCH', headline: 'h', summary: 's', trends: [{ title: 't' }], recommendations: [], notableDays: [{ date: '2026-03-01', note: 'n' }],
      watchPoints: ['w'], periodDays: 30, daysWithData: 12, model: 'gpt-x', generatedBy: 'ops', generatedAt: '2026-03-02T00:00:00.000Z',
    });
  });
});

describe('generateServerAdvice: what the model is told', () => {
  it('sends only numbers this server recorded: host size, right-now readings, containers, the month and the slow operations', async () => {
    arrange({ operations: [op('Slow', { p95_ms: 900, requests: 50 }), op('Busy', { p95_ms: 200, avg_ms: 400, requests: 1000 }), op('Rare', { requests: 5, p95_ms: 5000 })] });
    answer({ grade: 'WATCH' });
    await generateServerAdvice(user, 'duncit.com');
    expect(techService.serverInfo).toHaveBeenCalledWith('duncit.com');
    const data = sentData();
    expect(data).toMatchObject({
      environment: 'staging', time_zone: 'UTC',
      host: { os: 'Ubuntu 24.04', arch: 'x64', cpu_cores: 8, memory_total_gb: 16, swap_total_gb: 2, disk_total_gb: 100, kernel_uptime_days: 2 },
      right_now: { cpu_pct: 20, load_avg_1_5_15: [1, 2, 3], memory_pct: 50, disk_free_gb: 40, inode_pct: 10, ssl_days_remaining: 30 },
      docker: { available: true, running: 1, total: 2, not_running: ['db (Exited (1))'] },
      month: { daysWithData: 1, cpuAvgPct: 5, disk_growth_gb_per_day: 2 },
      containers: [{ name: 'api' }],
    });
    expect(data.month).not.toHaveProperty('diskGrowthBytesPerDay');
    expect(data.days[0]).toMatchObject({ date: '2026-03-01', cpu_peak_pct: 2, disk_used_gb: 7, errors_5xx: 9, worst_5min_p95_ms: 12, api_rss_peak_mb: 15 });
    expect(data.graphql_operations_30d.slowest_by_p95.map((o: { name: string }) => o.name)).toEqual(['Slow', 'Busy']);
    expect(data.graphql_operations_30d.most_total_time.map((o: { name: string }) => o.name)).toEqual(['Busy', 'Slow']);
    expect(data.graphql_operations_30d.slowest_by_p95[0]).toEqual({ name: 'Slow', type: 'QUERY', requests: 50, p95_ms: 900, avg_ms: 50, error_rate_pct: 1 });
    expect(graphqlMonitorService.operations).toHaveBeenCalledWith('LAST_30_DAYS');
  });

  it('copes with a host that reports no swap, no disk readings, no certificate and no growth figure', async () => {
    arrange({ info: info({ swap: { totalBytes: null }, disk: { totalBytes: null, freeBytes: undefined, usagePercent: 0, inodeUsagePercent: 0 }, ssl: null }) });
    (serverHistory as jest.Mock).mockResolvedValue({ timeZone: 'UTC', days: [], containers: [], summary: { diskGrowthBytesPerDay: null } });
    answer({});
    await generateServerAdvice(user);
    expect(sentData()).toMatchObject({ host: { swap_total_gb: null, disk_total_gb: null }, right_now: { disk_free_gb: null, ssl_days_remaining: null }, month: { disk_growth_gb_per_day: null } });
  });

  it('keeps at most ten operations of each list', async () => {
    arrange({ operations: Array.from({ length: 15 }, (_, i) => op(`op${i}`, { p95_ms: i })) });
    answer({});
    await generateServerAdvice(user);
    expect(sentData().graphql_operations_30d.slowest_by_p95).toHaveLength(10);
    expect(sentData().graphql_operations_30d.slowest_by_p95[0].name).toBe('op14');
  });

  it('asks OpenAI with both prompt turns and the signed-in user', async () => {
    arrange();
    answer({});
    await generateServerAdvice(user);
    expect(openaiChat).toHaveBeenCalledWith(expect.objectContaining({
      task: 'platform.server_advice', detail: 'staging', json: true, temperature: 0.2, user_id: 'u1',
      messages: [{ role: 'system', content: 'prompt:tech.server_advice' }, { role: 'user', content: 'prompt:tech.server_advice.user' }],
    }));
  });
});

describe('generateServerAdvice: the answer', () => {
  it('keeps the model’s JSON to the shape the portal renders, stores it and logs it', async () => {
    arrange();
    answer({
      grade: 'ACTION_NEEDED', headline: ' Disk fills in 9 days ', summary: 'Details',
      trends: [{ title: 'Disk', detail: 'growing', level: 'HIGH' }],
      recommendations: [{ title: 'Add space', detail: 'x', level: 'weird' }, { detail: 'no title' }, null, 'text'],
      notable_days: [{ date: '2026-03-01', note: 'spike' }, { date: 'yesterday', note: 'bad date' }, { date: '2026-03-02', note: '' }],
      watch_points: ['cpu', '', 5],
    });
    const out = await generateServerAdvice(user);
    expect(out).toMatchObject({
      id: 'adv1', grade: 'ACTION_NEEDED', headline: 'Disk fills in 9 days', summary: 'Details', periodDays: 30, daysWithData: 1, model: 'gpt-x', generatedBy: 'ops@duncit.com',
      trends: [{ title: 'Disk', detail: 'growing', level: 'HIGH' }],
      recommendations: [{ title: 'Add space', detail: 'x', level: 'MEDIUM' }],
      notableDays: [{ date: '2026-03-01', note: 'spike' }],
      watchPoints: ['cpu'],
    });
    expect(logs.server.info).toHaveBeenCalledWith('tech', 'serverAdvice', { grade: 'ACTION_NEEDED', model: 'gpt-x', userId: 'u1' });
  });

  it('turns an off-shape answer into an inconclusive one with nothing invented', async () => {
    arrange();
    answer({ grade: 'EXCELLENT', trends: 'none', recommendations: null, notable_days: {}, watch_points: 'x' });
    const out = await generateServerAdvice({ id: 'u9' } as never);
    expect(out).toMatchObject({ grade: 'INCONCLUSIVE', headline: '', summary: '', trends: [], recommendations: [], notableDays: [], watchPoints: [], generatedBy: 'u9' });
  });

  it('caps every list at eight entries', async () => {
    arrange();
    answer({ trends: Array.from({ length: 12 }, (_, i) => ({ title: `t${i}` })), watch_points: Array.from({ length: 12 }, (_, i) => `w${i}`) });
    const out = await generateServerAdvice(user);
    expect(out?.trends).toHaveLength(8);
    expect(out?.watchPoints).toHaveLength(8);
  });

  it('raises the model’s own error when OpenAI refuses, and stores nothing', async () => {
    arrange();
    (openaiChat as jest.Mock).mockResolvedValue({ ok: false, code: 'DISABLED', message: 'off' });
    await expect(generateServerAdvice(user)).rejects.toMatchObject({ extensions: { code: 'AI_FEATURE_DISABLED' } });
    expect(ServerAdviceModel.create).not.toHaveBeenCalled();
  });

  it('raises an invalid-json error when the answer is not JSON', async () => {
    arrange();
    answer('plain words');
    await expect(generateServerAdvice(user)).rejects.toMatchObject({ extensions: { code: 'AI_INVALID_JSON' } });
  });
});
