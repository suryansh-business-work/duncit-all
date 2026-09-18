import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { useTranslation } from '@duncit/app-settings';
import { KPI_COPY } from '../../entity-analytics/copy';
import { DEFAULT_PERIOD, ENTITY_ANALYTICS, type AnalyticsEntity } from '../../entity-analytics/queries';

export interface DashboardTile {
  key: string;
  title: string;
  /** A live count has no earlier period, so an alert on its change could never be judged. */
  live: boolean;
}

/** The tiles a dashboard shows, by name — read from the dashboard itself, so the list never drifts from it. */
export function useDashboardTiles(entity: AnalyticsEntity) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(ENTITY_ANALYTICS, {
    variables: { entity, days: DEFAULT_PERIOD },
    fetchPolicy: 'cache-first',
  });
  const tiles = useMemo<DashboardTile[]>(
    () =>
      (data?.entityAnalytics.kpis ?? []).map((kpi) => {
        const copy = KPI_COPY[kpi.key];
        return { key: kpi.key, title: copy ? t(copy.title) : kpi.key, live: kpi.previous === null };
      }),
    [data, t]
  );
  return { tiles, loading, error };
}
