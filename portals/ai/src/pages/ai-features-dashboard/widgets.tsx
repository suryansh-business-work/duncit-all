import type { DashboardPosition, DashboardWidget } from '@duncit/dashboard';
import type { useTranslation } from '@duncit/shell';
import TrendChart from '../../components/charts/TrendChart';
import { millis, percent, trendSummary } from '../../components/charts/summaries';
import { rankWidget } from '../../components/charts/rankWidget';
import { tokens, usd } from '../../lib/usd';
import { kpiWidgets } from './kpis';
import OffFeatures from './OffFeatures';
import { callSeries, failureRate, rankFeatures } from './rankings';
import type { FeaturesDashboard } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

/**
 * Every widget of the AI Features dashboard: the headline tiles, the daily
 * trends, where the money and the time go, what fails, and what is off. Each
 * chart has one unit on one axis; cost, calls and time are separate charts.
 */
export function buildFeatureWidgets(
  d: FeaturesDashboard,
  t: Translate,
  formatDay: (day: string) => string
): DashboardWidget[] {
  const ms = millis(t);
  const pct = percent(t);
  const days = d.series.map((day) => day.date);
  const noCalls = t('ai.featuresDashboard.noCalls');
  const titles = {
    calls: t('ai.featuresDashboard.dailyCalls'),
    cost: t('ai.featuresDashboard.dailyCost'),
    latency: t('ai.featuresDashboard.dailyLatency'),
  };
  const byArea = d.by_area.filter((area) => area.cost_usd > 0);
  const trend = (id: string, title: string, layout: DashboardPosition, chart: DashboardWidget['content']) => ({
    id,
    title,
    defaultLayout: layout,
    minW: 4,
    minH: 4,
    content: chart,
  });

  return [
    ...kpiWidgets(d, t),
    trend(
      'daily-calls',
      titles.calls,
      { x: 0, y: 2, w: 12, h: 6 },
      <TrendChart
        type="bar"
        days={days}
        series={callSeries(d.series, {
          answered: t('ai.featuresDashboard.seriesAnswered'),
          failed: t('ai.featuresDashboard.seriesFailed'),
          skipped: t('ai.featuresDashboard.seriesSkipped'),
        })}
        format={tokens}
        summary={trendSummary(t, titles.calls, days, tokens(d.calls), formatDay)}
      />
    ),
    trend(
      'daily-cost',
      titles.cost,
      { x: 0, y: 8, w: 6, h: 6 },
      <TrendChart
        type="line"
        days={days}
        series={[{ label: t('ai.featuresDashboard.seriesCost'), data: d.series.map((day) => day.cost_usd) }]}
        format={usd}
        summary={trendSummary(t, titles.cost, days, usd(d.cost_usd), formatDay)}
      />
    ),
    trend(
      'daily-latency',
      titles.latency,
      { x: 6, y: 8, w: 6, h: 6 },
      <TrendChart
        type="line"
        days={days}
        series={[{ label: t('ai.featuresDashboard.seriesLatency'), data: d.series.map((day) => day.avg_duration_ms) }]}
        format={ms}
        summary={trendSummary(t, titles.latency, days, ms(d.avg_duration_ms), formatDay)}
      />
    ),
    rankWidget(t, {
      id: 'cost-by-area',
      title: t('ai.featuresDashboard.costByArea'),
      ranking: { labels: byArea.map((area) => area.module), values: byArea.map((area) => area.cost_usd) },
      seriesLabel: t('ai.featuresDashboard.seriesCost'),
      format: usd,
      emptyText: noCalls,
      layout: { x: 0, y: 14, w: 4, h: 6 },
    }),
    rankWidget(t, {
      id: 'top-cost',
      title: t('ai.featuresDashboard.topCost'),
      ranking: rankFeatures(d.features, (f) => f.cost_usd),
      seriesLabel: t('ai.featuresDashboard.seriesCost'),
      format: usd,
      emptyText: noCalls,
      layout: { x: 4, y: 14, w: 4, h: 6 },
    }),
    rankWidget(t, {
      id: 'top-calls',
      title: t('ai.featuresDashboard.topCalls'),
      ranking: rankFeatures(d.features, (f) => f.calls),
      seriesLabel: t('ai.features.colCalls'),
      format: tokens,
      emptyText: noCalls,
      layout: { x: 8, y: 14, w: 4, h: 6 },
    }),
    rankWidget(t, {
      id: 'slowest',
      title: t('ai.featuresDashboard.slowest'),
      ranking: rankFeatures(d.features, (f) => f.avg_duration_ms),
      seriesLabel: t('ai.featuresDashboard.seriesLatency'),
      format: ms,
      emptyText: noCalls,
      layout: { x: 0, y: 20, w: 6, h: 6 },
    }),
    rankWidget(t, {
      id: 'failing',
      title: t('ai.featuresDashboard.failing'),
      ranking: rankFeatures(d.features, failureRate),
      seriesLabel: t('ai.featuresDashboard.seriesFailed'),
      format: pct,
      emptyText: t('ai.featuresDashboard.noFailures'),
      layout: { x: 6, y: 20, w: 6, h: 6 },
    }),
    {
      id: 'switched-off',
      title: t('ai.featuresDashboard.switchedOff'),
      fitContent: true,
      defaultLayout: { x: 0, y: 26, w: 12, h: 3 },
      minW: 3,
      minH: 2,
      content: <OffFeatures features={d.features} rangeDays={d.range_days} />,
    },
  ];
}
