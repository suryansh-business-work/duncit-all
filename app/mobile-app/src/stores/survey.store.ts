import { create } from 'zustand';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { SaveInterestsDocument, SurveyDataDocument } from '@/graphql/survey';
import { graphqlRequest } from '@/services/graphql.client';

export type SurveyData = ResultOf<typeof SurveyDataDocument>;

interface SurveyState {
  data?: SurveyData;
  isLoading: boolean;
  error?: unknown;
  saving: boolean;
  fetch: () => Promise<void>;
  /** Persist the chosen interest ids; throws on failure for the screen to show. */
  save: (categoryIds: string[]) => Promise<void>;
}

/** Signup-survey state: the category tree + the user's picks, plus the save. */
export const useSurveyStore = create<SurveyState>((set, get) => ({
  isLoading: false,
  saving: false,
  fetch: async () => {
    if (get().isLoading || get().data) return;
    set({ isLoading: true, error: undefined });
    try {
      const data = await graphqlRequest(SurveyDataDocument, undefined, { auth: true });
      set({ data, isLoading: false });
    } catch (error) {
      set({ error, isLoading: false });
    }
  },
  save: async (categoryIds) => {
    set({ saving: true });
    try {
      await graphqlRequest(SaveInterestsDocument, { category_ids: categoryIds }, { auth: true });
    } finally {
      set({ saving: false });
    }
  },
}));
