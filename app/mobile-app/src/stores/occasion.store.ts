import type { ResultOf } from '@graphql-typed-document-node/core';
import type { StoreApi, UseBoundStore } from 'zustand';

import { OccasionLiveDocument } from '@/graphql/occasion';
import { graphqlRequest } from '@/services/graphql.client';
import { createQueryStore, type QueryStore } from './create-query-store';

export type OccasionLiveData = ResultOf<typeof OccasionLiveDocument>;

/**
 * The fresh answer, still holding the previous look object when the look has
 * not changed. A foreground refetch then hands the app the same reference, so
 * the theme and the decoration are not rebuilt for nothing.
 */
export function keepSameLook(
  previous: OccasionLiveData | undefined,
  next: OccasionLiveData,
): OccasionLiveData {
  const before = previous?.occasionLive.theme;
  const after = next.occasionLive.theme;
  if (!before || !after || JSON.stringify(before) !== JSON.stringify(after)) return next;
  return { occasionLive: { ...next.occasionLive, theme: before } };
}

/** The live festive look (Marketing → Occasions), one request at a time. */
export const useOccasionStore: UseBoundStore<StoreApi<QueryStore<OccasionLiveData>>> =
  createQueryStore<OccasionLiveData>(async () =>
    keepSameLook(useOccasionStore.getState().data, await graphqlRequest(OccasionLiveDocument)),
  );
