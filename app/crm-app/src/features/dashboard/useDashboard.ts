import { useMemo } from 'react';
import {
  crmAggregatePriorities,
  crmAggregateServices,
  crmAggregateStages,
  crmAggregateSuperCategories,
  crmAggregateTotals,
  crmLeadsInWindow,
  crmRangeToWindow,
  type CrmDashboardRange,
  type CrmDateWindow,
} from '@duncit/utils';

import { CrmAppDashboardDocument } from '@/graphql/dashboard';
import { CrmAppLeadOptionsDocument } from '@/graphql/leadEditor';
import { useGqlQuery } from '@/hooks/useGqlQuery';

const NO_VARS = {};

/**
 * The portal Dashboard's numbers for a date range, counted by the shared
 * @duncit/utils crm-dashboard functions the portal itself uses.
 */
export function useDashboard(
  range: CrmDashboardRange,
  labels: { uncategorised: string; loadFailed: string },
  /** The from–to days of the Custom range (whole days, either end optional). */
  custom: CrmDateWindow = {},
) {
  const leads = useGqlQuery(CrmAppDashboardDocument, NO_VARS, { fallbackError: labels.loadFailed });
  const options = useGqlQuery(CrmAppLeadOptionsDocument, NO_VARS, {
    fallbackError: labels.loadFailed,
  });

  const numbers = useMemo(() => {
    const window = crmRangeToWindow(range, custom);
    const venue = crmLeadsInWindow(leads.data?.venueLeads ?? [], window);
    const host = crmLeadsInWindow(leads.data?.hostLeads ?? [], window);
    const config = options.data?.crmLeadConfig;
    const categories = (options.data?.categories ?? []).filter((c) => c.is_active);
    return {
      totals: crmAggregateTotals(venue, host),
      stages: crmAggregateStages(
        config?.venue_lead_statuses ?? [],
        config?.host_lead_statuses ?? [],
        venue,
        host,
      ),
      priorities: crmAggregatePriorities(config?.priorities ?? [], venue, host),
      services: crmAggregateServices(venue, host),
      superCategories: crmAggregateSuperCategories(categories, venue, host, labels.uncategorised),
    };
  }, [range, custom, leads.data, options.data, labels.uncategorised]);

  const refetch = async () => {
    await Promise.all([leads.refetch(), options.refetch()]);
  };

  return {
    ...numbers,
    loading: (leads.loading || options.loading) && !leads.data,
    error: leads.error ?? options.error,
    refetch,
  };
}
