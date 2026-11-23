import { useQuery } from '@apollo/client/react';
import { useDebouncedValue } from '@duncit/ui';
import { CRM_ASSIGNABLE_USERS, type CrmAssignableUsersData } from '../api/crmUsers.gql';
import type { CrmStaffUser } from '../api/crm.types';

/** How long typing settles before the team list is searched again. */
export const STAFF_SEARCH_DEBOUNCE_MS = 250;
const EMPTY: CrmStaffUser[] = [];

/**
 * Active CRM team members matching `search` (name or email), searched on the
 * server after typing settles. Shared by the Assigned To picker, the Leads
 * listing's Assigned To filter and @mentions in manual logs.
 */
export function useCrmStaffSearch(search: string, { limit = 20, skip = false }: { limit?: number; skip?: boolean } = {}) {
  const term = useDebouncedValue(search.trim(), STAFF_SEARCH_DEBOUNCE_MS);
  const { data, loading, error } = useQuery<CrmAssignableUsersData>(CRM_ASSIGNABLE_USERS, {
    variables: { search: term || null, limit },
    fetchPolicy: 'cache-first',
    skip,
  });
  return { users: data?.crmAssignableUsers ?? EMPTY, loading, error };
}
