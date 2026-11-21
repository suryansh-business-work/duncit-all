import type { DashboardPosition, DashboardWidget } from '@duncit/dashboard';
import type { useTranslation } from '@duncit/shell';
import RankBars from './RankBars';
import { rankSummary } from './summaries';
import type { Ranking } from './ranking';

type Translate = ReturnType<typeof useTranslation>['t'];

export interface RankSpec {
  id: string;
  title: string;
  ranking: Ranking;
  seriesLabel: string;
  format: (value: number) => string;
  emptyText: string;
  layout: DashboardPosition;
}

/** A ranked-bars dashboard card. One series, so the card's title names it. */
export const rankWidget = (t: Translate, spec: RankSpec): DashboardWidget => ({
  id: spec.id,
  title: spec.title,
  fitContent: true,
  defaultLayout: spec.layout,
  minW: 3,
  minH: 3,
  content: (
    <RankBars
      labels={spec.ranking.labels}
      series={[{ label: spec.seriesLabel, data: spec.ranking.values }]}
      format={spec.format}
      summary={rankSummary(t, spec.title, spec.ranking.labels, spec.ranking.values, spec.format)}
      emptyText={spec.emptyText}
    />
  ),
});
