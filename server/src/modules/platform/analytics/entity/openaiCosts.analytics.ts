import type { AnalyticsWindow } from './window';
import { consoleLink } from './links';
import { splitPeriod } from './aggregates';
import { namedSlices } from './aiUsage.analytics';
import {
  breakdown,
  kpi,
  linkEverything,
  pct,
  trend,
  type AnalyticsLeaderboard,
  type AnalyticsSlice,
  type EntityAnalyticsSections,
} from './shapes';
import { loadUsageDays, loadUsageMix, type SpendRow, type TaskRow, type UsageDayRow } from './aiUsage.data';

/**
 * Analytics > Costing > OpenAI — what the platform's OpenAI requests cost, in
 * US dollars, which is what OpenAI bills in (the platform keeps no exchange
 * rate). Each request's cost was frozen from the rate card when it was made,
 * so editing a rate never re-prices a past month. The call log keeps 180 days,
 * so a longer period reads only what is still kept.
 */

const OPENAI = consoleLink('ai', '/openai');
const OPENAI_LOGS = consoleLink('ai', '/openai/logs');

const TASK_COLUMNS = [
  { key: 'cost_requests', format: 'COUNT' },
  { key: 'cost_tokens', format: 'COUNT' },
  { key: 'cost_spend', format: 'USD' },
  { key: 'cost_share', format: 'PERCENT' },
] as const;

/** US cents as dollars, to a hundredth of a cent — a quiet day costs well under a dollar. */
const dollars = (cents: number) => Math.round(cents * 100) / 10_000;

/** Dollars per `unit` of `count` (per day, per thousand requests, per million tokens); 0 for none. */
const per = (amount: number, count: number, unit: number) =>
  count > 0 ? Math.round((amount / count) * unit * 10_000) / 10_000 : 0;

const spendSlices = (rows: readonly SpendRow[]): AnalyticsSlice[] =>
  namedSlices(rows.map((row) => ({ _id: row._id, count: dollars(row.cents) })));

/** The tasks that cost the most in the period, and their share of the whole bill. */
function taskLeaderboard(tasks: readonly TaskRow[], totalCents: number): AnalyticsLeaderboard {
  return {
    key: 'oai_cost_tasks',
    columns: [...TASK_COLUMNS],
    rows: tasks.map((task) => ({
      id: task._id,
      name: task.label,
      caption: task.module,
      values: [task.requests, task.tokens, dollars(task.cents), pct(task.cents, totalCents)],
    })),
    link: OPENAI_LOGS,
  };
}

export async function openaiCostAnalytics(window: AnalyticsWindow): Promise<EntityAnalyticsSections> {
  const [days, mix] = await Promise.all([loadUsageDays(window), loadUsageMix(window.from, window.to)]);
  const usage = (valueOf: (row: UsageDayRow) => number) => splitPeriod(days, window, valueOf);
  const cents = usage((row) => row.cents);
  const requests = usage((row) => row.requests);
  const input = usage((row) => row.input_tokens);
  const output = usage((row) => row.output_tokens);
  const unpriced = usage((row) => row.unpriced);
  const spend = { now: dollars(cents.now), before: dollars(cents.before) };
  const tokens = { now: input.now + output.now, before: input.before + output.before };
  const usd = { format: 'USD', higherIsBetter: false } as const;

  const sections: EntityAnalyticsSections = {
    kpis: [
      kpi('oai_cost_spend', spend.now, spend.before, usd),
      kpi('oai_cost_per_day', per(spend.now, window.days, 1), per(spend.before, window.days, 1), usd),
      kpi('oai_cost_requests', requests.now, requests.before, { link: OPENAI_LOGS }),
      kpi(
        'oai_cost_per_1k_requests',
        per(spend.now, requests.now, 1000),
        per(spend.before, requests.before, 1000),
        usd
      ),
      kpi('oai_cost_tokens', tokens.now, tokens.before),
      kpi(
        'oai_cost_per_1m_tokens',
        per(spend.now, tokens.now, 1_000_000),
        per(spend.before, tokens.before, 1_000_000),
        usd
      ),
      kpi('oai_cost_unpriced', unpriced.now, unpriced.before, { higherIsBetter: false }),
    ],
    trends: [
      trend('oai_cost_spend', window, [{ key: 'oai_cost_spend', values: cents.series.map(dollars) }], 'USD'),
      trend('oai_cost_tokens', window, [
        { key: 'ai_input_tokens', values: input.series },
        { key: 'ai_output_tokens', values: output.series },
      ]),
    ],
    breakdowns: [
      breakdown('oai_cost_by_model', spendSlices(mix.model), { format: 'USD' }),
      breakdown('oai_cost_by_module', spendSlices(mix.module), { format: 'USD' }),
    ],
    leaderboard: taskLeaderboard(mix.tasks, cents.now),
  };
  return linkEverything(sections, OPENAI);
}
