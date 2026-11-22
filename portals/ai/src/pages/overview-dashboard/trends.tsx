import type { DashboardPosition, DashboardWidget } from '@duncit/dashboard';
import type { useTranslation } from '@duncit/shell';
import TrendChart from '../../components/charts/TrendChart';
import { millis, trendSummary } from '../../components/charts/summaries';
import { tokens, usd } from '../../lib/usd';
import { callSeries } from '../ai-features-dashboard/rankings';
import DetailsLink from './DetailsLink';
import type { OverviewDashboard, OverviewDay } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

interface LineSpec {
  id: string;
  title: string;
  seriesLabel: string;
  pick: (day: OverviewDay) => number;
  format: (value: number) => string;
  /** The range's figure the screen-reader summary closes on. */
  total: string;
  layout: DashboardPosition;
}

/**
 * The per-day trends over the range: calls (answered, failed and skipped
 * stacked, as parts of each day's total), then cost, tokens, response time and
 * active people, each a line with its own unit on its own axis.
 */
export function trendWidgets(d: OverviewDashboard, t: Translate, formatDay: (day: string) => string): DashboardWidget[] {
  const ms = millis(t);
  const days = d.series.map((day) => day.date);
  const callsTitle = t('ai.overview.dailyCalls');
  const line = (spec: LineSpec): DashboardWidget => ({
    id: spec.id,
    title: spec.title,
    defaultLayout: spec.layout,
    minW: 4,
    minH: 4,
    content: (
      <TrendChart
        type="line"
        days={days}
        series={[{ label: spec.seriesLabel, data: d.series.map(spec.pick) }]}
        format={spec.format}
        summary={trendSummary(t, spec.title, days, spec.total, formatDay)}
      />
    ),
  });

  return [
    {
      id: 'daily-calls',
      title: callsTitle,
      headerActions: <DetailsLink to="/openai" label={t('ai.overview.openAiDetails')} />,
      defaultLayout: { x: 0, y: 4, w: 12, h: 6 },
      minW: 4,
      minH: 4,
      content: (
        <TrendChart
          type="bar"
          days={days}
          series={callSeries(d.series, {
            answered: t('ai.featuresDashboard.seriesAnswered'),
            failed: t('ai.featuresDashboard.seriesFailed'),
            skipped: t('ai.featuresDashboard.seriesSkipped'),
          })}
          format={tokens}
          summary={trendSummary(t, callsTitle, days, tokens(d.totals.calls), formatDay)}
        />
      ),
    },
    line({
      id: 'daily-cost',
      title: t('ai.overview.dailyCost'),
      seriesLabel: t('ai.featuresDashboard.seriesCost'),
      pick: (day) => day.cost_usd,
      format: usd,
      total: usd(d.totals.cost_usd),
      layout: { x: 0, y: 10, w: 6, h: 6 },
    }),
    line({
      id: 'daily-tokens',
      title: t('ai.overview.dailyTokens'),
      seriesLabel: t('ai.overview.seriesTokens'),
      pick: (day) => day.total_tokens,
      format: tokens,
      total: tokens(d.totals.total_tokens),
      layout: { x: 6, y: 10, w: 6, h: 6 },
    }),
    line({
      id: 'daily-latency',
      title: t('ai.overview.dailyLatency'),
      seriesLabel: t('ai.featuresDashboard.seriesLatency'),
      pick: (day) => day.avg_duration_ms,
      format: ms,
      total: ms(d.totals.avg_duration_ms),
      layout: { x: 0, y: 16, w: 6, h: 6 },
    }),
    line({
      id: 'daily-users',
      title: t('ai.overview.dailyUsers'),
      seriesLabel: t('ai.overview.seriesUsers'),
      pick: (day) => day.active_users,
      format: tokens,
      // People are not additive across days: the total is the distinct people over the range.
      total: tokens(d.totals.active_users),
      layout: { x: 6, y: 16, w: 6, h: 6 },
    }),
  ];
}
