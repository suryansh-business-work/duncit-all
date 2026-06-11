import { useQuery } from '@apollo/client';
import { CRM_LEAD_CONFIG } from './crm.gql';
import type { CrmOptionGroup } from './crm.types';

const EMPTY: CrmOptionGroup = {
  venue_types: [], space_types: [], venue_event_suitability: [], week_days: [], booking_notices: [],
  pricing_models: [], amenities: [], lead_sources: [], venue_lead_statuses: [], host_lead_statuses: [],
  priorities: [], host_types: [], host_interests: [], audience_sizes: [], frequencies: [],
  revenue_models: [], host_intent_scores: [], services_offered_options: [],
  venue_services_offered_options: [], host_services_offered_options: [],
};

/** Fetches the dynamic CRM option lists from the server (single source of truth). */
export function useCrmConfig() {
  const { data, loading, error } = useQuery(CRM_LEAD_CONFIG, { fetchPolicy: 'cache-first' });
  const config: CrmOptionGroup = data?.crmLeadConfig ?? EMPTY;
  return { config, loading, error };
}
