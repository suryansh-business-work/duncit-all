/**
 * The orchestrator's tick: nothing due leaves no trace; agents due run as
 * child runs of one ORCHESTRATOR run, a step each, and a child that failed is
 * a failed step. The run log, the service and the runner are faked; the
 * cluster job is checked for its wiring only.
 */
jest.mock('@utils/clusterJob', () => ({ startClusterJob: jest.fn(() => () => undefined) }));
jest.mock('@modules/crm/marketing/runs/marketingRun.service', () => ({
  SYSTEM_ACTOR: { kind: 'SYSTEM' },
  withRun: jest.fn(),
}));
jest.mock('@modules/crm/marketing/agents/agent.service', () => ({
  marketingAgentService: { dueAgents: jest.fn(), markRan: jest.fn() },
}));
jest.mock('@modules/crm/marketing/agents/agent.runner', () => ({
  agentActor: jest.fn((def: { key: string; name: string }) => ({ kind: 'AGENT', id: def.key, name: def.name })),
  startMarketingAgent: jest.fn(),
}));

import { startClusterJob } from '@utils/clusterJob';
import { withRun, type RunContext, type StartRunInput } from '@modules/crm/marketing/runs/marketingRun.service';
import { marketingAgentService } from '@modules/crm/marketing/agents/agent.service';
import { startMarketingAgent } from '@modules/crm/marketing/agents/agent.runner';
import { FIRST_DELAY_MS, TICK_MS, orchestratorPass, startMarketingAgentScheduler } from '../../agent.scheduler';

const m = (fn: unknown) => fn as jest.Mock;
const NOW = new Date('2026-11-03T03:30:00.000Z');

interface RecordedStep {
  key: string;
  label: string;
  status: 'OK' | 'FAILED';
  summary: string;
  error: string;
}

