import { create } from 'zustand';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { MobilePolicyBySlugDocument, MobilePublicPoliciesDocument } from '@/graphql/account';
import { graphqlRequest } from '@/services/graphql.client';
import { createQueryStore } from './create-query-store';

export type PublicPoliciesData = ResultOf<typeof MobilePublicPoliciesDocument>;
type PolicyData = ResultOf<typeof MobilePolicyBySlugDocument>;

/** Public policy links for the drawer's Policies section. */
export const usePublicPoliciesStore = createQueryStore<PublicPoliciesData>(() =>
  graphqlRequest(MobilePublicPoliciesDocument),
);

interface PolicyEntry {
  data?: PolicyData;
  isLoading: boolean;
  error?: unknown;
}

interface PolicyState {
  bySlug: Record<string, PolicyEntry>;
  fetch: (slug: string) => Promise<void>;
}

/** Per-slug policy cache — backs the policy reader screen. */
export const usePolicyStore = create<PolicyState>((set, get) => ({
  bySlug: {},
  fetch: async (slug) => {
    if (!slug) return;
    const entry = get().bySlug[slug];
    if (entry?.isLoading || entry?.data) return;
    set((s) => ({ bySlug: { ...s.bySlug, [slug]: { isLoading: true } } }));
    try {
      const data = await graphqlRequest(MobilePolicyBySlugDocument, { slug });
      set((s) => ({ bySlug: { ...s.bySlug, [slug]: { data, isLoading: false } } }));
    } catch (error) {
      set((s) => ({ bySlug: { ...s.bySlug, [slug]: { isLoading: false, error } } }));
    }
  },
}));
