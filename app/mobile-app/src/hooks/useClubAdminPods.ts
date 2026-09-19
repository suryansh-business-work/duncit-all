import { useCallback } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import type { PodRowStatusFilter } from '@duncit/utils';

import { TableSortDir, type PodRowStatus } from '@/generated/graphql/graphql';
import { ClubAdminPodsTableDocument } from '@/graphql/club-admin';
import { graphqlRequest } from '@/services/graphql.client';
import { useTablePage, type TablePageState } from './useTablePage';

export type ClubAdminPodRow = ResultOf<
  typeof ClubAdminPodsTableDocument
>['clubAdminPodsTable']['rows'][number];

const PAGE_SIZE = 20;

/**
 * One club's pods, newest first, in every stage — the status filter narrows
 * server-side so a page is a page of MATCHING pods, not a filtered page.
 * `''` is the absence of the filter, which the server takes as no argument.
 *
 * `search` is server-side for the same reason: a club with two hundred pods
 * paged twenty at a time cannot be searched by filtering the page already on
 * screen. mWeb has had this since its page was written; the app was left with
 * status pills and Load more (rule 27).
 */
export function useClubAdminPods(
  clubId: string,
  status: PodRowStatusFilter,
  search = '',
): TablePageState<ClubAdminPodRow> {
  const fetcher = useCallback(
    (page: number) =>
      graphqlRequest(
        ClubAdminPodsTableDocument,
        {
          club_id: clubId,
          query: {
            search: search || null,
            page,
            page_size: PAGE_SIZE,
            sort_by: 'pod_date_time',
            sort_dir: TableSortDir.Desc,
          },
          status: status ? (status as PodRowStatus) : null,
        },
        { auth: true },
      ).then((res) => res.clubAdminPodsTable),
    [clubId, status, search],
  );
  return useTablePage(fetcher);
}
