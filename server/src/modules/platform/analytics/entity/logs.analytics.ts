import { consoleLink, type ConsoleLink } from './links';
import type { PeriodTotals } from './aggregates';
import type { AnalyticsWindow } from './window';
import {
  breakdown,
  fixedSlices,
  kpi,
  linkEverything,
  pct,
  total,
  trend,
  type AnalyticsBreakdown,
  type AnalyticsKpi,
  type AnalyticsSeries,
  type AnalyticsTrend,
  type EntityAnalyticsSections,
} from './shapes';
import { LOG_SOURCES, loadLogFigures, type LogFigures, type LogSource, type LogSourceKey } from './logs.data';

/**
 * Logs — how much every log Duncit keeps grew in the period, how much of it
 * went wrong, and what each log's rows say. Every widget opens that log's own
 * page on the Logs console, which is also where this dashboard is home.
 */

const PAGE = consoleLink('logs', '/');

const linkOf = (source: LogSource): ConsoleLink => consoleLink('logs', source.path);

/** Series added bucket by bucket — every log shares the window's buckets. */
const addSeries = (all: ReadonlyArray<readonly number[]>): number[] =>
  all.reduce<number[]>((sum, values) => sum.map((value, index) => value + values[index]), all[0].map(() => 0));

/** Both periods summed over several logs. */
function sumTotals(parts: readonly PeriodTotals[]): PeriodTotals {
  return {
    series: addSeries(parts.map((part) => part.series)),
    now: total(parts.map((part) => part.now)),
    before: total(parts.map((part) => part.before)),
  };
}

/** The logs that can go wrong — the only ones a problem rate is fair to. */
const watched = (figures: readonly LogFigures[]) => figures.filter((item) => item.source.problems);

type FiguresByKey = Readonly<Record<LogSourceKey, LogFigures>>;

function logKpis(figures: readonly LogFigures[]): AnalyticsKpi[] {
  const entries = sumTotals(figures.map((item) => item.entries));
  const problems = sumTotals(figures.map((item) => item.problems));
  const attempted = sumTotals(watched(figures).map((item) => item.entries));
  const worse = { higherIsBetter: false };
  return [
    kpi('log_entries', entries.now, entries.before),
    kpi('log_problems', problems.now, problems.before, worse),
    kpi('log_problem_rate', pct(problems.now, attempted.now), pct(problems.before, attempted.before), {
      ...worse,
      format: 'PERCENT',
    }),
    ...figures.map((item) =>
      kpi(`log_${item.source.key}`, item.entries.now, item.entries.before, {
        higherIsBetter: item.source.higherIsBetter,
        link: linkOf(item.source),
      })
    ),
  ];
}

/** A log's rows, or the ones that went wrong, as a trend line keyed like its tile. */
const entriesOf = (byKey: FiguresByKey, key: LogSourceKey): AnalyticsSeries => ({
  key: `log_${key}`,
  values: byKey[key].entries.series,
});

const problemsOf = (byKey: FiguresByKey, key: LogSourceKey, seriesKey: string): AnalyticsSeries => ({
  key: seriesKey,
  values: byKey[key].problems.series,
});

/** One trend per group of logs the sidebar groups, never more than three lines on one chart. */
function logTrends(figures: readonly LogFigures[], window: AnalyticsWindow): AnalyticsTrend[] {
  // Every log loads, so every key is present.
  const byKey = Object.fromEntries(figures.map((item) => [item.source.key, item])) as FiguresByKey;
  const link = (key: LogSourceKey) => linkOf(byKey[key].source);
  const sends = sumTotals([byKey.email.problems, byKey.whatsapp.problems]);
  const volume = [
    { key: 'log_entries', values: sumTotals(figures.map((item) => item.entries)).series },
    { key: 'log_problems', values: sumTotals(figures.map((item) => item.problems)).series },
  ];
  return [
    trend('log_volume', window, volume),
    trend(
      'log_tech',
      window,
      [entriesOf(byKey, 'telemetry'), problemsOf(byKey, 'telemetry', 'log_telemetry_errors'), entriesOf(byKey, 'rate_limit')],
      'COUNT',
      link('telemetry')
    ),
    trend(
      'log_ai',
      window,
      [entriesOf(byKey, 'openai'), problemsOf(byKey, 'openai', 'log_openai_failed'), entriesOf(byKey, 'ai_monitoring')],
      'COUNT',
      link('openai')
    ),
    trend(
      'log_comms',
      window,
      [entriesOf(byKey, 'email'), entriesOf(byKey, 'whatsapp'), { key: 'log_sends_failed', values: sends.series }],
      'COUNT',
      link('email')
    ),
    trend(
      'log_money',
      window,
      [entriesOf(byKey, 'payment'), problemsOf(byKey, 'payment', 'log_payment_failed'), entriesOf(byKey, 'refund')],
      'COUNT',
      link('payment')
    ),
    trend('log_ledgers', window, [entriesOf(byKey, 'coin'), entriesOf(byKey, 'gift_card')], 'COUNT', link('coin')),
    trend(
      'log_trust',
      window,
      [entriesOf(byKey, 'policy'), entriesOf(byKey, 'pod_audit'), problemsOf(byKey, 'pod_audit', 'log_pod_high_risk')],
      'COUNT',
      link('pod_audit')
    ),
  ];
}

function logBreakdowns(figures: readonly LogFigures[]): AnalyticsBreakdown[] {
  const bySource = new Map(figures.map((item) => [item.source.key, item.entries.now]));
  const problemsBySource = new Map(watched(figures).map((item) => [item.source.key, item.problems.now]));
  return [
    breakdown(
      'log_by_source',
      fixedSlices(
        LOG_SOURCES.map((source) => source.key),
        bySource
      )
    ),
    breakdown('log_problems_by_source', fixedSlices([...problemsBySource.keys()], problemsBySource)),
    ...figures.map((item) =>
      breakdown(`log_${item.source.key}_status`, fixedSlices(item.source.statuses, item.statuses), {
        ordered: true,
        link: linkOf(item.source),
      })
    ),
  ];
}

export async function logsAnalytics(window: AnalyticsWindow): Promise<EntityAnalyticsSections> {
  const figures = await loadLogFigures(window);
  return linkEverything(
    {
      kpis: logKpis(figures),
      trends: logTrends(figures, window),
      breakdowns: logBreakdowns(figures),
      leaderboard: null,
    },
    PAGE
  );
}
