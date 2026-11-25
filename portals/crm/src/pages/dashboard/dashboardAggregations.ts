import {
  crmAggregatePriorities,
  crmAggregateServices,
  crmAggregateStages,
  crmAggregateSuperCategories,
  crmAggregateTotals,
  crmServiceLabel,
  type CrmDashboardLead,
} from '@duncit/utils';
import type { CrmServiceOffered, SuperCategoryOption } from '../../api/crm.types';
import type { SuperCategoryCount } from './dashboardConfig';

/* The counts live in @duncit/utils (crm-dashboard), shared with the Duncit CRM app. */
/** Display label: free-text `custom_name` when service is "Other", else catalogue value. */
export const serviceLabel = (s: CrmServiceOffered): string => crmServiceLabel(s);
export const aggregateStages = crmAggregateStages;
export const aggregatePriorities = crmAggregatePriorities;
export const aggregateServices = crmAggregateServices;
export const aggregateTotals = crmAggregateTotals;

/** Venue vs host leads per super category; unknown categories under "Uncategorised". */
export function aggregateSuperCategories(
  superCategories: SuperCategoryOption[],
  venueLeads: readonly CrmDashboardLead[],
  hostLeads: readonly CrmDashboardLead[],
): SuperCategoryCount[] {
  return crmAggregateSuperCategories(superCategories, venueLeads, hostLeads, 'Uncategorised');
}