/** A run context that records what the pass does with it, the way the real one would. */
function fakeRun(): { ctx: RunContext; steps: RecordedStep[] } {
  const steps: RecordedStep[] = [];
  const ctx: RunContext = {
    id: 'orch-1',
    async step(key, label, work, options) {
      try {
        const result = await work();
        steps.push({ key, label, status: 'OK', summary: options?.summarize?.(result) ?? '', error: '' });
        return result;
      } catch (error) {
        steps.push({ key, label, status: 'FAILED', summary: '', error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    },
    api: jest.fn(),
    cost: jest.fn(),
    cancelled: jest.fn(async () => false),
  };
  return { ctx, steps };
}

let started: StartRunInput | null;
let recorded: RecordedStep[];

beforeEach(() => {
  started = null;
  recorded = [];
  m(withRun).mockImplementation(async (input: StartRunInput, body: (ctx: RunContext) => Promise<unknown>) => {
    started = input;
    const run = fakeRun();
    const result = await body(run.ctx);
    recorded = run.steps;
    return result;
  });
  m(marketingAgentService.markRan).mockResolvedValue(undefined);
});

describe('orchestratorPass', () => {
  it('leaves no run behind when nothing is due', async () => {
    m(marketingAgentService.dueAgents).mockResolvedValue([]);
    await expect(orchestratorPass(NOW)).resolves.toBeNull();
    expect(marketingAgentService.dueAgents).toHaveBeenCalledWith(NOW);
    expect(withRun).not.toHaveBeenCalled();
    expect(startMarketingAgent).not.toHaveBeenCalled();
  });

  it('runs each due agent as a child of one orchestrator run, books its next time, and records a step each', async () => {
    m(marketingAgentService.dueAgents).mockResolvedValue(['ACCOUNT_DOCTOR', 'COMMUNITY_WATCH']);
    m(startMarketingAgent)
      .mockResolvedValueOnce({ run_id: 'child-1', finished: Promise.resolve({ run_id: 'child-1', status: 'COMPLETED', error: '' }) })
      .mockResolvedValueOnce({ run_id: 'child-2', finished: Promise.resolve({ run_id: 'child-2', status: 'PARTIAL', error: '' }) });

    await expect(orchestratorPass(NOW)).resolves.toBe('orch-1');

    expect(started).toEqual({ workflow: 'ORCHESTRATOR', name: 'Orchestrator: 2 agents due', trigger: 'SCHEDULE', actor: { kind: 'SYSTEM' } });
    expect(startMarketingAgent).toHaveBeenNthCalledWith(1, 'ACCOUNT_DOCTOR', 'SCHEDULE', { kind: 'AGENT', id: 'ACCOUNT_DOCTOR', name: 'Account doctor' }, { parent_run_id: 'orch-1' });
    expect(startMarketingAgent).toHaveBeenNthCalledWith(2, 'COMMUNITY_WATCH', 'SCHEDULE', { kind: 'AGENT', id: 'COMMUNITY_WATCH', name: 'Community watch' }, { parent_run_id: 'orch-1' });
    expect(marketingAgentService.markRan).toHaveBeenNthCalledWith(1, 'ACCOUNT_DOCTOR', 'child-1', NOW);
    expect(marketingAgentService.markRan).toHaveBeenNthCalledWith(2, 'COMMUNITY_WATCH', 'child-2', NOW);
    expect(recorded).toEqual([
      { key: 'ACCOUNT_DOCTOR', label: 'Account doctor', status: 'OK', summary: 'COMPLETED — run child-1', error: '' },
      { key: 'COMMUNITY_WATCH', label: 'Community watch', status: 'OK', summary: 'PARTIAL — run child-2', error: '' },
    ]);
  });

  it('names one agent in the singular, and a child that failed is a failed step that does not stop the others', async () => {
    m(marketingAgentService.dueAgents).mockResolvedValue(['CONTENT_PLANNER', 'ACCOUNT_DOCTOR']);
    m(startMarketingAgent)
      .mockResolvedValueOnce({ run_id: 'child-1', finished: Promise.resolve({ run_id: 'child-1', status: 'FAILED', error: 'The plan was not valid JSON' }) })
      .mockResolvedValueOnce({ run_id: 'child-2', finished: Promise.resolve({ run_id: 'child-2', status: 'FAILED', error: '' }) });

    await orchestratorPass(NOW);

    expect(started?.name).toBe('Orchestrator: 2 agents due');
    expect(recorded).toEqual([
      { key: 'CONTENT_PLANNER', label: 'Content planner', status: 'FAILED', summary: '', error: 'The plan was not valid JSON' },
      { key: 'ACCOUNT_DOCTOR', label: 'Account doctor', status: 'FAILED', summary: '', error: 'Account doctor failed' },
    ]);

    m(marketingAgentService.dueAgents).mockResolvedValue(['ACCOUNT_DOCTOR']);
    m(startMarketingAgent).mockResolvedValueOnce({ run_id: 'child-3', finished: Promise.resolve({ run_id: 'child-3', status: 'COMPLETED', error: '' }) });
    await orchestratorPass(NOW);
    expect(started?.name).toBe('Orchestrator: 1 agent due');
  });

  it('records a step as failed when the child could not even be started', async () => {
    m(marketingAgentService.dueAgents).mockResolvedValue(['ACCOUNT_DOCTOR']);
    m(startMarketingAgent).mockRejectedValueOnce(new Error('database down'));

    await orchestratorPass(NOW);

    expect(marketingAgentService.markRan).not.toHaveBeenCalled();
    expect(recorded).toEqual([{ key: 'ACCOUNT_DOCTOR', label: 'Account doctor', status: 'FAILED', summary: '', error: 'database down' }]);
  });
});

describe('startMarketingAgentScheduler', () => {
  it('registers one cluster job that ticks every fifteen minutes after the server has settled', () => {
    const stop = startMarketingAgentScheduler();
    expect(startClusterJob).toHaveBeenCalledWith({
      component: 'marketing-agents',
      operation: 'orchestrate',
      firstDelayMs: FIRST_DELAY_MS,
      intervalMs: TICK_MS,
      run: expect.any(Function),
    });
    expect(TICK_MS).toBe(15 * 60_000);
    expect(FIRST_DELAY_MS).toBe(2 * 60_000);
    expect(typeof stop).toBe('function');
  });

  it('runs a pass on each tick', async () => {
    m(marketingAgentService.dueAgents).mockResolvedValue([]);
    startMarketingAgentScheduler();
    const job = m(startClusterJob).mock.calls.at(-1)?.[0] as { run: () => Promise<unknown> };
    await expect(job.run()).resolves.toBeNull();
    expect(marketingAgentService.dueAgents).toHaveBeenCalledWith(expect.any(Date));
  });
});
