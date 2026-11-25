import { useCallback, useState } from 'react';

import type { CrmLeadNearInput } from '@/generated/graphql/graphql';
import type { LeadKind } from '@/features/leads/leadKinds';
import { usePagedSearch } from '@/hooks/usePagedSearch';
import { LEAD_LIST_KINDS, type LeadListRow } from './listKinds';
import { toTableQuery, type LeadListFilters, type LeadListSort } from './listQuery';

export interface LeadListParams {
  kind: LeadKind;
  search: string;
  filters: LeadListFilters;
  sort: LeadListSort;
  /** A Nearby leads search's centre and radius, or null for every lead. */
  near: CrmLeadNearInput | null;
}

/** The first page's summary, which a nearby search reports as its result. */
export interface LeadListSummary {
  /** Bumped on every first page, so a waiting nearby search sees the answer to its own read. */
  seq: number;
  total: number;
  unplaced: number | null;
  /** Whether the first page was read with a nearby search on. */
  nearby: boolean;
  /** The first page could not be read (the list shows why). */
  failed: boolean;
}

const NO_SUMMARY: LeadListSummary = {
  seq: 0,
  total: 0,
  unplaced: null,
  nearby: false,
  failed: false,
};

/**
 * One kind's lead listing — the portal's `*LeadsTable` read with its search,
 * filters, sort and Nearby `near` — page by page. Any change starts again
 * from page 1.
 */
export function useLeadList(params: LeadListParams, fallbackError: string) {
  const { kind, search, filters, sort, near } = params;
  const [summary, setSummary] = useState<LeadListSummary>(NO_SUMMARY);
  const fetchPage = useCallback(
    async (page: number, pageSize: number) => {
      const definition = LEAD_LIST_KINDS[kind];
      const nearby = Boolean(near);
      const query = toTableQuery(
        { search, filters, sort, kind: definition, nearby },
        page,
        pageSize,
      );
      const report = (next: Omit<LeadListSummary, 'seq' | 'nearby'>) => {
        if (page === 1) setSummary((prev) => ({ ...next, seq: prev.seq + 1, nearby }));
      };
      try {
        const result = await definition.fetchPage({ query, near });
        report({ total: result.total, unplaced: result.unplaced ?? null, failed: false });
        return { rows: result.rows, total: result.total };
      } catch (error) {
        report({ total: 0, unplaced: null, failed: true });
        throw error;
      }
    },
    [kind, search, filters, sort, near],
  );
  const list = usePagedSearch<LeadListRow>(fetchPage, {
    fallbackError,
    scope: 'crm-app/useLeadList',
  });
  return { ...list, summary };
}
