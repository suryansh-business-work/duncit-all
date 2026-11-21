import { gql } from '@apollo/client';
import type { CrmLeadDuplicateMatch as GqlLeadDuplicateMatch, QueryCrmLeadDuplicatesArgs } from '@duncit/gql-types';

/** Lead forms' live duplicate check: which typed values another lead (any kind) already has. */

/** The fields CRM_LEAD_DUPLICATES selects. */
export type CrmLeadDuplicateMatch = Pick<GqlLeadDuplicateMatch, 'field' | 'value' | 'entity_type' | 'lead_id' | 'lead_name' | 'city'>;

export type CrmLeadDuplicatesVars = QueryCrmLeadDuplicatesArgs;

export interface CrmLeadDuplicatesData {
  crmLeadDuplicates: CrmLeadDuplicateMatch[];
}

export const CRM_LEAD_DUPLICATES = gql`
  query CrmLeadDuplicates($input: CrmLeadDuplicateCheckInput!) {
    crmLeadDuplicates(input: $input) { field value entity_type lead_id lead_name city }
  }
`;
