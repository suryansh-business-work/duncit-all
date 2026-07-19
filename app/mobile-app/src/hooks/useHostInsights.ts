import { useEffect, useMemo, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { HostInsightsDocument } from '@/graphql/studio-dashboard';
import { graphqlRequest } from '@/services/graphql.client';
import type { StatusCounts } from '@/utils/host-insights';

const ALL_TIME_FROM = '1970-01-01T00:00:00.000Z';
const EMPTY_COUNTS: StatusCounts = { upcoming: 0, ongoing: 0, completed: 0, cancelled: 0 };

type InsightsData = ResultOf<typeof HostInsightsDocument>;
export type HostMonthlyEarning = InsightsData['hostInsights']['monthly_earnings'][number];

export interface HostInsightsResult {
  totalPods: number;
  hostEarning: number;
  statusCounts: StatusCounts;
  monthlyEarnings: HostMonthlyEarning[];
  isLoading: boolean;
}

/** Loads Host Insights (feature 1): the Partner-Portal-synced KPIs plus the pod
 * status distribution and monthly host-earnings series. */
export function useHostInsights(): HostInsightsResult {
  const [data, setData] = useState<InsightsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const now = useMemo(() => new Date().toISOString(), []);

  useEffect(() => {
    let active = true;
    graphqlRequest(
      HostInsightsDocument,
      { from: ALL_TIME_FROM, to: now, months: 12 },
      { auth: true },
    )
      .then((res) => {
        if (active) setData(res);
      })
      .catch(() => undefined)
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [now]);

  return {
    totalPods: data?.partnerDashboard?.host?.number_of_pods ?? 0,
    hostEarning: data?.partnerDashboard?.host?.host_earning ?? 0,
    statusCounts: data?.hostInsights?.status_counts ?? EMPTY_COUNTS,
    monthlyEarnings: data?.hostInsights?.monthly_earnings ?? [],
    isLoading,
  };
}
