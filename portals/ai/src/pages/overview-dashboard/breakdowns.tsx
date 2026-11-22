import type { DashboardPosition, DashboardWidget } from '@duncit/dashboard';
import type { useTranslation } from '@duncit/shell';
import { rankWidget } from '../../components/charts/rankWidget';
import { rankBy, type Ranking } from '../../components/charts/ranking';
import { millis, percent } from '../../components/charts/summaries';
import { tokens, usd } from '../../lib/usd';
import { failureRate } from '../ai-features-dashboard/rankings';
import DetailsLink from './DetailsLink';
import type { OverviewCount, OverviewDashboard, OverviewModel, OverviewUser } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

interface Breakdown {
  id: string;
  title: string;
  ranking: Ranking;
  seriesLabel: string;
  format: (value: number) => string;
  emptyText: string;
  /** Where the detail behind the ranking lives, if anywhere. */
  details?: { to: string; label: string };
}

/** Rows of three cards, four columns each, under the trends. */
const FIRST_ROW_Y = 22;
const ROW_H = 6;
const layoutAt = (index: number): DashboardPosition => ({
  x: (index % 3) * 4,
  y: FIRST_ROW_Y + Math.floor(index / 3) * ROW_H,
  w: 4,
  h: ROW_H,
});

/** Where the latest-calls list goes: below the last row of breakdowns. */
export const breakdownsEndY = (count: number) => FIRST_ROW_Y + Math.ceil(count / 3) * ROW_H;

const countRanking = (counts: readonly OverviewCount[]): Ranking => rankBy(counts, (c) => c.key, (c) => c.count);

/**
 * Where the calls, money, time and failures go — by model, by feature, by
 * area and by person — and what AI Monitoring and Automation did. Each card
 * ranks what was used and leaves out what was not.
 */
export function breakdownWidgets(d: OverviewDashboard, t: Translate): DashboardWidget[] {
  const ms = millis(t);
  const pct = percent(t);
  const noCalls = t('ai.overview.noCalls');
  const noFailures = t('ai.overview.noFailures');
  const noUsers = t('ai.overview.noUsers');
  const cost = t('ai.featuresDashboard.seriesCost');
  const calls = t('ai.overview.seriesCalls');
  const modelName = (m: OverviewModel) => m.model || t('ai.overview.noModel');
  const userName = (u: OverviewUser) => u.name || t('ai.overview.unknownUser');
  const openAi = { to: '/openai', label: t('ai.overview.openAiDetails') };
  const features = { to: `/ai-features/dashboard?days=${d.range_days}`, label: t('ai.overview.featuresDetails') };

  const cards: Breakdown[] = [
    {
      id: 'model-cost',
      title: t('ai.overview.costByModel'),
      ranking: rankBy(d.by_model, modelName, (m) => m.cost_usd),
      seriesLabel: cost,
      format: usd,
      emptyText: noCalls,
      details: openAi,
    },
    {
      id: 'model-calls',
      title: t('ai.overview.callsByModel'),
      ranking: rankBy(d.by_model, modelName, (m) => m.calls),
      seriesLabel: calls,
      format: tokens,
      emptyText: noCalls,
    },
    {
      id: 'model-latency',
      title: t('ai.overview.slowestModels'),
      ranking: rankBy(d.by_model, modelName, (m) => m.avg_duration_ms),
      seriesLabel: t('ai.featuresDashboard.seriesLatency'),
      format: ms,
      emptyText: noCalls,
    },
    {
      id: 'model-failures',
      title: t('ai.overview.failingModels'),
      ranking: rankBy(d.by_model, modelName, (m) => m.failure_rate),
      seriesLabel: t('ai.featuresDashboard.seriesFailed'),
      format: pct,
      emptyText: noFailures,
    },
    {
      id: 'feature-cost',
      title: t('ai.featuresDashboard.topCost'),
      ranking: rankBy(d.by_feature, (f) => f.label, (f) => f.cost_usd),
      seriesLabel: cost,
      format: usd,
      emptyText: noCalls,
      details: features,
    },
    {
      id: 'feature-calls',
      title: t('ai.featuresDashboard.topCalls'),
      ranking: rankBy(d.by_feature, (f) => f.label, (f) => f.calls),
      seriesLabel: calls,
      format: tokens,
      emptyText: noCalls,
    },
    {
      id: 'feature-failures',
      title: t('ai.overview.failingFeatures'),
      ranking: rankBy(d.by_feature, (f) => f.label, failureRate),
      seriesLabel: t('ai.featuresDashboard.seriesFailed'),
      format: pct,
      emptyText: noFailures,
    },
    {
      id: 'area-cost',
      title: t('ai.featuresDashboard.costByArea'),
      ranking: rankBy(d.by_module, (a) => a.module, (a) => a.cost_usd),
      seriesLabel: cost,
      format: usd,
      emptyText: noCalls,
    },
    {
      id: 'scans-risk',
      title: t('ai.overview.scansByRisk'),
      ranking: countRanking(d.monitoring.by_risk),
      seriesLabel: t('ai.overview.seriesCount'),
      format: tokens,
      emptyText: t('ai.overview.noScans'),
      details: { to: '/monitoring', label: t('ai.overview.monitoringDetails') },
    },
    {
      id: 'users-calls',
      title: t('ai.overview.topUsersCalls'),
      ranking: rankBy(d.top_users, userName, (u) => u.calls),
      seriesLabel: calls,
      format: tokens,
      emptyText: noUsers,
    },
    {
      id: 'users-cost',
      title: t('ai.overview.topUsersCost'),
      ranking: rankBy(d.top_users, userName, (u) => u.cost_usd),
      seriesLabel: cost,
      format: usd,
      emptyText: noUsers,
    },
    {
      id: 'runs-status',
      title: t('ai.overview.runsByStatus'),
      ranking: countRanking(d.automation.by_status),
      seriesLabel: t('ai.overview.seriesCount'),
      format: tokens,
      emptyText: t('ai.overview.noRuns'),
      details: { to: '/automation/whatsapp', label: t('ai.overview.automationDetails') },
    },
  ];

  return cards.map((card, index) => ({
    ...rankWidget(t, { ...card, layout: layoutAt(index) }),
    headerActions: card.details ? <DetailsLink to={card.details.to} label={card.details.label} /> : undefined,
  }));
}

