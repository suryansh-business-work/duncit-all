import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { MobileMyBadgeProgressDocument } from '@/graphql/badges';
import { graphqlRequest } from '@/services/graphql.client';

export type BadgeProgressRow = ResultOf<
  typeof MobileMyBadgeProgressDocument
>['myBadgeProgress'][number];

/**
 * The whole badge catalogue measured against the signed-in member — the Badges
 * screen renders all of it, the profile strip only the achieved rows. Both read
 * this one hook so the two can never disagree. RN twin of mWeb's
 * `MY_BADGE_PROGRESS` query (rule 27).
 */
export function useBadges() {
  const [rows, setRows] = useState<BadgeProgressRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    graphqlRequest(MobileMyBadgeProgressDocument, undefined, { auth: true })
      .then((data) => {
        if (!active) return;
        setRows(data.myBadgeProgress);
        setIsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setHasError(true);
        setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { rows, isLoading, hasError };
}
