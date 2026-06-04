import { create } from 'zustand';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { SuperCategoriesDocument } from '@/graphql/super-category';
import { graphqlRequest } from '@/services/graphql.client';

export type SuperCategoriesData = ResultOf<typeof SuperCategoriesDocument>;
export type SuperCategory = SuperCategoriesData['categories'][number];

interface SuperCategoryState {
  data?: SuperCategoriesData;
  isLoading: boolean;
  error?: unknown;
  /** '' = All (no super-category filter). */
  selectedSlug: string;
  fetch: () => Promise<void>;
  select: (slug: string) => void;
}

/** Header super-category filter — the active slug is shared across all tabs. */
export const useSuperCategoryStore = create<SuperCategoryState>((set, get) => ({
  isLoading: false,
  selectedSlug: '',
  select: (slug) => set({ selectedSlug: slug }),
  fetch: async () => {
    if (get().isLoading || get().data) return;
    set({ isLoading: true, error: undefined });
    try {
      const data = await graphqlRequest(SuperCategoriesDocument, undefined, { auth: true });
      set({ data, isLoading: false });
    } catch (error) {
      set({ error, isLoading: false });
    }
  },
}));
