import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import type { AdPosition } from '@/generated/graphql/graphql';
import { ActiveAdsDocument } from '@/graphql/ads';
import { graphqlRequest } from '@/services/graphql.client';
import { useRefreshRegistration } from '@/components/PullToRefresh';

/** One live ad as served to the apps (the public projection, never internals). */
export type ActiveAd = ResultOf<typeof ActiveAdsDocument>['activeAds'][number];

/** Placement value accepted as a plain string literal (e.g. "HOME_BOTTOM"). */
export type AdPositionValue = `${AdPosition}`;

/** How long one placement's answer is reused before a mount asks again. */
const ADS_TTL_MS = 60_000;

const adsByPosition = new Map<AdPositionValue, { at: number; request: Promise<ActiveAd[]> }>();

/**
 * One request per placement for every slot showing it. Each tab keeps its
 * screens mounted, so the same placement was fetched once per slot and again
 * on every remount; now slots share an answer for a minute (the server's own
 * cache window). `force` is pull-to-refresh. A failed answer is not kept.
 */
function loadAds(position: AdPositionValue, force: boolean): Promise<ActiveAd[]> {
  const hit = adsByPosition.get(position);
  if (!force && hit && Date.now() - hit.at < ADS_TTL_MS) return hit.request;
  const request = graphqlRequest(ActiveAdsDocument, { position: position as AdPosition }).then(
    (data) => data.activeAds,
  );
  adsByPosition.set(position, { at: Date.now(), request });
  request.catch(() => {
    if (adsByPosition.get(position)?.request === request) adsByPosition.delete(position);
  });
  return request;
}

/**
 * The live ads for one placement (shared across slots, see loadAds). Failures
 * and empty windows both resolve to an empty list so ad slots simply render
 * null — ads never block or break the surface they decorate.
 */
export function useActiveAds(position: AdPositionValue): { ads: ActiveAd[]; loading: boolean } {
  const [ads, setAds] = useState<ActiveAd[]>([]);
  const [loading, setLoading] = useState(true);

  const [attempt, setAttempt] = useState(0);
  const refetch = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    loadAds(position, attempt > 0)
      .then((next) => {
        if (active) setAds(next);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [position, attempt]);

  useRefreshRegistration(refetch);

  return { ads, loading };
}
