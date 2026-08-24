import { create } from 'zustand';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { HomePodsDocument, HomeStaticDocument } from '@/graphql/home';
import { graphqlRequest } from '@/services/graphql.client';

/**
 * The merged shape of both halves of the feed. It is an intersection rather
 * than one document's result because the request was split for caching (see
 * graphql/home.ts) — everything downstream still reads one object.
 */
export type HomeFeed = ResultOf<typeof HomeStaticDocument> & ResultOf<typeof HomePodsDocument>;

interface HomeState {
  data?: HomeFeed;
  isLoading: boolean;
  error?: unknown;
  /** Loads the home feed once; pass `force` to refetch (pull-to-refresh). */
  fetch: (force?: boolean) => Promise<void>;
  /** Bumped each time the logo is tapped while on Home, so the feed scrolls up. */
  scrollTopNonce: number;
  /** Signals the home feed to smooth-scroll back to the top (logo tap). */
  requestScrollTop: () => void;
}

/** Home-feed state: the raw clubs/pods/categories payload. Derivations (featured
 * pods, pods-by-club, vibe chips) live in `useHomeFeed` so the store stays thin. */
export const useHomeStore = create<HomeState>((set, get) => ({
  isLoading: false,
  scrollTopNonce: 0,
  requestScrollTop: () => set((s) => ({ scrollTopNonce: s.scrollTopNonce + 1 })),
  fetch: async (force = false) => {
    if (get().isLoading) return;
    if (get().data && !force) return;
    set({ isLoading: true, error: undefined });
    try {
      // In parallel: the catalogue half is usually a cache hit, so waiting for
      // it in sequence would hand back its saving to the round trip it saved.
      const [staticData, podData] = await Promise.all([
        graphqlRequest(HomeStaticDocument, undefined, { auth: true }),
        graphqlRequest(HomePodsDocument, { podFilter: { is_active: true } }, { auth: true }),
      ]);
      set({ data: { ...staticData, ...podData }, isLoading: false });
    } catch (error) {
      set({ error, isLoading: false });
    }
  },
}));
