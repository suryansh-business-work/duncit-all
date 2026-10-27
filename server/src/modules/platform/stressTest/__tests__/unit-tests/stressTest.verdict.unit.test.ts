import { generateStressVerdict } from '../../stressTest.verdict';
import { StressRunModel, StressSampleModel } from '../../stressTest.model';
import { appendEvent, pubRun, settingsDoc } from '../../stressTest.records';
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { openaiChat } from '@services/openai/openai.client';

jest.mock('@modules/ai/prompt/prompt.service', () => ({ resolvePrompt: jest.fn() }));
jest.mock('@services/openai/openai.client', () => ({ openaiChat: jest.fn() }));
jest.mock('@observability/log', () => ({ logs: { server: { info: jest.fn() } } }));
jest.mock('../../stressTest.records', () => ({ appendEvent: jest.fn(), pubRun: jest.fn(), settingsDoc: jest.fn() }));
jest.mock('../../stressTest.model', () => ({
  ...jest.requireActual('../../stressTest.model'),
  StressRunModel: { findById: jest.fn(), updateOne: jest.fn() },
  StressSampleModel: { find: jest.fn() },
}));

const user = { id: 'u1', email: 'ops@duncit.com' } as never;
const server = (over = {}) => ({
  rps_total: 10, host_cpu_pct: 50, host_memory_pct: 40, event_loop_lag_ms: 5, server_p95_ms: 120, rss_mb: 300,
  real_users: 2, visitors: 3, ...over,
});
const load = (over = {}) => ({ active_vus: 10, active_bots: 2, rps: 5, p95_ms: 200, error_rate_pct: 1, ...over });
const sample = (sec: number, over: Record<string, unknown> = {}) => ({
  at: new Date(1_700_000_000_000 + sec * 1000), load: load(), server: server(), containers: [], ...over,
});

const runDoc = (over = {}) => ({ _id: 'r1', run_no: 7, status: 'COMPLETED', started_at: new Date(1_700_000_000_000), ...over });
const pub = (over = {}) => ({
  run_no: 7, status: 'COMPLETED', environment: 'staging', duration_seconds: 60, stop_reason: '', error_message: '',
  profile: { vus: 5 }, peaks: { p: 1 }, summary: { s: 1 }, endpoints: Array.from({ length: 30 }, (_, i) => ({ path: `/e${i}` })), ...over,
});

const goodJson = {
  grade: 'STRAINED', headline: '  Holds 200  ', safe_concurrent_users: 199.6, breaking_point_users: -5, confidence: 'HIGH',
  capacity_reasoning: 'because', bottlenecks: [{ title: 'DB', detail: 'slow', level: 'HIGH' }], upgrades: [], watch_points: ['cpu', ''],
};

function arrange(samples: unknown[] = [sample(0)], found: unknown = runDoc()) {
  (StressRunModel.findById as jest.Mock).mockResolvedValue(found);
  (StressSampleModel.find as jest.Mock).mockReturnValue({ sort: () => ({ lean: () => Promise.resolve(samples) }) });
  (settingsDoc as jest.Mock).mockResolvedValue({ abort_error_rate_pct: 1, abort_p95_ms: 2, abort_host_cpu_pct: 3, abort_host_memory_pct: 4 });
  (pubRun as jest.Mock).mockReturnValue(pub());
  (resolvePrompt as jest.Mock).mockImplementation(async (key: string) => ({ model: 'gpt-x', content: `prompt:${key}` }));
}
const answer = (content: unknown) =>
  (openaiChat as jest.Mock).mockResolvedValue({ ok: true, content: typeof content === 'string' ? content : JSON.stringify(content), model: 'gpt-x' });
const sentData = (call = 0) => JSON.parse((resolvePrompt as jest.Mock).mock.calls.filter((c) => c[0] === 'stress.verdict.user')[call][1].run_data);
const storedVerdict = () => (StressRunModel.updateOne as jest.Mock).mock.calls[0][1].$set.verdict;

describe('generateStressVerdict guards', () => {
  it('rejects a run that no longer exists', async () => {
    arrange([], null);
    await expect(generateStressVerdict('x', user)).rejects.toMatchObject({ message: 'That stress run no longer exists.' });
  });

  it('rejects a live run', async () => {
    arrange([], runDoc({ status: 'RUNNING' }));
    await expect(generateStressVerdict('x', user)).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    expect(openaiChat).not.toHaveBeenCalled();
  });

  it('rejects a run that never generated load', async () => {
    arrange([], runDoc({ started_at: null }));
    await expect(generateStressVerdict('x', user)).rejects.toMatchObject({ message: expect.stringContaining('never generated load') });
  });
});

