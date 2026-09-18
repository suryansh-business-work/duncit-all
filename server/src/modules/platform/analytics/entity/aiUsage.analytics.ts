import { MONITORING_ACTIONS, MONITORING_RESULTS } from '@modules/ai/aiMonitoring/aiMonitoring.model';
import type { AnalyticsWindow } from './window';
import { consoleLink } from './links';
import {
  breakdown,
  countMap,
  fixedSlices,
  kpi,
  linkEverything,
  mean,
  pct,
  round1,
  topSlices,
  trend,
  type AnalyticsBreakdown,
  type AnalyticsLeaderboard,
  type AnalyticsSlice,
  type EntityAnalyticsSections,
} from './shapes';
import { splitPeriod, type Tally } from './aggregates';
import {
  loadScanDays,
  loadScanMix,
  loadUsageDays,
  loadUsageMix,
  type ScanDayRow,
  type SpendRow,
  type TaskRow,
  type UsageDayRow,
} from './aiUsage.data';

/**
 * Analytics > AI usage — every OpenAI request the platform made in the period
 * (what it cost, how many tokens, how many failed and how long answers took),
 * the AI Monitoring checks on uploaded images and what they flagged, and how
 * much Ask Bot and the Agent console were used. Spend is in US cents.
 */

const OPENAI = consoleLink('ai', '/openai');
const OPENAI_LOGS = consoleLink('ai', '/openai/logs');
const MONITORING = consoleLink('ai', '/monitoring');

const CALL_STATUSES = ['SUCCESS', 'FAILED', 'SKIPPED'] as const;
const TASK_COLUMNS = [
  { key: 'ai_task_requests', format: 'COUNT' },
  { key: 'ai_task_tokens', format: 'COUNT' },
  { key: 'ai_task_cost', format: 'DECIMAL' },
  { key: 'ai_task_failure_rate', format: 'PERCENT' },
  { key: 'ai_task_latency', format: 'DURATION' },
] as const;

/** Slices named by the data, with "not recorded" left for the console to word. */
function namedSlices(rows: readonly Tally[]): AnalyticsSlice[] {
  const names = new Map(rows.filter((row) => row._id !== 'none').map((row) => [row._id, row._id]));
  return topSlices(countMap(rows), names);
}

const spendSlices = (rows: readonly SpendRow[]) =>
  namedSlices(rows.map((row) => ({ _id: row._id, count: round1(row.cents) })));

function usageBreakdowns(
  usage: Awaited<ReturnType<typeof loadUsageMix>>,
  scans: Awaited<ReturnType<typeof loadScanMix>>
): AnalyticsBreakdown[] {
  const cents = { format: 'DECIMAL', link: OPENAI } as const;
  const checks = { link: MONITORING, ordered: true };
  const calls = { link: OPENAI_LOGS, ordered: true };
  return [
    breakdown('ai_cost_by_module', spendSlices(usage.module), cents),
    breakdown('ai_cost_by_model', spendSlices(usage.model), cents),
    breakdown('ai_request_status', fixedSlices(CALL_STATUSES, countMap(usage.status)), calls),
    breakdown('ai_scan_risk', fixedSlices(MONITORING_RESULTS, countMap(scans.risk)), checks),
    breakdown('ai_scan_action', fixedSlices(MONITORING_ACTIONS, countMap(scans.action)), checks),
    breakdown('ai_scans_by_surface', namedSlices(scans.surface), { link: MONITORING }),
  ];
}

/** The tasks that cost the most in the period, with how reliable and how quick each was. */
function taskLeaderboard(tasks: readonly TaskRow[]): AnalyticsLeaderboard {
  return {
    key: 'ai_tasks',
    columns: [...TASK_COLUMNS],
    rows: tasks.map((task) => ({
      id: task._id,
      name: task.label,
      caption: task.module,
      values: [
        task.requests,
        task.tokens,
        round1(task.cents),
        pct(task.failed, task.requests),
        mean(task.answer_ms, task.requests - task.failed),
      ],
    })),
    link: OPENAI_LOGS,
  };
}

export async function aiUsageAnalytics(window: AnalyticsWindow): Promise<EntityAnalyticsSections> {
  const [usageDays, scanDays, usageMix, scanMix] = await Promise.all([
    loadUsageDays(window),
    loadScanDays(window),
    loadUsageMix(window.from, window.to),
    loadScanMix(window.from, window.to),
  ]);
  const usage = (valueOf: (row: UsageDayRow) => number) => splitPeriod(usageDays, window, valueOf);
  const scan = (valueOf: (row: ScanDayRow) => number) => splitPeriod(scanDays, window, valueOf);
  const requests = usage((row) => row.requests);
  const failed = usage((row) => row.failed);
  const input = usage((row) => row.input_tokens);
  const output = usage((row) => row.output_tokens);
  const cents = usage((row) => row.cents);
  const answerMs = usage((row) => row.answer_ms);
  const askBot = usage((row) => row.ask_bot);
  const agent = usage((row) => row.agent);
  const scanned = scan((row) => row.scanned);
  const flagged = scan((row) => row.flagged);
  const worse = { higherIsBetter: false };

  const sections: EntityAnalyticsSections = {
    kpis: [
      kpi('ai_requests', requests.now, requests.before, { link: OPENAI }),
      kpi('ai_input_tokens', input.now, input.before, { link: OPENAI }),
      kpi('ai_output_tokens', output.now, output.before, { link: OPENAI }),
      kpi('ai_cost', round1(cents.now), round1(cents.before), { ...worse, format: 'DECIMAL', link: OPENAI }),
      kpi('ai_failed', failed.now, failed.before, { ...worse, link: OPENAI_LOGS }),
      kpi('ai_failure_rate', pct(failed.now, requests.now), pct(failed.before, requests.before), {
        ...worse,
        format: 'PERCENT',
        link: OPENAI_LOGS,
      }),
      kpi(
        'ai_latency',
        mean(answerMs.now, requests.now - failed.now),
        mean(answerMs.before, requests.before - failed.before),
        { ...worse, format: 'DURATION', link: OPENAI }
      ),
      kpi('ai_images_scanned', scanned.now, scanned.before, { link: MONITORING }),
      kpi('ai_images_flagged', flagged.now, flagged.before, { ...worse, link: MONITORING }),
      kpi('ai_ask_bot_answers', askBot.now, askBot.before, { link: OPENAI_LOGS }),
      kpi('ai_agent_turns', agent.now, agent.before, { link: OPENAI_LOGS }),
    ],
    trends: [
      trend(
        'ai_requests',
        window,
        [
          { key: 'ai_answered', values: requests.series.map((value, index) => value - failed.series[index]) },
          { key: 'ai_failed', values: failed.series },
        ],
        'COUNT',
        OPENAI_LOGS
      ),
      trend(
        'ai_tokens',
        window,
        [
          { key: 'ai_input_tokens', values: input.series },
          { key: 'ai_output_tokens', values: output.series },
        ],
        'COUNT',
        OPENAI
      ),
      trend('ai_cost', window, [{ key: 'ai_cost', values: cents.series.map(round1) }], 'DECIMAL', OPENAI),
    ],
    breakdowns: usageBreakdowns(usageMix, scanMix),
    leaderboard: taskLeaderboard(usageMix.tasks),
  };
  return linkEverything(sections, OPENAI);
}
