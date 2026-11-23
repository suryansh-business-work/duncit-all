import { useQuery } from '@apollo/client/react';
import type { QueryCrmLeadQualityArgs } from '@duncit/gql-types';
import { LEAD_QUALITY, type LeadQualityDetails } from '../../api/leadQuality.gql';
import type { CrmLeadEntityType } from '../../api/crm.types';

export interface LeadQualityData {
  crmLeadQuality: LeadQualityDetails;
}

/** The tab every lead detail page opens the breakdown on (`?selectedtab=quality`). */
export const QUALITY_TAB = 'quality';

export const leadQualityVars = (entity: CrmLeadEntityType, leadId: string): QueryCrmLeadQualityArgs => ({
  entity_type: entity,
  lead_id: leadId,
});

/**
 * One lead's score, breakdown and evidence. The header ring, the Quality Score
 * tab and the listing's quick view all read this one cache entry, so the ring,
 * the table and the qualification can never disagree. The header loads it
 * fresh (`cache-and-network`); the tab and the quick view reuse what is there.
 */
export function useLeadQualityDetails(
  entity: CrmLeadEntityType,
  leadId: string,
  fetchPolicy: 'cache-first' | 'cache-and-network' = 'cache-first',
) {
  const { data, loading, error, refetch } = useQuery<LeadQualityData, QueryCrmLeadQualityArgs>(LEAD_QUALITY, {
    variables: leadQualityVars(entity, leadId),
    fetchPolicy,
  });
  return { details: data?.crmLeadQuality ?? null, loading, error, refetch };
}
