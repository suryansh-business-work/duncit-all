import { useCallback } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { ClubAdminPodAuditLogsTableDocument } from '@/graphql/club-admin';
import { graphqlRequest } from '@/services/graphql.client';
import { useTablePage, type TablePageState } from './useTablePage';

export type ClubAdminAuditLogRow = ResultOf<
  typeof ClubAdminPodAuditLogsTableDocument
>['clubAdminPodAuditLogsTable']['rows'][number];

const PAGE_SIZE = 20;

/** The AI-monitored trail across the caller's clubs, searched server-side
 * over the pod title, the actor and the AI summary. */
export function useClubAdminAuditLogs(search: string): TablePageState<ClubAdminAuditLogRow> {
  const fetcher = useCallback(
    (page: number) =>
      graphqlRequest(
        ClubAdminPodAuditLogsTableDocument,
        { query: { page, page_size: PAGE_SIZE, search: search || null } },
        { auth: true },
      ).then((res) => res.clubAdminPodAuditLogsTable),
    [search],
  );
  return useTablePage(fetcher);
}
