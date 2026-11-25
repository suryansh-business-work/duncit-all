import { useMemo } from 'react';

import { CrmAppAssignableUsersDocument, CrmAppLeadOptionsDocument } from '@/graphql/leadEditor';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import type { LeadKind } from '@/features/leads/leadKinds';
import type { LeadEditorOptions } from '@/forms/lead/lead.types';
import { KIND_EDITORS } from './kinds';

/** As many people as the portal's assignee picker offers before you type. */
const ASSIGNEE_LIMIT = 50;
const NO_VARS = {};

const asOptions = (values: readonly string[] | null | undefined) =>
  (values ?? []).map((value) => ({ value, label: value }));

/**
 * The lists the editor's pickers offer, from the same reads as the portal:
 * crmLeadConfig (statuses per kind, priorities, venue types), the active
 * super categories, and the people a lead can be assigned to.
 */
export function useLeadEditorOptions(kind: LeadKind, fallbackError: string) {
  const config = useGqlQuery(CrmAppLeadOptionsDocument, NO_VARS, { fallbackError });
  const users = useGqlQuery(
    CrmAppAssignableUsersDocument,
    { limit: ASSIGNEE_LIMIT },
    { fallbackError },
  );

  const options = useMemo<LeadEditorOptions | null>(() => {
    if (!config.data) return null;
    const lists = config.data.crmLeadConfig;
    return {
      superCategories: config.data.categories
        .filter((c) => c.is_active)
        .map((c) => ({ value: c.id, label: c.name })),
      statuses: asOptions(lists[KIND_EDITORS[kind].statusList]),
      priorities: asOptions(lists.priorities),
      venueTypes: asOptions(lists.venue_types),
      // People are optional: a failed read leaves the lead unassigned, it never blocks the edit.
      users: (users.data?.crmAssignableUsers ?? []).map((u) => ({ value: u.id, label: u.name })),
    };
  }, [config.data, users.data, kind]);

  return { options, error: config.error, refetch: config.refetch };
}
