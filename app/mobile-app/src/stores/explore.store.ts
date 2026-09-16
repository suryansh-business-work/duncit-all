import { create } from 'zustand';
import type { ResultOf } from '@graphql-typed-document-node/core';

import {
  ExplorePodsDocument,
  TogglePodLikeDocument,
  ToggleSavedPodDocument,
} from '@/graphql/explore';
import { graphqlRequest } from '@/services/graphql.client';

export type ExploreData = ResultOf<typeof ExplorePodsDocument>;
export type ExplorePod = ExploreData['pods'][number];
export type ExploreClub = ExploreData['clubs'][number];

export interface LikeState {
  liked_by_me: boolean;
  like_count: number;
}

interface ExploreState {
  data?: ExploreData;
  /** The header city `data` was (or is being) loaded for; '' is every city. */
  locationId?: string;
  isLoading: boolean;
  error?: unknown;
  savedOverride: Record<string, boolean>;
  savePending: Record<string, boolean>;
  likeOverride: Record<string, LikeState>;
  commentDelta: Record<string, number>;
  /** Load the reels for one city. A different city replaces the feed outright,
   *  so reels from the previous city are never shown while the new ones load. */
  fetch: (locationId: string, force?: boolean) => Promise<void>;
  toggleSave: (podId: string, currentlySaved: boolean) => Promise<void>;
  toggleLike: (podId: string, current: LikeState) => Promise<void>;
  /** Push a like result from elsewhere (e.g. the Pod Detail page) so the feed banner stays in sync. */
  setLike: (podId: string, state: LikeState) => void;
  /** Adjust a pod's comment count (e.g. after adding/removing a comment in a sheet). */
  bumpComment: (podId: string, delta: number) => void;
}

/** Explore reels feed + optimistic save/like overlays reconciled with the server. */
export const useExploreStore = create<ExploreState>((set, get) => ({
  isLoading: false,
  savedOverride: {},
  savePending: {},
  likeOverride: {},
  commentDelta: {},
  setLike: (podId, state) => set((s) => ({ likeOverride: { ...s.likeOverride, [podId]: state } })),
  bumpComment: (podId, delta) =>
    set((s) => ({
      commentDelta: { ...s.commentDelta, [podId]: (s.commentDelta[podId] ?? 0) + delta },
    })),
  fetch: async (locationId, force = false) => {
    const sameCity = get().locationId === locationId;
    if (sameCity && (get().isLoading || (get().data && !force))) return;
    set({ locationId, isLoading: true, error: undefined, data: sameCity ? get().data : undefined });
    try {
      const data = await graphqlRequest(
        ExplorePodsDocument,
        { locationId: locationId || null },
        { auth: true },
      );
      // A city picked mid-request owns the feed now; this answer is stale.
      if (get().locationId === locationId) set({ data, isLoading: false });
    } catch (error) {
      if (get().locationId === locationId) set({ error, isLoading: false });
    }
  },
  toggleSave: async (podId, currentlySaved) => {
    set((s) => ({
      savedOverride: { ...s.savedOverride, [podId]: !currentlySaved },
      savePending: { ...s.savePending, [podId]: true },
    }));
    try {
      const res = await graphqlRequest(ToggleSavedPodDocument, { podDocId: podId }, { auth: true });
      set((s) => ({ savedOverride: { ...s.savedOverride, [podId]: res.toggleSavedPod.saved } }));
    } catch {
      set((s) => {
        const next = { ...s.savedOverride };
        delete next[podId];
        return { savedOverride: next };
      });
    } finally {
      set((s) => {
        const next = { ...s.savePending };
        delete next[podId];
        return { savePending: next };
      });
    }
  },
  toggleLike: async (podId, current) => {
    const optimistic: LikeState = {
      liked_by_me: !current.liked_by_me,
      like_count: current.like_count + (current.liked_by_me ? -1 : 1),
    };
    set((s) => ({ likeOverride: { ...s.likeOverride, [podId]: optimistic } }));
    try {
      const res = await graphqlRequest(TogglePodLikeDocument, { podDocId: podId }, { auth: true });
      set((s) => ({
        likeOverride: {
          ...s.likeOverride,
          [podId]: {
            liked_by_me: res.togglePodLike.liked_by_me,
            like_count: res.togglePodLike.like_count,
          },
        },
      }));
    } catch {
      set((s) => ({ likeOverride: { ...s.likeOverride, [podId]: current } }));
    }
  },
}));