describe('generateStressVerdict', () => {
  it('sends the run data to the model, stores the cleaned verdict and logs it', async () => {
    arrange([sample(0), sample(10, { containers: [{ name: 'api', cpu_pct: 90, memory_mb: 500, memory_pct: 40 }] })]);
    answer(goodJson);
    const stored = { id: 'r1' };
    (pubRun as jest.Mock).mockReturnValueOnce(pub()).mockReturnValueOnce(stored);

    const result = await generateStressVerdict('r1', user);

    expect(result).toBe(stored);
    const data = sentData();
    expect(data.ended_because).toBe('completed its plan');
    expect(data.slowest_endpoints).toHaveLength(25);
    expect(data.guardrails).toEqual({ abort_error_rate_pct: 1, abort_p95_ms: 2, abort_host_cpu_pct: 3, abort_host_memory_pct: 4 });
    expect(data.time_series).toHaveLength(2);
    expect(data.time_series[1]).toMatchObject({ t_seconds: 10, real_people: 5, p95_ms: 200 });
    expect(data.containers).toEqual([{ name: 'api', peak_cpu_pct: 90, peak_memory_mb: 500, peak_memory_pct: 40 }]);
    expect(openaiChat).toHaveBeenCalledWith(expect.objectContaining({
      task: 'platform.stress_verdict', detail: 7, json: true, user_id: 'u1', temperature: 0.2,
      messages: [{ role: 'system', content: 'prompt:stress.verdict' }, { role: 'user', content: 'prompt:stress.verdict.user' }],
    }));
    expect(storedVerdict()).toMatchObject({
      grade: 'STRAINED', headline: 'Holds 200', safe_concurrent_users: 200, breaking_point_users: 0, confidence: 'HIGH',
      bottlenecks: [{ title: 'DB', detail: 'slow', level: 'HIGH' }], upgrades: [], watch_points: ['cpu'],
      model: 'gpt-x', generated_by: 'ops@duncit.com',
    });
    expect(appendEvent).toHaveBeenCalledWith('r1', 'INFO', 'portal', 'AI verdict generated by ops@duncit.com: STRAINED.');
  });

  it('uses the stop reason, then the error message, as why the run ended', async () => {
    arrange();
    answer(goodJson);
    (pubRun as jest.Mock).mockReturnValue(pub({ stop_reason: 'cpu breach' }));
    await generateStressVerdict('r1', user);
    expect(sentData(0).ended_because).toBe('cpu breach');

    (pubRun as jest.Mock).mockReturnValue(pub({ error_message: 'boom' }));
    await generateStressVerdict('r1', user);
    expect(sentData(1).ended_because).toBe('boom');
  });

  it('falls back to defaults for an off-shape answer and the user id when there is no email', async () => {
    arrange();
    answer({ grade: 'WHATEVER', safe_concurrent_users: 'abc', confidence: 'nope', bottlenecks: 'x', watch_points: 'x' });
    await generateStressVerdict('r1', { id: 'u9' } as never);
    expect(storedVerdict()).toMatchObject({
      grade: 'INCONCLUSIVE', headline: '', safe_concurrent_users: 0, breaking_point_users: 0, confidence: 'MEDIUM',
      capacity_reasoning: '', bottlenecks: [], watch_points: [], generated_by: 'u9',
    });
  });

  it('drops items without a title, defaults their level and caps the lists at eight', async () => {
    arrange();
    const many = Array.from({ length: 12 }, (_, i) => ({ title: `t${i}`, detail: 1, level: 'bad' }));
    answer({ ...goodJson, bottlenecks: [{ detail: 'no title' }, ...many], watch_points: Array.from({ length: 12 }, (_, i) => `w${i}`) });
    await generateStressVerdict('r1', user);
    const verdict = storedVerdict();
    expect(verdict.bottlenecks).toHaveLength(7);
    expect(verdict.bottlenecks[0]).toEqual({ title: 't0', detail: '', level: 'MEDIUM' });
    expect(verdict.watch_points).toHaveLength(8);
  });

  it('raises a graphql error when the model call fails', async () => {
    arrange();
    (openaiChat as jest.Mock).mockResolvedValue({ ok: false, code: 'NOT_CONFIGURED', message: 'x' });
    await expect(generateStressVerdict('r1', user)).rejects.toMatchObject({ extensions: { code: 'AI_NOT_CONFIGURED' } });
    expect(StressRunModel.updateOne).not.toHaveBeenCalled();
  });

  it('raises an invalid-json error when the answer is not JSON', async () => {
    arrange();
    answer('not json');
    await expect(generateStressVerdict('r1', user)).rejects.toMatchObject({ extensions: { code: 'AI_INVALID_JSON' } });
  });

  it('sends an empty series for a run with no samples', async () => {
    arrange([]);
    answer(goodJson);
    await generateStressVerdict('r1', user);
    expect(sentData().time_series).toEqual([]);
    expect(sentData().containers).toEqual([]);
  });

  it('folds many samples into at most forty points and treats missing readings as zero', async () => {
    const samples = Array.from({ length: 85 }, (_, i) =>
      i === 0 ? sample(0, { load: {}, server: { real_users: 0, visitors: 0 }, containers: undefined }) : sample(i)
    );
    arrange(samples);
    answer(goodJson);
    await generateStressVerdict('r1', user);
    const series = sentData().time_series;
    expect(series).toHaveLength(29);
    expect(series[0]).toMatchObject({ t_seconds: 0, virtual_users: 10, bot_rps: 3.3 });
  });

  it('keeps only the eight busiest containers', async () => {
    const containers = Array.from({ length: 10 }, (_, i) => ({ name: `c${i}`, cpu_pct: i, memory_mb: 1, memory_pct: 1 }));
    arrange([sample(0, { containers }), sample(5, { containers: [{ name: 'c0', cpu_pct: 99, memory_mb: 9, memory_pct: 9 }] })]);
    answer(goodJson);
    await generateStressVerdict('r1', user);
    const peaks = sentData().containers;
    expect(peaks).toHaveLength(8);
    expect(peaks[0]).toEqual({ name: 'c0', peak_cpu_pct: 99, peak_memory_mb: 9, peak_memory_pct: 9 });
  });
});
