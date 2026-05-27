import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { HOST_LEADS, VENUE_LEADS } from '../../api/crm.gql';
import type { CrmServiceOffered, HostLead, VenueLead } from '../../api/crm.types';
import { useCrmConfig } from '../../api/useCrmConfig';
import { useSuperCategories } from '../../api/useSuperCategories';
import {
  isInWindow,
  type DateWindow,
  type ServiceCount,
  type StageCount,
  type SuperCategoryCount,
} from './dashboardConfig';

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

// Display label for a service row: free-text custom_name when the catalogue
// value is "Other", otherwise the catalogue value itself. Blank rows are
// dropped by the caller.
const serviceLabel = (s: CrmServiceOffered): string => {
  if (s.service === 'Other') return (s.custom_name ?? '').trim() || 'Other';
  return (s.service ?? '').trim();
};

const WON_RE = /won|converted|closed.*won/i;

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

  const { services, serviceTotals } = useMemo(() => {
    const tally = new Map<string, number>();
    let totalServiceRows = 0;
    let leadsWithServices = 0;
    const collect = (leadServices: CrmServiceOffered[] | undefined) => {
      if (!leadServices || leadServices.length === 0) return;
      let hadAny = false;
      for (const row of leadServices) {
        const label = serviceLabel(row);
        if (!label) continue;
        tally.set(label, (tally.get(label) ?? 0) + 1);
        totalServiceRows += 1;
        hadAny = true;
      }
      if (hadAny) leadsWithServices += 1;
    };
    venueLeads.forEach((l) => collect(l.services_offered));
    hostLeads.forEach((l) => collect(l.services_offered));
    const list: ServiceCount[] = Array.from(tally.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    return {
      services: list,
      serviceTotals: { uniqueServices: list.length, totalServiceRows, leadsWithServices },
    };
  }, [venueLeads, hostLeads]);

  const superCategoryCounts = useMemo<SuperCategoryCount[]>(() => {
    // Pre-populate the bucket map with the admin's catalogue (in display
    // order) so the bar chart shows all known super categories — even ones
    // that have zero leads in the selected window. Any super_category_id on
    // a lead that no longer matches a known category lands in "Uncategorised"
    // so the count still surfaces somewhere.
    const buckets = new Map<string, SuperCategoryCount>();
    for (const sc of superCategories) {
      buckets.set(sc.id, { super_category_id: sc.id, label: sc.name, venue: 0, host: 0, total: 0 });
    }
    const orphanKey = '__none__';
    const orphanLabel = 'Uncategorised';
    const bump = (id: string | null | undefined, kind: 'venue' | 'host', nameHint?: string | null) => {
      const key = id && buckets.has(id) ? id : id ? id : orphanKey;
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = {
          super_category_id: key,
          label: key === orphanKey ? orphanLabel : nameHint || orphanLabel,
          venue: 0,
          host: 0,
          total: 0,
        };
        buckets.set(key, bucket);
      }
      bucket[kind] += 1;
      bucket.total += 1;
    };
    for (const l of venueLeads) bump(l.super_category_id, 'venue', l.super_category?.name);
    for (const l of hostLeads) bump(l.super_category_id, 'host', l.super_category?.name);

    return Array.from(buckets.values())
      .filter((b, _, arr) => b.total > 0 || arr.length <= 8) // hide always-zero rows when many categories
      .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
  }, [superCategories, venueLeads, hostLeads]);

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
    services,
    serviceTotals,
    superCategoryCounts,
    totals,
    refetch: async () => {
      await Promise.all([venueQ.refetch(), hostQ.refetch()]);
    },
  };
}
