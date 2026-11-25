import { useCallback } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { CrmAppLeadSearchDocument } from '@/graphql/leads';
import { usePagedSearch } from '@/hooks/usePagedSearch';
import { gqlRequest } from '@/services/graphql.client';
import type { LeadKind } from './leadKinds';

export { PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '@/hooks/usePagedSearch';

export type LeadRow = ResultOf<typeof CrmAppLeadSearchDocument>['searchCrmLeads']['rows'][number];

/** Lead search across every kind (the portal's searchCrmLeads), page by page. */
export function useLeadSearch(search: string, kind: LeadKind | null, fallbackError: string) {
  const fetchPage = useCallback(
    async (page: number, pageSize: number) => {
      const { searchCrmLeads } = await gqlRequest(CrmAppLeadSearchDocument, {
        input: {
          search: search.trim() || null,
          entity_types: kind ? [kind] : null,
          page,
          page_size: pageSize,
        },
      });
      return { rows: searchCrmLeads.rows, total: searchCrmLeads.total };
    },
    [search, kind],
  );
  return usePagedSearch<LeadRow>(fetchPage, { fallbackError, scope: 'crm-app/useLeadSearch' });
}
