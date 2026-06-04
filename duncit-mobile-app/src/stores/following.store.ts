import { create } from 'zustand';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { FollowingDocument } from '@/graphql/following';
import { graphqlRequest } from '@/services/graphql.client';

export type FollowingData = ResultOf<typeof FollowingDocument>;

interface FollowingState {
  data?: FollowingData;
  isLoading: boolean;
  error?: unknown;
  fetch: (force?: boolean) => Promise<void>;
}

/** The signed-in user's followed pod/user ids (auth). */
export const useFollowingStore = create<FollowingState>((set, get) => ({
  isLoading: false,
  fetch: async (force = false) => {
    if (get().isLoading) return;
    if (get().data && !force) return;
    set({ isLoading: true, error: undefined });
    try {
      const data = await graphqlRequest(FollowingDocument, undefined, { auth: true });
      set({ data, isLoading: false });
    } catch (error) {
      set({ error, isLoading: false });
    }
  },
}));
