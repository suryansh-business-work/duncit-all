import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { HOST_LEADS, VENUE_LEADS } from '../../api/crm.gql';
import type { HostLead, VenueLead } from '../../api/crm.types';
import { useCrmConfig } from '../../api/useCrmConfig';
import { useSuperCategories } from '../../api/useSuperCategories';
import {
  isInWindow,
  type DateWindow,
  type ServiceCount,
  type StageCount,
  type SuperCategoryCount,
} from './dashboardConfig';
import {
  aggregatePriorities,
  aggregateServices,
  aggregateStages,
  aggregateSuperCategories,
  aggregateTotals,
} from './dashboardAggregations';

interface DashboardData {
  loading: boolean;
  error?: Error | null;
  venueLeads: VenueLead[];
  hostLeads: HostLead[];
  stageCounts: StageCount[];
  priorities: { label: string; count: number }[];
  services: ServiceCount[];
  serviceTotals: { uniqueServices: number; totalServiceRows: number; leadsWithServices: number };
  superCategoryCounts: SuperCategoryCount[];
  totals: { venue: number; host: number; total: number; conversionRate: number };
  refetch: () => Promise<unknown>;
}

export function useDashboardData(window: DateWindow): DashboardData {
  const { config } = useCrmConfig();
  const { options: superCategories } = useSuperCategories();
  const venueQ = useQuery(VENUE_LEADS, { variables: { filter: {} }, fetchPolicy: 'cache-and-network' });
  const hostQ = useQuery(HOST_LEADS, { variables: { filter: {} }, fetchPolicy: 'cache-and-network' });

  const allVenue: VenueLead[] = useMemo(() => venueQ.data?.venueLeads ?? [], [venueQ.data]);
  const allHost: HostLead[] = useMemo(() => hostQ.data?.hostLeads ?? [], [hostQ.data]);

  const hasWindow = Boolean(window.from || window.to);
  const venueLeads = useMemo(
    () => (hasWindow ? allVenue.filter((l) => isInWindow(l.created_at, window)) : allVenue),
    [allVenue, hasWindow, window]
  );
  const hostLeads = useMemo(
    () => (hasWindow ? allHost.filter((l) => isInWindow(l.created_at, window)) : allHost),
    [allHost, hasWindow, window]
  );

  const stageCounts = useMemo<StageCount[]>(
    () =>
      aggregateStages(
        config?.venue_lead_statuses ?? [],
        config?.host_lead_statuses ?? [],
        venueLeads,
        hostLeads
      ),
    [config, venueLeads, hostLeads]
  );

  const priorities = useMemo(
    () => aggregatePriorities(config?.priorities ?? [], venueLeads, hostLeads),
    [config, venueLeads, hostLeads]
  );

  const { services, serviceTotals } = useMemo(
    () => aggregateServices(venueLeads, hostLeads),
    [venueLeads, hostLeads]
  );

  const superCategoryCounts = useMemo<SuperCategoryCount[]>(
    () => aggregateSuperCategories(superCategories, venueLeads, hostLeads),
    [superCategories, venueLeads, hostLeads]
  );

  const totals = useMemo(() => aggregateTotals(venueLeads, hostLeads), [venueLeads, hostLeads]);

  return {
    loading: venueQ.loading || hostQ.loading,
    error: (venueQ.error as Error) ?? (hostQ.error as Error) ?? null,
    venueLeads,
    hostLeads,
    stageCounts,
    priorities,
    services,
    serviceTotals,
    superCategoryCounts,
    totals,
    refetch: async () => {
      await Promise.all([venueQ.refetch(), hostQ.refetch()]);
    },
  };
}
