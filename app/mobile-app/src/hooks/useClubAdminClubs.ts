import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { MyAdminClubsTableDocument } from '@/graphql/club-admin';
import { graphqlRequest } from '@/services/graphql.client';

export type AdminClubRow = ResultOf<
  typeof MyAdminClubsTableDocument
>['myAdminClubsTable']['rows'][number];

export interface AdminClubsState {
  clubs: AdminClubRow[];
  isLoading: boolean;
  hasError: boolean;
  refetch: () => void;
}

/** Club Studio lists every club the admin runs; fifty is the ceiling mWeb reads. */
const CLUBS_PAGE_SIZE = 50;

/** The clubs the signed-in user administers, with the figures the row shows. */
export function useClubAdminClubs(): AdminClubsState {
  const [clubs, setClubs] = useState<AdminClubRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setHasError(false);
    graphqlRequest(
      MyAdminClubsTableDocument,
      { query: { page: 1, page_size: CLUBS_PAGE_SIZE } },
      { auth: true },
    )
      .then((res) => active && setClubs(res.myAdminClubsTable.rows))
      .catch(() => active && setHasError(true))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [attempt]);

  return { clubs, isLoading, hasError, refetch: () => setAttempt((value) => value + 1) };
}
