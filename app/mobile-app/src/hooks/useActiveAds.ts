import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import type { AdPosition } from '@/generated/graphql/graphql';
import { ActiveAdsDocument } from '@/graphql/ads';
import { graphqlRequest } from '@/services/graphql.client';

/** One live ad as served to the apps (the public projection, never internals). */
export type ActiveAd = ResultOf<typeof ActiveAdsDocument>['activeAds'][number];

/** Placement value accepted as a plain string literal (e.g. "HOME_BOTTOM"). */
export type AdPositionValue = `${AdPosition}`;

/**
 * Loads the live ads for one placement, once per surface mount. Failures and
 * empty windows both resolve to an empty list so ad slots simply render null —
 * ads never block or break the surface they decorate.
 */
export function useActiveAds(position: AdPositionValue): { ads: ActiveAd[]; loading: boolean } {
  const [ads, setAds] = useState<ActiveAd[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    graphqlRequest(ActiveAdsDocument, { position: position as AdPosition })
      .then((data) => {
        if (active) setAds(data.activeAds);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [position]);

  return { ads, loading };
}
