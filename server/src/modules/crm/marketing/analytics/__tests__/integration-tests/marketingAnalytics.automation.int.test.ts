import { marketingAnalyticsService } from '../../marketingAnalytics.service';
import { MarketingRunModel, RUN_WORKFLOWS } from '../../../runs/marketingRun.model';

const WEEK = { from: '2026-10-01', to: '2026-10-07' };
const at = (iso: string) => new Date(iso);

/** A run written straight to the collection, so its creation time is the one the test says. */
const run = (over: Record<string, unknown>) =>
  MarketingRunModel.collection.insertOne({
    workflow: 'SOCIAL_PUBLISH',
    name: 'Run',
    status: 'COMPLETED',
    links: { agent_key: '' },
    approval: { required: false, requested_at: null, decision: null, decided_at: null },
    cost: { tokens_in: 0, tokens_out: 0, amount: 0, currency: 'USD' },
    created_at: at('2026-10-02T06:00:00.000Z'),
    ...over,
  });

const priced = (tokens_in: number, tokens_out: number, amount: number) => ({ cost: { tokens_in, tokens_out, amount, currency: 'USD' } });

describe('marketingAnalyticsService.automation', () => {
  it('reads an empty window as zeros, every workflow and status present', async () => {
    const automation = await marketingAnalyticsService.automation(WEEK);
    expect(automation).toMatchObject({ runs: 0, completed: 0, partial: 0, failed: 0, success_rate: 0, tokens: 0, cost: 0, agents: [] });
    expect(automation.by_workflow.map((row) => row.workflow)).toEqual([...RUN_WORKFLOWS]);
    expect(automation.by_workflow.every((row) => row.runs === 0 && row.success_rate === 0)).toBe(true);
    expect(automation.by_status.map((row) => row.key)).toEqual(['PENDING', 'RUNNING', 'AWAITING_APPROVAL', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED']);
    expect(automation.daily).toEqual({ runs: [0, 0, 0, 0, 0, 0, 0], cost: [0, 0, 0, 0, 0, 0, 0], tokens: [0, 0, 0, 0, 0, 0, 0] });
    expect(automation.approvals).toEqual({
      waiting: 0,
      decided: 0,
      by_decision: [
        { key: 'APPROVED', count: 0 },
        { key: 'REJECTED', count: 0 },
        { key: 'CHANGES_REQUESTED', count: 0 },
      ],
      median_decision_minutes: 0,
    });
  });

  it('sums runs, tokens and dollars per workflow, with success over finished runs only', async () => {
    await run({ workflow: 'REEL', status: 'COMPLETED', ...priced(1000, 500, 0.125) });
    await run({ workflow: 'REEL', status: 'FAILED', ...priced(200, 0, 0.01) });
    await run({ workflow: 'REEL', status: 'PARTIAL' });
    // Still going, or cancelled by a person: counted as runs, not as outcomes.
    await run({ workflow: 'REEL', status: 'RUNNING' });
    await run({ workflow: 'REEL', status: 'CANCELLED' });
    await run({ workflow: 'LEAD_SEARCH', status: 'COMPLETED', ...priced(10, 10, 0.004) });
    // Before the window.
    await run({ workflow: 'REEL', status: 'COMPLETED', created_at: at('2026-09-30T18:29:00.000Z'), ...priced(9, 9, 9) });

    const automation = await marketingAnalyticsService.automation(WEEK);
    const reel = automation.by_workflow.find((row) => row.workflow === 'REEL');
    expect(reel).toEqual({ workflow: 'REEL', runs: 5, completed: 1, partial: 1, failed: 1, success_rate: 33.3, tokens: 1700, cost: 0.14 });
    expect(automation).toMatchObject({ runs: 6, completed: 2, partial: 1, failed: 1, success_rate: 50, tokens: 1720, cost: 0.14 });
    const statuses = Object.fromEntries(automation.by_status.map((row) => [row.key, row.count]));
    expect(statuses).toMatchObject({ COMPLETED: 2, FAILED: 1, PARTIAL: 1, RUNNING: 1, CANCELLED: 1, PENDING: 0 });
  });

  it('lays runs, cost and tokens on the admin-zone days', async () => {
    // 1 Oct 00:10 IST and 7 Oct 23:50 IST — the window's first and last days.
    await run({ created_at: at('2026-09-30T18:40:00.000Z'), ...priced(5, 5, 0.333) });
    await run({ created_at: at('2026-10-07T18:20:00.000Z'), ...priced(1, 1, 0.5) });
    await run({ created_at: at('2026-10-07T18:25:00.000Z'), ...priced(1, 1, 0.25) });

    const { daily } = await marketingAnalyticsService.automation(WEEK);
    expect(daily.runs).toEqual([1, 0, 0, 0, 0, 0, 2]);
    expect(daily.cost).toEqual([0.33, 0, 0, 0, 0, 0, 0.75]);
    expect(daily.tokens).toEqual([10, 0, 0, 0, 0, 0, 4]);
  });

  it('counts what waits now and what was decided in the window, with the median wait', async () => {
    await run({ status: 'AWAITING_APPROVAL', approval: { required: true, requested_at: at('2026-09-01T00:00:00.000Z'), decision: null, decided_at: null } });
    const decided = (decision: string, asked: string, answered: string | null, requested: string | null = asked) =>
      run({ status: 'COMPLETED', approval: { required: true, requested_at: requested ? at(requested) : null, decision, decided_at: answered ? at(answered) : null } });
    await decided('APPROVED', '2026-10-02T10:00:00.000Z', '2026-10-02T10:10:00.000Z');
    await decided('APPROVED', '2026-10-02T10:00:00.000Z', '2026-10-02T10:30:00.000Z');
    await decided('REJECTED', '2026-10-03T10:00:00.000Z', '2026-10-03T12:00:00.000Z');
    // Decided with no recorded ask: counted, but no wait to measure.
    await decided('CHANGES_REQUESTED', '', '2026-10-04T10:00:00.000Z', null);
    // Decided before the window.
    await decided('APPROVED', '2026-09-10T10:00:00.000Z', '2026-09-10T11:00:00.000Z');

    const { approvals } = await marketingAnalyticsService.automation(WEEK);
    expect(approvals).toEqual({
      waiting: 1,
      decided: 4,
      by_decision: [
        { key: 'APPROVED', count: 2 },
        { key: 'REJECTED', count: 1 },
        { key: 'CHANGES_REQUESTED', count: 1 },
      ],
      // Waits of 10, 30 and 120 minutes.
      median_decision_minutes: 30,
    });
  });

  it('reads the agents’ own runs, one row per agent, busiest first', async () => {
    await run({ workflow: 'AGENT', links: { agent_key: 'CONTENT_PLANNER' }, ...priced(100, 50, 0.02) });
    await run({ workflow: 'AGENT', links: { agent_key: 'CONTENT_PLANNER' }, status: 'FAILED' });
    await run({ workflow: 'AGENT', links: { agent_key: 'ACCOUNT_DOCTOR' } });
    await run({ workflow: 'ORCHESTRATOR' });

    const { agents } = await marketingAnalyticsService.automation(WEEK);
    expect(agents).toEqual([
      { agent_key: 'CONTENT_PLANNER', runs: 2, completed: 1, partial: 0, failed: 1, success_rate: 50, tokens: 150, cost: 0.02 },
      { agent_key: 'ACCOUNT_DOCTOR', runs: 1, completed: 1, partial: 0, failed: 0, success_rate: 100, tokens: 0, cost: 0 },
    ]);
  });
});
