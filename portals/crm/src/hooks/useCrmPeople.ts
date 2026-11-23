import { useMemo } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import type { RichTextMentions } from '@duncit/rich-text';
import { CRM_ASSIGNABLE_USERS, CRM_USERS_BY_IDS, type CrmAssignableUsersData, type CrmUsersByIdsData } from '../api/crmUsers.gql';
import type { CrmStaffUser } from '../api/crm.types';

const MENTION_LIMIT = 8;

/** Names for a set of user ids, fetched in one request (skipped when there are none). */
export function useCrmPeople(ids: readonly string[]) {
  const { data, loading } = useQuery<CrmUsersByIdsData>(CRM_USERS_BY_IDS, {
    variables: { ids },
    skip: ids.length === 0,
    fetchPolicy: 'cache-first',
  });
  const byId = useMemo(
    () => new Map<string, CrmStaffUser>((data?.crmUsersByIds ?? []).map((user) => [user.id, user])),
    [data],
  );
  return { byId, loading };
}

/** @mention search over the CRM team, for the manual-log editor. */
export function useStaffMentions(): RichTextMentions {
  const client = useApolloClient();
  return useMemo(
    () => ({
      search: async (query: string) => {
        const { data } = await client.query<CrmAssignableUsersData>({
          query: CRM_ASSIGNABLE_USERS,
          variables: { search: query || null, limit: MENTION_LIMIT },
          fetchPolicy: 'cache-first',
        });
        return (data?.crmAssignableUsers ?? []).map((user) => ({
          id: user.id,
          label: user.name || user.email || user.id,
          description: user.email,
        }));
      },
    }),
    [client],
  );
}
