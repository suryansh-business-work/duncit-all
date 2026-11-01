import { MarketingRunModel, RUN_DECISIONS, RUN_STATUSES, RUN_WORKFLOWS } from '../runs/marketingRun.model';
import { countsIn, dayOf, inWindow, median, percent, round2, seriesOf, type AnalyticsWindow } from './marketingAnalytics.window';

/**
 * Marketing › Analytics › Automation: every run started in the window — by
 * workflow, by outcome, by day — what its AI steps cost, and how long people
 * took to decide the runs that waited on them.
 *
 * Cost is in US dollars, the AI portal's rate card unit; every run carries its
 * own already-priced `cost.amount`, so a total is a sum, never a re-pricing.
 */
const MINUTE_MS = 60_000;

const isStatus = (status: string) => ({ $sum: { $cond: [{ $eq: ['$status', status] }, 1, 0] } });

const runFiguresGroup = {
  runs: { $sum: 1 },
  completed: isStatus('COMPLETED'),
  partial: isStatus('PARTIAL'),
  failed: isStatus('FAILED'),
  tokens_in: { $sum: { $ifNull: ['$cost.tokens_in', 0] } },
  tokens_out: { $sum: { $ifNull: ['$cost.tokens_out', 0] } },
  cost: { $sum: { $ifNull: ['$cost.amount', 0] } },
};

interface RunFigures {
  runs: number;
  completed: number;
  partial: number;
  failed: number;
  tokens_in: number;
  tokens_out: number;
  cost: number;
}

/**
 * Completed runs as a share of the runs that finished — completed, partly
 * completed or failed. Runs still going and runs a person cancelled have no
 * outcome to count either way.
 */
export const successRate = (row: Pick<RunFigures, 'completed' | 'partial' | 'failed'>) =>
  percent(row.completed, row.completed + row.partial + row.failed);

const shaped = (row: RunFigures) => ({
  runs: row.runs,
  completed: row.completed,
  partial: row.partial,
  failed: row.failed,
  success_rate: successRate(row),
  tokens: row.tokens_in + row.tokens_out,
  cost: round2(row.cost),
});

const EMPTY: RunFigures = { runs: 0, completed: 0, partial: 0, failed: 0, tokens_in: 0, tokens_out: 0, cost: 0 };

const started = (window: AnalyticsWindow) => ({ created_at: inWindow(window) });

/** Runs per workflow, in the workflow list's order, with every workflow present. */
async function byWorkflow(window: AnalyticsWindow) {
  const rows = await MarketingRunModel.aggregate<RunFigures & { _id: string }>([
    { $match: started(window) },
    { $group: { _id: '$workflow', ...runFiguresGroup } },
  ]);
  const found = new Map(rows.map((row) => [row._id, row]));
  return RUN_WORKFLOWS.map((workflow) => ({ workflow, ...shaped(found.get(workflow) ?? EMPTY) }));
}

/** Runs, cost and tokens per day of the window. */
async function daily(window: AnalyticsWindow) {
  const rows = await MarketingRunModel.aggregate<{ _id: string; runs: number; cost: number; tokens: number }>([
    { $match: started(window) },
    {
      $group: {
        _id: dayOf(window, '$created_at'),
        runs: { $sum: 1 },
        cost: { $sum: { $ifNull: ['$cost.amount', 0] } },
        tokens: { $sum: { $add: [{ $ifNull: ['$cost.tokens_in', 0] }, { $ifNull: ['$cost.tokens_out', 0] }] } },
      },
    },
  ]);
  const pick = (field: 'runs' | 'cost' | 'tokens') => seriesOf(window, rows.map((row) => ({ _id: row._id, value: row[field] })));
  return { runs: pick('runs'), cost: pick('cost').map(round2), tokens: pick('tokens') };
}

/**
 * What waits on a person now, and what people decided in the window — with
 * the median time from the run asking to the person answering, in minutes.
 */
async function approvals(window: AnalyticsWindow) {
  const [waiting, decided] = await Promise.all([
    MarketingRunModel.countDocuments({ status: 'AWAITING_APPROVAL' }),
    MarketingRunModel.aggregate<{ _id: string; count: number; ms: (number | null)[] }>([
      { $match: { 'approval.decided_at': inWindow(window) } },
      {
        $group: {
          _id: '$approval.decision',
          count: { $sum: 1 },
          // A run decided with no recorded ask has no wait to measure.
          ms: { $push: { $cond: [{ $ifNull: ['$approval.requested_at', false] }, { $subtract: ['$approval.decided_at', '$approval.requested_at'] }, null] } },
        },
      },
    ]),
  ]);
  const waits = decided.flatMap((row) => row.ms).filter((ms): ms is number => typeof ms === 'number');
  return {
    waiting,
    decided: decided.reduce((sum, row) => sum + row.count, 0),
    by_decision: countsIn(RUN_DECISIONS, decided),
    median_decision_minutes: Math.round((median(waits) / MINUTE_MS) * 10) / 10,
  };
}

/** The agents' own runs, one row per agent that ran. */
async function agentRuns(window: AnalyticsWindow) {
  const rows = await MarketingRunModel.aggregate<RunFigures & { _id: string }>([
    { $match: { ...started(window), workflow: 'AGENT' } },
    { $group: { _id: '$links.agent_key', ...runFiguresGroup } },
    { $sort: { runs: -1, _id: 1 } },
  ]);
  return rows.map((row) => ({ agent_key: row._id ?? '', ...shaped(row) }));
}

/** The window's runs in one row — what the Overview leads with. */
export async function runTotals(window: AnalyticsWindow) {
  const [row] = await MarketingRunModel.aggregate<RunFigures>([{ $match: started(window) }, { $group: { _id: null, ...runFiguresGroup } }]);
  return shaped(row ?? EMPTY);
}

export async function automationAnalytics(window: AnalyticsWindow) {
  const [totals, workflows, statuses, perDay, decisions, agents] = await Promise.all([
    runTotals(window),
    byWorkflow(window),
    MarketingRunModel.aggregate<{ _id: string; count: number }>([{ $match: started(window) }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    daily(window),
    approvals(window),
    agentRuns(window),
  ]);
  return {
    window: { from: window.from, to: window.to, days: window.days },
    ...totals,
    by_workflow: workflows,
    by_status: countsIn(RUN_STATUSES, statuses),
    daily: perDay,
    approvals: decisions,
    agents,
  };
}
