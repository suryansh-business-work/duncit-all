import { useMemo } from 'react';
import { useWatch } from 'react-hook-form';
import { useQuery } from '@apollo/client/react';
import { useDebouncedValue } from '@duncit/ui';
import { DUPLICATE_CHECK_DEBOUNCE_MS, duplicateCheckKey, type DuplicateCheckValues } from '@duncit/forms/schemas';
import type { CrmLeadEntityType } from '../api/crm.types';
import {
  CRM_LEAD_DUPLICATES,
  type CrmLeadDuplicateMatch,
  type CrmLeadDuplicatesData,
  type CrmLeadDuplicatesVars,
} from '../api/leadDuplicates.gql';

// The check key is shared with the Duncit CRM app, so both send the same values.
export { DUPLICATE_CHECK_DEBOUNCE_MS, duplicateCheckKey } from '@duncit/forms/schemas';

export interface LeadDuplicatesState {
  matches: CrmLeadDuplicateMatch[];
  checking: boolean;
  failed: boolean;
}

/**
 * Live duplicate check for the lead form it is rendered in: watches the
 * contacts' phones and emails and the website, waits for typing to pause, then
 * asks the server which of them another lead (any kind) already has. The lead
 * being edited never matches itself.
 */
export function useLeadDuplicates(entityType: CrmLeadEntityType, leadId?: string | null): LeadDuplicatesState {
  const contacts = useWatch({ name: 'contacts' });
  const website = useWatch({ name: 'website' });
  const key = useDebouncedValue(duplicateCheckKey(contacts, website), DUPLICATE_CHECK_DEBOUNCE_MS);

  const input = useMemo(
    () => ({ entity_type: entityType, lead_id: leadId || null, ...(key ? (JSON.parse(key) as DuplicateCheckValues) : {}) }),
    [entityType, leadId, key],
  );
  const { data, loading, error } = useQuery<CrmLeadDuplicatesData, CrmLeadDuplicatesVars>(CRM_LEAD_DUPLICATES, {
    variables: { input },
    skip: !key,
    fetchPolicy: 'network-only',
  });

  if (!key) return { matches: [], checking: false, failed: false };
  return { matches: data?.crmLeadDuplicates ?? [], checking: loading, failed: Boolean(error) };
}
