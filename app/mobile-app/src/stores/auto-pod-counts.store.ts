import { create } from 'zustand';
import type { AutoPodActionCounts } from '@duncit/utils';

import { MyAutoPodActionCountsDocument } from '@/graphql/auto-pods';
import { graphqlRequest } from '@/services/graphql.client';

interface AutoPodCountsState {
  data?: AutoPodActionCounts;
  isLoading: boolean;
  /** Loads the counts once; pass `force` to re-read them. */
  fetch: (force?: boolean) => Promise<void>;
}

/**
 * How many Auto Pods are waiting on the signed-in user, per role.
 *
 * This exists so the role switch can decide where to land WITHOUT waiting on a
 * request: `studioSwitchRoute` reads whatever is in the store at the moment of
 * the switch, and an unloaded store simply falls through to the mode's usual
 * home. The switcher primes it on mount and re-reads it when the switch dialog
 * opens, so by the time a mode is chosen the answer is already here.
 *
 * A failure is deliberately swallowed: the counts only ever UPGRADE a
 * destination, so not having them costs a shortcut, never a working switch.
 */
export const useAutoPodCountsStore = create<AutoPodCountsState>((set, get) => ({
  isLoading: false,
  fetch: async (force = false) => {
    if (get().isLoading) return;
    if (get().data && !force) return;
    set({ isLoading: true });
    try {
      const res = await graphqlRequest(MyAutoPodActionCountsDocument, undefined, { auth: true });
      const { venue, host, club } = res.myAutoPodActionCounts;
      set({ data: { venue, host, club }, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));
