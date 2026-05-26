import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { HOST_LEADS, VENUE_LEADS } from '../../api/crm.gql';
import type { HostLead, VenueLead } from '../../api/crm.types';
import { useCrmConfig } from '../../api/useCrmConfig';
import { isInWindow, type DateWindow, type StageCount } from './dashboardConfig';

interface DashboardData {
  loading: boolean;
  error?: Error | null;
  venueLeads: VenueLead[];
  hostLeads: HostLead[];
  stageCounts: StageCount[];
  priorities: { label: string; count: number }[];
  totals: { venue: number; host: number; total: number; conversionRate: number };
  refetch: () => Promise<unknown>;
}

const WON_RE = /won|converted|closed.*won/i;

export function useDashboardData(window: DateWindow): DashboardData {
  const { config } = useCrmConfig();
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

  const stageCounts = useMemo<StageCount[]>(() => {
    const venueStages = config?.venue_lead_statuses ?? [];
    const hostStages = config?.host_lead_statuses ?? [];
    const stages = Array.from(new Set([...venueStages, ...hostStages]));
    return stages.map((stage) => {
      const venue = venueLeads.filter((l) => l.lead_status === stage).length;
      const host = hostLeads.filter((l) => l.lead_status === stage).length;
      return { stage, venue, host, total: venue + host };
    });
  }, [config, venueLeads, hostLeads]);

  const priorities = useMemo(() => {
    const labels = config?.priorities ?? [];
    return labels.map((label) => ({
      label,
      count:
        venueLeads.filter((l) => l.priority === label).length +
        hostLeads.filter((l) => l.priority === label).length,
    }));
  }, [config, venueLeads, hostLeads]);

  const totals = useMemo(() => {
    const venue = venueLeads.length;
    const host = hostLeads.length;
    const total = venue + host;
    const won =
      venueLeads.filter((l) => WON_RE.test(l.lead_status)).length +
      hostLeads.filter((l) => WON_RE.test(l.lead_status)).length;
    const conversionRate = total ? (won / total) * 100 : 0;
    return { venue, host, total, conversionRate };
  }, [venueLeads, hostLeads]);

  return {
    loading: venueQ.loading || hostQ.loading,
    error: (venueQ.error as Error) ?? (hostQ.error as Error) ?? null,
    venueLeads,
    hostLeads,
    stageCounts,
    priorities,
    totals,
    refetch: async () => {
      await Promise.all([venueQ.refetch(), hostQ.refetch()]);
    },
  };
}
