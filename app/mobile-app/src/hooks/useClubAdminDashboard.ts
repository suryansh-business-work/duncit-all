import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { clubAdminRangeFrom, emptyClubAdminDashboard, type ClubAdminRange } from '@duncit/utils';

import { ClubAdminDashboardDocument } from '@/graphql/club-admin';
import { graphqlRequest } from '@/services/graphql.client';
import { appNow } from '@/utils/app-formatter';

export type ClubAdminDashboardData = ResultOf<
  typeof ClubAdminDashboardDocument
>['clubAdminDashboard'];

/**
 * The Club Admin dashboard for one range. The `from` boundary is the shared
 * `clubAdminRangeFrom` rule off the app clock, so the phone and mWeb ask the
 * server for exactly the same window (rules 11 + 27).
 */
export function useClubAdminDashboard(range: ClubAdminRange) {
  const [data, setData] = useState<ClubAdminDashboardData>(emptyClubAdminDashboard);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setHasError(false);
    graphqlRequest(
      ClubAdminDashboardDocument,
      { from: clubAdminRangeFrom(range, appNow()), to: null },
      { auth: true },
    )
      .then((res) => active && setData(res.clubAdminDashboard))
      .catch(() => active && setHasError(true))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [range, attempt]);

  return { data, isLoading, hasError, refetch: () => setAttempt((value) => value + 1) };
}
