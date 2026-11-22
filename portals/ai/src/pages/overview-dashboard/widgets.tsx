import type { DashboardWidget } from '@duncit/dashboard';
import type { useTranslation } from '@duncit/shell';
import { kpiWidgets, summaryWidgets } from './kpis';
import { trendWidgets } from './trends';
import { breakdownWidgets, breakdownsEndY } from './breakdowns';
import DetailsLink from './DetailsLink';
import RecentCalls from './RecentCalls';
import type { OverviewDashboard } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

/**
 * Every widget of the AI portal Dashboard, top to bottom: the headline
 * figures, the rest of the portal at a glance, the daily trends, the
 * breakdowns, and the latest calls.
 */
export function buildOverviewWidgets(
  d: OverviewDashboard,
  t: Translate,
  formatDay: (day: string) => string
): DashboardWidget[] {
  const breakdowns = breakdownWidgets(d, t);
  return [
    ...kpiWidgets(d, t),
    ...summaryWidgets(d, t),
    ...trendWidgets(d, t, formatDay),
    ...breakdowns,
    {
      id: 'recent-calls',
      title: t('ai.overview.recent'),
      headerActions: <DetailsLink to="/openai/logs" label={t('ai.overview.allLogs')} />,
      defaultLayout: { x: 0, y: breakdownsEndY(breakdowns.length), w: 12, h: 8 },
      minW: 4,
      minH: 4,
      content: <RecentCalls calls={d.recent} />,
    },
  ];
}
