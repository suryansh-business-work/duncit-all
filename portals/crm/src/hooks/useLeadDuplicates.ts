import { useMemo } from 'react';
import { useWatch } from 'react-hook-form';
import { useQuery } from '@apollo/client/react';
import { useDebouncedValue } from '@duncit/ui';
import type { CrmLeadEntityType } from '../api/crm.types';
import {
  CRM_LEAD_DUPLICATES,
  type CrmLeadDuplicateMatch,
  type CrmLeadDuplicatesData,
  type CrmLeadDuplicatesVars,
} from '../api/leadDuplicates.gql';

/** Long enough that typing a number is one request, not ten. */
export const DUPLICATE_CHECK_DEBOUNCE_MS = 500;
/** Fewer digits cannot identify a lead; the server ignores them too. */
const MIN_PHONE_DIGITS = 7;

interface CheckValues {
  contacts: { mobile_number: string; email: string }[];
  website: string;
}

const digitCount = (value: string) => [...value].filter((ch) => ch >= '0' && ch <= '9').length;
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/**
 * The values worth checking, as a stable string so the debounce compares by
 * value; '' when nothing typed could match another lead.
 */
export function duplicateCheckKey(contacts: unknown, website: unknown): string {
  const rows = Array.isArray(contacts) ? (contacts as Array<Record<string, unknown> | null>) : [];
  const values: CheckValues = {
    contacts: rows
      .map((row) => {
        const phone = text(row?.mobile_number);
        const email = text(row?.email);
        return { mobile_number: digitCount(phone) >= MIN_PHONE_DIGITS ? phone : '', email: email.includes('@') ? email : '' };
      })
      .filter((row) => row.mobile_number || row.email),
    website: text(website),
  };
  return values.contacts.length > 0 || values.website ? JSON.stringify(values) : '';
}

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
    () => ({ entity_type: entityType, lead_id: leadId || null, ...(key ? (JSON.parse(key) as CheckValues) : {}) }),
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
